import { HttpStatus, Injectable } from '@nestjs/common';
import { StatusProjeto } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';

@Injectable()
export class ProjetosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(idUsuario: string, dto: CreateProjetoDto) {
    const pilar = await this.prisma.pilarVida.findUnique({
      where: { id: dto.idPilar },
    });

    if (!pilar) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: `Pilar com id ${dto.idPilar} não existe. Selecione um pilar de 1 a 7.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const projeto = await this.prisma.projeto.create({
      data: {
        idUsuario,
        idPilar: dto.idPilar,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim(),
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        dataFimPrevista: dto.dataFimPrevista ? new Date(dto.dataFimPrevista) : null,
        horasEstimadasTotais: dto.horasEstimadasTotais,
        status: StatusProjeto.EM_ANDAMENTO,
      },
      include: {
        pilar: true,
        _count: {
          select: {
            tarefas: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return this.formatProjetoResponse(projeto);
  }

  async findAll(idUsuario: string, status?: StatusProjeto) {
    const projetos = await this.prisma.projeto.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        pilar: true,
        _count: {
          select: {
            tarefas: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projetos.map((p) => this.formatProjetoResponse(p));
  }

  async findOne(idUsuario: string, id: string) {
    const projeto = await this.prisma.projeto.findFirst({
      where: {
        id,
        idUsuario,
        deletedAt: null,
      },
      include: {
        pilar: true,
        _count: {
          select: {
            tarefas: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!projeto) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Projeto não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatProjetoResponse(projeto);
  }

  async update(idUsuario: string, id: string, dto: UpdateProjetoDto) {
    await this.findOne(idUsuario, id);

    if (dto.idPilar) {
      const pilar = await this.prisma.pilarVida.findUnique({
        where: { id: dto.idPilar },
      });
      if (!pilar) {
        throw new DomainException(
          {
            errorCode: 'RESOURCE_NOT_FOUND',
            message: `Pilar com id ${dto.idPilar} não existe. Selecione um pilar de 1 a 7.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const atualizado = await this.prisma.projeto.update({
      where: { id },
      data: {
        ...(dto.nome ? { nome: dto.nome.trim() } : {}),
        ...(dto.idPilar ? { idPilar: dto.idPilar } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao?.trim() } : {}),
        ...(dto.dataInicio !== undefined
          ? { dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null }
          : {}),
        ...(dto.dataFimPrevista !== undefined
          ? { dataFimPrevista: dto.dataFimPrevista ? new Date(dto.dataFimPrevista) : null }
          : {}),
        ...(dto.horasEstimadasTotais !== undefined
          ? { horasEstimadasTotais: dto.horasEstimadasTotais }
          : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        pilar: true,
        _count: {
          select: {
            tarefas: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return this.formatProjetoResponse(atualizado);
  }

  async remove(idUsuario: string, id: string) {
    await this.findOne(idUsuario, id);

    await this.prisma.projeto.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Projeto excluído com sucesso.' };
  }

  private formatProjetoResponse(projeto: any) {
    return {
      id: projeto.id,
      idUsuario: projeto.idUsuario,
      idPilar: projeto.idPilar,
      nome: projeto.nome,
      descricao: projeto.descricao,
      dataInicio: projeto.dataInicio ? projeto.dataInicio.toISOString().slice(0, 10) : null,
      dataFimPrevista: projeto.dataFimPrevista
        ? projeto.dataFimPrevista.toISOString().slice(0, 10)
        : null,
      horasEstimadasTotais: projeto.horasEstimadasTotais
        ? Number(projeto.horasEstimadasTotais)
        : null,
      status: projeto.status,
      pilar: {
        idPilar: projeto.pilar.id,
        codigo: projeto.pilar.codigo,
        nome: projeto.pilar.nome,
        corHex: projeto.pilar.corHex,
        corFundoHex: projeto.pilar.corFundoHex,
        icone: projeto.pilar.icone,
      },
      totalTarefas: projeto._count?.tarefas ?? 0,
      createdAt: projeto.createdAt,
      updatedAt: projeto.updatedAt,
    };
  }
}
