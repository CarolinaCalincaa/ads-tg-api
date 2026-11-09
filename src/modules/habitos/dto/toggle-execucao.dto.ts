import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleExecucaoDto {
  @ApiPropertyOptional({
    description:
      'Status de conclusão do hábito no dia (se omitido, inverte o status atual)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  concluido?: boolean;
}
