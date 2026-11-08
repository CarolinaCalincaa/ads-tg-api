import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
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
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthService } from './oauth.service';
import { PasswordResetService } from './password-reset.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary:
      'Cadastra novo usuário com validação de força de senha (RF01, RF02) e 4 lembretes padrão',
  })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({
    status: 409,
    description: 'EMAIL_ALREADY_REGISTERED — E-mail já cadastrado.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica usuário com e-mail e senha (RF03, RNF05)',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({
    status: 401,
    description: 'INVALID_CREDENTIALS — E-mail ou senha incorretos.',
  })
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, userAgent);
  }

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica ou cria usuário via OAuth 2.0 Google ID Token (RF03)',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async oauthGoogle(
    @Body() dto: OAuthLoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.oauthService.authenticateGoogle(dto, userAgent);
  }

  @Public()
  @Post('oauth/apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica ou cria usuário via OAuth 2.0 Apple ID Token (RF03)',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async oauthApple(
    @Body() dto: OAuthLoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.oauthService.authenticateApple(dto, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rotaciona o Refresh Token opaco (SHA-256) e emite novo par de tokens (ADR-005)',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({
    status: 401,
    description: 'TOKEN_EXPIRED_OR_INVALID — Refresh token inválido/revogado.',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(dto, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoga a sessão de refresh token do usuário autenticado',
  })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto?: LogoutDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id, dto?.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Gera código temporário de 6 dígitos (15 min) e envia por e-mail via SMTP/Mailpit (RF04)',
  })
  @ApiResponse({ status: 200, description: 'Mensagem padrão de envio.' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Valida código de 6 dígitos, redefine senha com Argon2id e revoga sessões (RF04)',
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'RESET_TOKEN_INVALID — Código inválido ou expirado.',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.passwordResetService.resetPassword(dto);
  }
}
