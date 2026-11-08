import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'a3f9c8d7e6b5...',
    description: 'Refresh token opaco emitido na sessão anterior.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({
    example: 'a3f9c8d7e6b5...',
    description:
      'Se informado, revoga apenas esta sessão; caso omitido, revoga todas as sessões ativas do usuário.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
