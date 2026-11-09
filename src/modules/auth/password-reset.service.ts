import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export const FORGOT_PASSWORD_GENERIC_MESSAGE =
  'Se o e-mail estiver cadastrado, um código de recuperação foi enviado.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST') ?? 'localhost';
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 1025);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      ignoreTLS: true,
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
    }

    const codigo = randomInt(100000, 1000000).toString();
    const tokenHash = this.authService.hashTokenSha256(codigo);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // +15 minutos

    await this.prisma.tokenRecuperacaoSenha.create({
      data: {
        idUsuario: usuario.id,
        tokenHash,
        expiresAt,
      },
    });

    const from =
      this.configService.get<string>('SMTP_FROM') ??
      'Produtividade Pessoal <no-reply@produtividade.local>';

    try {
      await this.transporter.sendMail({
        from,
        to: usuario.email,
        subject: 'Código de Recuperação de Senha — Gestão de Produtividade',
        text: `Olá, ${usuario.nomeCompleto}!\n\nSeu código de recuperação de senha é: ${codigo}\nEste código expira em 15 minutos.\n\nCaso não tenha solicitado, ignore este e-mail.`,
        html: `<p>Olá, <strong>${usuario.nomeCompleto}</strong>!</p><p>Seu código de recuperação de senha é: <strong style="font-size:18px;letter-spacing:2px;">${codigo}</strong></p><p>Este código é válido por <strong>15 minutos</strong>.</p>`,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao entregar e-mail SMTP para ${usuario.email}: ${(error as Error).message}`,
      );
    }

    return { message: FORGOT_PASSWORD_GENERIC_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = dto.email.trim().toLowerCase();
    const codigo = dto.codigo.trim();

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new DomainException(
        {
          errorCode: 'RESET_TOKEN_INVALID',
          message: 'Código de recuperação inválido ou expirado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const tokenHash = this.authService.hashTokenSha256(codigo);
    const agora = new Date();

    const registroToken = await this.prisma.tokenRecuperacaoSenha.findFirst({
      where: {
        idUsuario: usuario.id,
        tokenHash,
        usadoEm: null,
        expiresAt: { gt: agora },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!registroToken) {
      throw new DomainException(
        {
          errorCode: 'RESET_TOKEN_INVALID',
          message: 'Código de recuperação inválido ou expirado.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const novaSenhaHash = await argon2.hash(dto.novaSenha, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash: novaSenhaHash },
      });

      await tx.tokenRecuperacaoSenha.update({
        where: { id: registroToken.id },
        data: { usadoEm: agora },
      });

      await tx.sessaoRefresh.updateMany({
        where: {
          idUsuario: usuario.id,
          revokedAt: null,
        },
        data: { revokedAt: agora },
      });
    });

    return {
      message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
    };
  }
}
