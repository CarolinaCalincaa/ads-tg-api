import { Injectable } from '@nestjs/common';
import { IndicadorDependencia, StatusTarefa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacidadeService } from '../tarefas/capacidade.service';
import { TarefasService } from '../tarefas/tarefas.service';

@Injectable()
export class PainelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacidadeService: CapacidadeService,
    private readonly tarefasService: TarefasService,
  ) {}

  async getPainelDia(idUsuario: string, dataStr?: string) {
    const data = dataStr ?? new Date().toISOString().slice(0, 10);
    const dataObj = new Date(data);

    // 1. Pilares Ativos do Mês (RN01 - Chave YYYY-MM-01)
    const mesAnoStr = `${data.slice(0, 7)}-01`;
    const pilaresAtivos = await this.prisma.pilarAtivoMes.findMany({
      where: {
        idUsuario,
        mesAno: new Date(mesAnoStr),
        deletedAt: null,
      },
      include: { pilar: true },
      orderBy: { idPilar: 'asc' },
    });

    const pilaresAtivosMes = pilaresAtivos.map((pa) => ({
      idPilar: pa.pilar.id,
      codigo: pa.pilar.codigo,
      nome: pa.pilar.nome,
      corHex: pa.pilar.corHex,
      corFundoHex: pa.pilar.corFundoHex,
      icone: pa.pilar.icone,
    }));

    // 2. Capacidade e Fadiga Mental do Dia (RN02)
    const capacidadeDia = await this.capacidadeService.calcularCapacidadeDia(
      idUsuario,
      data,
    );

    // 3. Tarefas do Dia (com distinção de MINHAS_ACOES vs EM_ESPERA)
    const tarefas = await this.prisma.tarefa.findMany({
      where: {
        idUsuario,
        dataAgendamento: dataObj,
        deletedAt: null,
      },
      include: {
        pilar: true,
        projeto: true,
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
        sessoesPomodoro: {
          where: { concluido: true, deletedAt: null },
        },
      },
      orderBy: [{ horarioInicio: 'asc' }, { createdAt: 'desc' }],
    });

    const itensLinhaTempoTarefas = tarefas
      .filter((t) => t.indicadorDependencia === IndicadorDependencia.MINHAS_ACOES)
      .map((t) => ({
        id: t.id,
        natureza: 'TAREFA' as const,
        tipoItem: t.tipoItem,
        horario: t.horarioInicio,
        nome: t.nome,
        descricao: t.descricao,
        duracaoEstimadaMinutos: t.duracaoEstimadaMinutos,
        prioridade: t.prioridade,
        indicadorDependencia: t.indicadorDependencia,
        status: t.status,
        concluido: t.status === StatusTarefa.CONCLUIDA,
        concluidaEm: t.concluidaEm,
        pomodorosConcluidos: t.sessoesPomodoro?.length ?? 0,
        pilar: {
          idPilar: t.pilar.id,
          codigo: t.pilar.codigo,
          nome: t.pilar.nome,
          corHex: t.pilar.corHex,
          corFundoHex: t.pilar.corFundoHex,
          icone: t.pilar.icone,
        },
        projeto: t.projeto
          ? { id: t.projeto.id, nome: t.projeto.nome, status: t.projeto.status }
          : null,
        checklists:
          t.checklists?.map((c) => ({
            id: c.id,
            titulo: c.titulo,
            ehModelo: c.ehModelo,
            totalItens: c.itens?.length ?? 0,
            itensConcluidos: c.itens?.filter((i) => i.concluido).length ?? 0,
            itens: c.itens?.map((i) => ({
              id: i.id,
              idChecklist: i.idChecklist,
              descricao: i.descricao,
              concluido: i.concluido,
              ordem: i.ordem,
            })),
          })) ?? [],
      }));

    const itensEmEspera = tarefas
      .filter((t) => t.indicadorDependencia === IndicadorDependencia.EM_ESPERA)
      .map((t) => this.tarefasService.formatTarefaResponse(t));

    // 4. Hábitos Ativos do Dia da Semana
    const dayOfWeek = dataObj.getUTCDay();
    const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;

    const habitos = await this.prisma.habito.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        statusAtivo: true,
        
        createdAt: { lte: new Date(`${data}T23:59:59.999Z`) },
      },
      include: {
        pilar: true,
        execucoes: {
          where: { dataExecucao: dataObj, deletedAt: null },
        },
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    const habitosDoDia = habitos.filter((h) => {
      if (Array.isArray(h.diasSemana)) {
        return (h.diasSemana as number[]).includes(weekday);
      }
      return true;
    });

    const itensLinhaTempoHabitos = habitosDoDia.map((h) => {
      const reg = h.execucoes[0];
      const concluido = reg ? reg.concluido : false;

      return {
        id: h.id,
        natureza: 'HABITO' as const,
        tipoItem: 'HABITO' as const,
        horario: h.horarioPadrao,
        nome: h.nome,
        descricao: h.descricao,
        duracaoEstimadaMinutos: h.duracaoEstimadaMinutos,
        prioridade: 'RAPIDO' as const,
        indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
        status: concluido ? StatusTarefa.CONCLUIDA : StatusTarefa.PENDENTE,
        concluido,
        concluidaEm: reg?.dataRegistro ?? null,
        streakAtual: 0,
        pomodorosConcluidos: 0,
        pilar: {
          idPilar: h.pilar.id,
          codigo: h.pilar.codigo,
          nome: h.pilar.nome,
          corHex: h.pilar.corHex,
          corFundoHex: h.pilar.corFundoHex,
          icone: h.pilar.icone,
        },
        projeto: null,
        checklists:
          h.checklists?.map((c) => ({
            id: c.id,
            titulo: c.titulo,
            ehModelo: c.ehModelo,
            totalItens: c.itens?.length ?? 0,
            itensConcluidos: c.itens?.filter((i) => i.concluido).length ?? 0,
            itens: c.itens?.map((i) => ({
              id: i.id,
              idChecklist: i.idChecklist,
              descricao: i.descricao,
              concluido: i.concluido,
              ordem: i.ordem,
            })),
          })) ?? [],
      };
    });

    // Mescla tarefas de Minhas Ações com Hábitos e ordena por horário
    const itensLinhaTempo = [
      ...itensLinhaTempoTarefas,
      ...itensLinhaTempoHabitos,
    ].sort((a, b) => {
      if (a.horario && b.horario) {
        return a.horario.localeCompare(b.horario);
      }
      if (a.horario && !b.horario) return -1;
      if (!a.horario && b.horario) return 1;
      return 0;
    });

    return {
      data,
      pilaresAtivosMes,
      capacidadeDia,
      itensLinhaTempo,
      itensEmEspera,
    };
  }

  async getPainelSemana(idUsuario: string, dataReferenciaStr?: string) {
    const dataRef = dataReferenciaStr ?? new Date().toISOString().slice(0, 10);
    const dateObj = new Date(dataRef);

    // Calcula a segunda-feira da semana (ISO-8601: 1=Segunda .. 7=Domingo)
    const dayOfWeek = dateObj.getUTCDay();
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const diffToMonday = isoDay - 1;

    const monday = new Date(dateObj);
    monday.setUTCDate(dateObj.getUTCDate() - diffToMonday);

    const nomesDias = [
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
      'Domingo',
    ];

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(monday);
      currentDay.setUTCDate(monday.getUTCDate() + i);
      const dayStr = currentDay.toISOString().slice(0, 10);

      const capacidade = await this.capacidadeService.calcularCapacidadeDia(
        idUsuario,
        dayStr,
      );

      const totalTarefas = await this.prisma.tarefa.count({
        where: {
          idUsuario,
          dataAgendamento: currentDay,
          deletedAt: null,
          indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
        },
      });

      const tarefasConcluidas = await this.prisma.tarefa.count({
        where: {
          idUsuario,
          dataAgendamento: currentDay,
          deletedAt: null,
          indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
          status: StatusTarefa.CONCLUIDA,
        },
      });

      const weekdayNumber = i + 1;
      const habitosSemana = await this.prisma.habito.findMany({
        where: {
          idUsuario,
          deletedAt: null,
          statusAtivo: true,
          createdAt: { lte: new Date(`${dayStr}T23:59:59.999Z`) },
        },
        select: { diasSemana: true },
      });
      const totalHabitos = habitosSemana.filter((h) => {
        if (Array.isArray(h.diasSemana)) {
          return (h.diasSemana as number[]).includes(weekdayNumber);
        }
        return true;
      }).length;

      const habitosConcluidos = await this.prisma.registroExecucaoHabito.count({
        where: {
          idUsuario,
          dataExecucao: currentDay,
          concluido: true,
          deletedAt: null,
        },
      });

      dias.push({
        data: dayStr,
        diaSemanaNome: nomesDias[i],
        diaSemanaNumero: weekdayNumber,
        capacidadeDia: capacidade,
        totalTarefas,
        tarefasConcluidas,
        totalHabitos,
        habitosConcluidos,
      });
    }

    return {
      dataReferencia: dataRef,
      inicioSemana: dias[0].data,
      fimSemana: dias[6].data,
      dias,
    };
  }

  async getDiasLivres(
    idUsuario: string,
    dataOrigemStr: string,
    duracaoMinutos: number = 60,
  ) {
    const dataOrigem = new Date(dataOrigemStr);
    const candidatos = [];

    for (let offset = 1; offset <= 7; offset++) {
      const proximoDia = new Date(dataOrigem);
      proximoDia.setUTCDate(dataOrigem.getUTCDate() + offset);
      const dayStr = proximoDia.toISOString().slice(0, 10);

      const capacidade = await this.capacidadeService.calcularCapacidadeDia(
        idUsuario,
        dayStr,
      );

      const novoComprometido = capacidade.minutosComprometidos + duracaoMinutos;
      const cabeSemUltrapassar =
        novoComprometido <= capacidade.limiteFadigaMinutos;

      candidatos.push({
        data: dayStr,
        distanciaDias: offset,
        minutosComprometidos: capacidade.minutosComprometidos,
        limiteFadigaMinutos: capacidade.limiteFadigaMinutos,
        percentualAtual: capacidade.percentualOcupacao,
        novoPercentualEstimado: Math.round(
          (novoComprometido / (capacidade.minutosUteis || 960)) * 100,
        ),
        cabeSemFadiga: cabeSemUltrapassar,
      });
    }

    // Ordena priorizando quem cabe sem fadiga, menor minutos comprometidos e menor distância
    const sugeridos = candidatos
      .filter((c) => c.cabeSemFadiga)
      .sort((a, b) => {
        if (a.minutosComprometidos !== b.minutosComprometidos) {
          return a.minutosComprometidos - b.minutosComprometidos;
        }
        return a.distanciaDias - b.distanciaDias;
      })
      .slice(0, 3);

    return {
      dataOrigem: dataOrigemStr,
      duracaoMinutos,
      sugeridos: sugeridos.length > 0 ? sugeridos : candidatos.slice(0, 3),
    };
  }
}
