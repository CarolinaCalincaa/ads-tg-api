import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProvedorOAuth } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';

export interface OAuthVerifiedProfile {
  sub: string;
  email: string;
  name: string;
  provider: ProvedorOAuth;
}

@Injectable()
export class OAuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId || undefined);
  }

  async authenticateGoogle(
    dto: OAuthLoginDto,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const rawToken = (dto.idToken ?? dto.identityToken ?? '').trim();
    const fallbackName = (dto.nomeCompleto ?? dto.fullName)?.trim();

    if (!rawToken) {
      throw new DomainException(
        {
          errorCode: 'VALIDATION_ERROR',
          message: 'O token OAuth do Google (idToken) é obrigatório.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const profile = await this.verifyGoogleToken(rawToken, fallbackName);
    return this.upsertOAuthUserAndIssueSession(profile, userAgent);
  }

  async authenticateApple(
    dto: OAuthLoginDto,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const rawToken = (dto.idToken ?? dto.identityToken ?? '').trim();
    const fallbackName = (dto.nomeCompleto ?? dto.fullName)?.trim();

    if (!rawToken) {
      throw new DomainException(
        {
          errorCode: 'VALIDATION_ERROR',
          message: 'O token OAuth da Apple (idToken) é obrigatório.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const profile = await this.verifyAppleToken(rawToken, fallbackName);
    return this.upsertOAuthUserAndIssueSession(profile, userAgent);
  }

  private async verifyGoogleToken(
    idToken: string,
    fallbackName?: string,
  ): Promise<OAuthVerifiedProfile> {
    if (this.isDevMockEnabled() && idToken.startsWith('mock-google-token')) {
      return this.parseMockToken(
        idToken,
        ProvedorOAuth.GOOGLE,
        fallbackName ?? 'Usuário Google',
      );
    }

    // 1. Suporte a Access Token OAuth2 (quando emitido pelo GIS TokenClient na Web)
    const isJwt = idToken.split('.').length === 3;
    if (!isJwt) {
      try {
        const response = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );

        if (response.ok) {
          const data = (await response.json()) as {
            sub?: string;
            email?: string;
            name?: string;
            picture?: string;
          };

          if (data.sub && data.email) {
            return {
              sub: data.sub,
              email: data.email.trim().toLowerCase(),
              name:
                data.name?.trim() ||
                fallbackName ||
                data.email.split('@')[0] ||
                'Usuário Google',
              provider: ProvedorOAuth.GOOGLE,
            };
          }
        }
      } catch {
        // Caso falhe, tenta o fluxo com verifyIdToken abaixo
      }
    }

    try {
      const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: googleClientId || undefined,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Payload Google incompleto.');
      }

      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name:
          payload.name?.trim() ||
          fallbackName ||
          payload.email.split('@')[0] ||
          'Usuário Google',
        provider: ProvedorOAuth.GOOGLE,
      };
    } catch {
      throw new DomainException(
        {
          errorCode: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Token OAuth do Google inválido ou expirado.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async verifyAppleToken(
    idToken: string,
    fallbackName?: string,
  ): Promise<OAuthVerifiedProfile> {
    if (this.isDevMockEnabled() && idToken.startsWith('mock-apple-token')) {
      return this.parseMockToken(
        idToken,
        ProvedorOAuth.APPLE,
        fallbackName ?? 'Usuário Apple',
      );
    }

    try {
      const segments = idToken.split('.');
      if (segments.length !== 3) {
        throw new Error('Formato JWT Apple inválido.');
      }

      const payloadJson = Buffer.from(segments[1], 'base64url').toString(
        'utf8',
      );
      const payload = JSON.parse(payloadJson) as {
        iss?: string;
        sub?: string;
        email?: string;
        exp?: number;
      };

      if (
        payload.iss !== 'https://appleid.apple.com' ||
        !payload.sub ||
        !payload.email ||
        (payload.exp && payload.exp * 1000 <= Date.now())
      ) {
        throw new Error('Claims Apple inválidas ou expiradas.');
      }

      return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name:
          fallbackName || payload.email.split('@')[0] || 'Usuário Apple',
        provider: ProvedorOAuth.APPLE,
      };
    } catch {
      throw new DomainException(
        {
          errorCode: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Token OAuth da Apple inválido ou expirado.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private parseMockToken(
    rawToken: string,
    provider: ProvedorOAuth,
    defaultName: string,
  ): OAuthVerifiedProfile {
    const parts = rawToken.split(':');
    const providerPrefix = provider.toLowerCase();

    if (parts.length >= 2 && parts[1].trim().length > 0) {
      const firstArg = parts[1].trim();
      if (firstArg.includes('@')) {
        const email = firstArg.toLowerCase();
        const name = parts[2]?.trim() || defaultName;
        return {
          sub: `mock-${providerPrefix}-${email}`,
          email,
          name,
          provider,
        };
      }

      const sub = `mock-${providerPrefix}-${firstArg}`;
      const email =
        parts[2]?.trim().includes('@')
          ? parts[2].trim().toLowerCase()
          : `${firstArg.toLowerCase()}@oauth.produtividade.local`;
      const name = parts[3]?.trim() || defaultName;

      return {
        sub,
        email,
        name,
        provider,
      };
    }

    const email = `${providerPrefix}.dev@produtividade.local`;
    return {
      sub: `mock-${providerPrefix}-default`,
      email,
      name: defaultName,
      provider,
    };
  }

  private isDevMockEnabled(): boolean {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    const mockFlag =
      this.configService.get<string>('OAUTH_DEV_MOCK_ENABLED') ??
      process.env.OAUTH_DEV_MOCK_ENABLED;

    return (
      nodeEnv !== 'production' &&
      (mockFlag === 'true' || mockFlag === '1' || mockFlag === undefined)
    );
  }

  private async upsertOAuthUserAndIssueSession(
    profile: OAuthVerifiedProfile,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    let usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { email: profile.email },
          {
            provedorOauth: profile.provider,
            oauthSubjectId: profile.sub,
          },
        ],
      },
    });

    if (!usuario) {
      usuario = await this.prisma.$transaction(async (tx) => {
        const criado = await tx.usuario.create({
          data: {
            nomeCompleto: profile.name.slice(0, 150),
            email: profile.email,
            provedorOauth: profile.provider,
            oauthSubjectId: profile.sub,
            horasSonoDiarias: 8,
          },
        });

        await this.authService.seedDefaultLembretes(tx, criado.id);
        return criado;
      });
    } else if (
      usuario.oauthSubjectId !== profile.sub ||
      usuario.provedorOauth !== profile.provider
    ) {
      usuario = await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          provedorOauth: profile.provider,
          oauthSubjectId: profile.sub,
        },
      });
    }

    return this.authService.issueSessionForUser(usuario, userAgent);
  }
}
