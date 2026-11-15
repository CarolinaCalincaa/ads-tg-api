import { HttpStatus, Injectable } from '@nestjs/common';
import { TipoCicloFechamento } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { StreakCalculator, toCivilDateString } from '../habitos/streak.calculator';
import { PreviaFechamentoQueryDto } from './dto/previa-fechamento-query.dto';
import { QueryFechamentosDto } from './dto/query-fechamentos.dto';
import { UpsertFechamentoDto } from './dto/upsert-fechamento.dto';

export interface CicloPeriodo {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  totalDiasCiclo: number;
}

export interface PreviaFechamentoResponse {
  tipoCiclo: TipoCicloFechamento;
  dataRef: string;
  dataInicioCiclo: string;
  dataFimCiclo: string;
  dataInicio: string;
  dataFim: string;
  rotuloPeriodo: string;
  totalDiasCiclo: number;
  habitosConcluidos: number;
  habitosEsperados: number;
  consistenciaPercentual: number;
  diasAtivos: number;
  sequenciaAtualDias: number;
  metricas: {
    consistenciaPercentual: number;
    habitosConcluidos: number;
    habitosEsperados: number;
    diasAtivos: number;
    totalDiasCiclo: number;
    sequenciaAtualDias: number;
  };
  acaoFuncionouBem: string | null;
  oqueFazerDiferente: string | null;
  vitoriaReconhecer: string | null;
  fracassoAceitar: string | null;
  fechamentoExistenteId: string | null;
  fechamentoSalvo: {
    id: string;
    acaoFuncionouBem: string | null;
    oqueFazerDiferente: string | null;
    vitoriaReconhecer: string | null;
    fracassoAceitar: string | null;
    dataFechamento: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

const NOMES_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

@Injectable()
export class FechamentosService {
  constructor(private readonly prisma: PrismaService) {}

  formatarRotuloPeriodo(
    tipoCiclo: TipoCicloFechamento,
    dataInicioStr: string,
    dataFimStr: string,
  ): string {
    const ano = Number(dataInicioStr.slice(0, 4));
    const mesInicio = Number(dataInicioStr.slice(5, 7));
    const diaInicio = dataInicioStr.slice(8, 10);

    const mesFim = Number(dataFimStr.slice(5, 7));
    const diaFim = dataFimStr.slice(8, 10);

    if (tipoCiclo === TipoCicloFechamento.MENSAL) {
      const nomeMes = NOMES_MESES[mesInicio - 1] ?? '';
      const capitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
      return `${capitalizado} / ${ano}`;
    }

    const nomeMesFim = NOMES_MESES[mesFim - 1] ?? '';
    if (mesInicio === mesFim) {
      return `${diaInicio} — ${diaFim} de ${nomeMesFim}`;
    }
    const nomeMesInicio = NOMES_MESES[mesInicio - 1] ?? '';
    return `${diaInicio} de ${nomeMesInicio} — ${diaFim} de ${nomeMesFim}`;
  }

  /**
   * Determina o intervalo do ciclo civil a partir da data de referência:
   * - SEMANAL: Segunda-feira até Domingo correspondente à semana ISO da dataRef.
   * - MENSAL: Primeiro até o último dia civil do mês da dataRef.
   */
  calcularPeriodoCiclo(
    tipoCiclo: TipoCicloFechamento,
    dataRefStr: string,
  ): CicloPeriodo {
    const dataRefCivil = toCivilDateString(dataRefStr);
    const ano = Number(dataRefCivil.slice(0, 4));
    const mes = Number(dataRefCivil.slice(5, 7));
    const dia = Number(dataRefCivil.slice(8, 10));

    if (tipoCiclo === TipoCicloFechamento.SEMANAL) {
      const d = new Date(Date.UTC(ano, mes - 1, dia));
      const diaSemana = d.getUTCDay(); // 0 = Domingo ... 6 = Sábado
      const isoWeekday = diaSemana === 0 ? 7 : diaSemana; // 1 = Segunda ... 7 = Domingo

      const diffParaSegunda = isoWeekday - 1;
      const dataInicioObj = new Date(Date.UTC(ano, mes - 1, dia - diffParaSegunda));
      const dataFimObj = new Date(
        Date.UTC(ano, mes - 1, dia - diffParaSegunda + 6),
      );

      return {
        dataInicio: toCivilDateString(dataInicioObj),
        dataFim: toCivilDateString(dataFimObj),
        totalDiasCiclo: 7,
      };
    }

    // MENSAL
    const dataInicioObj = new Date(Date.UTC(ano, mes - 1, 1));
    // Próximo mês dia 0 resulta no último dia do mês corrente
    const dataFimObj = new Date(Date.UTC(ano, mes, 0));
    const totalDiasCiclo = dataFimObj.getUTCDate();

    return {
      dataInicio: toCivilDateString(dataInicioObj),
      dataFim: toCivilDateString(dataFimObj),
      totalDiasCiclo,
    };
  }

  /**
   * Gera todas as strings de datas civis YYYY-MM-DD no intervalo [dataInicio, dataFim]
   */
  private gerarDiasNoIntervalo(dataInicioStr: string, dataFimStr: string): string[] {
    const dias: string[] = [];
    const inicio = new Date(`${dataInicioStr}T00:00:00.000Z`);
    const fim = new Date(`${dataFimStr}T00:00:00.000Z`);

    const cursor = new Date(inicio.getTime());
    while (cursor.getTime() <= fim.getTime()) {
      dias.push(toCivilDateString(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dias;
  }

  /**
   * GET /api/v1/fechamentos/previa?tipoCiclo=SEMANAL|MENSAL&dataRef=YYYY-MM-DD
   * Calcula as métricas agregadas exatas de acordo com Tech Doc 04 — Seção 6.
   */
  async obterPrevia(
    idUsuario: string,
    query: PreviaFechamentoQueryDto,
  ): Promise<PreviaFechamentoResponse> {
    const { tipoCiclo, dataRef } = query;
    const periodo = this.calcularPeriodoCiclo(tipoCiclo, dataRef);
    const { dataInicio, dataFim, totalDiasCiclo } = periodo;

    const diasIntervalo = this.gerarDiasNoIntervalo(dataInicio, dataFim);
    const dataInicioDate = new Date(`${dataInicio}T00:00:00.000Z`);
    const dataFimDate = new Date(`${dataFim}T23:59:59.999Z`);

    // 1. Hábitos ativos do usuário criados até o fim do ciclo
    const habitos = await this.prisma.habito.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        statusAtivo: true,
        createdAt: { lte: dataFimDate },
      },
      include: {
        execucoes: {
          where: {
            dataExecucao: {
              gte: dataInicioDate,
              lte: dataFimDate,
            },
            deletedAt: null,
          },
          select: {
            dataExecucao: true,
            concluido: true,
          },
        },
      },
    });

    let habitosEsperados = 0;
    let habitosConcluidos = 0;
    const setDatasComHabitoConcluidoNoCiclo = new Set<string>();

    for (const habito of habitos) {
      const diasSemanaProgramados = (habito.diasSemana as number[]) ?? [
        1, 2, 3, 4, 5, 6, 7,
      ];
      const dataCriacaoHabito = toCivilDateString(habito.createdAt);

      const execucoesConcluidasSet = new Set(
        habito.execucoes
          .filter((e) => e.concluido)
          .map((e) => toCivilDateString(e.dataExecucao)),
      );

      for (const d of diasIntervalo) {
        // Só contabiliza a partir do dia de criação do hábito para não exigir retroativo indevido
        if (d < dataCriacaoHabito) {
          continue;
        }

        const dateObj = new Date(`${d}T00:00:00.000Z`);
        const dayOfWeek = dateObj.getUTCDay();
        const isoWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;

        if (diasSemanaProgramados.includes(isoWeekday)) {
          habitosEsperados++;
          if (execucoesConcluidasSet.has(d)) {
            habitosConcluidos++;
            setDatasComHabitoConcluidoNoCiclo.add(d);
          }
        }
      }
    }

    // 2. Consistência % = round((habitosConcluidos / habitosEsperados) * 100)
    const consistenciaPercentual =
      habitosEsperados > 0
        ? Math.round((habitosConcluidos / habitosEsperados) * 100)
        : 0;

    // 3. Dias Ativos no ciclo: contagem de datas d onde (hábitos concluídos + tarefas concluídas) >= 1
    const tarefasConcluidas = await this.prisma.tarefa.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        status: 'CONCLUIDA',
        dataAgendamento: {
          gte: dataInicioDate,
          lte: dataFimDate,
        },
      },
      select: {
        dataAgendamento: true,
      },
    });

