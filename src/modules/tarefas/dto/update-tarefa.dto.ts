import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StatusTarefa } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTarefaDto } from './create-tarefa.dto';

export class UpdateTarefaDto extends PartialType(CreateTarefaDto) {
  @ApiPropertyOptional({
    description: 'Status da tarefa',
    enum: StatusTarefa,
    example: StatusTarefa.CONCLUIDA,
  })
  @IsOptional()
  @IsEnum(StatusTarefa)
  status?: StatusTarefa;
}
