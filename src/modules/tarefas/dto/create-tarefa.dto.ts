import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IndicadorDependencia,
  NivelPrioridade,
  TipoItemAgenda,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTarefaDto {
  @ApiProperty({ description: 'Nome da tarefa ou compromisso', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @ApiProperty({ description: 'Duração estimada em minutos', minimum: 1, example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracaoEstimadaMinutos: number;

  @ApiProperty({ description: 'ID do pilar associado (1 a 7)', minimum: 1, maximum: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  idPilar: number;

  @ApiProperty({
    description: 'Nível de prioridade',
    enum: NivelPrioridade,
    default: NivelPrioridade.PRIORIDADE,
  })
  @IsEnum(NivelPrioridade)
  prioridade: NivelPrioridade = NivelPrioridade.PRIORIDADE;

  @ApiProperty({
    description: 'Indicador de dependência (Minhas Ações vs Em Espera)',
    enum: IndicadorDependencia,
    default: IndicadorDependencia.MINHAS_ACOES,
  })
  @IsEnum(IndicadorDependencia)
  indicadorDependencia: IndicadorDependencia = IndicadorDependencia.MINHAS_ACOES;

  @ApiProperty({ description: 'Data do agendamento (YYYY-MM-DD)', example: '2026-10-15' })
  @IsDateString()
  dataAgendamento: string;

  @ApiProperty({
    description: 'Tipo do item na agenda (Tarefa ou Compromisso)',
    enum: TipoItemAgenda,
    default: TipoItemAgenda.TAREFA,
  })
  @IsEnum(TipoItemAgenda)
  tipoItem: TipoItemAgenda = TipoItemAgenda.TAREFA;

  @ApiPropertyOptional({ description: 'Descrição detalhada' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Horário de início (HH:mm)',
    example: '09:00',
  })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horarioInicio deve estar no formato HH:mm (ex: 09:30).',
  })
  horarioInicio?: string;

  @ApiPropertyOptional({ description: 'ID do projeto associado', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  idProjeto?: string;
}
