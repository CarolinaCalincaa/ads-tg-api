import { Injectable } from '@nestjs/common';
import { IndicadorDependencia, StatusTarefa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CapacidadeDiaDto {
  horasSonoDiarias: number;
  minutosUteis: number;
  limiteFadigaMinutos: number;
  minutosTarefas: number;
  minutosHabitos: number;
  minutosComprometidos: number;
  percentualOcupacao: number;
  nivel: 'EQUILIBRADO' | 'ATENCAO' | 'RISCO_FADIGA';
  emAlertaFadiga: boolean;
  novosAgendamentosBloqueados: boolean;
}

export function calcularMetricasFadiga(
  horasSonoDiarias: number,
  minutosTarefas: number,
  minutosHabitos: number,
): CapacidadeDiaDto {
  const minutosUteis = (24 - horasSonoDiarias) * 60;
  const limiteFadigaMinutos = Math.floor(minutosUteis * 0.8);
  const minutosComprometidos = minutosTarefas + minutosHabitos;
  const razao = minutosUteis > 0 ? minutosComprometidos / minutosUteis : 1.0;
  const percentualOcupacao = Math.round(razao * 100);

  const emAlertaFadiga = minutosComprometidos > limiteFadigaMinutos;
  const novosAgendamentosBloqueados = emAlertaFadiga;

  let nivel: 'EQUILIBRADO' | 'ATENCAO' | 'RISCO_FADIGA' = 'EQUILIBRADO';
  if (emAlertaFadiga) {
    nivel = 'RISCO_FADIGA';
  } else if (minutosComprometidos > Math.floor(minutosUteis * 0.6)) {
    nivel = 'ATENCAO';
  }

  return {
    horasSonoDiarias,
    minutosUteis,
    limiteFadigaMinutos,
    minutosTarefas,
    minutosHabitos,
    minutosComprometidos,
    percentualOcupacao,
    nivel,
    emAlertaFadiga,
    novosAgendamentosBloqueados,
  };
}

@Injectable()
export class FadigaMentalService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularCapacidadeDia(
    idUsuario: string,
    dataStr: string,
  ): Promise<CapacidadeDiaDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
      select: { horasSonoDiarias: true },
    });

    const horasSonoDiarias = usuario?.horasSonoDiarias ?? 8;
    const dataObj = new Date(dataStr);

    // 1. Minutos de Tarefas (apenas MINHAS_ACOES, não canceladas e ativas)
    const tarefas = await this.prisma.tarefa.findMany({
      where: {
        idUsuario,
        dataAgendamento: dataObj,
        deletedAt: null,
        status: { not: StatusTarefa.CANCELADA },
        indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
      },
      select: { duracaoEstimadaMinutos: true },
    });
    const minutosTarefas = tarefas.reduce(
      (sum, t) => sum + t.duracaoEstimadaMinutos,
      0,
    );

    // 2. Minutos de Hábitos ativos aplicáveis ao dia da semana (1=Segunda .. 7=Domingo)
    const dayOfWeek = dataObj.getUTCDay();
    const weekday = dayOfWeek === 0 ? 7 : dayOfWeek;

    const habitos = await this.prisma.habito.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        statusAtivo: true,
      },
      select: { duracaoEstimadaMinutos: true, diasSemana: true },
    });
    const habitosDoDia = habitos.filter((h) => {
      if (Array.isArray(h.diasSemana)) {
        return (h.diasSemana as number[]).includes(weekday);
      }
      return true;
    });
    const minutosHabitos = habitosDoDia.reduce(
      (sum, h) => sum + h.duracaoEstimadaMinutos,
      0,
    );

    return calcularMetricasFadiga(
      horasSonoDiarias,
      minutosTarefas,
      minutosHabitos,
    );
  }
}
