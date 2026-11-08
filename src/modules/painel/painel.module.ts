import { Module } from '@nestjs/common';
import { TarefasModule } from '../tarefas/tarefas.module';
import { PainelController } from './painel.controller';
import { PainelService } from './painel.service';

@Module({
  imports: [TarefasModule],
  controllers: [PainelController],
  providers: [PainelService],
  exports: [PainelService],
})
export class PainelModule {}
