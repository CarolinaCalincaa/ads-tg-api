import { Test, TestingModule } from '@nestjs/testing';
import { CreateSessaoPomodoroDto } from './dto/create-sessao-pomodoro.dto';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';

describe('PomodoroController', () => {
  let controller: PomodoroController;
  let pomodoroService: {
    registrarSessao: jest.Mock;
    listarSessoesTarefa: jest.Mock;
    obterTotalMinutosFoco: jest.Mock;
  };

  beforeEach(async () => {
    pomodoroService = {
      registrarSessao: jest.fn(),
      listarSessoesTarefa: jest.fn(),
      obterTotalMinutosFoco: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PomodoroController],
      providers: [
        { provide: PomodoroService, useValue: pomodoroService },
      ],
    }).compile();

    controller = module.get<PomodoroController>(PomodoroController);
  });

  it('deve registrar sessão via POST /pomodoro/sessoes', async () => {
    const dto: CreateSessaoPomodoroDto = {
      idTarefa: 'd3b07384-d113-4966-bfdc-53d30b6510bb',
      duracaoMinutos: 25,
      dataInicio: '2026-10-15T14:00:00.000Z',
      dataFim: '2026-10-15T14:25:00.000Z',
      concluido: true,
    };

    const mockResponse = { id: 'sessao-1', ...dto };
    pomodoroService.registrarSessao.mockResolvedValue(mockResponse);

    const result = await controller.registrarSessao('user-1', dto);

    expect(pomodoroService.registrarSessao).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(mockResponse);
  });

  it('deve listar sessões de uma tarefa via GET /pomodoro/tarefa/:idTarefa', async () => {
    const mockList = [{ id: 's1' }, { id: 's2' }];
    pomodoroService.listarSessoesTarefa.mockResolvedValue(mockList);

    const result = await controller.listarSessoesTarefa(
      'user-1',
      'd3b07384-d113-4966-bfdc-53d30b6510bb',
    );

    expect(pomodoroService.listarSessoesTarefa).toHaveBeenCalledWith(
      'user-1',
      'd3b07384-d113-4966-bfdc-53d30b6510bb',
    );
    expect(result).toEqual(mockList);
  });

  it('deve obter total de minutos de foco via GET /pomodoro/total-minutos-foco', async () => {
    const mockResumo = {
      data: '2026-10-15',
      totalMinutosFoco: 50,
      totalSessoes: 2,
    };
    pomodoroService.obterTotalMinutosFoco.mockResolvedValue(mockResumo);

    const result = await controller.obterTotalMinutosFoco('user-1', '2026-10-15');

    expect(pomodoroService.obterTotalMinutosFoco).toHaveBeenCalledWith(
      'user-1',
      '2026-10-15',
    );
    expect(result).toEqual(mockResumo);
  });
});
