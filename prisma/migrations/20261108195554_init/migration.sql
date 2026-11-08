-- CreateEnum
CREATE TYPE "ProvedorOAuth" AS ENUM ('LOCAL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "NivelCompetencia" AS ENUM ('ALTA', 'BAIXA');

-- CreateEnum
CREATE TYPE "NivelEnergia" AS ENUM ('GANHA_ENERGIA', 'PERDE_ENERGIA');

-- CreateEnum
CREATE TYPE "QuadranteEnergia" AS ENUM ('ZONA_GENIO', 'ZONA_HOBBY', 'ZONA_PERIGO', 'ZONA_NULA');

-- CreateEnum
CREATE TYPE "StatusProjeto" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoItemAgenda" AS ENUM ('TAREFA', 'COMPROMISSO');

-- CreateEnum
CREATE TYPE "NivelPrioridade" AS ENUM ('PRIORIDADE', 'RAPIDO', 'POSTERGAVEL');

-- CreateEnum
CREATE TYPE "IndicadorDependencia" AS ENUM ('MINHAS_ACOES', 'EM_ESPERA');

-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoCicloFechamento" AS ENUM ('SEMANAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "TipoLembrete" AS ENUM ('AGUA', 'ALONGAMENTO', 'SONO', 'FECHAMENTO_SEMANAL');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" UUID NOT NULL,
    "nome_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "senha_hash" VARCHAR(255),
    "provedor_oauth" "ProvedorOAuth" NOT NULL DEFAULT 'LOCAL',
    "oauth_subject_id" VARCHAR(255),
    "horas_sono_diarias" INTEGER NOT NULL DEFAULT 8,
    "onboarding_concluido" BOOLEAN NOT NULL DEFAULT false,
    "data_cadastro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "sessao_refresh" (
    "id_sessao_refresh" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_agent" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_refresh_pkey" PRIMARY KEY ("id_sessao_refresh")
);

-- CreateTable
CREATE TABLE "token_recuperacao_senha" (
    "id_token" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "usado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_recuperacao_senha_pkey" PRIMARY KEY ("id_token")
);

-- CreateTable
CREATE TABLE "pilar_vida" (
    "id_pilar" SMALLINT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "cor_hex" VARCHAR(7) NOT NULL,
    "cor_fundo_hex" VARCHAR(7) NOT NULL,
    "icone" VARCHAR(50) NOT NULL,

    CONSTRAINT "pilar_vida_pkey" PRIMARY KEY ("id_pilar")
);

-- CreateTable
CREATE TABLE "pilar_ativo_mes" (
    "id_pilar_ativo" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pilar" SMALLINT NOT NULL,
    "mes_ano" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pilar_ativo_mes_pkey" PRIMARY KEY ("id_pilar_ativo")
);

-- CreateTable
CREATE TABLE "matriz_energia" (
    "id_matriz" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "nome_atividade" VARCHAR(150) NOT NULL,
    "nivel_competencia" "NivelCompetencia" NOT NULL,
    "nivel_energia" "NivelEnergia" NOT NULL,
    "quadrante" "QuadranteEnergia" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "matriz_energia_pkey" PRIMARY KEY ("id_matriz")
);

-- CreateTable
CREATE TABLE "projeto" (
    "id_projeto" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pilar" SMALLINT NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "data_inicio" DATE,
    "data_fim_prevista" DATE,
    "horas_estimadas_totais" DECIMAL(6,2),
    "status" "StatusProjeto" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "projeto_pkey" PRIMARY KEY ("id_projeto")
);

-- CreateTable
CREATE TABLE "tarefa" (
    "id_tarefa" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pilar" SMALLINT NOT NULL,
    "id_projeto" UUID,
    "tipo_item" "TipoItemAgenda" NOT NULL DEFAULT 'TAREFA',
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "duracao_estimada_minutos" INTEGER NOT NULL,
    "prioridade" "NivelPrioridade" NOT NULL DEFAULT 'PRIORIDADE',
    "indicador_dependencia" "IndicadorDependencia" NOT NULL DEFAULT 'MINHAS_ACOES',
    "data_agendamento" DATE NOT NULL,
    "horario_inicio" VARCHAR(5),
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "concluida_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "tarefa_pkey" PRIMARY KEY ("id_tarefa")
);

-- CreateTable
CREATE TABLE "habito" (
    "id_habito" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_pilar" SMALLINT NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "duracao_estimada_minutos" INTEGER NOT NULL,
    "frequencia_semanal" INTEGER NOT NULL DEFAULT 7,
    "dias_semana" JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
    "horario_padrao" VARCHAR(5),
    "status_ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "habito_pkey" PRIMARY KEY ("id_habito")
);

