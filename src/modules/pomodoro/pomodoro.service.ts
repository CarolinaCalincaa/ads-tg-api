import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessaoPomodoroDto } from './dto/create-sessao-pomodoro.dto';

@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  async registrarSessao(idUsuario: string, dto: CreateSessaoPomodoroDto) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: {
        id: dto.idTarefa,
        idUsuario,
        deletedAt: null,
      },
    });

    if (!tarefa) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Tarefa associada não encontrada ou não pertence ao usuário.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.sessaoPomodoro.create({
      data: {
        idUsuario,
        idTarefa: dto.idTarefa,
        duracaoMinutos: dto.duracaoMinutos ?? 25,
        dataInicio: new Date(dto.dataInicio),
        dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
        concluido: dto.concluido ?? true,
      },
      include: {
        tarefa: {
          select: {
            id: true,
            nome: true,
            idPilar: true,
          },
        },
      },
    });
  }

  async listarSessoesTarefa(idUsuario: string, idTarefa: string) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: {
        id: idTarefa,
        idUsuario,
        deletedAt: null,
      },
    });

    if (!tarefa) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Tarefa não encontrada ou não pertence ao usuário.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.sessaoPomodoro.findMany({
      where: {
        idTarefa,
        idUsuario,
        deletedAt: null,
      },
      orderBy: { dataInicio: 'desc' },
    });
  }

  async obterTotalMinutosFoco(idUsuario: string, dataStr?: string) {
    const dataRef = dataStr ?? new Date().toISOString().slice(0, 10);
    const inicioDia = new Date(`${dataRef}T00:00:00.000Z`);
    const fimDia = new Date(`${dataRef}T23:59:59.999Z`);

    const sessoes = await this.prisma.sessaoPomodoro.findMany({
      where: {
        idUsuario,
        concluido: true,
        deletedAt: null,
        dataInicio: {
          gte: inicioDia,
          lte: fimDia,
        },
      },
      select: {
        id: true,
        duracaoMinutos: true,
        dataInicio: true,
        dataFim: true,
        idTarefa: true,
      },
      orderBy: { dataInicio: 'asc' },
    });

    const totalMinutosFoco = sessoes.reduce(
      (acc, s) => acc + s.duracaoMinutos,
      0,
    );
    const totalSessoes = sessoes.length;

    return {
      data: dataRef,
      totalMinutosFoco,
      totalSessoes,
      sessoes,
    };
  }
}
