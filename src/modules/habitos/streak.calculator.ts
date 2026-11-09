/**
 * Utilitário de cálculo determinístico de Streaks (Sequências Consecutivas 🔥)
 * Especificado em Tech Doc 04 — Seção 3
 */

export function toCivilDateString(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getIsoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  return day === 0 ? 7 : day; // 1 = Segunda ... 7 = Domingo
}

export function subtractDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export class StreakCalculator {
  /**
   * Calcula o streak individual de um hábito.
   *
   * @param diasSemanaProgramados Array com os dias da semana exigidos (1=Seg..7=Dom). Ex: [1,3,5]
   * @param datasExecutadas Datas em que o hábito foi concluído (concluido: true)
   * @param dataReferencia Data base para a contagem (padrão: hoje)
   */
  static calcularStreakHabito(
    diasSemanaProgramados: number[],
    datasExecutadas: (Date | string)[],
    dataReferencia: Date | string = new Date(),
  ): number {
    if (!diasSemanaProgramados || diasSemanaProgramados.length === 0) {
      return 0;
    }

    const setExecucoes = new Set(datasExecutadas.map(toCivilDateString));
    const dataRefStr = toCivilDateString(dataReferencia);
    const setDiasSemana = new Set(diasSemanaProgramados);

    let streak = 0;
    let dataCursor = dataRefStr;
    const weekdayRef = getIsoWeekday(dataRefStr);

    // 1. Tratamento do dia de referência:
    // Se o dia de referência é um dia programado para o hábito:
    if (setDiasSemana.has(weekdayRef)) {
      if (setExecucoes.has(dataRefStr)) {
        // Concluído hoje -> soma 1
        streak++;
        dataCursor = subtractDays(dataCursor, 1);
      } else {
        // Não concluído hoje: o dia de hoje está em aberto (não zera a sequência conquistada até ontem)
        // Não soma para hoje, mas recua para verificar o dia programado anterior
        dataCursor = subtractDays(dataCursor, 1);
      }
    } else {
      // Dia de referência NÃO é um dia programado para este hábito (ex: sábado para hábito Seg-Sex)
      // Recua para verificar o último dia programado
      dataCursor = subtractDays(dataCursor, 1);
    }

    // 2. Loop retroativo por até 365 dias para verificar ciclos programados consecutivos
    for (let i = 0; i < 365; i++) {
      const weekday = getIsoWeekday(dataCursor);

      if (setDiasSemana.has(weekday)) {
        if (setExecucoes.has(dataCursor)) {
          streak++;
        } else {
          // Falha em um dia programado: sequência quebrou!
          break;
        }
      }
      // Se não era dia programado, apenas pula sem penalizar (ex: terça-feira para Seg/Qua/Sex)
      dataCursor = subtractDays(dataCursor, 1);
    }

    return streak;
  }

  /**
   * Calcula o streak global de dias ativos do usuário (Card "5 dias 🔥 Sequência atual").
   * Conta dias civis consecutivos em que o usuário concluiu ao menos 1 hábito.
   *
   * @param datasComAoMenosUmHabitoConcluido Conjunto de datas em que houve atividade
   * @param dataReferencia Data base (padrão: hoje)
   */
  static calcularStreakGlobal(
    datasComAoMenosUmHabitoConcluido: (Date | string)[],
    dataReferencia: Date | string = new Date(),
  ): number {
    const setAtivos = new Set(
      datasComAoMenosUmHabitoConcluido.map(toCivilDateString),
    );
    const dataRefStr = toCivilDateString(dataReferencia);

    let streak = 0;
    let cursor = dataRefStr;

    // Se hoje tem atividade:
    if (setAtivos.has(dataRefStr)) {
      streak++;
      cursor = subtractDays(cursor, 1);
    } else {
      // Hoje ainda não tem atividade, mas o dia está em aberto:
      // Verifica se ontem teve atividade para preservar o streak
      const ontemStr = subtractDays(dataRefStr, 1);
      if (setAtivos.has(ontemStr)) {
        cursor = ontemStr;
      } else {
        // Nem hoje nem ontem: sequência quebrada
        return 0;
      }
    }

    // Loop retroativo
    for (let i = 0; i < 365; i++) {
      if (setAtivos.has(cursor)) {
        streak++;
        cursor = subtractDays(cursor, 1);
      } else {
        break;
      }
    }

    return streak;
  }
}
