import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateItemChecklistDto {
  @ApiProperty({ description: 'Descrição do item', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descricao: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ordem?: number;
}

export class CreateChecklistDto {
  @ApiProperty({ description: 'Título da checklist', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  titulo: string;

  @ApiPropertyOptional({ description: 'ID da tarefa associada', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idTarefa?: string;

  @ApiPropertyOptional({ description: 'ID do hábito associado', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idHabito?: string;

  @ApiPropertyOptional({
    description: 'Indica se é um Modelo de Processo Reutilizável (RF19)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  ehModelo?: boolean = false;

  @ApiPropertyOptional({
    description: 'Itens iniciais da checklist',
    type: [CreateItemChecklistDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemChecklistDto)
  itens?: CreateItemChecklistDto[];
}