    const setDatasComTarefaConcluida = new Set(
      tarefasConcluidas.map((t) => toCivilDateString(t.dataAgendamento)),
    );

    let diasAtivos = 0;
    for (const d of diasIntervalo) {
      if (
        setDatasComHabitoConcluidoNoCiclo.has(d) ||
        setDatasComTarefaConcluida.has(d)
      ) {
        diasAtivos++;
      }
    }

    // 4. Sequência Atual Global (Streak 🔥) até a dataRef
    const todasExecucoesUsuario =
      await this.prisma.registroExecucaoHabito.findMany({
        where: {
          idUsuario,
          concluido: true,
          deletedAt: null,
        },
        select: { dataExecucao: true },
        distinct: ['dataExecucao'],
      });

    const datasAtivasGlobais = todasExecucoesUsuario.map((e) => e.dataExecucao);
    const sequenciaAtualDias = StreakCalculator.calcularStreakGlobal(
      datasAtivasGlobais,
      dataRef,
    );

    // 5. Verifica se já existe fechamento salvo para o ciclo
    const fechamentoExistente = await this.prisma.fechamentoReflexao.findUnique({
      where: {
        idUsuario_tipoCiclo_dataInicioCiclo: {
          idUsuario,
          tipoCiclo,
          dataInicioCiclo: dataInicioDate,
        },
      },
    });

