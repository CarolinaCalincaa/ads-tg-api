import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PomodoroService } from './pomodoro.service';

describe('PomodoroService', () => {
  let service: PomodoroService;
  let prisma: {
    tarefa: { findFirst: jest.Mock };
    sessaoPomodoro: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tarefa: { findFirst: jest.fn() },
      sessaoPomodoro: { create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PomodoroService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PomodoroService>(PomodoroService);
  });

  describe('registrarSessao', () => {
    it('deve registrar com sucesso uma sessão Pomodoro de 25 minutos vinculada à tarefa', async () => {
      prisma.tarefa.findFirst.mockResolvedValue({
        id: 'tarefa-uuid-1',
        idUsuario: 'user-1',
        nome: 'Implementar RN02',
        idPilar: 5,
      });

      const mockSessao = {
        id: 'sessao-uuid-1',
        idUsuario: 'user-1',
        idTarefa: 'tarefa-uuid-1',
        duracaoMinutos: 25,
        dataInicio: new Date('2026-10-15T14:00:00.000Z'),
        dataFim: new Date('2026-10-15T14:25:00.000Z'),
        concluido: true,
        createdAt: new Date(),
        tarefa: {
          id: 'tarefa-uuid-1',
          nome: 'Implementar RN02',
          idPilar: 5,
        },
      };

      prisma.sessaoPomodoro.create.mockResolvedValue(mockSessao);

      const result = await service.registrarSessao('user-1', {
        idTarefa: 'tarefa-uuid-1',
        dataInicio: '2026-10-15T14:00:00.000Z',
        dataFim: '2026-10-15T14:25:00.000Z',
        duracaoMinutos: 25,
        concluido: true,
      });

      expect(prisma.tarefa.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'tarefa-uuid-1',
          idUsuario: 'user-1',
          deletedAt: null,
        },
      });

      expect(prisma.sessaoPomodoro.create).toHaveBeenCalledWith({
        data: {
          idUsuario: 'user-1',
          idTarefa: 'tarefa-uuid-1',
          duracaoMinutos: 25,
          dataInicio: new Date('2026-10-15T14:00:00.000Z'),
          dataFim: new Date('2026-10-15T14:25:00.000Z'),
          concluido: true,
        },
        include: {
          tarefa: {
            select: {
              id: true,
              nome: true,
              idPilar: true,
            },
          },
        },
      });

      expect(result).toEqual(mockSessao);
    });

    it('deve usar 25 minutos como duração padrão se omitido', async () => {
      prisma.tarefa.findFirst.mockResolvedValue({
        id: 'tarefa-uuid-1',
        idUsuario: 'user-1',
      });
      prisma.sessaoPomodoro.create.mockResolvedValue({ id: 'sessao-1' });

      await service.registrarSessao('user-1', {
        idTarefa: 'tarefa-uuid-1',
        dataInicio: '2026-10-15T14:00:00.000Z',
      });

      expect(prisma.sessaoPomodoro.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            duracaoMinutos: 25,
            concluido: true,
          }),
        }),
      );
    });

    it('deve lançar DomainException 404 se a tarefa não for encontrada ou pertencer a outro usuário', async () => {
      prisma.tarefa.findFirst.mockResolvedValue(null);

      await expect(
        service.registrarSessao('user-1', {
          idTarefa: 'tarefa-inexistente',
          dataInicio: '2026-10-15T14:00:00.000Z',
        }),
      ).rejects.toThrow(DomainException);

      await expect(
        service.registrarSessao('user-1', {
          idTarefa: 'tarefa-inexistente',
          dataInicio: '2026-10-15T14:00:00.000Z',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: expect.objectContaining({
          errorCode: 'RESOURCE_NOT_FOUND',
        }),
      });
    });
  });

  describe('listarSessoesTarefa', () => {
    it('deve listar as sessões de uma tarefa com sucesso', async () => {
      prisma.tarefa.findFirst.mockResolvedValue({
        id: 'tarefa-uuid-1',
        idUsuario: 'user-1',
      });

      const sessoesMock = [
        {
          id: 'sessao-2',
          idTarefa: 'tarefa-uuid-1',
          duracaoMinutos: 25,
          dataInicio: new Date('2026-10-15T15:00:00.000Z'),
        },
        {
          id: 'sessao-1',
          idTarefa: 'tarefa-uuid-1',
          duracaoMinutos: 25,
          dataInicio: new Date('2026-10-15T14:00:00.000Z'),
        },
      ];

      prisma.sessaoPomodoro.findMany.mockResolvedValue(sessoesMock);

      const result = await service.listarSessoesTarefa('user-1', 'tarefa-uuid-1');

      expect(prisma.sessaoPomodoro.findMany).toHaveBeenCalledWith({
        where: {
          idTarefa: 'tarefa-uuid-1',
          idUsuario: 'user-1',
          deletedAt: null,
        },
        orderBy: { dataInicio: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('deve lançar 404 se a tarefa não for encontrada', async () => {
      prisma.tarefa.findFirst.mockResolvedValue(null);

      await expect(
        service.listarSessoesTarefa('user-1', 'tarefa-alheia'),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('obterTotalMinutosFoco', () => {
    it('deve somar minutos de foco de sessões concluídas no dia', async () => {
      prisma.sessaoPomodoro.findMany.mockResolvedValue([
        { id: 's1', duracaoMinutos: 25 },
        { id: 's2', duracaoMinutos: 25 },
        { id: 's3', duracaoMinutos: 30 },
      ]);

      const result = await service.obterTotalMinutosFoco('user-1', '2026-10-15');

      expect(result.data).toBe('2026-10-15');
      expect(result.totalMinutosFoco).toBe(80);
      expect(result.totalSessoes).toBe(3);
      expect(prisma.sessaoPomodoro.findMany).toHaveBeenCalledWith({
        where: {
          idUsuario: 'user-1',
          concluido: true,
          deletedAt: null,
          dataInicio: {
            gte: new Date('2026-10-15T00:00:00.000Z'),
            lte: new Date('2026-10-15T23:59:59.999Z'),
          },
        },
        select: {
          id: true,
          duracaoMinutos: true,
          dataInicio: true,
          dataFim: true,
          idTarefa: true,
        },
        orderBy: { dataInicio: 'asc' },
      });
    });

    it('deve retornar 0 minutos quando não houver sessões no dia', async () => {
      prisma.sessaoPomodoro.findMany.mockResolvedValue([]);

      const result = await service.obterTotalMinutosFoco('user-1', '2026-10-15');

      expect(result.totalMinutosFoco).toBe(0);
      expect(result.totalSessoes).toBe(0);
    });
  });
});
