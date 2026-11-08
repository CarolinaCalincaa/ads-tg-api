import { Module } from '@nestjs/common';
import { TarefasModule } from '../tarefas/tarefas.module';
import { FadigaMentalService } from './fadiga-mental.service';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';

@Module({
  imports: [TarefasModule],
  controllers: [PainelController],
  providers: [PainelService, FadigaMentalService],
  exports: [PainelService, FadigaMentalService],
})
export class PainelModule {}
