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
import { StatusProjeto } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { ProjetosService } from './projetos.service';

@ApiTags('Projetos')
@ApiBearerAuth()
@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Post()
  @ApiOperation({ summary: 'Cria novo projeto vinculado a um pilar (RF15)' })
  create(
    @CurrentUser('id') idUsuario: string,
    @Body() dto: CreateProjetoDto,
  ) {
    return this.projetosService.create(idUsuario, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista projetos do usuário' })
  @ApiQuery({ name: 'status', enum: StatusProjeto, required: false })
  findAll(
    @CurrentUser('id') idUsuario: string,
    @Query('status') status?: StatusProjeto,
  ) {
    return this.projetosService.findAll(idUsuario, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca projeto por ID' })
  findOne(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projetosService.findOne(idUsuario, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza dados ou status do projeto' })
  update(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjetoDto,
  ) {
    return this.projetosService.update(idUsuario, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exclusão lógica do projeto (soft delete)' })
  remove(
    @CurrentUser('id') idUsuario: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projetosService.remove(idUsuario, id);
  }
}
