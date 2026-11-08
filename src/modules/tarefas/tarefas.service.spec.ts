import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IndicadorDependencia, NivelPrioridade, StatusTarefa, TipoItemAgenda } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacidadeService } from './capacidade.service';
import { TarefasService } from './tarefas.service';

describe('TarefasService', () => {
  let service: TarefasService;
  let prisma: any;
  let capacidadeService: any;

  beforeEach(async () => {
    prisma = {
      pilarVida: { findUnique: jest.fn() },
      projeto: { findFirst: jest.fn() },
      tarefa: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    capacidadeService = {
      calcularCapacidadeDia: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TarefasService,
        { provide: PrismaService, useValue: prisma },
        { provide: CapacidadeService, useValue: capacidadeService },
      ],
    }).compile();

    service = module.get<TarefasService>(TarefasService);
  });

  it('deve criar tarefa com sucesso quando RN02 permite (< 80%)', async () => {
    prisma.pilarVida.findUnique.mockResolvedValue({ id: 5, nome: 'Estudos' });
    capacidadeService.calcularCapacidadeDia.mockResolvedValue({
      minutosComprometidos: 300,
      minutosUteis: 960,
      limiteFadigaMinutos: 768,
      percentualOcupacao: 31,
      emAlertaFadiga: false,
      novosAgendamentosBloqueados: false,
      nivel: 'EQUILIBRADO',
    });

    prisma.tarefa.create.mockResolvedValue({
      id: 'uuid-tarefa-1',
      idUsuario: 'user-1',
      idPilar: 5,
      idProjeto: null,
      tipoItem: TipoItemAgenda.TAREFA,
      nome: 'Estudar NestJS',
      descricao: null,
      duracaoEstimadaMinutos: 60,
      prioridade: NivelPrioridade.PRIORIDADE,
      indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
      dataAgendamento: new Date('2026-10-15'),
      horarioInicio: '10:00',
      status: StatusTarefa.PENDENTE,
      concluidaEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pilar: {
        id: 5,
        codigo: 'ESTUDOS',
        nome: 'Estudos',
        corHex: '#10B981',
        corFundoHex: '#ECFDF5',
        icone: 'book_open',
      },
      projeto: null,
      checklists: [],
      sessoesPomodoro: [],
    });

    const result = await service.create('user-1', {
      nome: 'Estudar NestJS',
      duracaoEstimadaMinutos: 60,
      idPilar: 5,
      prioridade: NivelPrioridade.PRIORIDADE,
      indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
      dataAgendamento: '2026-10-15',
      tipoItem: TipoItemAgenda.TAREFA,
      horarioInicio: '10:00',
    });

    expect(result.tarefa.id).toBe('uuid-tarefa-1');
    expect(result.tarefa.nome).toBe('Estudar NestJS');
    expect(result.capacidadeDia.emAlertaFadiga).toBe(false);
  });

  it('deve BLOQUEAR com HTTP 422 (RN02) quando o dia já está em risco de fadiga (> 80%) para MINHAS_ACOES', async () => {
    prisma.pilarVida.findUnique.mockResolvedValue({ id: 5, nome: 'Estudos' });
    capacidadeService.calcularCapacidadeDia.mockResolvedValue({
      minutosComprometidos: 800,
      minutosUteis: 960,
      limiteFadigaMinutos: 768,
      percentualOcupacao: 83,
      emAlertaFadiga: true,
      novosAgendamentosBloqueados: true,
      nivel: 'RISCO_FADIGA',
    });

    await expect(
      service.create('user-1', {
        nome: 'Mais uma tarefa pesada',
        duracaoEstimadaMinutos: 60,
        idPilar: 5,
        prioridade: NivelPrioridade.PRIORIDADE,
        indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
        dataAgendamento: '2026-10-15',
        tipoItem: TipoItemAgenda.TAREFA,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: expect.objectContaining({
        errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
        message: 'Limite de horas atingido, reagende a atividade.',
      }),
    });
  });

  it('permite agendar tarefas EM_ESPERA mesmo se o dia estiver com ocupação alta (pois não consome tempo ativo)', async () => {
    prisma.pilarVida.findUnique.mockResolvedValue({ id: 5, nome: 'Estudos' });
    prisma.tarefa.create.mockResolvedValue({
      id: 'uuid-tarefa-espera',
      idUsuario: 'user-1',
      idPilar: 5,
      idProjeto: null,
      tipoItem: TipoItemAgenda.TAREFA,
      nome: 'Aguardar revisão do orientador',
      duracaoEstimadaMinutos: 30,
      prioridade: NivelPrioridade.POSTERGAVEL,
      indicadorDependencia: IndicadorDependencia.EM_ESPERA,
      dataAgendamento: new Date('2026-10-15'),
      horarioInicio: null,
      status: StatusTarefa.PENDENTE,
      concluidaEm: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      pilar: {
        id: 5,
        codigo: 'ESTUDOS',
        nome: 'Estudos',
        corHex: '#10B981',
        corFundoHex: '#ECFDF5',
        icone: 'book_open',
      },
      projeto: null,
      checklists: [],
      sessoesPomodoro: [],
    });
    capacidadeService.calcularCapacidadeDia.mockResolvedValue({
      minutosComprometidos: 800,
      minutosUteis: 960,
      limiteFadigaMinutos: 768,
      percentualOcupacao: 83,
      emAlertaFadiga: true,
      novosAgendamentosBloqueados: true,
      nivel: 'RISCO_FADIGA',
    });

    const result = await service.create('user-1', {
      nome: 'Aguardar revisão do orientador',
      duracaoEstimadaMinutos: 30,
      idPilar: 5,
      prioridade: NivelPrioridade.POSTERGAVEL,
      indicadorDependencia: IndicadorDependencia.EM_ESPERA,
      dataAgendamento: '2026-10-15',
      tipoItem: TipoItemAgenda.TAREFA,
    });

    expect(result.tarefa.indicadorDependencia).toBe(IndicadorDependencia.EM_ESPERA);
  });

  it('deve BLOQUEAR reagendamento (update) com HTTP 422 quando o novo dia agendado estiver em risco de fadiga (> 80%)', async () => {
    prisma.tarefa.findFirst.mockResolvedValue({
      id: 'uuid-tarefa-1',
      idUsuario: 'user-1',
      idPilar: 5,
      indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
      dataAgendamento: new Date('2026-10-15'),
      deletedAt: null,
    });

    capacidadeService.calcularCapacidadeDia.mockResolvedValue({
      minutosComprometidos: 790,
      minutosUteis: 960,
      limiteFadigaMinutos: 768,
      percentualOcupacao: 82,
      emAlertaFadiga: true,
      novosAgendamentosBloqueados: true,
      nivel: 'RISCO_FADIGA',
    });

    await expect(
      service.update('user-1', 'uuid-tarefa-1', {
        dataAgendamento: '2026-10-16',
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: expect.objectContaining({
        errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
        message: 'Limite de horas atingido, reagende a atividade.',
      }),
    });
  });
});
