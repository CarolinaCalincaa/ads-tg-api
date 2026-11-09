import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Confirmação opcional de exclusão definitiva da conta (LGPD — RNF07).',
  })
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;

  @ApiPropertyOptional({
    example: 'EXCLUIR',
    description: 'Texto de confirmação opcional.',
  })
  @IsOptional()
  @IsString()
  confirmacaoTexto?: string;
}
