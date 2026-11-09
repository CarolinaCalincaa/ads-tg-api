import { Test, TestingModule } from '@nestjs/testing';
import { TipoCicloFechamento } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { FechamentosService } from './fechamentos.service';

describe('FechamentosService', () => {
  let service: FechamentosService;
  let prisma: {
    habito: { findMany: jest.Mock };
    tarefa: { findMany: jest.Mock };
    registroExecucaoHabito: { findMany: jest.Mock };
    fechamentoReflexao: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const idUsuario = 'user-uuid-123';

  beforeEach(async () => {
    prisma = {
      habito: { findMany: jest.fn() },
      tarefa: { findMany: jest.fn() },
      registroExecucaoHabito: { findMany: jest.fn() },
      fechamentoReflexao: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FechamentosService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FechamentosService>(FechamentosService);
  });

  describe('calcularPeriodoCiclo', () => {
    it('deve calcular corretamente a semana ISO (Segunda a Domingo)', () => {
      // 2026-10-15 é uma quinta-feira (isoWeekday = 4)
      // Segunda-feira = 2026-10-12, Domingo = 2026-10-18
      const periodo = service.calcularPeriodoCiclo(
        TipoCicloFechamento.SEMANAL,
        '2026-10-15',
      );

      expect(periodo.dataInicio).toBe('2026-10-12');
      expect(periodo.dataFim).toBe('2026-10-18');
      expect(periodo.totalDiasCiclo).toBe(7);
    });

    it('deve calcular corretamente se a data de referência for domingo', () => {
      // 2026-10-18 é domingo (isoWeekday = 7)
      const periodo = service.calcularPeriodoCiclo(
        TipoCicloFechamento.SEMANAL,
        '2026-10-18',
      );

      expect(periodo.dataInicio).toBe('2026-10-12');
      expect(periodo.dataFim).toBe('2026-10-18');
      expect(periodo.totalDiasCiclo).toBe(7);
    });

    it('deve calcular corretamente o mês civil completo (primeiro ao último dia)', () => {
      // Outubro possui 31 dias
      const periodo = service.calcularPeriodoCiclo(
        TipoCicloFechamento.MENSAL,
        '2026-10-15',
      );

      expect(periodo.dataInicio).toBe('2026-10-01');
      expect(periodo.dataFim).toBe('2026-10-31');
      expect(periodo.totalDiasCiclo).toBe(31);
    });

    it('deve calcular corretamente mês bissexto (Fevereiro 2028 = 29 dias)', () => {
      const periodo = service.calcularPeriodoCiclo(
        TipoCicloFechamento.MENSAL,
        '2028-02-10',
      );

      expect(periodo.dataInicio).toBe('2028-02-01');
      expect(periodo.dataFim).toBe('2028-02-29');
      expect(periodo.totalDiasCiclo).toBe(29);
    });
  });

  describe('obterPrevia', () => {
    it('deve calcular métricas exatas do ciclo: consistencia 75% (18/24), 6/7 dias ativos e streak global', async () => {
      // Semana: 2026-10-12 (Segunda) até 2026-10-18 (Domingo)
      // Simulando hábitos:
      // Habito 1: criado em 2026-10-01, todos os 7 dias da semana (7 esperados), concluído em 6 dias
      // Habito 2: criado em 2026-10-01, seg a sex (5 dias esperados), concluído em 4 dias
      // Habito 3: criado em 2026-10-01, todos os 7 dias da semana (7 esperados), concluído em 5 dias
      // Habito 4: criado em 2026-10-01, seg a sex (5 dias esperados), concluído em 3 dias
      // Total esperados: 7 + 5 + 7 + 5 = 24
      // Total concluidos: 6 + 4 + 5 + 3 = 18 => 18/24 = 75%

      const habito1 = {
        id: 'h1',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
        execucoes: [
          { dataExecucao: new Date('2026-10-12T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-13T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-14T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-15T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-16T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-17T00:00:00.000Z'), concluido: true },
        ],
      };

      const habito2 = {
        id: 'h2',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        diasSemana: [1, 2, 3, 4, 5],
        execucoes: [
          { dataExecucao: new Date('2026-10-12T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-13T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-14T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-15T00:00:00.000Z'), concluido: true },
        ],
      };

      const habito3 = {
        id: 'h3',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
        execucoes: [
          { dataExecucao: new Date('2026-10-12T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-13T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-14T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-15T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-16T00:00:00.000Z'), concluido: true },
        ],
      };

      const habito4 = {
        id: 'h4',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        diasSemana: [1, 2, 3, 4, 5],
        execucoes: [
          { dataExecucao: new Date('2026-10-12T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-13T00:00:00.000Z'), concluido: true },
          { dataExecucao: new Date('2026-10-14T00:00:00.000Z'), concluido: true },
        ],
      };

      prisma.habito.findMany.mockResolvedValue([
        habito1,
        habito2,
        habito3,
        habito4,
      ]);

      // Tarefas concluídas: nenhuma adicional no domingo (dia 18)
      prisma.tarefa.findMany.mockResolvedValue([
        { dataAgendamento: new Date('2026-10-13T00:00:00.000Z') },
        { dataAgendamento: new Date('2026-10-14T00:00:00.000Z') },
      ]);

      // Atividades globais para streak global (5 dias consecutivos até 16/10)
      prisma.registroExecucaoHabito.findMany.mockResolvedValue([
        { dataExecucao: new Date('2026-10-12T00:00:00.000Z') },
        { dataExecucao: new Date('2026-10-13T00:00:00.000Z') },
        { dataExecucao: new Date('2026-10-14T00:00:00.000Z') },
        { dataExecucao: new Date('2026-10-15T00:00:00.000Z') },
        { dataExecucao: new Date('2026-10-16T00:00:00.000Z') },
      ]);

      prisma.fechamentoReflexao.findUnique.mockResolvedValue(null);

      const previa = await service.obterPrevia(idUsuario, {
        tipoCiclo: TipoCicloFechamento.SEMANAL,
        dataRef: '2026-10-16',
      });

      expect(previa.dataInicioCiclo).toBe('2026-10-12');
      expect(previa.dataFimCiclo).toBe('2026-10-18');
      expect(previa.totalDiasCiclo).toBe(7);
      expect(previa.habitosEsperados).toBe(24);
      expect(previa.habitosConcluidos).toBe(18);
      expect(previa.consistenciaPercentual).toBe(75);
      // Dias ativos: 12, 13, 14, 15, 16, 17 (6 dias)
      expect(previa.diasAtivos).toBe(6);
      expect(previa.sequenciaAtualDias).toBe(5);
      expect(previa.fechamentoSalvo).toBeNull();
    });

    it('deve retornar fechamentoSalvo preenchido caso já exista registro para o ciclo', async () => {
      prisma.habito.findMany.mockResolvedValue([]);
      prisma.tarefa.findMany.mockResolvedValue([]);
      prisma.registroExecucaoHabito.findMany.mockResolvedValue([]);

      prisma.fechamentoReflexao.findUnique.mockResolvedValue({
        id: 'fechamento-1',
        tipoCiclo: TipoCicloFechamento.SEMANAL,
        dataInicioCiclo: new Date('2026-10-12T00:00:00.000Z'),
        dataFechamento: new Date('2026-10-18T00:00:00.000Z'),
        acaoFuncionouBem: 'Acordar cedo',
        oqueFazerDiferente: 'Menos reuniões',
        vitoriaReconhecer: 'Concluí o MVP',
        fracassoAceitar: 'Dormi tarde na sexta',
        createdAt: new Date('2026-10-18T10:00:00.000Z'),
        updatedAt: new Date('2026-10-18T10:00:00.000Z'),
      });

      const previa = await service.obterPrevia(idUsuario, {
        tipoCiclo: TipoCicloFechamento.SEMANAL,
        dataRef: '2026-10-18',
      });

      expect(previa.fechamentoSalvo).not.toBeNull();
      expect(previa.fechamentoSalvo?.id).toBe('fechamento-1');
      expect(previa.fechamentoSalvo?.acaoFuncionouBem).toBe('Acordar cedo');
    });
  });

  describe('upsert', () => {
    it('deve persistir reflexões e congelar dadosConsolidados no banco', async () => {
      const mockSaved = {
        id: 'fechamento-id-123',
        idUsuario,
        tipoCiclo: TipoCicloFechamento.SEMANAL,
        dataInicioCiclo: new Date('2026-10-12T00:00:00.000Z'),
        dataFechamento: new Date('2026-10-18T00:00:00.000Z'),
        acaoFuncionouBem: 'Ritual matinal sem telas',
        oqueFazerDiferente: 'Não checar e-mail à noite',
        vitoriaReconhecer: 'Artigo aceito',
        fracassoAceitar: 'Perdi um dia de academia',
        dadosConsolidados: {
          consistenciaPercentual: 80,
          habitosConcluidos: 16,
          habitosEsperados: 20,
          diasAtivos: 6,
          totalDiasCiclo: 7,
          sequenciaAtualDias: 4,
        },
        createdAt: new Date('2026-10-18T20:00:00.000Z'),
        updatedAt: new Date('2026-10-18T20:00:00.000Z'),
      };

      prisma.fechamentoReflexao.upsert.mockResolvedValue(mockSaved);

      const dto = {
        tipoCiclo: TipoCicloFechamento.SEMANAL,
        dataInicioCiclo: '2026-10-12',
        dataFechamento: '2026-10-18',
        acaoFuncionouBem: 'Ritual matinal sem telas',
        oqueFazerDiferente: 'Não checar e-mail à noite',
        vitoriaReconhecer: 'Artigo aceito',
        fracassoAceitar: 'Perdi um dia de academia',
        dadosConsolidados: {
          consistenciaPercentual: 80,
          habitosConcluidos: 16,
          habitosEsperados: 20,
          diasAtivos: 6,
          totalDiasCiclo: 7,
          sequenciaAtualDias: 4,
        },
      };

      const result = await service.upsert(idUsuario, dto);

      expect(prisma.fechamentoReflexao.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idUsuario_tipoCiclo_dataInicioCiclo: {
              idUsuario,
              tipoCiclo: TipoCicloFechamento.SEMANAL,
              dataInicioCiclo: new Date('2026-10-12T00:00:00.000Z'),
            },
          },
        }),
      );

      expect(result.id).toBe('fechamento-id-123');
      expect(result.dataInicioCiclo).toBe('2026-10-12');
      expect(result.dataFechamento).toBe('2026-10-18');
      expect(result.acaoFuncionouBem).toBe('Ritual matinal sem telas');
      expect(result.dadosConsolidados).toEqual(dto.dadosConsolidados);
    });
  });

  describe('findAll e findOne', () => {
    it('deve listar fechamentos filtrados por tipoCiclo em ordem decrescente', async () => {
      prisma.fechamentoReflexao.findMany.mockResolvedValue([
        {
          id: 'f2',
          idUsuario,
          tipoCiclo: TipoCicloFechamento.SEMANAL,
          dataInicioCiclo: new Date('2026-10-12T00:00:00.000Z'),
          dataFechamento: new Date('2026-10-18T00:00:00.000Z'),
          acaoFuncionouBem: 'Ação 2',
          oqueFazerDiferente: null,
          vitoriaReconhecer: null,
          fracassoAceitar: null,
          dadosConsolidados: { consistenciaPercentual: 90 },
          createdAt: new Date('2026-10-18T20:00:00.000Z'),
          updatedAt: new Date('2026-10-18T20:00:00.000Z'),
        },
      ]);

      const lista = await service.findAll(idUsuario, {
        tipoCiclo: TipoCicloFechamento.SEMANAL,
      });

      expect(prisma.fechamentoReflexao.findMany).toHaveBeenCalledWith({
        where: {
          idUsuario,
          deletedAt: null,
          tipoCiclo: TipoCicloFechamento.SEMANAL,
        },
        orderBy: [{ dataFechamento: 'desc' }, { createdAt: 'desc' }],
      });

      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe('f2');
    });

    it('findOne deve lançar RESOURCE_NOT_FOUND se o fechamento não existir', async () => {
      prisma.fechamentoReflexao.findFirst.mockResolvedValue(null);

      await expect(service.findOne(idUsuario, 'inexistente')).rejects.toThrow(
        DomainException,
      );
    });
  });
});
