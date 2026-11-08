import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StatusProjeto } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjetosService } from './projetos.service';

describe('ProjetosService', () => {
  let service: ProjetosService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      pilarVida: {
        findUnique: jest.fn(),
      },
      projeto: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjetosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjetosService>(ProjetosService);
  });

  it('deve criar um projeto com sucesso quando o pilar existe', async () => {
    prisma.pilarVida.findUnique.mockResolvedValue({ id: 7, nome: 'Carreira' });
    prisma.projeto.create.mockResolvedValue({
      id: 'uuid-proj-1',
      idUsuario: 'user-1',
      idPilar: 7,
      nome: 'TCC FATEC',
      descricao: 'Entrega final',
      dataInicio: new Date('2026-10-01'),
      dataFimPrevista: new Date('2026-12-15'),
      horasEstimadasTotais: 50,
      status: StatusProjeto.EM_ANDAMENTO,
      createdAt: new Date(),
      updatedAt: new Date(),
      pilar: {
        id: 7,
        codigo: 'CARREIRA',
        nome: 'Carreira',
        corHex: '#0EA5E9',
        corFundoHex: '#F0F9FF',
        icone: 'briefcase',
      },
      _count: { tarefas: 0 },
    });

    const result = await service.create('user-1', {
      nome: 'TCC FATEC',
      idPilar: 7,
      descricao: 'Entrega final',
      dataInicio: '2026-10-01',
      dataFimPrevista: '2026-12-15',
      horasEstimadasTotais: 50,
    });

    expect(result.id).toBe('uuid-proj-1');
    expect(result.nome).toBe('TCC FATEC');
    expect(result.pilar.nome).toBe('Carreira');
  });

  it('deve lançar erro quando o pilar não existe', async () => {
    prisma.pilarVida.findUnique.mockResolvedValue(null);

    await expect(
      service.create('user-1', { nome: 'Invalido', idPilar: 99 }),
    ).rejects.toThrow(DomainException);
  });
});
