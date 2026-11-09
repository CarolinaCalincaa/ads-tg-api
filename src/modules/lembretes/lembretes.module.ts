import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LembretesController } from './lembretes.controller';
import { LembretesService } from './lembretes.service';

@Module({
  imports: [PrismaModule],
  controllers: [LembretesController],
  providers: [LembretesService],
  exports: [LembretesService],
})
export class LembretesModule {}
