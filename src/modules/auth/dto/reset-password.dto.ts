import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_STRENGTH_MESSAGE,
  PASSWORD_STRENGTH_REGEX,
} from './register.dto';

export class ResetPasswordDto {
  @ApiProperty({ example: 'carolina@fatec.sp.gov.br' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Código numérico temporário de 6 dígitos enviado por e-mail.',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'O código de recuperação deve conter exatamente 6 dígitos numéricos.',
  })
  codigo!: string;

  @ApiProperty({
    example: 'NovaSenha@2026!',
    description:
      'Nova senha forte atendendo aos critérios RF02 (mínimo 8 caracteres, maiúscula, minúscula, número e especial).',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_STRENGTH_REGEX, {
    message: PASSWORD_STRENGTH_MESSAGE,
  })
  novaSenha!: string;
}
