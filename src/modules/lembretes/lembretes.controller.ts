import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { TipoLembrete } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateLembreteDto } from './dto/update-lembretes.dto';
import { LembretesService } from './lembretes.service';

@ApiTags('Lembretes')
@ApiBearerAuth()
@Controller('lembretes')
export class LembretesController {
  constructor(private readonly lembretesService: LembretesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Retorna as preferências configuradas dos 4 tipos de lembrete (AGUA, ALONGAMENTO, SONO, FECHAMENTO_SEMANAL)',
  })
  obterConfiguracoes(@CurrentUser('id') idUsuario: string) {
    return this.lembretesService.obterConfiguracoes(idUsuario);
  }

  @Put(':tipo')
  @ApiOperation({
    summary: 'Atualiza a configuração de um tipo específico de lembrete (RF21)',
  })
  @ApiParam({
    name: 'tipo',
    enum: TipoLembrete,
    example: TipoLembrete.AGUA,
    description: 'Tipo de lembrete a ser configurado',
  })
  atualizarConfiguracao(
    @CurrentUser('id') idUsuario: string,
    @Param('tipo', new ParseEnumPipe(TipoLembrete)) tipo: TipoLembrete,
    @Body() dto: UpdateLembreteDto,
  ) {
    return this.lembretesService.atualizarConfiguracao(idUsuario, tipo, dto);
  }
}
