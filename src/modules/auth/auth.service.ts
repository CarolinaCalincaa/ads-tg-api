import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, ProvedorOAuth, TipoLembrete, Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthResponseDto,
  UsuarioProfileResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

export const DEFAULT_LEMBRETES_CONFIG: Array<{
  tipo: TipoLembrete;
  ativo: boolean;
  intervaloMinutos: number | null;
  horarioFixo: string | null;
  janelaInicio: string;
  janelaFim: string;
}> = [
  {
    tipo: TipoLembrete.AGUA,
    ativo: true,
    intervaloMinutos: 90,
    horarioFixo: null,
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
  {
    tipo: TipoLembrete.ALONGAMENTO,
    ativo: true,
    intervaloMinutos: 120,
    horarioFixo: null,
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
  {
    tipo: TipoLembrete.SONO,
    ativo: true,
    intervaloMinutos: null,
    horarioFixo: '22:00',
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
  {
    tipo: TipoLembrete.FECHAMENTO_SEMANAL,
    ativo: true,
    intervaloMinutos: null,
    horarioFixo: '19:00',
    janelaInicio: '08:00',
    janelaFim: '21:00',
  },
];

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const existente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (existente) {
      throw new DomainException(
        {
          errorCode: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este endereço de e-mail já está cadastrado.',
        },
        HttpStatus.CONFLICT,
      );
    }

    const senhaHash = await argon2.hash(dto.senha, {
      type: argon2.argon2id,
    });

    const { rawRefreshToken, tokenHash, expiresAt } =
      this.generateRefreshTokenData();

    const usuario = await this.prisma.$transaction(async (tx) => {
      const novoUsuario = await tx.usuario.create({
        data: {
          nomeCompleto: dto.nomeCompleto.trim(),
          email,
          senhaHash,
          provedorOauth: ProvedorOAuth.LOCAL,
          horasSonoDiarias: dto.horasSonoDiarias ?? 8,
        },
      });

      await this.seedDefaultLembretes(tx, novoUsuario.id);

      await tx.sessaoRefresh.create({
        data: {
          idUsuario: novoUsuario.id,
          tokenHash,
          userAgent: userAgent?.slice(0, 255) ?? null,
          expiresAt,
        },
      });

      return novoUsuario;
    });

    const accessToken = await this.signAccessToken(usuario);

    return {
      usuario: this.toUsuarioProfile(usuario),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario || !usuario.senhaHash) {
      throw new DomainException(
        {
          errorCode: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha inválidos.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const senhaValida = await argon2.verify(usuario.senhaHash, dto.senha);
    if (!senhaValida) {
      throw new DomainException(
        {
          errorCode: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha inválidos.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueSessionForUser(usuario, userAgent);
  }

  async refresh(
    dto: RefreshTokenDto,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const incomingHash = this.hashTokenSha256(dto.refreshToken);

    const sessaoAtual = await this.prisma.sessaoRefresh.findUnique({
      where: { tokenHash: incomingHash },
      include: { usuario: true },
    });

    const agora = new Date();
    if (
      !sessaoAtual ||
      sessaoAtual.revokedAt !== null ||
      sessaoAtual.expiresAt <= agora
    ) {
      throw new DomainException(
        {
          errorCode: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Refresh token expirado, revogado ou inválido.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { rawRefreshToken, tokenHash, expiresAt } =
      this.generateRefreshTokenData();

    await this.prisma.$transaction(async (tx) => {
      await tx.sessaoRefresh.update({
        where: { id: sessaoAtual.id },
        data: { revokedAt: agora },
      });

      await tx.sessaoRefresh.create({
        data: {
          idUsuario: sessaoAtual.idUsuario,
          tokenHash,
          userAgent: userAgent?.slice(0, 255) ?? null,
          expiresAt,
        },
      });
    });

    const accessToken = await this.signAccessToken(sessaoAtual.usuario);

    return {
      usuario: this.toUsuarioProfile(sessaoAtual.usuario),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async logout(
    idUsuario: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    const agora = new Date();

    if (refreshToken && refreshToken.trim().length > 0) {
      const tokenHash = this.hashTokenSha256(refreshToken.trim());
      await this.prisma.sessaoRefresh.updateMany({
        where: {
          idUsuario,
          tokenHash,
          revokedAt: null,
        },
        data: { revokedAt: agora },
      });
    } else {
      await this.prisma.sessaoRefresh.updateMany({
        where: {
          idUsuario,
          revokedAt: null,
        },
        data: { revokedAt: agora },
      });
    }

    return { message: 'Sessão encerrada com sucesso.' };
  }

  async issueSessionForUser(
    usuario: Usuario,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { rawRefreshToken, tokenHash, expiresAt } =
      this.generateRefreshTokenData();

    await this.prisma.sessaoRefresh.create({
      data: {
        idUsuario: usuario.id,
        tokenHash,
        userAgent: userAgent?.slice(0, 255) ?? null,
        expiresAt,
      },
    });

    const accessToken = await this.signAccessToken(usuario);

    return {
      usuario: this.toUsuarioProfile(usuario),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async seedDefaultLembretes(
    tx: Prisma.TransactionClient,
    idUsuario: string,
  ): Promise<void> {
    await tx.lembreteConfig.createMany({
      data: DEFAULT_LEMBRETES_CONFIG.map((cfg) => ({
        idUsuario,
        tipo: cfg.tipo,
        ativo: cfg.ativo,
        intervaloMinutos: cfg.intervaloMinutos,
        horarioFixo: cfg.horarioFixo,
        janelaInicio: cfg.janelaInicio,
        janelaFim: cfg.janelaFim,
      })),
      skipDuplicates: true,
    });
  }

  toUsuarioProfile(usuario: Usuario): UsuarioProfileResponseDto {
    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      provedorOauth: usuario.provedorOauth,
      horasSonoDiarias: usuario.horasSonoDiarias,
      onboardingConcluido: usuario.onboardingConcluido,
      dataCadastro: usuario.dataCadastro,
      updatedAt: usuario.updatedAt,
    };
  }

  hashTokenSha256(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private generateRefreshTokenData(): {
    rawRefreshToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawRefreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashTokenSha256(rawRefreshToken);
    const refreshDays = Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 30,
    );
    const expiresAt = new Date(
      Date.now() + refreshDays * 24 * 60 * 60 * 1000,
    );

    return { rawRefreshToken, tokenHash, expiresAt };
  }

  private async signAccessToken(usuario: Usuario): Promise<string> {
    return this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
    });
  }
}
