import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { ToggleExecucaoDto } from './dto/toggle-execucao.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';
import { StreakCalculator, toCivilDateString } from './streak.calculator';

@Injectable()
export class HabitosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo hábito recorrente vinculado a um pilar de vida (RF06)
   */
  async create(idUsuario: string, dto: CreateHabitoDto) {
    const pilar = await this.prisma.pilarVida.findUnique({
      where: { id: dto.idPilar },
    });
    if (!pilar) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: `Pilar de vida com ID ${dto.idPilar} não existe.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const frequencia = dto.frequenciaSemanal ?? dto.diasSemana.length;

    const habito = await this.prisma.habito.create({
      data: {
        idUsuario,
        idPilar: dto.idPilar,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() ?? null,
        duracaoEstimadaMinutos: dto.duracaoEstimadaMinutos,
        diasSemana: dto.diasSemana,
        frequenciaSemanal: frequencia,
        horarioPadrao: dto.horarioPadrao ?? null,
      },
      include: {
        pilar: true,
      },
    });

    return this.formatHabitoResponse(habito, 0);
  }

  /**
   * Lista os hábitos do usuário com opção de filtro por pilar e status ativo
   */
  async findAll(idUsuario: string, idPilar?: number, statusAtivo?: boolean) {
    const whereClause: Record<string, unknown> = {
      idUsuario,
      deletedAt: null,
    };
    if (idPilar !== undefined) {
      whereClause.idPilar = Number(idPilar);
    }
    if (statusAtivo !== undefined) {
      whereClause.statusAtivo =
        typeof statusAtivo === 'string'
          ? statusAtivo === 'true'
          : Boolean(statusAtivo);
    }

    const habitos = await this.prisma.habito.findMany({
      where: whereClause,
      include: {
        pilar: true,
        execucoes: {
          where: { concluido: true, deletedAt: null },
          select: { dataExecucao: true },
        },
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              where: { deletedAt: null },
              orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
      orderBy: [{ horarioPadrao: 'asc' }, { createdAt: 'desc' }],
    });

    return habitos.map((h) => {
      const diasProgramados = (h.diasSemana as number[]) ?? [1, 2, 3, 4, 5, 6, 7];
      const datasExecutadas = h.execucoes.map((e) => e.dataExecucao);
      const streakAtual = StreakCalculator.calcularStreakHabito(
        diasProgramados,
        datasExecutadas,
      );
      return this.formatHabitoResponse(h, streakAtual);
    });
  }

  /**
   * Busca um hábito por ID
   */
  async findOne(idUsuario: string, id: string) {
    const habito = await this.prisma.habito.findFirst({
      where: { id, idUsuario, deletedAt: null },
      include: {
        pilar: true,
        execucoes: {
          where: { concluido: true, deletedAt: null },
          select: { dataExecucao: true },
        },
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              where: { deletedAt: null },
              orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    if (!habito) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Hábito não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const diasProgramados = (habito.diasSemana as number[]) ?? [1, 2, 3, 4, 5, 6, 7];
    const datasExecutadas = habito.execucoes.map((e) => e.dataExecucao);
    const streakAtual = StreakCalculator.calcularStreakHabito(
      diasProgramados,
      datasExecutadas,
    );

    return this.formatHabitoResponse(habito, streakAtual);
  }

  /**
   * Atualiza dados de um hábito existente
   */
  async update(idUsuario: string, id: string, dto: UpdateHabitoDto) {
    const existente = await this.prisma.habito.findFirst({
      where: { id, idUsuario, deletedAt: null },
    });
    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Hábito não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.idPilar !== undefined) {
      const pilar = await this.prisma.pilarVida.findUnique({
        where: { id: dto.idPilar },
      });
      if (!pilar) {
        throw new DomainException(
          {
            errorCode: 'RESOURCE_NOT_FOUND',
            message: `Pilar de vida com ID ${dto.idPilar} não existe.`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const habitoAtualizado = await this.prisma.habito.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome.trim() }),
        ...(dto.descricao !== undefined && {
          descricao: dto.descricao ? dto.descricao.trim() : null,
        }),
        ...(dto.idPilar !== undefined && { idPilar: dto.idPilar }),
        ...(dto.duracaoEstimadaMinutos !== undefined && {
          duracaoEstimadaMinutos: dto.duracaoEstimadaMinutos,
        }),
        ...(dto.diasSemana !== undefined && { diasSemana: dto.diasSemana }),
        ...(dto.frequenciaSemanal !== undefined && {
          frequenciaSemanal: dto.frequenciaSemanal,
        }),
        ...(dto.horarioPadrao !== undefined && {
          horarioPadrao: dto.horarioPadrao ?? null,
        }),
        ...(dto.statusAtivo !== undefined && {
          statusAtivo: dto.statusAtivo,
        }),
      },
      include: {
        pilar: true,
        execucoes: {
          where: { concluido: true, deletedAt: null },
          select: { dataExecucao: true },
        },
      },
    });

    const diasProgramados =
      (habitoAtualizado.diasSemana as number[]) ?? [1, 2, 3, 4, 5, 6, 7];
    const datasExecutadas = habitoAtualizado.execucoes.map((e) => e.dataExecucao);
    const streakAtual = StreakCalculator.calcularStreakHabito(
      diasProgramados,
      datasExecutadas,
    );

    return this.formatHabitoResponse(habitoAtualizado, streakAtual);
  }

  /**
   * Exclusão lógica (soft delete) do hábito
   */
  async remove(idUsuario: string, id: string) {
    const existente = await this.prisma.habito.findFirst({
      where: { id, idUsuario, deletedAt: null },
    });
    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Hábito não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.habito.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Hábito removido com sucesso.' };
  }

  /**
   * Alterna ou define execução do hábito no dia especificado (RF15)
   * Faz upsert em registro_execucao_habito e recalcula streaks.
   */
  async toggleExecucao(
    idUsuario: string,
    idHabito: string,
    dataStr: string,
    dto?: ToggleExecucaoDto,
  ) {
    const habito = await this.prisma.habito.findFirst({
      where: { id: idHabito, idUsuario, deletedAt: null },
    });
    if (!habito) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Hábito não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const dataCivil = toCivilDateString(dataStr);
    const dataObj = new Date(dataCivil);

    const execucaoExistente =
      await this.prisma.registroExecucaoHabito.findUnique({
        where: {
          idHabito_dataExecucao: {
            idHabito,
            dataExecucao: dataObj,
          },
        },
      });

    let novoConcluido: boolean;
    if (dto && dto.concluido !== undefined) {
      novoConcluido = dto.concluido;
    } else {
      novoConcluido = execucaoExistente ? !execucaoExistente.concluido : true;
    }

    let registroAtualizado;
    if (execucaoExistente) {
      registroAtualizado = await this.prisma.registroExecucaoHabito.update({
        where: { id: execucaoExistente.id },
        data: {
          concluido: novoConcluido,
          deletedAt: null,
          dataRegistro: new Date(),
        },
      });
    } else {
      registroAtualizado = await this.prisma.registroExecucaoHabito.create({
        data: {
          idHabito,
          idUsuario,
          dataExecucao: dataObj,
          concluido: novoConcluido,
        },
      });
    }

    // Recalcula streak individual do hábito
    const todasExecucoes = await this.prisma.registroExecucaoHabito.findMany({
      where: {
        idHabito,
        concluido: true,
        deletedAt: null,
      },
      select: { dataExecucao: true },
    });

    const diasProgramados =
      (habito.diasSemana as number[]) ?? [1, 2, 3, 4, 5, 6, 7];
    const datasExecutadas = todasExecucoes.map((e) => e.dataExecucao);
    const streakAtual = StreakCalculator.calcularStreakHabito(
      diasProgramados,
      datasExecutadas,
      dataCivil,
    );

    // Recalcula streak global de dias ativos do usuário (🔥)
    const streakGlobalDiasAtivos = await this.obterStreakGlobal(
      idUsuario,
      dataCivil,
    );

    return {
      idHabito,
      dataExecucao: dataCivil,
      concluido: registroAtualizado.concluido,
      dataRegistro: registroAtualizado.dataRegistro,
      streakAtual,
      streakGlobalDiasAtivos: streakGlobalDiasAtivos.streakGlobalDiasAtivos,
    };
  }

  /**
   * Obtém a sequência atual global de dias ativos do usuário (Card "5 dias 🔥")
   */
  async obterStreakGlobal(idUsuario: string, dataReferenciaStr?: string) {
    const dataRef = dataReferenciaStr
      ? toCivilDateString(dataReferenciaStr)
      : toCivilDateString(new Date());

    const execucoesUsuario =
      await this.prisma.registroExecucaoHabito.findMany({
        where: {
          idUsuario,
          concluido: true,
          deletedAt: null,
        },
        select: { dataExecucao: true },
        distinct: ['dataExecucao'],
      });

    const datasAtivas = execucoesUsuario.map((e) => e.dataExecucao);
    const streak = StreakCalculator.calcularStreakGlobal(datasAtivas, dataRef);

    return {
      dataReferencia: dataRef,
      streakGlobalDiasAtivos: streak,
    };
  }

  private formatHabitoResponse(
    habito: {
      id: string;
      idPilar: number;
      nome: string;
      descricao: string | null;
      duracaoEstimadaMinutos: number;
      frequenciaSemanal: number;
      diasSemana: unknown;
      horarioPadrao: string | null;
      statusAtivo: boolean;
      createdAt: Date;
      updatedAt: Date;
      pilar?: {
        id: number;
        codigo: string;
        nome: string;
        corHex: string;
        corFundoHex: string;
        icone: string;
      };
      checklists?: Array<{
        id: string;
        titulo: string;
        ehModelo: boolean;
        itens?: Array<{
          id: string;
          descricao: string;
          concluido: boolean;
          ordem: number;
        }>;
      }>;
    },
    streakAtual: number,
  ) {
    return {
      id: habito.id,
      nome: habito.nome,
      descricao: habito.descricao,
      duracaoEstimadaMinutos: habito.duracaoEstimadaMinutos,
      frequenciaSemanal: habito.frequenciaSemanal,
      diasSemana: habito.diasSemana as number[],
      horarioPadrao: habito.horarioPadrao,
      statusAtivo: habito.statusAtivo,
      streakAtual,
      pilar: habito.pilar
        ? {
            idPilar: habito.pilar.id,
            codigo: habito.pilar.codigo,
            nome: habito.pilar.nome,
            corHex: habito.pilar.corHex,
            corFundoHex: habito.pilar.corFundoHex,
            icone: habito.pilar.icone,
          }
        : { idPilar: habito.idPilar },
      checklists:
        habito.checklists?.map((c) => ({
          id: c.id,
          titulo: c.titulo,
          ehModelo: c.ehModelo,
          totalItens: c.itens?.length ?? 0,
          itensConcluidos: c.itens?.filter((i) => i.concluido).length ?? 0,
          itens: c.itens,
        })) ?? [],
      createdAt: habito.createdAt,
      updatedAt: habito.updatedAt,
    };
  }
}
