import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/global-http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HealthController & Database Integrity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health deve retornar 200 OK com banco conectado', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        database: 'connected',
        timestamp: expect.any(String),
      }),
    );
  });

  it('deve possuir os 7 Pilares de Vida populados no banco PostgreSQL', async () => {
    const pilares = await prisma.pilarVida.findMany({
      orderBy: { id: 'asc' },
    });

    expect(pilares).toHaveLength(7);
    expect(pilares.map((p) => p.codigo)).toEqual([
      'SAUDE',
      'MOVIMENTO',
      'SONO',
      'MENTE',
      'ESTUDOS',
      'FINANCAS',
      'CARREIRA',
    ]);
  });

  it('trigger trg_enforce_max_3_pilares_mes deve permitir até 3 pilares ativos no mês e bloquear o 4º (RN01)', async () => {
    const emailTeste = `teste.rn01.${Date.now()}@produtividade.local`;
    const usuario = await prisma.usuario.create({
      data: {
        nomeCompleto: 'Usuário Teste RN01',
        email: emailTeste,
        horasSonoDiarias: 8,
      },
    });

    const mesOutubro = new Date('2026-10-01T00:00:00.000Z');

    try {
      await prisma.pilarAtivoMes.createMany({
        data: [
          { idUsuario: usuario.id, idPilar: 1, mesAno: mesOutubro },
          { idUsuario: usuario.id, idPilar: 2, mesAno: mesOutubro },
          { idUsuario: usuario.id, idPilar: 3, mesAno: mesOutubro },
        ],
      });

      await expect(
        prisma.pilarAtivoMes.create({
          data: { idUsuario: usuario.id, idPilar: 4, mesAno: mesOutubro },
        }),
      ).rejects.toThrow(/RN01_VIOLATION: Selecione apenas 3 pilares por mês!/);

      // Se um dos 3 pilares for desativado (soft-delete), o 4º deve ser permitido
      await prisma.pilarAtivoMes.updateMany({
        where: { idUsuario: usuario.id, idPilar: 1, mesAno: mesOutubro },
        data: { deletedAt: new Date() },
      });

      const quartoAposDesativar = await prisma.pilarAtivoMes.create({
        data: { idUsuario: usuario.id, idPilar: 4, mesAno: mesOutubro },
      });
      expect(quartoAposDesativar.idPilar).toBe(4);
    } finally {
      await prisma.usuario.delete({ where: { id: usuario.id } });
    }
  });
});
