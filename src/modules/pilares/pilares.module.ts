import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PilaresController } from './pilares.controller';
import { PilaresService } from './pilares.service';

@Module({
  imports: [PrismaModule],
  controllers: [PilaresController],
  providers: [PilaresService],
  exports: [PilaresService],
})
export class PilaresModule {}
