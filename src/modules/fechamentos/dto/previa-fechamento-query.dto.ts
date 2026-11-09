import { IsEnum, IsISO8601, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoCicloFechamento } from '@prisma/client';

export class PreviaFechamentoQueryDto {
  @ApiProperty({
    enum: TipoCicloFechamento,
    description: 'Tipo do ciclo do rito de fechamento reflexivo',
    example: TipoCicloFechamento.SEMANAL,
  })
  @IsEnum(TipoCicloFechamento, {
    message: 'tipoCiclo deve ser SEMANAL ou MENSAL.',
  })
  @IsNotEmpty()
  tipoCiclo: TipoCicloFechamento;

  @ApiProperty({
    description: 'Data de referência civil do ciclo (formato YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsISO8601(
    { strict: true },
    { message: 'dataRef deve ser uma data válida no formato YYYY-MM-DD.' },
  )
  @IsNotEmpty()
  dataRef: string;
}
