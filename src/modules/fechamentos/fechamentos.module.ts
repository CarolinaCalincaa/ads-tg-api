import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FechamentosController } from './fechamentos.controller';
import { FechamentosService } from './fechamentos.service';

@Module({
  imports: [PrismaModule],
  controllers: [FechamentosController],
  providers: [FechamentosService],
  exports: [FechamentosService],
})
export class FechamentosModule {}
