import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjetoDto {
  @ApiProperty({ description: 'Nome do projeto', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @ApiProperty({ description: 'ID do pilar associado (1 a 7)', minimum: 1, maximum: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  idPilar: number;

  @ApiPropertyOptional({ description: 'Descrição detalhada do projeto' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Data de início prevista (YYYY-MM-DD)', example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Data de término prevista (YYYY-MM-DD)', example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  dataFimPrevista?: string;

  @ApiPropertyOptional({ description: 'Total de horas estimadas', minimum: 0, example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  horasEstimadasTotais?: number;
}