-- CreateTable
CREATE TABLE "registro_execucao_habito" (
    "id_registro" UUID NOT NULL,
    "id_habito" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "data_execucao" DATE NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT true,
    "data_registro" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "registro_execucao_habito_pkey" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "sessao_pomodoro" (
    "id_sessao" UUID NOT NULL,
    "id_tarefa" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "duracao_minutos" INTEGER NOT NULL DEFAULT 25,
    "data_inicio" TIMESTAMPTZ(3) NOT NULL,
    "data_fim" TIMESTAMPTZ(3),
    "concluido" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessao_pomodoro_pkey" PRIMARY KEY ("id_sessao")
);

-- CreateTable
CREATE TABLE "checklist" (
    "id_checklist" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "id_tarefa" UUID,
    "id_habito" UUID,
    "titulo" VARCHAR(100) NOT NULL,
    "eh_modelo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "checklist_pkey" PRIMARY KEY ("id_checklist")
);

-- CreateTable
CREATE TABLE "item_checklist" (
    "id_item" UUID NOT NULL,
    "id_checklist" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "item_checklist_pkey" PRIMARY KEY ("id_item")
);

-- CreateTable
CREATE TABLE "fechamento_reflexao" (
    "id_fechamento" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "tipo_ciclo" "TipoCicloFechamento" NOT NULL,
    "data_inicio_ciclo" DATE NOT NULL,
    "data_fechamento" DATE NOT NULL,
    "acao_funcionou_bem" TEXT,
    "oque_fazer_diferente" TEXT,
    "vitoria_reconhecer" TEXT,
    "fracasso_aceitar" TEXT,
    "dados_consolidados" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "fechamento_reflexao_pkey" PRIMARY KEY ("id_fechamento")
);

-- CreateTable
CREATE TABLE "lembrete_config" (
    "id_lembrete" UUID NOT NULL,
    "id_usuario" UUID NOT NULL,
    "tipo" "TipoLembrete" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "intervalo_minutos" INTEGER,
    "horario_fixo" VARCHAR(5),
    "janela_inicio" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "janela_fim" VARCHAR(5) NOT NULL DEFAULT '21:00',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "lembrete_config_pkey" PRIMARY KEY ("id_lembrete")
);

-- CreateTable
CREATE TABLE "ia_cache_resposta" (
    "hash_entrada" VARCHAR(64) NOT NULL,
    "tipo_operacao" VARCHAR(30) NOT NULL,
    "resposta_json" JSONB NOT NULL,
    "tokens_consumidos" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_cache_resposta_pkey" PRIMARY KEY ("hash_entrada")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_refresh_token_hash_key" ON "sessao_refresh"("token_hash");

-- CreateIndex
CREATE INDEX "sessao_refresh_id_usuario_idx" ON "sessao_refresh"("id_usuario");

-- CreateIndex
CREATE INDEX "token_recuperacao_senha_id_usuario_expires_at_idx" ON "token_recuperacao_senha"("id_usuario", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "pilar_vida_codigo_key" ON "pilar_vida"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pilar_vida_nome_key" ON "pilar_vida"("nome");

-- CreateIndex
CREATE INDEX "pilar_ativo_mes_id_usuario_mes_ano_idx" ON "pilar_ativo_mes"("id_usuario", "mes_ano");

-- CreateIndex
CREATE INDEX "pilar_ativo_mes_id_usuario_updated_at_idx" ON "pilar_ativo_mes"("id_usuario", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_usuario_pilar_mes" ON "pilar_ativo_mes"("id_usuario", "id_pilar", "mes_ano");

-- CreateIndex
CREATE INDEX "matriz_energia_id_usuario_updated_at_idx" ON "matriz_energia"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "projeto_id_usuario_status_idx" ON "projeto"("id_usuario", "status");

-- CreateIndex
CREATE INDEX "projeto_id_usuario_updated_at_idx" ON "projeto"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "idx_tarefa_usuario_data" ON "tarefa"("id_usuario", "data_agendamento", "deleted_at");

-- CreateIndex
CREATE INDEX "tarefa_id_usuario_updated_at_idx" ON "tarefa"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "habito_id_usuario_status_ativo_deleted_at_idx" ON "habito"("id_usuario", "status_ativo", "deleted_at");

-- CreateIndex
CREATE INDEX "habito_id_usuario_updated_at_idx" ON "habito"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "registro_execucao_habito_id_usuario_data_execucao_idx" ON "registro_execucao_habito"("id_usuario", "data_execucao");

-- CreateIndex
CREATE INDEX "registro_execucao_habito_id_usuario_updated_at_idx" ON "registro_execucao_habito"("id_usuario", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_habito_data" ON "registro_execucao_habito"("id_habito", "data_execucao");

-- CreateIndex
CREATE INDEX "sessao_pomodoro_id_usuario_updated_at_idx" ON "sessao_pomodoro"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "checklist_id_usuario_eh_modelo_idx" ON "checklist"("id_usuario", "eh_modelo");

-- CreateIndex
CREATE INDEX "checklist_id_usuario_updated_at_idx" ON "checklist"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "item_checklist_id_checklist_ordem_idx" ON "item_checklist"("id_checklist", "ordem");

-- CreateIndex
CREATE INDEX "item_checklist_id_usuario_updated_at_idx" ON "item_checklist"("id_usuario", "updated_at");

-- CreateIndex
CREATE INDEX "fechamento_reflexao_id_usuario_data_fechamento_idx" ON "fechamento_reflexao"("id_usuario", "data_fechamento");

-- CreateIndex
CREATE INDEX "fechamento_reflexao_id_usuario_updated_at_idx" ON "fechamento_reflexao"("id_usuario", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_usuario_ciclo_inicio" ON "fechamento_reflexao"("id_usuario", "tipo_ciclo", "data_inicio_ciclo");

-- CreateIndex
CREATE INDEX "lembrete_config_id_usuario_updated_at_idx" ON "lembrete_config"("id_usuario", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "uk_usuario_tipo_lembrete" ON "lembrete_config"("id_usuario", "tipo");

-- CreateIndex
CREATE INDEX "ia_cache_resposta_expires_at_idx" ON "ia_cache_resposta"("expires_at");

-- AddForeignKey
ALTER TABLE "sessao_refresh" ADD CONSTRAINT "sessao_refresh_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_recuperacao_senha" ADD CONSTRAINT "token_recuperacao_senha_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilar_ativo_mes" ADD CONSTRAINT "pilar_ativo_mes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilar_ativo_mes" ADD CONSTRAINT "pilar_ativo_mes_id_pilar_fkey" FOREIGN KEY ("id_pilar") REFERENCES "pilar_vida"("id_pilar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriz_energia" ADD CONSTRAINT "matriz_energia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_id_pilar_fkey" FOREIGN KEY ("id_pilar") REFERENCES "pilar_vida"("id_pilar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_id_pilar_fkey" FOREIGN KEY ("id_pilar") REFERENCES "pilar_vida"("id_pilar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projeto"("id_projeto") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habito" ADD CONSTRAINT "habito_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habito" ADD CONSTRAINT "habito_id_pilar_fkey" FOREIGN KEY ("id_pilar") REFERENCES "pilar_vida"("id_pilar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_execucao_habito" ADD CONSTRAINT "registro_execucao_habito_id_habito_fkey" FOREIGN KEY ("id_habito") REFERENCES "habito"("id_habito") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao_pomodoro" ADD CONSTRAINT "sessao_pomodoro_id_tarefa_fkey" FOREIGN KEY ("id_tarefa") REFERENCES "tarefa"("id_tarefa") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist" ADD CONSTRAINT "checklist_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist" ADD CONSTRAINT "checklist_id_tarefa_fkey" FOREIGN KEY ("id_tarefa") REFERENCES "tarefa"("id_tarefa") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist" ADD CONSTRAINT "checklist_id_habito_fkey" FOREIGN KEY ("id_habito") REFERENCES "habito"("id_habito") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_checklist" ADD CONSTRAINT "item_checklist_id_checklist_fkey" FOREIGN KEY ("id_checklist") REFERENCES "checklist"("id_checklist") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_reflexao" ADD CONSTRAINT "fechamento_reflexao_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembrete_config" ADD CONSTRAINT "lembrete_config_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;


-- Trigger RN01: Máximo de 3 Pilares Ativos por Mês por Usuário
CREATE OR REPLACE FUNCTION fn_enforce_max_3_pilares_mes()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    IF NEW.deleted_at IS NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM pilar_ativo_mes
        WHERE id_usuario = NEW.id_usuario
          AND mes_ano = NEW.mes_ano
          AND deleted_at IS NULL
          AND id_pilar_ativo <> NEW.id_pilar_ativo;

        IF v_count >= 3 THEN
            RAISE EXCEPTION 'RN01_VIOLATION: Selecione apenas 3 pilares por mês!'
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_max_3_pilares_mes
BEFORE INSERT OR UPDATE ON pilar_ativo_mes
FOR EACH ROW EXECUTE FUNCTION fn_enforce_max_3_pilares_mes();
