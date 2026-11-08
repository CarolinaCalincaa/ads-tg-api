import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/global-http-exception.filter';
import { PasswordResetService } from '../src/modules/auth/password-reset.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthModule & UsuariosModule E2E Journey (E02-T01 & E02-T02)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordResetService: PasswordResetService;

  const uniqueSuffix = Date.now();
  const testEmail = `carolina.e2e.${uniqueSuffix}@fatec.sp.gov.br`;
  const googleOAuthEmail = `google.e2e.${uniqueSuffix}@fatec.sp.gov.br`;
  const appleOAuthEmail = `apple.e2e.${uniqueSuffix}@fatec.sp.gov.br`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    passwordResetService = app.get(PasswordResetService);
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: {
        email: {
          in: [testEmail, googleOAuthEmail, appleOAuthEmail],
        },
      },
    });
    await app.close();
  });

  it('deve executar a jornada completa: Register -> Login -> Refresh Rotation -> /usuarios/me -> PATCH horasSonoDiarias -> Forgot/Reset Password -> OAuth -> DELETE /usuarios/me (Cascade LGPD RNF07)', async () => {
    // 1. Rejeitar cadastro com senha fraca (RF02 -> 400 VALIDATION_ERROR)
    const weakRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nomeCompleto: 'Carolina E2E',
        email: testEmail,
        senha: 'fraca',
      })
      .expect(400);

    expect(weakRes.body.errorCode).toBe('VALIDATION_ERROR');

    // 2. Cadastrar usuário válido (RF01, RF02 -> 201 Created)
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nomeCompleto: 'Carolina E2E',
        email: testEmail,
        senha: 'Fatec@2026!',
        horasSonoDiarias: 8,
      })
      .expect(201);

    expect(registerRes.body.usuario.email).toBe(testEmail);
    expect(registerRes.body.usuario.horasSonoDiarias).toBe(8);
    expect(registerRes.body.accessToken).toEqual(expect.any(String));
    expect(registerRes.body.refreshToken).toEqual(expect.any(String));

    const userId: string = registerRes.body.usuario.id;

    // Verificar que os 4 lembretes padrão foram criados no PostgreSQL
    const lembretesCount = await prisma.lembreteConfig.count({
      where: { idUsuario: userId },
    });
    expect(lembretesCount).toBe(4);

    // 3. Rejeitar e-mail duplicado (409 EMAIL_ALREADY_REGISTERED)
    const duplicateRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nomeCompleto: 'Carolina Duplicada',
        email: testEmail,
        senha: 'Fatec@2026!',
      })
      .expect(409);

    expect(duplicateRes.body.errorCode).toBe('EMAIL_ALREADY_REGISTERED');

    // 4. Login com credenciais inválidas (401 INVALID_CREDENTIALS) e válidas (200 OK)
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        senha: 'SenhaErrada@2026',
      })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        senha: 'Fatec@2026!',
      })
      .expect(200);

    const firstRefreshToken: string = loginRes.body.refreshToken;

    // 5. Refresh Rotation (ADR-005): rotaciona refreshToken e bloqueia reuso do anterior
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);

    const rotatedAccessToken: string = refreshRes.body.accessToken;
    const rotatedRefreshToken: string = refreshRes.body.refreshToken;
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    // 6. GET /api/v1/usuarios/me (401 sem token, 200 com token)
    await request(app.getHttpServer()).get('/api/v1/usuarios/me').expect(401);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .expect(200);

    expect(meRes.body.id).toBe(userId);
    expect(meRes.body.senhaHash).toBeUndefined();

    // 7. PATCH /api/v1/usuarios/me (RF05 — atualizar horasSonoDiarias e nomeCompleto)
    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .send({
        nomeCompleto: 'Carolina Calinca FATEC',
        horasSonoDiarias: 7,
        onboardingConcluido: true,
      })
      .expect(200);

    expect(patchRes.body.nomeCompleto).toBe('Carolina Calinca FATEC');
    expect(patchRes.body.horasSonoDiarias).toBe(7);
    expect(patchRes.body.onboardingConcluido).toBe(true);

    // 8. Forgot Password & Reset Password (RF04)
    let capturedEmailText = '';
    const transporter = (
      passwordResetService as unknown as {
        transporter: { sendMail: (...args: unknown[]) => Promise<unknown> };
      }
    ).transporter;

    const sendMailSpy = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation(async (mailOptions: unknown) => {
        const opts = mailOptions as { text?: string };
        capturedEmailText = opts.text ?? '';
        return { messageId: 'mock-mailpit-id' };
      });

    try {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail })
        .expect(200);
    } finally {
      sendMailSpy.mockRestore();
    }

    const codeMatch = capturedEmailText.match(/\b(\d{6})\b/);
    expect(codeMatch).not.toBeNull();
    const sixDigitCode = codeMatch![1];

    // Código incorreto deve falhar com 400 RESET_TOKEN_INVALID
    const invalidResetRes = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        email: testEmail,
        codigo: '000000',
        novaSenha: 'NovaSenhaForte@2026!',
      })
      .expect(400);

    expect(invalidResetRes.body.errorCode).toBe('RESET_TOKEN_INVALID');

    // Código válido redefine a senha e revoga todas as sessões anteriores
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        email: testEmail,
        codigo: sixDigitCode,
        novaSenha: 'NovaSenhaForte@2026!',
      })
      .expect(200);

    // Refresh token anterior à redefinição deve estar revogado
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);

    // Login com a nova senha deve funcionar
    const reloginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        senha: 'NovaSenhaForte@2026!',
      })
      .expect(200);

    const activeAccessToken: string = reloginRes.body.accessToken;

    // 9. OAuth 2.0 Google & Apple (RF03)
    const googleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/google')
      .send({
        idToken: `mock-google-token:${googleOAuthEmail}:Usuária Google E2E`,
      })
      .expect(200);

    expect(googleRes.body.usuario.email).toBe(googleOAuthEmail);
    expect(googleRes.body.usuario.provedorOauth).toBe('GOOGLE');

    const appleRes = await request(app.getHttpServer())
      .post('/api/v1/auth/oauth/apple')
      .send({
        idToken: `mock-apple-token:${appleOAuthEmail}:Usuária Apple E2E`,
      })
      .expect(200);

    expect(appleRes.body.usuario.email).toBe(appleOAuthEmail);
    expect(appleRes.body.usuario.provedorOauth).toBe('APPLE');

    // 10. Popular dados filhos e executar DELETE /api/v1/usuarios/me (LGPD Cascade RNF07)
    await prisma.pilarAtivoMes.create({
      data: {
        idUsuario: userId,
        idPilar: 1,
        mesAno: new Date('2026-11-01T00:00:00.000Z'),
      },
    });

    await prisma.tarefa.create({
      data: {
        idUsuario: userId,
        idPilar: 1,
        nome: 'Tarefa que será expurgada via Cascade LGPD',
        duracaoEstimadaMinutos: 45,
        dataAgendamento: new Date('2026-11-08T00:00:00.000Z'),
      },
    });

    await request(app.getHttpServer())
      .delete('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${activeAccessToken}`)
      .expect(200);

    // Comprovar expurgo 100% em cascata no PostgreSQL (RNF07)
    const [
      usuarioRestante,
      sessoesRestantes,
      tokensResetRestantes,
      lembretesRestantes,
      pilaresRestantes,
      tarefasRestantes,
    ] = await Promise.all([
      prisma.usuario.count({ where: { id: userId } }),
      prisma.sessaoRefresh.count({ where: { idUsuario: userId } }),
      prisma.tokenRecuperacaoSenha.count({ where: { idUsuario: userId } }),
      prisma.lembreteConfig.count({ where: { idUsuario: userId } }),
      prisma.pilarAtivoMes.count({ where: { idUsuario: userId } }),
      prisma.tarefa.count({ where: { idUsuario: userId } }),
    ]);

    expect(usuarioRestante).toBe(0);
    expect(sessoesRestantes).toBe(0);
    expect(tokensResetRestantes).toBe(0);
    expect(lembretesRestantes).toBe(0);
    expect(pilaresRestantes).toBe(0);
    expect(tarefasRestantes).toBe(0);

    // Token JWT do usuário excluído deve ser rejeitado imediatamente (401)
    await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${activeAccessToken}`)
      .expect(401);
  });
});
