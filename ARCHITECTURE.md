# ARCHITECTURE.md — Back-end API Central (`ads-tg-api`)

> **Arquivo Vivo de Arquitetura**: Mantido e atualizado a cada tarefa concluída no repositório `ads-tg-api`.

---

## 1. Visão Geral

Monólito modular **NestJS 11** em **TypeScript 5 (strict)** responsável por centralizar todas as regras de negócio, autenticação híbrida, cálculos de capacidade diária (`RN02`), limite mensal de pilares (`RN01`), *streaks* de hábitos, agregações analíticas e integração com IA Generativa, tendo o **PostgreSQL 16** (via **Prisma ORM 6**) como Fonte Única da Verdade (*Source of Truth*).

- **Fase 1 (MVP — Épicos 01 a 05)**: Arquitetura *Online-First* consumida diretamente pelo app Flutter via REST (`/api/v1/*`).
- **Fase 2 (Pós-MVP — Épicos 06 a 10)**: Expansão com Fechamento Reflexivo, Relatórios, IA (`@google/genai`) e motor de sincronização *Offline-First* (`POST /api/v1/sync`).

---

## 2. Stack e Versões Exatas Instaladas

| Componente | Pacote / Imagem | Versão | Papel |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `24.x` (compatível `>=22 LTS`) | Execução JavaScript/TypeScript no servidor |
| **Framework HTTP** | `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | `^11.0.0` | Injeção de dependência, roteamento, pipes e filtros |
| **Configuração** | `@nestjs/config` | `^4.0.0` | Carregamento global de variáveis `.env` |
| **Documentação OpenAPI** | `@nestjs/swagger` | `^11.0.0` | Especificação OpenAPI 3.1 servida em `/api/docs` |
| **Rate Limiting & Segurança** | `@nestjs/throttler`, `helmet` | `^6.4.0`, `^8.0.0` | Proteção contra abuso HTTP e headers de segurança |
| **Validação de DTOs** | `class-validator`, `class-transformer` | `^0.14.1`, `^0.5.1` | Validação declarativa com `whitelist: true` e `forbidNonWhitelisted: true` |
| **ORM & Migrations** | `prisma`, `@prisma/client` | `^6.5.0` (instalado `6.19.3`) | Mapeamento objeto-relacional tipado e DDL versionado |
| **Banco de Dados** | `postgres:16-alpine` | `16` | Persistência relacional 3FN + `JSONB` + `UUID` + Triggers SQL |
| **Servidor SMTP Dev** | `axllent/mailpit:latest` | `latest` | Captura local de e-mails transacionais (`1025` SMTP / `8025` Web UI) |
| **Testes** | `jest`, `ts-jest`, `supertest` | `^29.7.0`, `^29.2.5`, `^7.0.0` | Testes unitários (`*.spec.ts`) e E2E (`*.e2e-spec.ts`) |

---

## 3. Estrutura de Pastas

```text
apps/api/
├── .editorconfig
├── .env.example                  # Template de variáveis de ambiente
├── .gitignore
├── Dockerfile                    # Multi-stage build (node:22-alpine)
├── docker-compose.yml            # PostgreSQL 16 (5432) + Mailpit (1025/8025) + API (3000)
├── eslint.config.mjs             # Configuração ESLint 9 + TypeScript-ESLint
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── prisma/
│   ├── schema.prisma             # Modelo físico canônico (13 tabelas + 10 enums)
│   ├── seed.ts                   # Seed idempotente dos 7 Pilares de Vida
│   └── migrations/
│       └── 20261108195554_init/
│           └── migration.sql     # DDL completo + Trigger SQL trg_enforce_max_3_pilares_mes
├── src/
│   ├── main.ts                   # Bootstrap, prefixo /api/v1, ValidationPipe, Helmet, CORS, Swagger
│   ├── app.module.ts             # Módulo raiz (ConfigModule, ThrottlerModule, PrismaModule, HealthModule)
│   ├── common/
│   │   ├── dto/
│   │   │   └── api-error-response.dto.ts
│   │   ├── exceptions/
│   │   │   └── domain.exception.ts
│   │   └── filters/
│   │       ├── global-http-exception.filter.ts
│   │       └── global-http-exception.filter.spec.ts
│   ├── prisma/
│   │   ├── prisma.module.ts      # @Global() PrismaModule
│   │   └── prisma.service.ts     # PrismaClient com ciclo de vida OnModuleInit/OnModuleDestroy
│   └── modules/
│       └── health/
│           ├── health.module.ts
│           ├── health.controller.ts
│           └── health.controller.spec.ts
└── test/
    ├── jest-e2e.json
    └── health.e2e-spec.ts        # Teste E2E de /api/v1/health, seed dos 7 pilares e trigger RN01
