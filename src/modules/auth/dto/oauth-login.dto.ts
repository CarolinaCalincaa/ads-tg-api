import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OAuthLoginDto {
  @ApiPropertyOptional({
    example: 'mock-google-token:carolina.oauth@fatec.sp.gov.br:Carolina OAuth',
    description: 'ID Token emitido pelo provedor OAuth 2.0 (Google ou Apple).',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    example: 'mock-apple-token:carolina.apple@fatec.sp.gov.br:Carolina Apple',
    description: 'Alias compatível com Apple Sign-In (identityToken).',
  })
  @IsOptional()
  @IsString()
  identityToken?: string;

  @ApiPropertyOptional({
    example: 'Carolina Calinca',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nomeCompleto?: string;

  @ApiPropertyOptional({
    example: 'Carolina Calinca',
    maxLength: 150,
    description: 'Alias compatível com Apple Sign-In (fullName).',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;
}
