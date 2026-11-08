import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateChecklistDto,
  CreateItemChecklistDto,
} from './dto/create-checklist.dto';
import {
  CloneChecklistDto,
  UpdateChecklistDto,
  UpdateItemChecklistDto,
} from './dto/update-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(idUsuario: string, dto: CreateChecklistDto) {
    if (dto.idTarefa) {
      const tarefa = await this.prisma.tarefa.findFirst({
        where: { id: dto.idTarefa, idUsuario, deletedAt: null },
      });
      if (!tarefa) {
        throw new DomainException(
          { errorCode: 'RESOURCE_NOT_FOUND', message: 'Tarefa associada não encontrada.' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.idHabito) {
      const habito = await this.prisma.habito.findFirst({
        where: { id: dto.idHabito, idUsuario, deletedAt: null },
      });
      if (!habito) {
        throw new DomainException(
          { errorCode: 'RESOURCE_NOT_FOUND', message: 'Hábito associado não encontrado.' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const checklist = await this.prisma.$transaction(async (tx) => {
      const criada = await tx.checklist.create({
        data: {
          idUsuario,
          idTarefa: dto.idTarefa,
          idHabito: dto.idHabito,
          titulo: dto.titulo.trim(),
          ehModelo: dto.ehModelo ?? false,
        },
      });

      if (dto.itens && dto.itens.length > 0) {
        for (let idx = 0; idx < dto.itens.length; idx++) {
          const item = dto.itens[idx];
          await tx.itemChecklist.create({
            data: {
              idUsuario,
              idChecklist: criada.id,
              descricao: item.descricao.trim(),
              ordem: item.ordem ?? idx + 1,
              concluido: false,
            },
          });
        }
      }

      return tx.checklist.findUnique({
        where: { id: criada.id },
        include: {
          itens: {
            orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    });

    return this.formatChecklist(checklist!);
  }

  async findAll(
    idUsuario: string,
    filters?: { ehModelo?: boolean; idTarefa?: string; idHabito?: string },
  ) {
    const checklists = await this.prisma.checklist.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        ...(filters?.ehModelo !== undefined
          ? { ehModelo: filters.ehModelo }
          : {}),
        ...(filters?.idTarefa ? { idTarefa: filters.idTarefa } : {}),
        ...(filters?.idHabito ? { idHabito: filters.idHabito } : {}),
      },
      include: {
        itens: {
          orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return checklists.map((c) => this.formatChecklist(c));
  }

  async findOne(idUsuario: string, id: string) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id, idUsuario, deletedAt: null },
      include: {
        itens: {
          orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!checklist) {
      throw new DomainException(
        { errorCode: 'RESOURCE_NOT_FOUND', message: 'Checklist não encontrada.' },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatChecklist(checklist);
  }

  async update(idUsuario: string, id: string, dto: UpdateChecklistDto) {
    await this.findOne(idUsuario, id);

    const atualizada = await this.prisma.checklist.update({
      where: { id },
      data: {
        ...(dto.titulo ? { titulo: dto.titulo.trim() } : {}),
        ...(dto.ehModelo !== undefined ? { ehModelo: dto.ehModelo } : {}),
      },
      include: {
        itens: {
          orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return this.formatChecklist(atualizada);
  }

  async remove(idUsuario: string, id: string) {
    await this.findOne(idUsuario, id);

    await this.prisma.checklist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Checklist excluída com sucesso.' };
  }

  async clone(idUsuario: string, idModelo: string, dto: CloneChecklistDto) {
    const modelo = await this.prisma.checklist.findFirst({
      where: { id: idModelo, idUsuario, deletedAt: null },
      include: {
        itens: {
          orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!modelo) {
      throw new DomainException(
        { errorCode: 'RESOURCE_NOT_FOUND', message: 'Modelo de processo não encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!dto.idTarefa && !dto.idHabito) {
      throw new DomainException(
        {
          errorCode: 'VALIDATION_ERROR',
          message: 'É necessário informar idTarefa ou idHabito de destino.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const clonada = await this.prisma.$transaction(async (tx) => {
      const nova = await tx.checklist.create({
        data: {
          idUsuario,
          idTarefa: dto.idTarefa,
          idHabito: dto.idHabito,
          titulo: modelo.titulo,
          ehModelo: false,
        },
      });

      for (const item of modelo.itens) {
        await tx.itemChecklist.create({
          data: {
            idUsuario,
            idChecklist: nova.id,
            descricao: item.descricao,
            ordem: item.ordem,
            concluido: false,
          },
        });
      }

      return tx.checklist.findUnique({
        where: { id: nova.id },
        include: {
          itens: {
            orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    });

    return this.formatChecklist(clonada!);
  }

  async addItem(
    idUsuario: string,
    idChecklist: string,
    dto: CreateItemChecklistDto,
  ) {
    await this.findOne(idUsuario, idChecklist);

    const count = await this.prisma.itemChecklist.count({
      where: { idChecklist },
    });

    const item = await this.prisma.itemChecklist.create({
      data: {
        idUsuario,
        idChecklist,
        descricao: dto.descricao.trim(),
        ordem: dto.ordem ?? count + 1,
        concluido: false,
      },
    });

    return item;
  }

  async updateItem(
    idUsuario: string,
    idChecklist: string,
    itemId: string,
    dto: UpdateItemChecklistDto,
  ) {
    await this.findOne(idUsuario, idChecklist);

    const itemExistente = await this.prisma.itemChecklist.findFirst({
      where: { id: itemId, idChecklist, idUsuario },
    });

    if (!itemExistente) {
      throw new DomainException(
        { errorCode: 'RESOURCE_NOT_FOUND', message: 'Item da checklist não encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }

    const atualizado = await this.prisma.itemChecklist.update({
      where: { id: itemId },
      data: {
        ...(dto.descricao ? { descricao: dto.descricao.trim() } : {}),
        ...(dto.concluido !== undefined ? { concluido: dto.concluido } : {}),
        ...(dto.ordem !== undefined ? { ordem: dto.ordem } : {}),
      },
    });

    return atualizado;
  }

  async removeItem(idUsuario: string, idChecklist: string, itemId: string) {
    await this.findOne(idUsuario, idChecklist);

    const item = await this.prisma.itemChecklist.findFirst({
      where: { id: itemId, idChecklist, idUsuario },
    });

    if (!item) {
      throw new DomainException(
        { errorCode: 'RESOURCE_NOT_FOUND', message: 'Item da checklist não encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.itemChecklist.delete({
      where: { id: itemId },
    });

    return { message: 'Item excluído com sucesso.' };
  }

  private formatChecklist(checklist: any) {
    const totalItens = checklist.itens?.length ?? 0;
    const itensConcluidos =
      checklist.itens?.filter((i: any) => i.concluido).length ?? 0;

    return {
      id: checklist.id,
      idUsuario: checklist.idUsuario,
      idTarefa: checklist.idTarefa,
      idHabito: checklist.idHabito,
      titulo: checklist.titulo,
      ehModelo: checklist.ehModelo,
      totalItens,
      itensConcluidos,
      itens:
        checklist.itens?.map((i: any) => ({
          id: i.id,
          idChecklist: i.idChecklist,
          descricao: i.descricao,
          concluido: i.concluido,
          ordem: i.ordem,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        })) ?? [],
      createdAt: checklist.createdAt,
      updatedAt: checklist.updatedAt,
    };
  }
}
