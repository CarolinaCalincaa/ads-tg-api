import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { Public } from '../../common/decorators/public.decorator';
import { SetActivePillarsDto } from './dto/set-active-pillars.dto';
import { PilaresService } from './pilares.service';

@ApiTags('Pilares')
@Controller('pilares')
export class PilaresController {
  constructor(private readonly pilaresService: PilaresService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lista os 7 Pilares Mestres de Vida (PilarVida)',
  })
  findAll() {
    return this.pilaresService.findAll();
  }

  @ApiBearerAuth()
  @Get('ativos')
  @ApiOperation({
    summary: 'Lista os pilares ativos do usuário no mês (máximo 3 — RN01)',
  })
  @ApiQuery({
    name: 'mesAno',
    required: false,
    example: '2026-10-01',
    description: 'Chave mensal no formato YYYY-MM-01 (ou YYYY-MM)',
  })
  findActive(
    @CurrentUser('id') idUsuario: string,
    @Query('mesAno') mesAno?: string,
  ) {
    return this.pilaresService.findActivePillars(idUsuario, mesAno);
  }

  @ApiBearerAuth()
  @Put('ativos/:mesAno')
  @ApiOperation({
    summary: 'Define a lista de até 3 pilares ativos para o mês (RN01)',
  })
  @ApiParam({
    name: 'mesAno',
    example: '2026-10-01',
    description: 'Chave mensal YYYY-MM-01',
  })
  setActive(
    @CurrentUser('id') idUsuario: string,
    @Param('mesAno') mesAno: string,
    @Body() dto: SetActivePillarsDto,
  ) {
    return this.pilaresService.setActivePillars(idUsuario, mesAno, dto);
  }

  @ApiBearerAuth()
  @Post('ativos/:mesAno/toggle/:idPilar')
  @ApiOperation({
    summary:
      'Alterna (ativa/desativa) um pilar específico no mês com validação estrita RN01 (HTTP 422)',
  })
  @ApiParam({ name: 'mesAno', example: '2026-10-01' })
  @ApiParam({ name: 'idPilar', example: 2, description: 'ID do pilar (1..7)' })
  toggleActive(
    @CurrentUser('id') idUsuario: string,
    @Param('mesAno') mesAno: string,
    @Param('idPilar', ParseIntPipe) idPilar: number,
  ) {
    return this.pilaresService.toggleActivePillar(idUsuario, mesAno, idPilar);
  }
}
