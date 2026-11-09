import { Test, TestingModule } from '@nestjs/testing';
import { TipoCicloFechamento } from '@prisma/client';
import { FechamentosController } from './fechamentos.controller';
import { FechamentosService } from './fechamentos.service';

describe('FechamentosController', () => {
  let controller: FechamentosController;
  let service: {
    obterPrevia: jest.Mock;
    upsert: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  const idUsuario = 'user-uuid-123';

  beforeEach(async () => {
    service = {
      obterPrevia: jest.fn(),
      upsert: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FechamentosController],
      providers: [
        {
          provide: FechamentosService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<FechamentosController>(FechamentosController);
  });

  it('deve delegar obterPrevia para o service', async () => {
    const query = {
      tipoCiclo: TipoCicloFechamento.SEMANAL,
      dataRef: '2026-10-15',
    };
    service.obterPrevia.mockResolvedValue({ habitosConcluidos: 18 });

    const result = await controller.obterPrevia(idUsuario, query);

    expect(service.obterPrevia).toHaveBeenCalledWith(idUsuario, query);
    expect(result).toEqual({ habitosConcluidos: 18 });
  });

  it('deve delegar upsert para o service', async () => {
    const dto = {
      tipoCiclo: TipoCicloFechamento.SEMANAL,
      dataInicioCiclo: '2026-10-12',
      acaoFuncionouBem: 'Foco total',
    };
    service.upsert.mockResolvedValue({ id: 'f-1', ...dto });

    const result = await controller.upsert(idUsuario, dto);

    expect(service.upsert).toHaveBeenCalledWith(idUsuario, dto);
    expect(result.id).toBe('f-1');
  });

  it('deve delegar findAll para o service', async () => {
    service.findAll.mockResolvedValue([]);

    const result = await controller.findAll(idUsuario, {
      tipoCiclo: TipoCicloFechamento.SEMANAL,
    });

    expect(service.findAll).toHaveBeenCalledWith(idUsuario, {
      tipoCiclo: TipoCicloFechamento.SEMANAL,
    });
    expect(result).toEqual([]);
  });

  it('deve delegar findOne para o service', async () => {
    service.findOne.mockResolvedValue({ id: 'f-1' });

    const result = await controller.findOne(idUsuario, 'f-1');

    expect(service.findOne).toHaveBeenCalledWith(idUsuario, 'f-1');
    expect(result).toEqual({ id: 'f-1' });
  });
});
