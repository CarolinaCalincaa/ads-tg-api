import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StatusProjeto } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateProjetoDto } from './create-projeto.dto';

export class UpdateProjetoDto extends PartialType(CreateProjetoDto) {
  @ApiPropertyOptional({
    description: 'Status do projeto',
    enum: StatusProjeto,
    example: StatusProjeto.CONCLUIDO,
  })
  @IsOptional()
  @IsEnum(StatusProjeto)
  status?: StatusProjeto;
}
