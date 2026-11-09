import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateHabitoDto } from './create-habito.dto';

export class UpdateHabitoDto extends PartialType(CreateHabitoDto) {
  @ApiPropertyOptional({
    description: 'Status ativo do hábito',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  statusAtivo?: boolean;
}
