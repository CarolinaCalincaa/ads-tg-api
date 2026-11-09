import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { FechamentosModule } from './modules/fechamentos/fechamentos.module';
import { HabitosModule } from './modules/habitos/habitos.module';
import { HealthModule } from './modules/health/health.module';
import { LembretesModule } from './modules/lembretes/lembretes.module';
import { PainelModule } from './modules/painel/painel.module';
import { PilaresModule } from './modules/pilares/pilares.module';
import { PomodoroModule } from './modules/pomodoro/pomodoro.module';
import { ProjetosModule } from './modules/projetos/projetos.module';
import { TarefasModule } from './modules/tarefas/tarefas.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsuariosModule,
    PilaresModule,
    ProjetosModule,
    TarefasModule,
    HabitosModule,
    ChecklistsModule,
    PainelModule,
    PomodoroModule,
    LembretesModule,
    FechamentosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
