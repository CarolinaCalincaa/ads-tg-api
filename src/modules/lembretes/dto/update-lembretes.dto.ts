import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoLembrete } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateLembreteDto {
  @ApiPropertyOptional({
    description: 'Ativa ou desativa as notificações deste lembrete',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({
    description:
      'Intervalo periódico em minutos para alertas de repetição (ex: 90 para água)',
    example: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  intervaloMinutos?: number | null;

  @ApiPropertyOptional({
    description:
      'Horário fixo diário no formato HH:mm (ex: 22:00 para ritual de sono)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'horarioFixo deve estar no formato HH:mm (ex: 22:00)',
  })
  horarioFixo?: string | null;

  @ApiPropertyOptional({
    description:
      'Início da janela de horário diária permitida no formato HH:mm',
    example: '08:00',
    default: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'janelaInicio deve estar no formato HH:mm (ex: 08:00)',
  })
  janelaInicio?: string;

  @ApiPropertyOptional({
    description: 'Fim da janela de horário diária permitida no formato HH:mm',
    example: '21:00',
    default: '21:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'janelaFim deve estar no formato HH:mm (ex: 21:00)',
  })
  janelaFim?: string;
}

export class ItemLembreteBatchDto extends UpdateLembreteDto {
  @ApiProperty({
    enum: TipoLembrete,
    description: 'Tipo de lembrete a ser configurado',
    example: TipoLembrete.AGUA,
  })
  @IsEnum(TipoLembrete, {
    message: 'tipo deve ser AGUA, ALONGAMENTO, SONO ou FECHAMENTO_SEMANAL.',
  })
  @IsNotEmpty()
  tipo: TipoLembrete;
}

export class UpdateLembretesBatchDto {
  @ApiProperty({
    type: [ItemLembreteBatchDto],
    description: 'Lista de configurações de lembretes para atualização em lote',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemLembreteBatchDto)
  lembretes: ItemLembreteBatchDto[];
}
