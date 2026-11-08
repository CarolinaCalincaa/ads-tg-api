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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChecklistsService } from './checklists.service';
import {
  CreateChecklistDto,
  CreateItemChecklistDto,
} from './dto/create-checklist.dto';
import {
  CloneChecklistDto,
  UpdateChecklistDto,
  UpdateItemChecklistDto,
} from './dto/update-checklist.dto';

@ApiTags('Checklists & Modelos de Processos')
@ApiBearerAuth()
@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria nova checklist vinculada ou modelo de processo (RF19)' })
  create(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistsService.create(idUsuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista checklists com filtro opcional por modelo ou tarefa' })
  @ApiQuery({ name: 'ehModelo', type: Boolean, required: false })
  @ApiQuery({ name: 'idTarefa', type: String, required: false })
  @ApiQuery({ name: 'idHabito', type: String, required: false })
  findAll(
    @CurrentUser('id') idUsuario: string,
    @Query('ehModelo') ehModelo?: string,
    @Query('idTarefa') idTarefa?: string,
    @Query('idHabito') idHabito?: string,
  ) {
    const isModeloBool =
      ehModelo !== undefined
        ? ehModelo === 'true' || ehModelo === '1'
        : undefined;

    return this.checklistsService.findAll(idUsuario, {
      ehModelo: isModeloBool,
      idTarefa,
      idHabito,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca checklist com seus itens' })
  findOne(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checklistsService.findOne(idUsuario, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza título ou flag de modelo da checklist' })
  update(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChecklistDto,
  ) {
    return this.checklistsService.update(idUsuario, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exclusão lógica da checklist' })
  remove(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checklistsService.remove(idUsuario, id);
  }

  @Post(':id/clonar')
  @ApiOperation({
    summary:
      'Clona um modelo de processo reutilizável para dentro de uma tarefa ou hábito (RF19)',
  })
  clone(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneChecklistDto,
  ) {
    return this.checklistsService.clone(idUsuario, id, dto);
  }

  @Post(':id/itens')
  @ApiOperation({ summary: 'Adiciona novo item à checklist' })
  addItem(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateItemChecklistDto,
  ) {
    return this.checklistsService.addItem(idUsuario, id, dto);
  }

  @Patch(':id/itens/:itemId')
  @ApiOperation({
    summary:
      'Marca/desmarca item individual diretamente pela linha do tempo (RF20)',
  })
  updateItem(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemChecklistDto,
  ) {
    return this.checklistsService.updateItem(idUsuario, id, itemId, dto);
  }

  @Delete(':id/itens/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item da checklist' })
  removeItem(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.checklistsService.removeItem(idUsuario, id, itemId);
  }
}
