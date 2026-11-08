import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ProvedorOAuth, TipoLembrete, Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService & RegisterDto (E02-T01)', () => {
  let authService: AuthService;
  let prismaMock: {
    usuario: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    lembreteConfig: {
      createMany: jest.Mock;
    };
    sessaoRefresh: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtServiceMock: { signAsync: jest.Mock };
  let configServiceMock: { get: jest.Mock };

  const mockDate = new Date('2026-11-08T19:00:00.000Z');

  beforeEach(() => {
    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      lembreteConfig: {
        createMany: jest.fn(),
      },
      sessaoRefresh: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: typeof prismaMock) => unknown) =>
        callback(prismaMock),
      ),
    };

    jwtServiceMock = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-access-token'),
    };

    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_REFRESH_EXPIRES_IN_DAYS') return '30';
        return undefined;
      }),
    };

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  describe('Validação de RegisterDto (RF01, RF02)', () => {
    it('deve aceitar cadastro válido com senha forte', async () => {
      const dto = plainToInstance(RegisterDto, {
        nomeCompleto: 'Carolina Calinca',
        email: 'carolina@fatec.sp.gov.br',
        senha: 'Fatec@2026!',
        horasSonoDiarias: 8,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar senha fraca sem maiúscula, número ou caractere especial (RF02)', async () => {
      const senhasFracas = [
        'curta1!',
        'semmaiuscula1!',
        'SEMMINUSCULA1!',
        'SemNumeroAqui!',
        'SemEspecial123',
      ];

      for (const senha of senhasFracas) {
        const dto = plainToInstance(RegisterDto, {
          nomeCompleto: 'Carolina Calinca',
          email: 'carolina@fatec.sp.gov.br',
          senha,
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'senha')).toBe(true);
      }
    });
  });

  describe('register', () => {
    it('deve criar usuário com hash Argon2id, 4 lembretes padrão e sessão refresh', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      prismaMock.usuario.create.mockImplementation(
        ({ data }: { data: Partial<Usuario> }) =>
          Promise.resolve({
            id: 'uuid-user-1',
            nomeCompleto: data.nomeCompleto,
            email: data.email,
            senhaHash: data.senhaHash,
            provedorOauth: ProvedorOAuth.LOCAL,
            oauthSubjectId: null,
            horasSonoDiarias: data.horasSonoDiarias ?? 8,
            onboardingConcluido: false,
            dataCadastro: mockDate,
            updatedAt: mockDate,
          }),
      );

      const response = await authService.register(
        {
          nomeCompleto: 'Carolina Calinca',
          email: 'Carolina@Fatec.sp.gov.br',
          senha: 'Fatec@2026!',
        },
        'Jest-Test-Agent',
      );

      expect(response.usuario.email).toBe('carolina@fatec.sp.gov.br');
      expect(response.usuario.horasSonoDiarias).toBe(8);
      expect(response.accessToken).toBe('signed-jwt-access-token');
      expect(response.refreshToken).toHaveLength(96);

      const createdUserArg = prismaMock.usuario.create.mock.calls[0][0].data;
      expect(createdUserArg.senhaHash).toContain('$argon2id$');
      await expect(
        argon2.verify(createdUserArg.senhaHash, 'Fatec@2026!'),
      ).resolves.toBe(true);

      expect(prismaMock.lembreteConfig.createMany).toHaveBeenCalledTimes(1);
      const lembretesCriados =
        prismaMock.lembreteConfig.createMany.mock.calls[0][0].data;
      expect(lembretesCriados).toHaveLength(4);
      expect(lembretesCriados.map((l: { tipo: TipoLembrete }) => l.tipo)).toEqual([
        TipoLembrete.AGUA,
        TipoLembrete.ALONGAMENTO,
        TipoLembrete.SONO,
        TipoLembrete.FECHAMENTO_SEMANAL,
      ]);

      expect(prismaMock.sessaoRefresh.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idUsuario: 'uuid-user-1',
            tokenHash: authService.hashTokenSha256(response.refreshToken),
          }),
        }),
      );
    });

    it('deve lançar DomainException 409 EMAIL_ALREADY_REGISTERED quando e-mail já existir', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'carolina@fatec.sp.gov.br',
      });

      await expect(
        authService.register({
          nomeCompleto: 'Carolina Calinca',
          email: 'carolina@fatec.sp.gov.br',
          senha: 'Fatec@2026!',
        }),
      ).rejects.toMatchObject({
        errorCode: 'EMAIL_ALREADY_REGISTERED',
        status: HttpStatus.CONFLICT,
      });
    });
  });

  describe('login', () => {
    it('deve autenticar usuário com credenciais válidas e emitir tokens', async () => {
      const hash = await argon2.hash('Fatec@2026!', { type: argon2.argon2id });
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 'uuid-user-1',
        nomeCompleto: 'Carolina Calinca',
        email: 'carolina@fatec.sp.gov.br',
        senhaHash: hash,
        provedorOauth: ProvedorOAuth.LOCAL,
        oauthSubjectId: null,
        horasSonoDiarias: 8,
        onboardingConcluido: false,
        dataCadastro: mockDate,
        updatedAt: mockDate,
      });

      const res = await authService.login({
        email: 'carolina@fatec.sp.gov.br',
        senha: 'Fatec@2026!',
      });

      expect(res.accessToken).toBe('signed-jwt-access-token');
      expect(res.refreshToken).toHaveLength(96);
      expect(prismaMock.sessaoRefresh.create).toHaveBeenCalledTimes(1);
    });

    it('deve rejeitar login com 401 INVALID_CREDENTIALS para senha incorreta', async () => {
      const hash = await argon2.hash('Fatec@2026!', { type: argon2.argon2id });
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: 'uuid-user-1',
        email: 'carolina@fatec.sp.gov.br',
        senhaHash: hash,
      });

      await expect(
        authService.login({
          email: 'carolina@fatec.sp.gov.br',
          senha: 'SenhaErrada@123',
        }),
      ).rejects.toMatchObject({
        errorCode: 'INVALID_CREDENTIALS',
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });

  describe('refresh & logout', () => {
    it('deve rotacionar refresh token válido revogando a sessão anterior', async () => {
      const rawToken = 'valid-refresh-token-raw';
      const tokenHash = authService.hashTokenSha256(rawToken);

      prismaMock.sessaoRefresh.findUnique.mockResolvedValue({
        id: 'sessao-1',
        idUsuario: 'uuid-user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        usuario: {
          id: 'uuid-user-1',
          nomeCompleto: 'Carolina Calinca',
          email: 'carolina@fatec.sp.gov.br',
          provedorOauth: ProvedorOAuth.LOCAL,
          horasSonoDiarias: 8,
          onboardingConcluido: false,
          dataCadastro: mockDate,
          updatedAt: mockDate,
        },
      });

      const result = await authService.refresh({ refreshToken: rawToken });

      expect(prismaMock.sessaoRefresh.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sessao-1' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
      expect(prismaMock.sessaoRefresh.create).toHaveBeenCalledTimes(1);
      expect(result.refreshToken).not.toBe(rawToken);
    });

    it('deve rejeitar refresh token revogado ou expirado com 401 TOKEN_EXPIRED_OR_INVALID', async () => {
      prismaMock.sessaoRefresh.findUnique.mockResolvedValue({
        id: 'sessao-revogada',
        idUsuario: 'uuid-user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        authService.refresh({ refreshToken: 'revoked-token' }),
      ).rejects.toBeInstanceOf(DomainException);
    });

    it('deve revogar sessão no logout', async () => {
      const res = await authService.logout('uuid-user-1', 'my-refresh-token');
      expect(res.message).toBe('Sessão encerrada com sucesso.');
      expect(prismaMock.sessaoRefresh.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idUsuario: 'uuid-user-1',
            tokenHash: authService.hashTokenSha256('my-refresh-token'),
            revokedAt: null,
          },
        }),
      );
    });
  });
});
