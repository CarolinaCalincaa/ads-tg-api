import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCicloFechamento } from '@prisma/client';

export class QueryFechamentosDto {
  @ApiPropertyOptional({
    enum: TipoCicloFechamento,
    description: 'Filtro por tipo de ciclo reflexivo (SEMANAL ou MENSAL)',
    example: TipoCicloFechamento.SEMANAL,
  })
  @IsEnum(TipoCicloFechamento, {
    message: 'tipoCiclo deve ser SEMANAL ou MENSAL.',
  })
  @IsOptional()
  tipoCiclo?: TipoCicloFechamento;
}
