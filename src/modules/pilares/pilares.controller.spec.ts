import { Test, TestingModule } from '@nestjs/testing';
import { PilaresController } from './pilares.controller';
import { PilaresService } from './pilares.service';

describe('PilaresController', () => {
  let controller: PilaresController;
  let pilaresService: {
    findAll: jest.Mock;
    findActivePillars: jest.Mock;
    setActivePillars: jest.Mock;
    toggleActivePillar: jest.Mock;
  };

  const idUsuario = 'user-uuid-1';

  beforeEach(async () => {
    pilaresService = {
      findAll: jest.fn(),
      findActivePillars: jest.fn(),
      setActivePillars: jest.fn(),
      toggleActivePillar: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PilaresController],
      providers: [{ provide: PilaresService, useValue: pilaresService }],
    }).compile();

    controller = module.get<PilaresController>(PilaresController);
  });

  it('deve listar os 7 pilares mestres via GET /pilares', async () => {
    pilaresService.findAll.mockResolvedValue([{ id: 1, nome: 'Corpo' }]);

    const result = await controller.findAll();

    expect(pilaresService.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('deve listar pilares ativos do mês via GET /pilares/ativos', async () => {
    pilaresService.findActivePillars.mockResolvedValue({ totalAtivos: 3, pilares: [] });

    const result = await controller.findActive(idUsuario, '2026-10-01');

    expect(pilaresService.findActivePillars).toHaveBeenCalledWith(idUsuario, '2026-10-01');
    expect(result.totalAtivos).toBe(3);
  });

  it('deve definir pilares ativos via PUT /pilares/ativos/:mesAno', async () => {
    pilaresService.setActivePillars.mockResolvedValue({ totalAtivos: 2 });

    const result = await controller.setActive(idUsuario, '2026-10-01', {
      idsPilares: [1, 5],
    });

    expect(pilaresService.setActivePillars).toHaveBeenCalledWith(
      idUsuario,
      '2026-10-01',
      { idsPilares: [1, 5] },
    );
    expect(result.totalAtivos).toBe(2);
  });

  it('deve alternar ativação via POST /pilares/ativos/:mesAno/toggle/:idPilar', async () => {
    pilaresService.toggleActivePillar.mockResolvedValue({
      idPilar: 2,
      ativo: true,
      totalAtivos: 3,
    });

    const result = await controller.toggleActive(idUsuario, '2026-10-01', 2);

    expect(pilaresService.toggleActivePillar).toHaveBeenCalledWith(
      idUsuario,
      '2026-10-01',
      2,
    );
    expect(result.ativo).toBe(true);
  });
});
