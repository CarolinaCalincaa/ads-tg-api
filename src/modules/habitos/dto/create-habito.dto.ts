import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateHabitoDto {
  @ApiProperty({
    description: 'Nome do hábito recorrente',
    example: 'Ritual matinal sem telas',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @ApiProperty({
    description: 'ID do pilar de vida ao qual o hábito pertence (1..7)',
    example: 1,
    minimum: 1,
    maximum: 7,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  idPilar: number;

  @ApiProperty({
    description: 'Duração estimada em minutos para execução do hábito',
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  duracaoEstimadaMinutos: number;

  @ApiProperty({
    description:
      'Dias da semana em que o hábito é programado (1=Segunda .. 7=Domingo)',
    example: [1, 2, 3, 4, 5, 6, 7],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  diasSemana: number[];

  @ApiPropertyOptional({
    description: 'Frequência semanal desejada (1..7)',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  frequenciaSemanal?: number;

  @ApiPropertyOptional({
    description: 'Horário padrão sugerido no formato HH:mm',
    example: '06:30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horarioPadrao deve estar no formato HH:mm (ex: 07:30)',
  })
  horarioPadrao?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do hábito ou instruções de execução',
    example: '30 minutos de hidratação, leitura analógica e luz natural.',
  })
  @IsOptional()
  @IsString()
  descricao?: string;
}
