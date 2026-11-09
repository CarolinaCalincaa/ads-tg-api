import { Test, TestingModule } from '@nestjs/testing';
import { TipoLembrete } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LembretesService } from './lembretes.service';

describe('LembretesService', () => {
  let service: LembretesService;
  let prisma: {
    lembreteConfig: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const idUsuario = 'user-uuid-123';

  const mockConfigs = [
    {
      id: 'l-1',
      idUsuario,
      tipo: TipoLembrete.AGUA,
      ativo: true,
      intervaloMinutos: 90,
      horarioFixo: null,
      janelaInicio: '08:00',
      janelaFim: '21:00',
      updatedAt: new Date(),
    },
    {
      id: 'l-2',
      idUsuario,
      tipo: TipoLembrete.ALONGAMENTO,
      ativo: true,
      intervaloMinutos: 120,
      horarioFixo: null,
      janelaInicio: '09:00',
      janelaFim: '19:00',
      updatedAt: new Date(),
    },
    {
      id: 'l-3',
      idUsuario,
      tipo: TipoLembrete.SONO,
      ativo: true,
      intervaloMinutos: null,
      horarioFixo: '22:00',
      janelaInicio: '08:00',
      janelaFim: '21:00',
      updatedAt: new Date(),
    },
    {
      id: 'l-4',
      idUsuario,
      tipo: TipoLembrete.FECHAMENTO_SEMANAL,
      ativo: true,
      intervaloMinutos: null,
      horarioFixo: '18:00',
      janelaInicio: '08:00',
      janelaFim: '21:00',
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    prisma = {
      lembreteConfig: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LembretesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LembretesService>(LembretesService);
  });

  describe('obterConfiguracoes (RF21)', () => {
    it('deve retornar as 4 categorias de lembrete quando todas já existem', async () => {
      prisma.lembreteConfig.findMany.mockResolvedValue(mockConfigs);

      const resultado = await service.obterConfiguracoes(idUsuario);

      expect(resultado).toHaveLength(4);
      expect(resultado.map((r) => r.tipo)).toEqual([
        TipoLembrete.AGUA,
        TipoLembrete.ALONGAMENTO,
        TipoLembrete.SONO,
        TipoLembrete.FECHAMENTO_SEMANAL,
      ]);
    });

    it('deve criar configurações default quando usuário ainda não possui registros', async () => {
      prisma.lembreteConfig.findMany.mockResolvedValue([]);
      prisma.lembreteConfig.upsert.mockImplementation(({ create }) =>
        Promise.resolve({
          id: 'new-id',
          ...create,
          updatedAt: new Date(),
        }),
      );

      const resultado = await service.obterConfiguracoes(idUsuario);

      expect(resultado).toHaveLength(4);
      expect(prisma.lembreteConfig.upsert).toHaveBeenCalledTimes(4);
    });
  });

  describe('atualizarConfiguracao', () => {
    it('deve atualizar preferências do lembrete via upsert', async () => {
      prisma.lembreteConfig.upsert.mockResolvedValue({
        id: 'l-1',
        idUsuario,
        tipo: TipoLembrete.AGUA,
        ativo: false,
        intervaloMinutos: 60,
        horarioFixo: null,
        janelaInicio: '09:00',
        janelaFim: '20:00',
        updatedAt: new Date(),
      });

      const resultado = await service.atualizarConfiguracao(
        idUsuario,
        TipoLembrete.AGUA,
        {
          ativo: false,
          intervaloMinutos: 60,
          janelaInicio: '09:00',
          janelaFim: '20:00',
        },
      );

      expect(resultado.tipo).toBe(TipoLembrete.AGUA);
      expect(resultado.ativo).toBe(false);
      expect(resultado.intervaloMinutos).toBe(60);
      expect(prisma.lembreteConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idUsuario_tipo: {
              idUsuario,
              tipo: TipoLembrete.AGUA,
            },
          },
        }),
      );
    });
  });
});
