import { HttpStatus, Injectable } from '@nestjs/common';
import { IndicadorDependencia, StatusTarefa } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CapacidadeService } from './capacidade.service';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';

@Injectable()
export class TarefasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacidadeService: CapacidadeService,
  ) {}

  async create(idUsuario: string, dto: CreateTarefaDto) {
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

    if (dto.idProjeto) {
      const projeto = await this.prisma.projeto.findFirst({
        where: { id: dto.idProjeto, idUsuario, deletedAt: null },
      });
      if (!projeto) {
        throw new DomainException(
          {
            errorCode: 'RESOURCE_NOT_FOUND',
            message: 'Projeto associado não encontrado.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Validação RN02: Bloqueio estrito quando o dia já ultrapassou o limite saudável de 80%
    if (dto.indicadorDependencia === IndicadorDependencia.MINHAS_ACOES) {
      const capacidadeAtual = await this.capacidadeService.calcularCapacidadeDia(
        idUsuario,
        dto.dataAgendamento,
      );

      if (capacidadeAtual.novosAgendamentosBloqueados) {
        throw new DomainException(
          {
            errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
            message: 'Limite de horas atingido, reagende a atividade.',
            details: {
              data: dto.dataAgendamento,
              minutosComprometidos: capacidadeAtual.minutosComprometidos,
              limiteFadigaMinutos: capacidadeAtual.limiteFadigaMinutos,
              percentualOcupacao: capacidadeAtual.percentualOcupacao,
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    const tarefa = await this.prisma.tarefa.create({
      data: {
        idUsuario,
        idPilar: dto.idPilar,
        idProjeto: dto.idProjeto,
        tipoItem: dto.tipoItem,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim(),
        duracaoEstimadaMinutos: dto.duracaoEstimadaMinutos,
        prioridade: dto.prioridade,
        indicadorDependencia: dto.indicadorDependencia,
        dataAgendamento: new Date(dto.dataAgendamento),
        horarioInicio: dto.horarioInicio?.trim(),
        status: StatusTarefa.PENDENTE,
      },
      include: {
        pilar: true,
        projeto: true,
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        sessoesPomodoro: {
          where: { concluido: true, deletedAt: null },
        },
      },
    });

    const novaCapacidade = await this.capacidadeService.calcularCapacidadeDia(
      idUsuario,
      dto.dataAgendamento,
    );

    return {
      tarefa: this.formatTarefaResponse(tarefa),
      capacidadeDia: novaCapacidade,
    };
  }

  async findAll(
    idUsuario: string,
    filters?: {
      data?: string;
      idProjeto?: string;
      status?: StatusTarefa;
      indicadorDependencia?: IndicadorDependencia;
    },
  ) {
    const tarefas = await this.prisma.tarefa.findMany({
      where: {
        idUsuario,
        deletedAt: null,
        ...(filters?.data ? { dataAgendamento: new Date(filters.data) } : {}),
        ...(filters?.idProjeto ? { idProjeto: filters.idProjeto } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.indicadorDependencia
          ? { indicadorDependencia: filters.indicadorDependencia }
          : {}),
      },
      include: {
        pilar: true,
        projeto: true,
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        sessoesPomodoro: {
          where: { concluido: true, deletedAt: null },
        },
      },
      orderBy: [{ horarioInicio: 'asc' }, { createdAt: 'desc' }],
    });

    return tarefas.map((t) => this.formatTarefaResponse(t));
  }

  async findOne(idUsuario: string, id: string) {
    const tarefa = await this.prisma.tarefa.findFirst({
      where: { id, idUsuario, deletedAt: null },
      include: {
        pilar: true,
        projeto: true,
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        sessoesPomodoro: {
          where: { concluido: true, deletedAt: null },
        },
      },
    });

    if (!tarefa) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Tarefa não encontrada.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatTarefaResponse(tarefa);
  }

  async update(idUsuario: string, id: string, dto: UpdateTarefaDto) {
    const existente = await this.prisma.tarefa.findFirst({
      where: { id, idUsuario, deletedAt: null },
    });

    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Tarefa não encontrada.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

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

    if (dto.idProjeto) {
      const projeto = await this.prisma.projeto.findFirst({
        where: { id: dto.idProjeto, idUsuario, deletedAt: null },
      });
      if (!projeto) {
        throw new DomainException(
          {
            errorCode: 'RESOURCE_NOT_FOUND',
            message: 'Projeto associado não encontrado.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Se estiver remanejando para outra data ou ativando MINHAS_ACOES
    const targetDateStr = dto.dataAgendamento ?? existente.dataAgendamento.toISOString().slice(0, 10);
    const targetDependencia = dto.indicadorDependencia ?? existente.indicadorDependencia;

    const mudouData = dto.dataAgendamento && dto.dataAgendamento !== existente.dataAgendamento.toISOString().slice(0, 10);
    const virouMinhasAcoes = dto.indicadorDependencia === IndicadorDependencia.MINHAS_ACOES && existente.indicadorDependencia !== IndicadorDependencia.MINHAS_ACOES;

    if ((mudouData || virouMinhasAcoes) && targetDependencia === IndicadorDependencia.MINHAS_ACOES) {
      const capacidade = await this.capacidadeService.calcularCapacidadeDia(
        idUsuario,
        targetDateStr,
      );

      if (capacidade.novosAgendamentosBloqueados) {
        throw new DomainException(
          {
            errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
            message: 'Limite de horas atingido, reagende a atividade.',
            details: {
              data: targetDateStr,
              minutosComprometidos: capacidade.minutosComprometidos,
              limiteFadigaMinutos: capacidade.limiteFadigaMinutos,
              percentualOcupacao: capacidade.percentualOcupacao,
            },
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    let concluidaEm: Date | null = existente.concluidaEm;
    if (dto.status === StatusTarefa.CONCLUIDA && existente.status !== StatusTarefa.CONCLUIDA) {
      concluidaEm = new Date();
    } else if (dto.status === StatusTarefa.PENDENTE) {
      concluidaEm = null;
    }

    const atualizada = await this.prisma.tarefa.update({
      where: { id },
      data: {
        ...(dto.nome ? { nome: dto.nome.trim() } : {}),
        ...(dto.idPilar ? { idPilar: dto.idPilar } : {}),
        ...(dto.idProjeto !== undefined ? { idProjeto: dto.idProjeto } : {}),
        ...(dto.tipoItem ? { tipoItem: dto.tipoItem } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao?.trim() } : {}),
        ...(dto.duracaoEstimadaMinutos !== undefined
          ? { duracaoEstimadaMinutos: dto.duracaoEstimadaMinutos }
          : {}),
        ...(dto.prioridade ? { prioridade: dto.prioridade } : {}),
        ...(dto.indicadorDependencia ? { indicadorDependencia: dto.indicadorDependencia } : {}),
        ...(dto.dataAgendamento ? { dataAgendamento: new Date(dto.dataAgendamento) } : {}),
        ...(dto.horarioInicio !== undefined ? { horarioInicio: dto.horarioInicio?.trim() } : {}),
        ...(dto.status ? { status: dto.status, concluidaEm } : {}),
      },
      include: {
        pilar: true,
        projeto: true,
        checklists: {
          where: { deletedAt: null },
          include: {
            itens: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        sessoesPomodoro: {
          where: { concluido: true, deletedAt: null },
        },
      },
    });

    const novaCapacidade = await this.capacidadeService.calcularCapacidadeDia(
      idUsuario,
      targetDateStr,
    );

    return {
      tarefa: this.formatTarefaResponse(atualizada),
      capacidadeDia: novaCapacidade,
    };
  }

  async remove(idUsuario: string, id: string) {
    const existente = await this.prisma.tarefa.findFirst({
      where: { id, idUsuario, deletedAt: null },
    });

    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Tarefa não encontrada.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.tarefa.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const dataStr = existente.dataAgendamento.toISOString().slice(0, 10);
    const novaCapacidade = await this.capacidadeService.calcularCapacidadeDia(
      idUsuario,
      dataStr,
    );

    return {
      message: 'Tarefa excluída com sucesso.',
      capacidadeDia: novaCapacidade,
    };
  }

  public formatTarefaResponse(tarefa: any) {
    const totalItensChecklist =
      tarefa.checklists?.reduce(
        (sum: number, c: any) => sum + (c.itens?.length ?? 0),
        0,
      ) ?? 0;
    const itensConcluidosChecklist =
      tarefa.checklists?.reduce(
        (sum: number, c: any) =>
          sum + (c.itens?.filter((i: any) => i.concluido).length ?? 0),
        0,
      ) ?? 0;

    return {
      id: tarefa.id,
      idUsuario: tarefa.idUsuario,
      idPilar: tarefa.idPilar,
      idProjeto: tarefa.idProjeto,
      tipoItem: tarefa.tipoItem,
      nome: tarefa.nome,
      descricao: tarefa.descricao,
      duracaoEstimadaMinutos: tarefa.duracaoEstimadaMinutos,
      prioridade: tarefa.prioridade,
      indicadorDependencia: tarefa.indicadorDependencia,
      dataAgendamento: tarefa.dataAgendamento.toISOString().slice(0, 10),
      horarioInicio: tarefa.horarioInicio,
      status: tarefa.status,
      concluido: tarefa.status === StatusTarefa.CONCLUIDA,
      concluidaEm: tarefa.concluidaEm,
      pomodorosConcluidos: tarefa.sessoesPomodoro?.length ?? 0,
      pilar: {
        idPilar: tarefa.pilar.id,
        codigo: tarefa.pilar.codigo,
        nome: tarefa.pilar.nome,
        corHex: tarefa.pilar.corHex,
        corFundoHex: tarefa.pilar.corFundoHex,
        icone: tarefa.pilar.icone,
      },
      projeto: tarefa.projeto
        ? {
            id: tarefa.projeto.id,
            nome: tarefa.projeto.nome,
            status: tarefa.projeto.status,
          }
        : null,
      checklists:
        tarefa.checklists?.map((c: any) => ({
          id: c.id,
          titulo: c.titulo,
          ehModelo: c.ehModelo,
          totalItens: c.itens?.length ?? 0,
          itensConcluidos: c.itens?.filter((i: any) => i.concluido).length ?? 0,
          itens:
            c.itens?.map((i: any) => ({
              id: i.id,
              idChecklist: i.idChecklist,
              descricao: i.descricao,
              concluido: i.concluido,
              ordem: i.ordem,
            })) ?? [],
        })) ?? [],
      totalItensChecklist,
      itensConcluidosChecklist,
      createdAt: tarefa.createdAt,
      updatedAt: tarefa.updatedAt,
    };
  }
}
