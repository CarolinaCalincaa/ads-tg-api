import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/exceptions/domain.exception';
import { SetActivePillarsDto } from './dto/set-active-pillars.dto';

export function normalizeMesAno(mesAnoStr?: string): {
  date: Date;
  formatted: string;
} {
  let ym: string;
  if (mesAnoStr && /^\d{4}-\d{2}/.test(mesAnoStr)) {
    ym = mesAnoStr.slice(0, 7);
  } else {
    ym = new Date().toISOString().slice(0, 7);
  }
  const formatted = `${ym}-01`;
  const date = new Date(formatted);
  return { date, formatted };
}

@Injectable()
export class PilaresService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna os 7 Pilares Mestres de Vida (PilarVida) ordenados por ID
   */
  async findAll() {
    return this.prisma.pilarVida.findMany({
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Lista os pilares ativos do usuário no mês especificado (ou mês corrente)
   */
  async findActivePillars(idUsuario: string, mesAnoStr?: string) {
    const { date, formatted } = normalizeMesAno(mesAnoStr);

    const ativos = await this.prisma.pilarAtivoMes.findMany({
      where: {
        idUsuario,
        mesAno: date,
        deletedAt: null,
      },
      include: {
        pilar: true,
      },
      orderBy: { idPilar: 'asc' },
    });

    return {
      mesAno: formatted,
      totalAtivos: ativos.length,
      pilares: ativos.map((pa) => ({
        idPilar: pa.pilar.id,
        codigo: pa.pilar.codigo,
        nome: pa.pilar.nome,
        descricao: pa.pilar.descricao,
        corHex: pa.pilar.corHex,
        corFundoHex: pa.pilar.corFundoHex,
        icone: pa.pilar.icone,
        dataAtivacao: pa.createdAt,
      })),
    };
  }

  /**
   * Define os pilares ativos do usuário para o mês (RN01 - máximo 3 pilares)
   */
  async setActivePillars(
    idUsuario: string,
    mesAnoStr: string,
    dto: SetActivePillarsDto,
  ) {
    if (dto.idsPilares.length > 3) {
      throw DomainException.maxActivePillarsExceeded({
        mesAno: mesAnoStr,
        recebidos: dto.idsPilares,
      });
    }

    const { date, formatted } = normalizeMesAno(mesAnoStr);

    // Valida se os IDs fornecidos existem no catálogo de pilares mestres
    if (dto.idsPilares.length > 0) {
      const pilaresExistentes = await this.prisma.pilarVida.findMany({
        where: { id: { in: dto.idsPilares } },
        select: { id: true },
      });
      if (pilaresExistentes.length !== dto.idsPilares.length) {
        throw new DomainException(
          {
            errorCode: 'VALIDATION_ERROR',
            message: 'Um ou mais IDs de pilares informados são inválidos.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Soft-delete pilares atualmente ativos que não estão na nova seleção
      await tx.pilarAtivoMes.updateMany({
        where: {
          idUsuario,
          mesAno: date,
          deletedAt: null,
          idPilar: { notIn: dto.idsPilares },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // 2. Para cada pilar selecionado, faz upsert garantindo reativação se estava soft-deleted
      for (const idPilar of dto.idsPilares) {
        const existente = await tx.pilarAtivoMes.findUnique({
          where: {
            idUsuario_idPilar_mesAno: {
              idUsuario,
              idPilar,
              mesAno: date,
            },
          },
        });

        if (existente) {
          if (existente.deletedAt !== null) {
            await tx.pilarAtivoMes.update({
              where: { id: existente.id },
              data: { deletedAt: null },
            });
          }
        } else {
          await tx.pilarAtivoMes.create({
            data: {
              idUsuario,
              idPilar,
              mesAno: date,
            },
          });
        }
      }

      // 3. Retorna lista consolidada
      const atualizados = await tx.pilarAtivoMes.findMany({
        where: {
          idUsuario,
          mesAno: date,
          deletedAt: null,
        },
        include: { pilar: true },
        orderBy: { idPilar: 'asc' },
      });

      return {
        mesAno: formatted,
        totalAtivos: atualizados.length,
        pilares: atualizados.map((pa) => ({
          idPilar: pa.pilar.id,
          codigo: pa.pilar.codigo,
          nome: pa.pilar.nome,
          descricao: pa.pilar.descricao,
          corHex: pa.pilar.corHex,
          corFundoHex: pa.pilar.corFundoHex,
          icone: pa.pilar.icone,
        })),
      };
    });
  }

  /**
   * Alterna (toggle) ativação de um pilar individual no mês
   * Se já existirem 3 pilares ativos e a ação for ativar, bloqueia com RN01 (HTTP 422).
   */
  async toggleActivePillar(
    idUsuario: string,
    mesAnoStr: string,
    idPilar: number,
  ) {
    if (idPilar < 1 || idPilar > 7) {
      throw new DomainException(
        {
          errorCode: 'VALIDATION_ERROR',
          message: 'O ID do pilar deve estar entre 1 e 7.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { date, formatted } = normalizeMesAno(mesAnoStr);

    const pilar = await this.prisma.pilarVida.findUnique({
      where: { id: idPilar },
    });
    if (!pilar) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: `Pilar com ID ${idPilar} não encontrado.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const registroExistente = await tx.pilarAtivoMes.findUnique({
        where: {
          idUsuario_idPilar_mesAno: {
            idUsuario,
            idPilar,
            mesAno: date,
          },
        },
      });

      const estaAtivo = registroExistente && registroExistente.deletedAt === null;

      if (estaAtivo) {
        // Desativação
        await tx.pilarAtivoMes.update({
          where: { id: registroExistente.id },
          data: { deletedAt: new Date() },
        });

        const totalAtivos = await tx.pilarAtivoMes.count({
          where: {
            idUsuario,
            mesAno: date,
            deletedAt: null,
          },
        });

        return {
          mesAno: formatted,
          idPilar,
          nome: pilar.nome,
          ativo: false,
          totalAtivos,
        };
      } else {
        // Tentativa de ativação — validação estrita RN01
        const ativosAtuais = await tx.pilarAtivoMes.count({
          where: {
            idUsuario,
            mesAno: date,
            deletedAt: null,
          },
        });

        if (ativosAtuais >= 3) {
          throw DomainException.maxActivePillarsExceeded({
            mesAno: formatted,
            ativosAtuais,
            idPilarTentado: idPilar,
          });
        }

        if (registroExistente) {
          await tx.pilarAtivoMes.update({
            where: { id: registroExistente.id },
            data: { deletedAt: null },
          });
        } else {
          await tx.pilarAtivoMes.create({
            data: {
              idUsuario,
              idPilar,
              mesAno: date,
            },
          });
        }

        return {
          mesAno: formatted,
          idPilar,
          nome: pilar.nome,
          ativo: true,
          totalAtivos: ativosAtuais + 1,
        };
      }
    });
  }
}
