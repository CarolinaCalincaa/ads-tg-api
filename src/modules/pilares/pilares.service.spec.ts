import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PilaresService } from './pilares.service';

describe('PilaresService', () => {
  let service: PilaresService;
  let prisma: {
    pilarVida: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    pilarAtivoMes: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const idUsuario = 'user-uuid-123';
  const mesAno = '2026-10-01';

  const mockPilaresMestres = [
    { id: 1, codigo: 'CORPO', nome: 'Corpo & Saúde', corHex: '#10B981', corFundoHex: '#ECFDF5', icone: 'heart' },
    { id: 2, codigo: 'MOVIMENTO', nome: 'Movimento & Treino', corHex: '#F97316', corFundoHex: '#FFF7ED', icone: 'activity' },
    { id: 3, codigo: 'SONO', nome: 'Sono & Descanso', corHex: '#6366F1', corFundoHex: '#EEF2FF', icone: 'moon' },
    { id: 4, codigo: 'MENTE', nome: 'Mente & Emoções', corHex: '#8B5CF6', corFundoHex: '#F5F3FF', icone: 'smile' },
    { id: 5, codigo: 'ESTUDOS', nome: 'Estudos & Foco', corHex: '#3B82F6', corFundoHex: '#EFF6FF', icone: 'book-open' },
    { id: 6, codigo: 'RELACIONAMENTOS', nome: 'Relações & Família', corHex: '#EC4899', corFundoHex: '#FDF2F8', icone: 'users' },
    { id: 7, codigo: 'CARREIRA', nome: 'Carreira & Finanças', corHex: '#EAB308', corFundoHex: '#FEFCE8', icone: 'briefcase' },
  ];

  beforeEach(async () => {
    prisma = {
      pilarVida: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      pilarAtivoMes: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PilaresService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PilaresService>(PilaresService);
  });

  describe('findAll', () => {
    it('deve listar os 7 pilares mestres ordenados por ID', async () => {
      prisma.pilarVida.findMany.mockResolvedValue(mockPilaresMestres);

      const resultado = await service.findAll();

      expect(resultado).toHaveLength(7);
      expect(prisma.pilarVida.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });
  });

  describe('findActivePillars', () => {
    it('deve retornar a lista de pilares ativos no mês', async () => {
      prisma.pilarAtivoMes.findMany.mockResolvedValue([
        {
          id: 'pa-1',
          idUsuario,
          idPilar: 2,
          mesAno: new Date('2026-10-01'),
          createdAt: new Date(),
          pilar: mockPilaresMestres[1],
        },
        {
          id: 'pa-2',
          idUsuario,
          idPilar: 5,
          mesAno: new Date('2026-10-01'),
          createdAt: new Date(),
          pilar: mockPilaresMestres[4],
        },
      ]);

      const resultado = await service.findActivePillars(idUsuario, mesAno);

      expect(resultado.totalAtivos).toBe(2);
      expect(resultado.pilares[0].idPilar).toBe(2);
      expect(resultado.pilares[1].idPilar).toBe(5);
    });
  });

  describe('setActivePillars (RN01)', () => {
    it('deve salvar com sucesso até 3 pilares ativos no mês', async () => {
      prisma.pilarVida.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 5 },
      ]);
      prisma.pilarAtivoMes.updateMany.mockResolvedValue({ count: 0 });
      prisma.pilarAtivoMes.findUnique.mockResolvedValue(null);
      prisma.pilarAtivoMes.create.mockResolvedValue({});
      prisma.pilarAtivoMes.findMany.mockResolvedValue([
        { idPilar: 1, pilar: mockPilaresMestres[0] },
        { idPilar: 2, pilar: mockPilaresMestres[1] },
        { idPilar: 5, pilar: mockPilaresMestres[4] },
      ]);

      const resultado = await service.setActivePillars(idUsuario, mesAno, {
        idsPilares: [1, 2, 5],
      });

      expect(resultado.totalAtivos).toBe(3);
      expect(prisma.pilarAtivoMes.create).toHaveBeenCalledTimes(3);
    });

    it('deve lançar DomainException 422 MAX_ACTIVE_PILLARS_EXCEEDED se passar mais de 3 pilares', async () => {
      await expect(
        service.setActivePillars(idUsuario, mesAno, {
          idsPilares: [1, 2, 3, 4],
        }),
      ).rejects.toThrow(DomainException);

      try {
        await service.setActivePillars(idUsuario, mesAno, {
          idsPilares: [1, 2, 3, 4],
        });
      } catch (err: unknown) {
        const domainErr = err as DomainException;
        expect(domainErr.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(domainErr.errorCode).toBe('MAX_ACTIVE_PILLARS_EXCEEDED');
        expect(domainErr.message).toBe('Selecione apenas 3 pilares por mês!');
      }
    });
  });

  describe('toggleActivePillar (RN01)', () => {
    it('deve desativar um pilar ativo existente sem restrição', async () => {
      prisma.pilarVida.findUnique.mockResolvedValue(mockPilaresMestres[1]);
      prisma.pilarAtivoMes.findUnique.mockResolvedValue({
        id: 'pa-1',
        idUsuario,
        idPilar: 2,
        deletedAt: null,
      });
      prisma.pilarAtivoMes.update.mockResolvedValue({});
      prisma.pilarAtivoMes.count.mockResolvedValue(1);

      const resultado = await service.toggleActivePillar(idUsuario, mesAno, 2);

      expect(resultado.ativo).toBe(false);
      expect(resultado.totalAtivos).toBe(1);
      expect(prisma.pilarAtivoMes.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('deve ativar um pilar inativo quando existirem menos de 3 pilares ativos', async () => {
      prisma.pilarVida.findUnique.mockResolvedValue(mockPilaresMestres[2]);
      prisma.pilarAtivoMes.findUnique.mockResolvedValue(null);
      prisma.pilarAtivoMes.count.mockResolvedValue(2); // Atualmente 2 ativos
      prisma.pilarAtivoMes.create.mockResolvedValue({});

      const resultado = await service.toggleActivePillar(idUsuario, mesAno, 3);

      expect(resultado.ativo).toBe(true);
      expect(resultado.totalAtivos).toBe(3);
      expect(prisma.pilarAtivoMes.create).toHaveBeenCalled();
    });

    it('deve BLOQUEAR com HTTP 422 e "Selecione apenas 3 pilares por mês!" ao tentar ativar o 4º pilar (RN01)', async () => {
      prisma.pilarVida.findUnique.mockResolvedValue(mockPilaresMestres[6]);
      prisma.pilarAtivoMes.findUnique.mockResolvedValue(null); // Inativo
      prisma.pilarAtivoMes.count.mockResolvedValue(3); // Já existem 3 ativos!

      await expect(
        service.toggleActivePillar(idUsuario, mesAno, 7),
      ).rejects.toThrow(DomainException);

      try {
        await service.toggleActivePillar(idUsuario, mesAno, 7);
      } catch (err: unknown) {
        const domainErr = err as DomainException;
        expect(domainErr.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(domainErr.errorCode).toBe('MAX_ACTIVE_PILLARS_EXCEEDED');
        expect(domainErr.message).toBe('Selecione apenas 3 pilares por mês!');
      }
    });

    it('deve rejeitar ID de pilar inválido (< 1 ou > 7)', async () => {
      await expect(
        service.toggleActivePillar(idUsuario, mesAno, 8),
      ).rejects.toThrow(DomainException);
    });
  });
});
