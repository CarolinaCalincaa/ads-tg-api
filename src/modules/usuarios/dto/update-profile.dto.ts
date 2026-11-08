import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Carolina Calinca',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nomeCompleto?: string;

  @ApiPropertyOptional({
    example: 8,
    minimum: 4,
    maximum: 12,
    description:
      'Média de horas de sono diárias (RF05) para cálculo de capacidade útil RN02: (24 - sono) * 60.',
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(12)
  horasSonoDiarias?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o usuário concluiu o wizard de onboarding.',
  })
  @IsOptional()
  @IsBoolean()
  onboardingConcluido?: boolean;
}
