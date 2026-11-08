import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('deve validar SELECT 1 no Prisma e retornar status ok com timestamp ISO-8601', async () => {
    const result = await controller.check();
    expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
