import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PainelService } from './painel.service';

@ApiTags('Painel do Dia & Linha do Tempo')
@ApiBearerAuth()
@Controller('painel')
export class PainelController {
  constructor(private readonly painelService: PainelService) {}

  @Get('dia')
  @ApiOperation({
    summary:
      'Retorna Linha do Tempo unificada do dia, pilares ativos do mês e métricas de fadiga (RF13, RF16, RF17)',
  })
  @ApiQuery({
    name: 'data',
    required: false,
    example: '2026-10-15',
    description: 'Data no formato YYYY-MM-DD (default: hoje)',
  })
  getPainelDia(
    @CurrentUser('id') idUsuario: string,
    @Query('data') data?: string,
  ) {
    return this.painelService.getPainelDia(idUsuario, data);
  }

  @Get('semana')
  @ApiOperation({
    summary:
      'Retorna visão consolidada dos 7 dias da semana (Segunda a Domingo) com taxas de ocupação (RF14)',
  })
  @ApiQuery({
    name: 'dataReferencia',
    required: false,
    example: '2026-10-15',
    description: 'Data de referência para calcular a semana (default: hoje)',
  })
  getPainelSemana(
    @CurrentUser('id') idUsuario: string,
    @Query('dataReferencia') dataReferencia?: string,
  ) {
    return this.painelService.getPainelSemana(idUsuario, dataReferencia);
  }

  @Get('dias-livres')
  @ApiOperation({
    summary:
      'Sugere os 3 melhores dias nos próximos 7 dias com ocupação < 80% para remanejamento (RN02)',
  })
  @ApiQuery({ name: 'dataOrigem', required: true, example: '2026-10-15' })
  @ApiQuery({
    name: 'duracaoMinutos',
    required: false,
    example: 60,
    type: Number,
  })
  getDiasLivres(
    @CurrentUser('id') idUsuario: string,
    @Query('dataOrigem') dataOrigem: string,
    @Query('duracaoMinutos') duracaoMinutos?: string,
  ) {
    const duracao = duracaoMinutos ? parseInt(duracaoMinutos, 10) : 60;
    return this.painelService.getDiasLivres(idUsuario, dataOrigem, duracao);
  }
}
