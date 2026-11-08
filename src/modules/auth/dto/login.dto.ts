import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'carolina@fatec.sp.gov.br' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  @MaxLength(150)
  email!: string;

  @ApiProperty({ example: 'Fatec@2026!' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MaxLength(128)
  senha!: string;
}
