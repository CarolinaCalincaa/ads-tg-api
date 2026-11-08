import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'carolina@fatec.sp.gov.br' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  @MaxLength(150)
  email!: string;
}
