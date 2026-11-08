import { ApiProperty } from '@nestjs/swagger';
import { ProvedorOAuth } from '@prisma/client';

export class UsuarioProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Carolina Calinca' })
  nomeCompleto!: string;

  @ApiProperty({ example: 'carolina@fatec.sp.gov.br' })
  email!: string;

  @ApiProperty({ enum: ProvedorOAuth, example: ProvedorOAuth.LOCAL })
  provedorOauth!: ProvedorOAuth;

  @ApiProperty({ example: 8 })
  horasSonoDiarias!: number;

  @ApiProperty({ example: false })
  onboardingConcluido!: boolean;

  @ApiProperty({ example: '2026-11-08T19:00:00.000Z' })
  dataCadastro!: Date;

  @ApiProperty({ example: '2026-11-08T19:00:00.000Z' })
  updatedAt!: Date;
}

export class AuthTokensResponseDto {
  @ApiProperty({ description: 'JWT Access Token (expiração: 15m)' })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh Token opaco rotativo (expiração: 30d)' })
  refreshToken!: string;
}

export class AuthResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: UsuarioProfileResponseDto })
  usuario!: UsuarioProfileResponseDto;
}
