import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TipoLembrete } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ItemLembreteBatchDto,
  UpdateLembreteDto,
  UpdateLembretesBatchDto,
} from './dto/update-lembretes.dto';
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

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Atualiza configurações de múltiplos lembretes em lote (RF21) aceitando { lembretes: [...] } ou array direto',
  })
  @ApiBody({
    type: UpdateLembretesBatchDto,
    description: 'Payload contendo array de lembretes a serem atualizados',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa e atualizada de lembretes do usuário',
  })
  atualizarConfiguracoesEmLote(
    @CurrentUser('id') idUsuario: string,
    @Body() payload: UpdateLembretesBatchDto | ItemLembreteBatchDto[],
  ) {
    return this.lembretesService.atualizarConfiguracoesEmLote(idUsuario, payload);
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
