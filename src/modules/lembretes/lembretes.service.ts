import { Injectable } from '@nestjs/common';
import { TipoLembrete } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ItemLembreteBatchDto,
  UpdateLembreteDto,
  UpdateLembretesBatchDto,
} from './dto/update-lembretes.dto';

export interface LembreteDefaultConfig {
  ativo: boolean;
  intervaloMinutos: number | null;
  horarioFixo: string | null;
  janelaInicio: string;
  janelaFim: string;
}

export const LEMBRETES_DEFAULTS: Record<TipoLembrete, LembreteDefaultConfig> = {
  [TipoLembrete.AGUA]: {
    ativo: true,
    intervaloMinutos: 90,
    horarioFixo: null,
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
  [TipoLembrete.ALONGAMENTO]: {
    ativo: true,
    intervaloMinutos: 120,
    horarioFixo: null,
    janelaInicio: '09:00',
    janelaFim: '19:00',
  },
  [TipoLembrete.SONO]: {
    ativo: true,
    intervaloMinutos: null,
    horarioFixo: '22:00',
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
  [TipoLembrete.FECHAMENTO_SEMANAL]: {
    ativo: true,
    intervaloMinutos: null,
    horarioFixo: '18:00',
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
};

@Injectable()
export class LembretesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém as configurações dos 4 tipos de lembrete do usuário (RF21)
   * Se algum tipo ainda não estiver gravado no banco, cria o registro default.
   */
  async obterConfiguracoes(idUsuario: string) {
    const tipos = Object.values(TipoLembrete);
    const configs = await this.prisma.lembreteConfig.findMany({
      where: {
        idUsuario,
        deletedAt: null,
      },
    });

    const mapaExistentes = new Map(configs.map((c) => [c.tipo, c]));
    const resultados = [];

    for (const tipo of tipos) {
      let config = mapaExistentes.get(tipo);
      if (!config) {
        const padrao = LEMBRETES_DEFAULTS[tipo];
        config = await this.prisma.lembreteConfig.upsert({
          where: {
            idUsuario_tipo: {
              idUsuario,
              tipo,
            },
          },
          update: {
            deletedAt: null,
          },
          create: {
            idUsuario,
            tipo,
            ativo: padrao.ativo,
            intervaloMinutos: padrao.intervaloMinutos,
            horarioFixo: padrao.horarioFixo,
            janelaInicio: padrao.janelaInicio,
            janelaFim: padrao.janelaFim,
          },
        });
      }
      resultados.push(this.formatResponse(config));
    }

    return resultados;
  }

  /**
   * Atualiza as configurações de um tipo específico de lembrete
   */
  async atualizarConfiguracao(
    idUsuario: string,
    tipo: TipoLembrete,
    dto: UpdateLembreteDto,
  ) {
    const padrao = LEMBRETES_DEFAULTS[tipo];

    const atualizado = await this.prisma.lembreteConfig.upsert({
      where: {
        idUsuario_tipo: {
          idUsuario,
          tipo,
        },
      },
      update: {
        deletedAt: null,
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
        ...(dto.intervaloMinutos !== undefined && {
          intervaloMinutos: dto.intervaloMinutos,
        }),
        ...(dto.horarioFixo !== undefined && {
          horarioFixo: dto.horarioFixo,
        }),
        ...(dto.janelaInicio !== undefined && {
          janelaInicio: dto.janelaInicio,
        }),
        ...(dto.janelaFim !== undefined && {
          janelaFim: dto.janelaFim,
        }),
      },
      create: {
        idUsuario,
        tipo,
        ativo: dto.ativo ?? padrao.ativo,
        intervaloMinutos:
          dto.intervaloMinutos !== undefined
            ? dto.intervaloMinutos
            : padrao.intervaloMinutos,
        horarioFixo:
          dto.horarioFixo !== undefined ? dto.horarioFixo : padrao.horarioFixo,
        janelaInicio: dto.janelaInicio ?? padrao.janelaInicio,
        janelaFim: dto.janelaFim ?? padrao.janelaFim,
      },
    });

    return this.formatResponse(atualizado);
  }

  /**
   * Atualiza ou cria configurações de lembrete em lote (RF21)
   * Suporta tanto { lembretes: [...] } quanto array direto [...]
   */
  async atualizarConfiguracoesEmLote(
    idUsuario: string,
    payload: UpdateLembretesBatchDto | ItemLembreteBatchDto[],
  ) {
    const listaLembretes: ItemLembreteBatchDto[] = Array.isArray(payload)
      ? payload
      : payload?.lembretes ?? [];

    for (const item of listaLembretes) {
      if (item && item.tipo) {
        await this.atualizarConfiguracao(idUsuario, item.tipo, item);
      }
    }

    return this.obterConfiguracoes(idUsuario);
  }

  private formatResponse(config: {
    id: string;
    tipo: TipoLembrete;
    ativo: boolean;
    intervaloMinutos: number | null;
    horarioFixo: string | null;
    janelaInicio: string;
    janelaFim: string;
    updatedAt: Date;
  }) {
    return {
      id: config.id,
      tipo: config.tipo,
      ativo: config.ativo,
      intervaloMinutos: config.intervaloMinutos,
      horarioFixo: config.horarioFixo,
      janelaInicio: config.janelaInicio,
      janelaFim: config.janelaFim,
      updatedAt: config.updatedAt,
    };
  }
}
