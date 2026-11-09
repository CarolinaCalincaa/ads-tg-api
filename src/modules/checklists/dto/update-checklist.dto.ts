import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateChecklistDto {
  @ApiPropertyOptional({ description: 'Título da checklist', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titulo?: string;

  @ApiPropertyOptional({ description: 'Indica se é um Modelo de Processo Reutilizável' })
  @IsOptional()
  @IsBoolean()
  ehModelo?: boolean;
}

export class UpdateItemChecklistDto {
  @ApiPropertyOptional({ description: 'Descrição do item', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @ApiPropertyOptional({ description: 'Status de conclusão do item (RF20)' })
  @IsOptional()
  @IsBoolean()
  concluido?: boolean;

  @ApiPropertyOptional({ description: 'Ordem de exibição' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordem?: number;
}

export class CloneChecklistDto {
  @ApiPropertyOptional({ description: 'ID da tarefa de destino', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idTarefa?: string;

  @ApiPropertyOptional({ description: 'ID do hábito de destino', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idHabito?: string;
}
