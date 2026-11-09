import {
  Body,
  Controller,
  Get,
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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSessaoPomodoroDto } from './dto/create-sessao-pomodoro.dto';
import { PomodoroService } from './pomodoro.service';

@ApiTags('Temporizador Pomodoro')
@ApiBearerAuth()
@Controller('pomodoro')
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post('sessoes')
  @ApiOperation({
    summary:
      'Registra a conclusão de uma sessão de foco Pomodoro vinculada a uma tarefa',
  })
  registrarSessao(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: CreateSessaoPomodoroDto,
  ) {
    return this.pomodoroService.registrarSessao(idUsuario, dto);
  }

  @Get('tarefa/:idTarefa')
  @ApiOperation({
    summary: 'Lista o histórico de sessões Pomodoro de uma tarefa',
  })
  @ApiParam({
    name: 'idTarefa',
    description: 'UUID da tarefa',
    example: 'd3b07384-d113-4966-bfdc-53d30b6510bb',
  })
  listarSessoesTarefa(
    @CurrentUser('id') idUsuario: string,
    @Param('idTarefa', ParseUUIDPipe) idTarefa: string,
  ) {
    return this.pomodoroService.listarSessoesTarefa(idUsuario, idTarefa);
  }

  @Get('total-minutos-foco')
  @ApiOperation({
    summary:
      'Retorna o total de minutos de foco Pomodoro acumulados na data especificada',
  })
  @ApiQuery({
    name: 'data',
    required: false,
    example: '2026-10-15',
    description: 'Data no formato YYYY-MM-DD (default: hoje)',
  })
  obterTotalMinutosFoco(
    @CurrentUser('id') idUsuario: string,
    @Query('data') data?: string,
  ) {
    return this.pomodoroService.obterTotalMinutosFoco(idUsuario, data);
  }
}
