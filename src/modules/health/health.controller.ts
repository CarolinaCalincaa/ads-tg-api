import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Verifica status da API e conectividade com PostgreSQL 16 (RNF08)',
  })
  @ApiResponse({
    status: 200,
    description: 'API e banco de dados operacionais.',
  })
  async check(): Promise<{
    status: string;
    database: string;
    timestamp: string;
  }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
