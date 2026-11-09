import { Test, TestingModule } from '@nestjs/testing';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { HabitosService } from './habitos.service';

describe('HabitosService', () => {
  let service: HabitosService;
  let prisma: {
    habito: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    pilarVida: {
      findUnique: jest.Mock;
    };
    registroExecucaoHabito: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  const idUsuario = 'user-uuid-123';
  const idHabito = 'habito-uuid-abc';
  const dataHoje = '2026-10-15';

  const mockPilar = {
    id: 1,
    codigo: 'CORPO',
    nome: 'Corpo & Saúde',
    corHex: '#10B981',
    corFundoHex: '#ECFDF5',
    icone: 'heart',
  };

  const mockHabito = {
    id: idHabito,
    idUsuario,
    idPilar: 1,
    nome: 'Beber 2L de água',
    descricao: 'Distribuir ao longo do dia',
    duracaoEstimadaMinutos: 15,
    frequenciaSemanal: 7,
    diasSemana: [1, 2, 3, 4, 5, 6, 7],
    horarioPadrao: '08:00',
    statusAtivo: true,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    deletedAt: null,
    pilar: mockPilar,
    execucoes: [],
    checklists: [],
  };

  beforeEach(async () => {
    prisma = {
      habito: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      pilarVida: {
        findUnique: jest.fn(),
      },
      registroExecucaoHabito: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HabitosService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<HabitosService>(HabitosService);
  });

  describe('create', () => {
    it('deve criar um hábito vinculado a um pilar com sucesso (RF06)', async () => {
      prisma.pilarVida.findUnique.mockResolvedValue(mockPilar);
      prisma.habito.create.mockResolvedValue(mockHabito);

      const resultado = await service.create(idUsuario, {
        nome: 'Beber 2L de água',
        idPilar: 1,
        duracaoEstimadaMinutos: 15,
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
      });

      expect(resultado.id).toBe(idHabito);
      expect(resultado.nome).toBe('Beber 2L de água');
      expect(prisma.habito.create).toHaveBeenCalled();
    });

    it('deve lançar 404 se o pilar informado não existir', async () => {
      prisma.pilarVida.findUnique.mockResolvedValue(null);

      await expect(
        service.create(idUsuario, {
          nome: 'Inválido',
          idPilar: 99,
          duracaoEstimadaMinutos: 30,
          diasSemana: [1],
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('findAll', () => {
    it('deve listar hábitos do usuário calculando o streakAtual de cada um', async () => {
      const habitoComExecucoes = {
        ...mockHabito,
        execucoes: [
          { dataExecucao: new Date('2026-10-13') },
          { dataExecucao: new Date('2026-10-14') },
        ],
      };
      prisma.habito.findMany.mockResolvedValue([habitoComExecucoes]);

      const resultado = await service.findAll(idUsuario);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe(idHabito);
      expect(typeof resultado[0].streakAtual).toBe('number');
    });
  });

  describe('findOne', () => {
    it('deve buscar hábito por ID e retornar com streak', async () => {
      prisma.habito.findFirst.mockResolvedValue(mockHabito);

      const resultado = await service.findOne(idUsuario, idHabito);

      expect(resultado.id).toBe(idHabito);
      expect(resultado.nome).toBe(mockHabito.nome);
    });

    it('deve lançar 404 se o hábito não existir', async () => {
      prisma.habito.findFirst.mockResolvedValue(null);

      await expect(service.findOne(idUsuario, 'uuid-inexistente')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar campos do hábito com sucesso', async () => {
      prisma.habito.findFirst.mockResolvedValue(mockHabito);
      prisma.habito.update.mockResolvedValue({
        ...mockHabito,
        nome: 'Beber 3L de água',
        execucoes: [],
      });

      const resultado = await service.update(idUsuario, idHabito, {
        nome: 'Beber 3L de água',
      });

      expect(resultado.nome).toBe('Beber 3L de água');
      expect(prisma.habito.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve realizar exclusão lógica (soft delete) do hábito', async () => {
      prisma.habito.findFirst.mockResolvedValue(mockHabito);
      prisma.habito.update.mockResolvedValue({});

      const resultado = await service.remove(idUsuario, idHabito);

      expect(resultado.message).toContain('removido com sucesso');
      expect(prisma.habito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('toggleExecucao (RF15)', () => {
    it('deve criar registro de execução se não existir e retornar streak recalculado', async () => {
      prisma.habito.findFirst.mockResolvedValue(mockHabito);
      prisma.registroExecucaoHabito.findUnique.mockResolvedValue(null);
      prisma.registroExecucaoHabito.create.mockResolvedValue({
        id: 'reg-1',
        concluido: true,
        dataRegistro: new Date(),
      });
      prisma.registroExecucaoHabito.findMany
        .mockResolvedValueOnce([
          // Todas execuções do hábito
          { dataExecucao: new Date('2026-10-15') },
        ])
        .mockResolvedValueOnce([
          // Todas execuções do usuário para streak global
          { dataExecucao: new Date('2026-10-15') },
        ]);

      const resultado = await service.toggleExecucao(
        idUsuario,
        idHabito,
        dataHoje,
      );

      expect(resultado.concluido).toBe(true);
      expect(resultado.streakAtual).toBeGreaterThanOrEqual(1);
      expect(resultado.streakGlobalDiasAtivos).toBeGreaterThanOrEqual(1);
    });

    it('deve alternar registro existente de true para false', async () => {
      prisma.habito.findFirst.mockResolvedValue(mockHabito);
      prisma.registroExecucaoHabito.findUnique.mockResolvedValue({
        id: 'reg-1',
        concluido: true,
      });
      prisma.registroExecucaoHabito.update.mockResolvedValue({
        id: 'reg-1',
        concluido: false,
        dataRegistro: new Date(),
      });
      prisma.registroExecucaoHabito.findMany.mockResolvedValue([]);

      const resultado = await service.toggleExecucao(
        idUsuario,
        idHabito,
        dataHoje,
      );

      expect(resultado.concluido).toBe(false);
      expect(prisma.registroExecucaoHabito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ concluido: false }),
        }),
      );
    });

    it('deve lançar 404 se o hábito for inexistente', async () => {
      prisma.habito.findFirst.mockResolvedValue(null);

      await expect(
        service.toggleExecucao(idUsuario, 'uuid-fantasma', dataHoje),
      ).rejects.toThrow(DomainException);
    });
  });
});
