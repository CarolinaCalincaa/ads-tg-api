import { Test, TestingModule } from '@nestjs/testing';
import { IndicadorDependencia, StatusTarefa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calcularMetricasFadiga,
  FadigaMentalService,
} from './fadiga-mental.service';

describe('FadigaMentalService (RN02)', () => {
  let service: FadigaMentalService;
  let prisma: {
    usuario: { findUnique: jest.Mock };
    tarefa: { findMany: jest.Mock };
    habito: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      usuario: { findUnique: jest.fn() },
      tarefa: { findMany: jest.fn() },
      habito: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FadigaMentalService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FadigaMentalService>(FadigaMentalService);
  });

  describe('Cenários Matemáticos Canônicos da RN02 (calcularMetricasFadiga)', () => {
    it('1. Cenário 0% de ocupação (0 minutos) -> EQUILIBRADO e sem alerta de fadiga', () => {
      // 8h sono -> 960 min úteis, limite 768 min
      const res = calcularMetricasFadiga(8, 0, 0);

      expect(res.horasSonoDiarias).toBe(8);
      expect(res.minutosUteis).toBe(960);
      expect(res.limiteFadigaMinutos).toBe(768);
      expect(res.minutosComprometidos).toBe(0);
      expect(res.percentualOcupacao).toBe(0);
      expect(res.nivel).toBe('EQUILIBRADO');
      expect(res.emAlertaFadiga).toBe(false);
      expect(res.novosAgendamentosBloqueados).toBe(false);
    });

    it('2. Cenário 60.0% de ocupação exata -> EQUILIBRADO e sem alerta de fadiga', () => {
      // 960 * 0.60 = 576 min
      const res = calcularMetricasFadiga(8, 500, 76);

      expect(res.minutosComprometidos).toBe(576);
      expect(res.percentualOcupacao).toBe(60);
      expect(res.nivel).toBe('EQUILIBRADO');
      expect(res.emAlertaFadiga).toBe(false);
      expect(res.novosAgendamentosBloqueados).toBe(false);
    });

    it('3. Cenário 61% a 80% de ocupação -> ATENCAO e sem bloqueio', () => {
      // 577 min -> estritamente > 576 (60%) e <= 768 (80%)
      const res61 = calcularMetricasFadiga(8, 577, 0);
      expect(res61.nivel).toBe('ATENCAO');
      expect(res61.emAlertaFadiga).toBe(false);
      expect(res61.novosAgendamentosBloqueados).toBe(false);

      // 700 min / 960 = 73%
      const res73 = calcularMetricasFadiga(8, 650, 50);
      expect(res73.percentualOcupacao).toBe(73);
      expect(res73.nivel).toBe('ATENCAO');
      expect(res73.emAlertaFadiga).toBe(false);
      expect(res73.novosAgendamentosBloqueados).toBe(false);
    });

    it('4. Cenário 80.0% exato (768 min para 8h sono) -> ATENCAO, sem alerta e SEM bloqueio', () => {
      // 960 * 0.80 = 768 min
      const res = calcularMetricasFadiga(8, 700, 68);

      expect(res.minutosComprometidos).toBe(768);
      expect(res.percentualOcupacao).toBe(80);
      expect(res.nivel).toBe('ATENCAO');
      expect(res.emAlertaFadiga).toBe(false);
      expect(res.novosAgendamentosBloqueados).toBe(false);
    });

    it('5. Cenário 80.1% (769 min para 8h sono) -> RISCO_FADIGA, emAlertaFadiga = true e novosAgendamentosBloqueados = true', () => {
      // 769 > 768 (limite de fadiga)
      const res = calcularMetricasFadiga(8, 700, 69);

      expect(res.minutosComprometidos).toBe(769);
      expect(res.percentualOcupacao).toBe(80);
      expect(res.nivel).toBe('RISCO_FADIGA');
      expect(res.emAlertaFadiga).toBe(true);
      expect(res.novosAgendamentosBloqueados).toBe(true);
    });

    it('6. Cenário 82% (Mockup 01 do TCC) -> RISCO_FADIGA, 82% ocupação e agendamentos bloqueados', () => {
      // 787 / 960 = 0.81979... arredonda para 82%
      const res = calcularMetricasFadiga(8, 750, 37);

      expect(res.minutosComprometidos).toBe(787);
      expect(res.percentualOcupacao).toBe(82);
      expect(res.nivel).toBe('RISCO_FADIGA');
      expect(res.emAlertaFadiga).toBe(true);
      expect(res.novosAgendamentosBloqueados).toBe(true);
    });

    it('7. Cenário com variação de horasSonoDiarias (6h sono -> minutosUteis = 1080, limite = 864)', () => {
      // (24 - 6) * 60 = 1080 min úteis. Limite = Math.floor(1080 * 0.80) = 864 min.
      const res864 = calcularMetricasFadiga(6, 800, 64);
      expect(res864.minutosUteis).toBe(1080);
      expect(res864.limiteFadigaMinutos).toBe(864);
      expect(res864.minutosComprometidos).toBe(864);
      expect(res864.percentualOcupacao).toBe(80);
      expect(res864.emAlertaFadiga).toBe(false);
      expect(res864.novosAgendamentosBloqueados).toBe(false);

      // 865 min ultrapassa o limite de 864 min
      const res865 = calcularMetricasFadiga(6, 800, 65);
      expect(res865.minutosComprometidos).toBe(865);
      expect(res865.emAlertaFadiga).toBe(true);
      expect(res865.novosAgendamentosBloqueados).toBe(true);
      expect(res865.nivel).toBe('RISCO_FADIGA');
    });
  });

  describe('Integração com Prisma e Filtros Estritos de Domínio (calcularCapacidadeDia)', () => {
    it('deve consultar tarefas com exclusão estrita de CANCELADA, EM_ESPERA e soft-deleted (deletedAt != null)', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ horasSonoDiarias: 8 });
      prisma.tarefa.findMany.mockResolvedValue([
        { duracaoEstimadaMinutos: 120 },
        { duracaoEstimadaMinutos: 60 },
      ]);
      prisma.habito.findMany.mockResolvedValue([
        { duracaoEstimadaMinutos: 30, diasSemana: [4] }, // Quinta-feira
      ]);

      // 2026-10-15 é uma quinta-feira (weekday = 4)
      const res = await service.calcularCapacidadeDia('user-1', '2026-10-15');

      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { horasSonoDiarias: true },
      });

      // Valida filtros Prisma da Tarefa
      expect(prisma.tarefa.findMany).toHaveBeenCalledWith({
        where: {
          idUsuario: 'user-1',
          dataAgendamento: new Date('2026-10-15'),
          deletedAt: null,
          status: { not: StatusTarefa.CANCELADA },
          indicadorDependencia: IndicadorDependencia.MINHAS_ACOES,
        },
        select: { duracaoEstimadaMinutos: true },
      });

      // Valida filtros Prisma do Hábito
      expect(prisma.habito.findMany).toHaveBeenCalledWith({
        where: {
          idUsuario: 'user-1',
          deletedAt: null,
          statusAtivo: true,
          createdAt: { lte: expect.any(Date) },
        },
        select: { duracaoEstimadaMinutos: true, diasSemana: true },
      });

      expect(res.minutosTarefas).toBe(180);
      expect(res.minutosHabitos).toBe(30);
      expect(res.minutosComprometidos).toBe(210);
      expect(res.percentualOcupacao).toBe(22);
      expect(res.nivel).toBe('EQUILIBRADO');
      expect(res.emAlertaFadiga).toBe(false);
    });

    it('deve ignorar hábitos que não pertencem ao dia da semana analisado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ horasSonoDiarias: 8 });
      prisma.tarefa.findMany.mockResolvedValue([]);
      prisma.habito.findMany.mockResolvedValue([
        { duracaoEstimadaMinutos: 60, diasSemana: [1, 2, 3] }, // Segunda a Quarta, não Quinta (4)
        { duracaoEstimadaMinutos: 45, diasSemana: [4, 5] }, // Inclui Quinta (4)
      ]);

      const res = await service.calcularCapacidadeDia('user-1', '2026-10-15');

      expect(res.minutosTarefas).toBe(0);
      expect(res.minutosHabitos).toBe(45);
      expect(res.minutosComprometidos).toBe(45);
    });

    it('usa 8 horas de sono diárias como fallback se o usuário não tiver configurado', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.tarefa.findMany.mockResolvedValue([]);
      prisma.habito.findMany.mockResolvedValue([]);

      const res = await service.calcularCapacidadeDia('user-1', '2026-10-15');

      expect(res.horasSonoDiarias).toBe(8);
      expect(res.minutosUteis).toBe(960);
      expect(res.limiteFadigaMinutos).toBe(768);
    });
  });
});
