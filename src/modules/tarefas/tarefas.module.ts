import { Module } from '@nestjs/common';
import { CapacidadeService } from './capacidade.service';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';

@Module({
  controllers: [TarefasController],
  providers: [TarefasService, CapacidadeService],
  exports: [TarefasService, CapacidadeService],
})
export class TarefasModule {}
