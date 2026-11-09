import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { UsuarioProfileResponseDto } from '../auth/dto/auth-response.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('Usuários & Perfil LGPD')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Retorna o perfil do usuário autenticado (sem senhaHash)',
  })
  @ApiResponse({ status: 200, type: UsuarioProfileResponseDto })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UsuarioProfileResponseDto> {
    return this.usuariosService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary:
      'Atualiza nomeCompleto, horasSonoDiarias (4..12 — RF05) e/ou onboardingConcluido',
  })
  @ApiResponse({ status: 200, type: UsuarioProfileResponseDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UsuarioProfileResponseDto> {
    return this.usuariosService.updateMe(user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exclui definitivamente o usuário e todos os seus dados em cascata no PostgreSQL (LGPD — RF05, RNF07)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta excluída definitivamente em cascata.',
  })
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() _dto?: DeleteAccountDto,
  ): Promise<{ message: string }> {
    return this.usuariosService.deleteMe(user.id);
  }
}
