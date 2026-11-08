import { Test, TestingModule } from '@nestjs/testing';
import { IndicadorDependencia, StatusTarefa, TipoItemAgenda } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacidadeService } from '../tarefas/capacidade.service';
import { TarefasService } from '../tarefas/tarefas.service';
import { PainelService } from './painel.service';

describe('PainelService', () => {
  let service: PainelService;
  let prisma: any;
  let capacidadeService: any;
  let tarefasService: any;

  beforeEach(async () => {
    prisma = {
      pilarAtivoMes: { findMany: jest.fn() },
      tarefa: { findMany: jest.fn(), count: jest.fn() },
      habito: { findMany: jest.fn(), count: jest.fn() },
      registroExecucaoHabito: { count: jest.fn() },
    };

    capacidadeService = {
      calcularCapacidadeDia: jest.fn(),
    };

    tarefasService = {
      formatTarefaResponse: jest.fn((t) => t),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PainelService,
        { provide: PrismaService, useValue: prisma },
        { provide: CapacidadeService, useValue: capacidadeService },
        { provide: TarefasService, useValue: tarefasService },
      ],
    }).compile();

    service = module.get<PainelService>(PainelService);
  });

  it('deve retornar painel do dia agregando pilares do mês, capacidade e linha do tempo unificada (RF13)', async () => {
    prisma.pilarAtivoMes.findMany.mockResolvedValue([
      {
        pilar: {
          id: 7,
          codigo: 'CARREIRA',
          nome: 'Carreira',
          corHex: '#0EA5E9',
          corFundoHex: '#F0F9FF',
          icone: 'briefcase',
        },
      },
    ]);

    capacidadeService.calcularCapacidadeDia.mockResolvedValue({
      horasSonoDiarias: 8,
      minutosUteis: 960,
      limiteFadigaMinutos: 768,
      minutosTarefas: 120,
      minutosHabitos: 30,
      minutosComprometidos: 150,
      percentualOcupacao: 16,
      nivel: 'EQUILIBRADO',
      emAlertaFadiga: false,
      novosAgendamentosBloqueados: false,
    });

    prisma.tarefa.findMany.mockResolvedValue([
      {
        id: 'tarefa-1',
        tipoItem: TipoItemAgenda.TAREFA,
        horarioInicio: '09:00',
        nome: 'Reunião sprint',
        descricao: null,
        duracaoEstimadaMinutos: 60,
        prioridade: 'PRIORIDADE',
        indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
        status: StatusTarefa.PENDENTE,
        concluidaEm: null,
        pilar: { id: 7, codigo: 'CARREIRA', nome: 'Carreira', corHex: '#0EA5E9', corFundoHex: '#F0F9FF', icone: 'briefcase' },
        projeto: null,
        checklists: [],
        sessoesPomodoro: [],
      },
    ]);

    prisma.habito.findMany.mockResolvedValue([
      {
        id: 'habito-1',
        nome: 'Beber água ao acordar',
        horarioPadrao: '07:00',
        duracaoEstimadaMinutos: 5,
        streakAtual: 3,
        pilar: { id: 1, codigo: 'SAUDE', nome: 'Saúde', corHex: '#22C55E', corFundoHex: '#F0FDF4', icone: 'heart' },
        execucoes: [{ concluido: true, dataRegistro: new Date() }],
        checklists: [],
      },
    ]);

    const result = await service.getPainelDia('user-1', '2026-10-15');

    expect(result.data).toBe('2026-10-15');
    expect(result.pilaresAtivosMes).toHaveLength(1);
    expect(result.capacidadeDia.percentualOcupacao).toBe(16);
    expect(result.itensLinhaTempo).toHaveLength(2);
    // Ordenado por horário: 07:00 (hábito) antes de 09:00 (tarefa)
    expect(result.itensLinhaTempo[0].id).toBe('habito-1');
    expect(result.itensLinhaTempo[1].id).toBe('tarefa-1');
  });

  it('deve sugerir dias livres ordenando por menor ocupação e menor distância (RN02)', async () => {
    capacidadeService.calcularCapacidadeDia.mockImplementation((_: string, dataStr: string) => {
      const day = parseInt(dataStr.slice(-2), 10);
      return Promise.resolve({
        minutosComprometidos: day % 2 === 0 ? 200 : 700,
        minutosUteis: 960,
        limiteFadigaMinutos: 768,
        percentualOcupacao: day % 2 === 0 ? 21 : 73,
      });
    });

    const result = await service.getDiasLivres('user-1', '2026-10-15', 60);

    expect(result.sugeridos.length).toBeLessThanOrEqual(3);
    expect(result.sugeridos[0].cabeSemFadiga).toBe(true);
  });
});