    const rotuloPeriodo = this.formatarRotuloPeriodo(
      tipoCiclo,
      dataInicio,
      dataFim,
    );

    return {
      tipoCiclo,
      dataRef,
      dataInicioCiclo: dataInicio,
      dataFimCiclo: dataFim,
      dataInicio,
      dataFim,
      rotuloPeriodo,
      totalDiasCiclo,
      habitosConcluidos,
      habitosEsperados,
      consistenciaPercentual,
      diasAtivos,
      sequenciaAtualDias,
      metricas: {
        consistenciaPercentual,
        habitosConcluidos,
        habitosEsperados,
        diasAtivos,
        totalDiasCiclo,
        sequenciaAtualDias,
      },
      acaoFuncionouBem: fechamentoExistente?.acaoFuncionouBem ?? null,
      oqueFazerDiferente: fechamentoExistente?.oqueFazerDiferente ?? null,
      vitoriaReconhecer: fechamentoExistente?.vitoriaReconhecer ?? null,
      fracassoAceitar: fechamentoExistente?.fracassoAceitar ?? null,
      fechamentoExistenteId: fechamentoExistente?.id ?? null,
      fechamentoSalvo: fechamentoExistente
        ? {
            id: fechamentoExistente.id,
            acaoFuncionouBem: fechamentoExistente.acaoFuncionouBem,
            oqueFazerDiferente: fechamentoExistente.oqueFazerDiferente,
            vitoriaReconhecer: fechamentoExistente.vitoriaReconhecer,
            fracassoAceitar: fechamentoExistente.fracassoAceitar,
            dataFechamento: toCivilDateString(fechamentoExistente.dataFechamento),
            createdAt: fechamentoExistente.createdAt,
            updatedAt: fechamentoExistente.updatedAt,
          }
        : null,
    };
  }

  /**
   * POST /api/v1/fechamentos
   * Realiza o Upsert sobre a chave única (idUsuario, tipoCiclo, dataInicioCiclo)
   */
  async upsert(idUsuario: string, dto: UpsertFechamentoDto) {
    const rawDataInicio = dto.dataInicioCiclo ?? dto.dataInicio;
    if (!rawDataInicio) {
      throw new DomainException(
        {
          errorCode: 'VALIDATION_ERROR',
          message: 'dataInicioCiclo ou dataInicio deve ser informada.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dataInicioCivil = toCivilDateString(rawDataInicio);
    const dataInicioDate = new Date(`${dataInicioCivil}T00:00:00.000Z`);

    const dataFechamentoCivil = dto.dataFechamento
      ? toCivilDateString(dto.dataFechamento)
      : toCivilDateString(new Date());
    const dataFechamentoDate = new Date(`${dataFechamentoCivil}T00:00:00.000Z`);

    // Se o cliente não informou dadosConsolidados, calcula e congela o snapshot da prévia
    let dadosConsolidados = dto.dadosConsolidados;
    if (!dadosConsolidados) {
      const previa = await this.obterPrevia(idUsuario, {
        tipoCiclo: dto.tipoCiclo,
        dataRef: dataFechamentoCivil,
      });
      dadosConsolidados = {
        habitosConcluidos: previa.habitosConcluidos,
        habitosEsperados: previa.habitosEsperados,
        consistenciaPercentual: previa.consistenciaPercentual,
        diasAtivos: previa.diasAtivos,
        totalDiasCiclo: previa.totalDiasCiclo,
        sequenciaAtualDias: previa.sequenciaAtualDias,
        congeladoEm: new Date().toISOString(),
      };
    }

    const fechamento = await this.prisma.fechamentoReflexao.upsert({
      where: {
        idUsuario_tipoCiclo_dataInicioCiclo: {
          idUsuario,
          tipoCiclo: dto.tipoCiclo,
          dataInicioCiclo: dataInicioDate,
        },
      },
      create: {
        idUsuario,
        tipoCiclo: dto.tipoCiclo,
        dataInicioCiclo: dataInicioDate,
        dataFechamento: dataFechamentoDate,
        acaoFuncionouBem: dto.acaoFuncionouBem?.trim() ?? null,
        oqueFazerDiferente: dto.oqueFazerDiferente?.trim() ?? null,
        vitoriaReconhecer: dto.vitoriaReconhecer?.trim() ?? null,
        fracassoAceitar: dto.fracassoAceitar?.trim() ?? null,
        dadosConsolidados: dadosConsolidados as any,
      },
      update: {
        dataFechamento: dataFechamentoDate,
        acaoFuncionouBem: dto.acaoFuncionouBem !== undefined
          ? dto.acaoFuncionouBem.trim()
          : undefined,
        oqueFazerDiferente: dto.oqueFazerDiferente !== undefined
          ? dto.oqueFazerDiferente.trim()
          : undefined,
        vitoriaReconhecer: dto.vitoriaReconhecer !== undefined
          ? dto.vitoriaReconhecer.trim()
          : undefined,
        fracassoAceitar: dto.fracassoAceitar !== undefined
          ? dto.fracassoAceitar.trim()
          : undefined,
        dadosConsolidados: dadosConsolidados as any,
        deletedAt: null,
      },
    });

    return this.formatFechamentoResponse(fechamento);
  }

  /**
   * GET /api/v1/fechamentos?tipoCiclo=SEMANAL|MENSAL
   * Lista o histórico ordenado por dataFechamento decrescente
   */
  async findAll(idUsuario: string, query: QueryFechamentosDto) {
    const whereClause: Record<string, unknown> = {
      idUsuario,
      deletedAt: null,
    };

    if (query.tipoCiclo) {
      whereClause.tipoCiclo = query.tipoCiclo;
    }

    const fechamentos = await this.prisma.fechamentoReflexao.findMany({
      where: whereClause,
      orderBy: [{ dataFechamento: 'desc' }, { createdAt: 'desc' }],
    });

    return fechamentos.map((f) => this.formatFechamentoResponse(f));
  }

  /**
   * GET /api/v1/fechamentos/:id
   */
  async findOne(idUsuario: string, id: string) {
    const fechamento = await this.prisma.fechamentoReflexao.findFirst({
      where: {
        id,
        idUsuario,
        deletedAt: null,
      },
    });

    if (!fechamento) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: `Fechamento com ID ${id} não encontrado.`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatFechamentoResponse(fechamento);
  }

  private formatFechamentoResponse(fechamento: {
    id: string;
    idUsuario: string;
    tipoCiclo: TipoCicloFechamento;
    dataInicioCiclo: Date;
    dataFechamento: Date;
    acaoFuncionouBem: string | null;
    oqueFazerDiferente: string | null;
    vitoriaReconhecer: string | null;
    fracassoAceitar: string | null;
    dadosConsolidados: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const dataInicioCiclo = toCivilDateString(fechamento.dataInicioCiclo);
    const periodo = this.calcularPeriodoCiclo(
      fechamento.tipoCiclo,
      dataInicioCiclo,
    );
    const rotuloPeriodo = this.formatarRotuloPeriodo(
      fechamento.tipoCiclo,
      periodo.dataInicio,
      periodo.dataFim,
    );

    return {
      id: fechamento.id,
      idUsuario: fechamento.idUsuario,
      tipoCiclo: fechamento.tipoCiclo,
      dataInicioCiclo,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
      rotuloPeriodo,
      dataFechamento: toCivilDateString(fechamento.dataFechamento),
      acaoFuncionouBem: fechamento.acaoFuncionouBem,
      oqueFazerDiferente: fechamento.oqueFazerDiferente,
      vitoriaReconhecer: fechamento.vitoriaReconhecer,
      fracassoAceitar: fechamento.fracassoAceitar,
      dadosConsolidados: fechamento.dadosConsolidados,
      createdAt: fechamento.createdAt,
      updatedAt: fechamento.updatedAt,
    };
  }
}
