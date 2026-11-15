import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCicloFechamento } from '@prisma/client';

export class UpsertFechamentoDto {
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
    description:
      'Data de referência civil de início do ciclo (YYYY-MM-DD)',
    example: '2026-10-06',
  })
  @IsISO8601(
    { strict: true },
    { message: 'dataInicioCiclo deve ser uma data válida no formato YYYY-MM-DD.' },
  )
  @IsOptional()
  dataInicioCiclo?: string;

  @ApiPropertyOptional({
    description:
      'Alias de compatibilidade para dataInicioCiclo (YYYY-MM-DD).',
    example: '2026-10-06',
  })
  @IsISO8601(
    { strict: true },
    { message: 'dataInicio deve ser uma data válida no formato YYYY-MM-DD.' },
  )
  @IsOptional()
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data civil de fim do ciclo (YYYY-MM-DD).',
    example: '2026-10-12',
  })
  @IsString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Rótulo legível do período do ciclo.',
    example: '06 — 12 de outubro',
  })
  @IsString()
  @IsOptional()
  rotuloPeriodo?: string;

  @ApiPropertyOptional({
    description:
      'Data civil em que o fechamento foi realizado (YYYY-MM-DD). Padrão: hoje.',
    example: '2026-10-12',
  })
  @IsISO8601(
    { strict: true },
    { message: 'dataFechamento deve ser uma data válida no formato YYYY-MM-DD.' },
  )
  @IsOptional()
  dataFechamento?: string;

  @ApiPropertyOptional({
    description: '1. Ação que funcionou bem no ciclo (Mockup 02 / RF22)',
    example: 'Manter o ritual matinal sem telas das 06:30 às 07:00.',
  })
  @IsString()
  @IsOptional()
  acaoFuncionouBem?: string;

  @ApiPropertyOptional({
    description: '2. O que farei diferente no próximo ciclo (Mockup 02 / RF22)',
    example: 'Evitar marcar reuniões longas antes do almoço.',
  })
  @IsString()
  @IsOptional()
  oqueFazerDiferente?: string;

  @ApiPropertyOptional({
    description: '3. Vitória a reconhecer no ciclo (Mockup 02 / RF22)',
    example: 'Entreguei o capítulo de arquitetura do TCC sem atraso.',
  })
  @IsString()
  @IsOptional()
  vitoriaReconhecer?: string;

  @ApiPropertyOptional({
    description: '4. Fracasso a aceitar e aprender com ele (Mockup 02 / RF22)',
    example: 'Não consegui fazer os 3 treinos de corrida na semana por cansaço.',
  })
  @IsString()
  @IsOptional()
  fracassoAceitar?: string;

  @ApiPropertyOptional({
    description:
      'Snapshot opcional de dados consolidado enviado pelo cliente. Se omitido, a API consolida automaticamente a prévia calculada.',
  })
  @IsOptional()
  dadosConsolidados?: Record<string, unknown>;
}
