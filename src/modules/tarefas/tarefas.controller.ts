import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IndicadorDependencia, StatusTarefa } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTarefaDto } from './dto/create-tarefa.dto';
import { UpdateTarefaDto } from './dto/update-tarefa.dto';
import { TarefasService } from './tarefas.service';

@ApiTags('Tarefas & Compromissos')
@ApiBearerAuth()
@Controller('tarefas')
export class TarefasController {
  constructor(private readonly tarefasService: TarefasService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria nova tarefa/compromisso validando RN02 (bloqueia HTTP 422 se dia > 80% para MINHAS_ACOES)',
  })
  create(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: CreateTarefaDto,
  ) {
    return this.tarefasService.create(idUsuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista tarefas com filtros opcionais' })
  @ApiQuery({ name: 'data', required: false, example: '2026-10-15' })
  @ApiQuery({ name: 'idProjeto', required: false })
  @ApiQuery({ name: 'status', enum: StatusTarefa, required: false })
  @ApiQuery({
    name: 'indicadorDependencia',
    enum: IndicadorDependencia,
    required: false,
  })
  findAll(
    @CurrentUser('id') idUsuario: string,
    @Query('data') data?: string,
    @Query('idProjeto') idProjeto?: string,
    @Query('status') status?: StatusTarefa,
    @Query('indicadorDependencia') indicadorDependencia?: IndicadorDependencia,
  ) {
    return this.tarefasService.findAll(idUsuario, {
      data,
      idProjeto,
      status,
      indicadorDependencia,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca tarefa por ID' })
  findOne(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tarefasService.findOne(idUsuario, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualiza campos, status ou remaneja data da tarefa (validando RN02)',
  })
  update(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTarefaDto,
  ) {
    return this.tarefasService.update(idUsuario, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exclusão lógica da tarefa e recalculação de capacidade' })
  remove(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tarefasService.remove(idUsuario, id);
  }
}
