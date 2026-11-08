import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const PASSWORD_STRENGTH_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_STRENGTH_MESSAGE =
  'A senha deve possuir no mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial.';

export class RegisterDto {
  @ApiProperty({
    example: 'Carolina Calinca',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  nomeCompleto!: string;

  @ApiProperty({
    example: 'carolina@fatec.sp.gov.br',
    maxLength: 150,
  })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    example: 'Fatec@2026!',
    description:
      'Mínimo 8 caracteres, com 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial (RF02).',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message: PASSWORD_STRENGTH_MESSAGE,
  })
  senha!: string;

  @ApiPropertyOptional({
    example: 8,
    minimum: 4,
    maximum: 12,
    default: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(12)
  horasSonoDiarias?: number;
}
