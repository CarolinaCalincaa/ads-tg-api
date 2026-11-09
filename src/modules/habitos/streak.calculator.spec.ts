import { StreakCalculator } from './streak.calculator';

describe('StreakCalculator', () => {
  describe('calcularStreakHabito', () => {
    const todosOsDias = [1, 2, 3, 4, 5, 6, 7]; // Seg..Dom
    const segQuaSex = [1, 3, 5]; // Seg, Qua, Sex

    it('deve retornar 0 para lista de dias vazia ou sem execuções', () => {
      expect(StreakCalculator.calcularStreakHabito([], ['2026-10-15'])).toBe(0);
      expect(StreakCalculator.calcularStreakHabito(todosOsDias, [])).toBe(0);
    });

    it('deve calcular streak de hábito diário com conclusão no dia de hoje', () => {
      // 2026-10-15 é Quinta-feira (4)
      const dataRef = '2026-10-15';
      const execucoes = [
        '2026-10-11', // Dom
        '2026-10-12', // Seg
        '2026-10-13', // Ter
        '2026-10-14', // Qua
        '2026-10-15', // Qui (hoje)
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        todosOsDias,
        execucoes,
        dataRef,
      );

      expect(streak).toBe(5);
    });

    it('não deve zerar o streak durante o dia corrente se hoje ainda não foi concluído (regra do dia em aberto)', () => {
      // 2026-10-15 é Quinta-feira (hoje). O usuário concluiu até ontem (Quarta-feira).
      const dataRef = '2026-10-15';
      const execucoes = [
        '2026-10-12', // Seg
        '2026-10-13', // Ter
        '2026-10-14', // Qua
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        todosOsDias,
        execucoes,
        dataRef,
      );

      // Streak de 3 dias preservado!
      expect(streak).toBe(3);
    });

    it('deve zerar o streak se o último dia programado anterior a hoje foi perdido', () => {
      // 2026-10-15 (Qui). Executou Terça (13), mas não executou Quarta (14).
      const dataRef = '2026-10-15';
      const execucoes = [
        '2026-10-12', // Seg
        '2026-10-13', // Ter
        // Faltou 2026-10-14!
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        todosOsDias,
        execucoes,
        dataRef,
      );

      expect(streak).toBe(0);
    });

    it('deve respeitar os dias da semana programados (ex: Seg/Qua/Sex) sem penalizar dias intermediários', () => {
      // 2026-10-15 é Quinta-feira (não programada).
      // Dias programados: 1 (Seg), 3 (Qua), 5 (Sex).
      // Executou:
      // - Sex 09/10
      // - Seg 12/10
      // - Qua 14/10
      const dataRef = '2026-10-15'; // Quinta
      const execucoes = [
        '2026-10-09', // Sex
        '2026-10-12', // Seg
        '2026-10-14', // Qua
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        segQuaSex,
        execucoes,
        dataRef,
      );

      // 3 ciclos programados consecutivos sem penalizar Terça ou Quinta!
      expect(streak).toBe(3);
    });

    it('deve quebrar streak de dias intercalados se um dia exigido for esquecido', () => {
      // Dias programados: Seg (1), Qua (3), Sex (5).
      // Hoje: 2026-10-16 (Sexta).
      // Executou: Seg 12/10, mas perdeu Qua 14/10!
      const dataRef = '2026-10-16'; // Sexta
      const execucoes = [
        '2026-10-09', // Sex
        '2026-10-12', // Seg
        // Perdeu Qua 14/10!
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        segQuaSex,
        execucoes,
        dataRef,
      );

      expect(streak).toBe(0);
    });

    it('deve somar o dia de hoje assim que for concluído em dia intercalado', () => {
      // Hoje: 2026-10-16 (Sexta). Executou Seg 12, Qua 14 e Sex 16.
      const dataRef = '2026-10-16';
      const execucoes = [
        '2026-10-09', // Sex
        '2026-10-12', // Seg
        '2026-10-14', // Qua
        '2026-10-16', // Sex (hoje)
      ];

      const streak = StreakCalculator.calcularStreakHabito(
        segQuaSex,
        execucoes,
        dataRef,
      );

      expect(streak).toBe(4);
    });
  });

  describe('calcularStreakGlobal', () => {
    it('deve calcular streak global contando dias consecutivos ativos', () => {
      const dataRef = '2026-10-15';
      const datasComAtividade = [
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
      ];

      const streak = StreakCalculator.calcularStreakGlobal(
        datasComAtividade,
        dataRef,
      );

      expect(streak).toBe(5);
    });

    it('deve preservar streak conquistado até ontem se hoje ainda não tem atividades', () => {
      const dataRef = '2026-10-15';
      const datasComAtividade = [
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        // 2026-10-15 não concluído ainda
      ];

      const streak = StreakCalculator.calcularStreakGlobal(
        datasComAtividade,
        dataRef,
      );

      expect(streak).toBe(4);
    });

    it('deve retornar 0 se nem ontem nem hoje tiveram atividades', () => {
      const dataRef = '2026-10-15';
      const datasComAtividade = [
        '2026-10-11',
        '2026-10-12',
        // 2026-10-13 e 14 esquecidos
      ];

      const streak = StreakCalculator.calcularStreakGlobal(
        datasComAtividade,
        dataRef,
      );

      expect(streak).toBe(0);
    });
  });
});
