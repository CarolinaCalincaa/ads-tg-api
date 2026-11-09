import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PreviaFechamentoQueryDto } from './dto/previa-fechamento-query.dto';
import { QueryFechamentosDto } from './dto/query-fechamentos.dto';
import { UpsertFechamentoDto } from './dto/upsert-fechamento.dto';
import { FechamentosService } from './fechamentos.service';

@ApiTags('Fechamentos Reflexivos')
@ApiBearerAuth()
@Controller('fechamentos')
export class FechamentosController {
  constructor(private readonly fechamentosService: FechamentosService) {}

  @Get('previa')
  @ApiOperation({
    summary:
      'Retorna métricas pré-calculadas do ciclo (Semanal ou Mensal) e reflexões já salvas (RF22)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Métricas calculadas do ciclo (habitosConcluidos, consistenciaPercentual, diasAtivos, sequenciaAtualDias).',
  })
  obterPrevia(
    @CurrentUser('id') idUsuario: string,
    @Query() query: PreviaFechamentoQueryDto,
  ) {
    return this.fechamentosService.obterPrevia(idUsuario, query);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Upsert de fechamento reflexivo com snapshot de métricas JSONB (RF22, RF23)',
  })
  @ApiResponse({
    status: 200,
    description: 'Fechamento reflexivo persistido com sucesso.',
  })
  upsert(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: UpsertFechamentoDto,
  ) {
    return this.fechamentosService.upsert(idUsuario, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista histórico cronológico reverso de fechamentos (RF23)',
  })
  @ApiQuery({
    name: 'tipoCiclo',
    required: false,
    enum: ['SEMANAL', 'MENSAL'],
    description: 'Filtro opcional por tipo de ciclo',
  })
  findAll(
    @CurrentUser('id') idUsuario: string,
    @Query() query: QueryFechamentosDto,
  ) {
    return this.fechamentosService.findAll(idUsuario, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retorna detalhe de um fechamento reflexivo por ID',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do fechamento',
  })
  findOne(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.fechamentosService.findOne(idUsuario, id);
  }
}
