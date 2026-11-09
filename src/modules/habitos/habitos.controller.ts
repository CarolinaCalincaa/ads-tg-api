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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateHabitoDto } from './dto/create-habito.dto';
import { ToggleExecucaoDto } from './dto/toggle-execucao.dto';
import { UpdateHabitoDto } from './dto/update-habito.dto';
import { HabitosService } from './habitos.service';

@ApiTags('Hábitos')
@ApiBearerAuth()
@Controller('habitos')
export class HabitosController {
  constructor(private readonly habitosService: HabitosService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria novo hábito recorrente vinculado a um pilar (RF06)',
  })
  create(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: CreateHabitoDto,
  ) {
    return this.habitosService.create(idUsuario, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista hábitos do usuário com seus streaks atuais calculados',
  })
  @ApiQuery({ name: 'idPilar', required: false, type: Number })
  @ApiQuery({ name: 'statusAtivo', required: false, type: Boolean })
  findAll(
    @CurrentUser('id') idUsuario: string,
    @Query('idPilar') idPilar?: number,
    @Query('statusAtivo') statusAtivo?: boolean,
  ) {
    return this.habitosService.findAll(idUsuario, idPilar, statusAtivo);
  }

  @Get('streak-global')
  @ApiOperation({
    summary:
      'Retorna a sequência atual global de dias ativos do usuário (Card 5 dias 🔥)',
  })
  @ApiQuery({
    name: 'dataReferencia',
    required: false,
    example: '2026-10-15',
  })
  getStreakGlobal(
    @CurrentUser('id') idUsuario: string,
    @Query('dataReferencia') dataReferencia?: string,
  ) {
    return this.habitosService.obterStreakGlobal(idUsuario, dataReferencia);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca hábito por ID',
  })
  findOne(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.habitosService.findOne(idUsuario, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza dados de um hábito existente',
  })
  update(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHabitoDto,
  ) {
    return this.habitosService.update(idUsuario, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exclusão lógica do hábito (soft delete)',
  })
  remove(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.habitosService.remove(idUsuario, id);
  }

  @Put(':id/execucoes/:data')
  @ApiOperation({
    summary:
      'Registra ou alterna execução diária do hábito e recalcula o streak (RF15)',
  })
  @ApiParam({ name: 'id', description: 'ID do hábito (UUID)' })
  @ApiParam({ name: 'data', example: '2026-10-15', description: 'Data civil YYYY-MM-DD' })
  toggleExecucao(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('data') data: string,
    @Body() dto?: ToggleExecucaoDto,
  ) {
    return this.habitosService.toggleExecucao(idUsuario, id, data, dto);
  }
}
