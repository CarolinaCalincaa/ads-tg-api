import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSessaoPomodoroDto {
  @ApiProperty({
    description: 'UUID da tarefa à qual a sessão Pomodoro está vinculada',
    example: 'd3b07384-d113-4966-bfdc-53d30b6510bb',
  })
  @IsUUID('4', { message: 'idTarefa deve ser um UUID v4 válido.' })
  @IsNotEmpty({ message: 'idTarefa é obrigatório.' })
  idTarefa: string;

  @ApiPropertyOptional({
    description: 'Duração da sessão em minutos (padrão: 25)',
    default: 25,
    minimum: 1,
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'duracaoMinutos deve ser um número inteiro.' })
  @Min(1, { message: 'duracaoMinutos deve ser de pelo menos 1 minuto.' })
  duracaoMinutos?: number = 25;

  @ApiProperty({
    description: 'Timestamp ISO-8601 de início da sessão de foco',
    example: '2026-10-15T14:00:00.000Z',
  })
  @IsDateString(
    {},
    { message: 'dataInicio deve ser uma string de data ISO-8601 válida.' },
  )
  @IsNotEmpty({ message: 'dataInicio é obrigatória.' })
  dataInicio: string;

  @ApiPropertyOptional({
    description: 'Timestamp ISO-8601 de término da sessão de foco',
    example: '2026-10-15T14:25:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dataFim deve ser uma string de data ISO-8601 válida.' },
  )
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Indica se a sessão Pomodoro foi concluída com sucesso',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'concluido deve ser um booleano.' })
  concluido?: boolean = true;
}