```

---

## 4. Camadas, Módulos e Padrão de Erros

### 4.1 Prefixo Global e Documentação
- Todas as rotas HTTP expõem o prefixo `/api/v1`.
- Documentação Swagger disponível em `http://localhost:3000/api/docs`.

### 4.2 Envelope Padronizado de Erros (`GlobalHttpExceptionFilter`)
Qualquer exceção capturada na API é serializada no formato determinístico esperado pelo cliente Flutter:
```json
{
  "statusCode": 422,
  "errorCode": "MAX_ACTIVE_PILLARS_EXCEEDED",
  "message": "Selecione apenas 3 pilares por mês!",
  "details": { "mesAno": "2026-10-01" },
  "timestamp": "2026-11-08T19:55:00.000Z",
  "path": "/api/v1/pilares/ativos/2026-10-01"
}
```

### 4.3 Catálogo Canônico de `errorCode` (`DomainException`)
- `VALIDATION_ERROR` (`400`)
- `INVALID_CREDENTIALS` (`401`)
- `TOKEN_EXPIRED_OR_INVALID` (`401`)
- `RESOURCE_NOT_FOUND` (`404`)
- `EMAIL_ALREADY_REGISTERED` (`409`)
- `RESET_TOKEN_INVALID` (`400`)
- `MAX_ACTIVE_PILLARS_EXCEEDED` (`422` — RN01: `"Selecione apenas 3 pilares por mês!"`)
- `MENTAL_FATIGUE_LIMIT_EXCEEDED` (`422` — RN02: `"Limite de horas atingido, reagende a atividade."`)
- `INTERNAL_SERVER_ERROR` (`500`)

O `GlobalHttpExceptionFilter` também intercepta violações oriundas diretamente da trigger SQL `RN01_VIOLATION` do PostgreSQL e as converte automaticamente em `HTTP 422 MAX_ACTIVE_PILLARS_EXCEEDED`.

---

## 5. Banco de Dados e Prisma ORM

### 5.1 Tabelas Mapeadas (`prisma/schema.prisma`)
1. `usuario` (`Usuario`)
2. `sessao_refresh` (`SessaoRefresh`) — `ON DELETE CASCADE`
3. `token_recuperacao_senha` (`TokenRecuperacaoSenha`) — `ON DELETE CASCADE`
4. `pilar_vida` (`PilarVida`) — Catálogo fixo (`1..7`)
5. `pilar_ativo_mes` (`PilarAtivoMes`) — `uk_usuario_pilar_mes` + Trigger `RN01`
6. `matriz_energia` (`MatrizEnergia`)
7. `projeto` (`Projeto`)
8. `tarefa` (`Tarefa`) — `idx_tarefa_usuario_data`
9. `habito` (`Habito`)
10. `registro_execucao_habito` (`RegistroExecucaoHabito`) — `uk_habito_data`
11. `sessao_pomodoro` (`SessaoPomodoro`)
12. `checklist` (`Checklist`)
13. `item_checklist` (`ItemChecklist`)
14. `fechamento_reflexao` (`FechamentoReflexao`) — `uk_usuario_ciclo_inicio`
15. `lembrete_config` (`LembreteConfig`) — `uk_usuario_tipo_lembrete`
16. `ia_cache_resposta` (`IaCacheResposta`)

