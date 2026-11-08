import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { ChecklistsService } from './checklists.service';

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tarefa: { findFirst: jest.fn() },
      habito: { findFirst: jest.fn() },
      checklist: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      itemChecklist: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ChecklistsService>(ChecklistsService);
  });

  it('deve clonar um modelo de processo para uma tarefa alvo com itens não concluídos (RF19)', async () => {
    prisma.checklist.findFirst.mockResolvedValue({
      id: 'uuid-modelo-1',
      idUsuario: 'user-1',
      titulo: 'Checklist de Viagem',
      ehModelo: true,
      itens: [
        { id: 'i1', descricao: 'Passaporte', ordem: 1 },
        { id: 'i2', descricao: 'Carregador', ordem: 2 },
      ],
    });

    prisma.checklist.create.mockResolvedValue({
      id: 'uuid-checklist-clonada',
      idUsuario: 'user-1',
      idTarefa: 'uuid-tarefa-1',
      idHabito: null,
      titulo: 'Checklist de Viagem',
      ehModelo: false,
    });

    prisma.checklist.findUnique.mockResolvedValue({
      id: 'uuid-checklist-clonada',
      idUsuario: 'user-1',
      idTarefa: 'uuid-tarefa-1',
      idHabito: null,
      titulo: 'Checklist de Viagem',
      ehModelo: false,
      itens: [
        { id: 'i1-clone', descricao: 'Passaporte', ordem: 1, concluido: false },
        { id: 'i2-clone', descricao: 'Carregador', ordem: 2, concluido: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.clone('user-1', 'uuid-modelo-1', {
      idTarefa: 'uuid-tarefa-1',
    });

    expect(result.id).toBe('uuid-checklist-clonada');
    expect(result.idTarefa).toBe('uuid-tarefa-1');
    expect(result.ehModelo).toBe(false);
    expect(result.totalItens).toBe(2);
    expect(result.itensConcluidos).toBe(0);
  });

  it('deve alternar status concluído de um item de checklist (RF20)', async () => {
    prisma.checklist.findFirst.mockResolvedValue({
      id: 'uuid-check-1',
      idUsuario: 'user-1',
      deletedAt: null,
      itens: [],
    });

    prisma.itemChecklist.findFirst.mockResolvedValue({
      id: 'uuid-item-1',
      idChecklist: 'uuid-check-1',
      idUsuario: 'user-1',
      descricao: 'Item 1',
      concluido: false,
    });

    prisma.itemChecklist.update.mockResolvedValue({
      id: 'uuid-item-1',
      idChecklist: 'uuid-check-1',
      descricao: 'Item 1',
      concluido: true,
      ordem: 1,
    });

    const result = await service.updateItem(
      'user-1',
      'uuid-check-1',
      'uuid-item-1',
      { concluido: true },
    );

    expect(result.concluido).toBe(true);
  });
});
