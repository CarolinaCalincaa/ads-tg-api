import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { DomainException } from '../../../common/exceptions/domain.exception';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ??
        'dev_jwt_access_secret_change_in_prod',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new DomainException(
        {
          errorCode: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Payload do token de acesso inválido.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!usuario) {
      throw new DomainException(
        {
          errorCode: 'TOKEN_EXPIRED_OR_INVALID',
          message: 'Sessão inválida ou usuário não encontrado.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nomeCompleto: usuario.nomeCompleto,
      horasSonoDiarias: usuario.horasSonoDiarias,
      onboardingConcluido: usuario.onboardingConcluido,
    };
  }
}
