import { Test, TestingModule } from '@nestjs/testing';
import { HabitosController } from './habitos.controller';
import { HabitosService } from './habitos.service';

describe('HabitosController', () => {
  let controller: HabitosController;
  let habitosService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toggleExecucao: jest.Mock;
    obterStreakGlobal: jest.Mock;
  };

  const idUsuario = 'user-uuid-1';
  const idHabito = 'habito-uuid-abc';

  beforeEach(async () => {
    habitosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toggleExecucao: jest.fn(),
      obterStreakGlobal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HabitosController],
      providers: [{ provide: HabitosService, useValue: habitosService }],
    }).compile();

    controller = module.get<HabitosController>(HabitosController);
  });

  it('deve criar hábito via POST /habitos', async () => {
    const dto = {
      nome: 'Meditação',
      idPilar: 4,
      duracaoEstimadaMinutos: 15,
      diasSemana: [1, 2, 3, 4, 5],
    };
    habitosService.create.mockResolvedValue({ id: idHabito, ...dto });

    const result = await controller.create(idUsuario, dto);

    expect(habitosService.create).toHaveBeenCalledWith(idUsuario, dto);
    expect(result.id).toBe(idHabito);
  });

  it('deve listar hábitos via GET /habitos', async () => {
    habitosService.findAll.mockResolvedValue([{ id: idHabito }]);

    const result = await controller.findAll(idUsuario, 4, true);

    expect(habitosService.findAll).toHaveBeenCalledWith(idUsuario, 4, true);
    expect(result).toHaveLength(1);
  });

  it('deve obter streak global via GET /habitos/streak-global', async () => {
    habitosService.obterStreakGlobal.mockResolvedValue({
      streakGlobalDiasAtivos: 5,
    });

    const result = await controller.getStreakGlobal(idUsuario, '2026-10-15');

    expect(habitosService.obterStreakGlobal).toHaveBeenCalledWith(
      idUsuario,
      '2026-10-15',
    );
    expect(result.streakGlobalDiasAtivos).toBe(5);
  });

  it('deve buscar hábito por ID via GET /habitos/:id', async () => {
    habitosService.findOne.mockResolvedValue({ id: idHabito });

    const result = await controller.findOne(idUsuario, idHabito);

    expect(habitosService.findOne).toHaveBeenCalledWith(idUsuario, idHabito);
    expect(result.id).toBe(idHabito);
  });

  it('deve atualizar hábito via PATCH /habitos/:id', async () => {
    const dto = { nome: 'Meditação Guiada' };
    habitosService.update.mockResolvedValue({ id: idHabito, ...dto });

    const result = await controller.update(idUsuario, idHabito, dto);

    expect(habitosService.update).toHaveBeenCalledWith(idUsuario, idHabito, dto);
    expect(result.nome).toBe('Meditação Guiada');
  });

  it('deve remover hábito via DELETE /habitos/:id', async () => {
    habitosService.remove.mockResolvedValue({ message: 'removido' });

    const result = await controller.remove(idUsuario, idHabito);

    expect(habitosService.remove).toHaveBeenCalledWith(idUsuario, idHabito);
    expect(result.message).toBe('removido');
  });

  it('deve registrar/alternar execução via PUT /habitos/:id/execucoes/:data', async () => {
    habitosService.toggleExecucao.mockResolvedValue({
      idHabito,
      dataExecucao: '2026-10-15',
      concluido: true,
      streakAtual: 4,
    });

    const result = await controller.toggleExecucao(
      idUsuario,
      idHabito,
      '2026-10-15',
      { concluido: true },
    );

    expect(habitosService.toggleExecucao).toHaveBeenCalledWith(
      idUsuario,
      idHabito,
      '2026-10-15',
      { concluido: true },
    );
    expect(result.concluido).toBe(true);
    expect(result.streakAtual).toBe(4);
  });
});
