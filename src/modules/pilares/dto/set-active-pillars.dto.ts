import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class SetActivePillarsDto {
  @ApiProperty({
    description: 'Lista com no máximo 3 IDs de pilares ativos no mês (1..7)',
    example: [2, 5, 7],
    type: [Number],
  })
  @IsArray()
  @ArrayMaxSize(3, { message: 'Selecione apenas 3 pilares por mês!' })
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  idsPilares: number[];
}
