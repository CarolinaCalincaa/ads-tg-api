import { Test, TestingModule } from '@nestjs/testing';
import { TipoLembrete } from '@prisma/client';
import { LembretesController } from './lembretes.controller';
import { LembretesService } from './lembretes.service';

describe('LembretesController', () => {
  let controller: LembretesController;
  let lembretesService: {
    obterConfiguracoes: jest.Mock;
    atualizarConfiguracao: jest.Mock;
    atualizarConfiguracoesEmLote: jest.Mock;
  };

  const idUsuario = 'user-uuid-1';

  beforeEach(async () => {
    lembretesService = {
      obterConfiguracoes: jest.fn(),
      atualizarConfiguracao: jest.fn(),
      atualizarConfiguracoesEmLote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LembretesController],
      providers: [{ provide: LembretesService, useValue: lembretesService }],
    }).compile();

    controller = module.get<LembretesController>(LembretesController);
  });

  it('deve obter configurações dos 4 lembretes via GET /lembretes', async () => {
    lembretesService.obterConfiguracoes.mockResolvedValue([
      { tipo: TipoLembrete.AGUA },
      { tipo: TipoLembrete.ALONGAMENTO },
    ]);

    const result = await controller.obterConfiguracoes(idUsuario);

    expect(lembretesService.obterConfiguracoes).toHaveBeenCalledWith(idUsuario);
    expect(result).toHaveLength(2);
  });

  it('deve atualizar configurações em lote via PUT /lembretes com { lembretes: [...] }', async () => {
    const payload = {
      lembretes: [
        { tipo: TipoLembrete.AGUA, ativo: true, intervaloMinutos: 45 },
        { tipo: TipoLembrete.ALONGAMENTO, ativo: false },
      ],
    };
    lembretesService.atualizarConfiguracoesEmLote.mockResolvedValue([
      { tipo: TipoLembrete.AGUA, ativo: true, intervaloMinutos: 45 },
      { tipo: TipoLembrete.ALONGAMENTO, ativo: false },
    ]);

    const result = await controller.atualizarConfiguracoesEmLote(
      idUsuario,
      payload,
    );

    expect(lembretesService.atualizarConfiguracoesEmLote).toHaveBeenCalledWith(
      idUsuario,
      payload,
    );
    expect(result).toHaveLength(2);
  });

  it('deve atualizar configurações em lote via PUT /lembretes com array direto', async () => {
    const payload = [
      { tipo: TipoLembrete.AGUA, ativo: true, intervaloMinutos: 60 },
    ];
    lembretesService.atualizarConfiguracoesEmLote.mockResolvedValue([
      { tipo: TipoLembrete.AGUA, ativo: true, intervaloMinutos: 60 },
    ]);

    const result = await controller.atualizarConfiguracoesEmLote(
      idUsuario,
      payload,
    );

    expect(lembretesService.atualizarConfiguracoesEmLote).toHaveBeenCalledWith(
      idUsuario,
      payload,
    );
    expect(result).toHaveLength(1);
  });

  it('deve atualizar configuração via PUT /lembretes/:tipo', async () => {
    const dto = { ativo: false, intervaloMinutos: 45 };
    lembretesService.atualizarConfiguracao.mockResolvedValue({
      tipo: TipoLembrete.AGUA,
      ...dto,
    });

    const result = await controller.atualizarConfiguracao(
      idUsuario,
      TipoLembrete.AGUA,
      dto,
    );

    expect(lembretesService.atualizarConfiguracao).toHaveBeenCalledWith(
      idUsuario,
      TipoLembrete.AGUA,
      dto,
    );
    expect(result.ativo).toBe(false);
  });
});