### 5.2 Trigger SQL de Integridade (`RN01`)
Incluída na migration inicial (`20261108195554_init/migration.sql`):
- Função `fn_enforce_max_3_pilares_mes()` e trigger `trg_enforce_max_3_pilares_mes` (`BEFORE INSERT OR UPDATE ON pilar_ativo_mes`).
- Conta registros com `deleted_at IS NULL` para o par `(id_usuario, mes_ano)` e lança `ERRCODE = '23514'` com `'RN01_VIOLATION: Selecione apenas 3 pilares por mês!'` caso já existam 3 pilares ativos.

### 5.3 Seed dos 7 Pilares (`prisma/seed.ts`)
Popula de forma idempotente via `upsert`:
1. `SAUDE` (`#EF4444` / `#FEF2F2` / `heart_pulse`)
2. `MOVIMENTO` (`#F97316` / `#FFF7ED` / `activity`)
3. `SONO` (`#6366F1` / `#EEF2FF` / `moon`)
4. `MENTE` (`#8B5CF6` / `#F5F3FF` / `brain`)
5. `ESTUDOS` (`#10B981` / `#ECFDF5` / `book_open`)
6. `FINANCAS` (`#CA8A04` / `#FEFCE8` / `wallet`)
7. `CARREIRA` (`#0EA5E9` / `#F0F9FF` / `briefcase`)

---

## 6. Como Executar Localmente

```powershell
# 1. Subir PostgreSQL 16 e Mailpit
docker compose up -d postgres mailpit

# 2. Instalar dependências
npm.cmd install

# 3. Aplicar migrations + trigger SQL e rodar seed dos 7 pilares
npx.cmd prisma migrate reset --force

# 4. Iniciar servidor em modo desenvolvimento (porta 3000)
npm.cmd run start:dev

# 5. Qualidade e Testes
npm.cmd run lint
npm.cmd run build
npm.cmd run test
npm.cmd run test:e2e
```

---

## 7. Decisões Locais de Implementação

- **Fixação do Prisma em `^6.5.0`**: Mantém a sintaxe estável `url = env("DATABASE_URL")` em `schema.prisma` e `package.json#prisma.seed`, evitando quebras introduzidas pelo Prisma 7.
- **`esModuleInterop: true` no `tsconfig.json`**: Habilitado para compatibilidade limpa de imports default (`import helmet from 'helmet'`, `import request from 'supertest'`) tanto no runtime quanto no Jest/ts-jest.
- **`docker-compose.yml` autocontido em `apps/api/` (`DEC-001`)**: Ajustado `build.context: .` e `env_file: ./.env` para refletir a separação de repositórios definida pelo Arquiteto Coordenador.

---

## 8. Changelog por Tarefa

### `E01-T01` — Inicializar Repositório `apps/api`, Docker Compose e NestJS Base
- Criados `docker-compose.yml` (`postgres:16-alpine` e `axllent/mailpit:latest`), `Dockerfile`, `.env.example`, `package.json`, `tsconfig.json` e `eslint.config.mjs`.
- Configurado `main.ts` com prefixo `/api/v1`, `ValidationPipe` global, `helmet`, `CORS` e Swagger em `/api/docs`.
- Implementados `DomainException`, `GlobalHttpExceptionFilter` e `HealthController` (`GET /api/v1/health`) com testes unitários e E2E.

### `E01-T02` — Implementar Schema Prisma Completo, Trigger SQL `RN01` e Seed dos 7 Pilares de Vida
- Criado `prisma/schema.prisma` com todos os 16 models e 10 enums canônicos do TCC.
- Gerada e aplicada a migration inicial `20261108195554_init` contendo o DDL completo e a trigger `trg_enforce_max_3_pilares_mes` (`RN01`).
- Implementado `prisma/seed.ts` com `upsert` dos 7 Pilares de Vida.
- Criado `PrismaModule` (`@Global()`) + `PrismaService` e integrado `SELECT 1` ao `HealthController`, com testes E2E validando os 7 pilares e o bloqueio do 4º pilar no PostgreSQL.
