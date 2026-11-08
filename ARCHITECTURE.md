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
| **Autenticação & Criptografia** | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `argon2`, `google-auth-library` | `^11.0.0`, `^11.0.0`, `^4.0.1`, `^0.41.1`, `^9.15.0` | JWT (`15m`), Refresh Rotation (`30d` SHA-256), hash `Argon2id` e OAuth 2.0 Google/Apple |
| **E-mail Transacional** | `nodemailer` | `^6.10.0` | Envio de código temporário de 6 dígitos para recuperação de senha (`RF04`) via Mailpit/SMTP |
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
apps/ads-tg-api/
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
│   ├── schema.prisma             # Modelo físico canônico (16 models + 10 enums)
│   ├── seed.ts                   # Seed idempotente dos 7 Pilares de Vida
│   └── migrations/
│       └── 20261108195554_init/
│           └── migration.sql     # DDL completo + Trigger SQL trg_enforce_max_3_pilares_mes
├── src/
│   ├── main.ts                   # Bootstrap, prefixo /api/v1, ValidationPipe, Helmet, CORS, Swagger
│   ├── app.module.ts             # Módulo raiz (ConfigModule, ThrottlerModule, PrismaModule, HealthModule, AuthModule, UsuariosModule, APP_GUARD: JwtAuthGuard)
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts # @CurrentUser() extrai AuthenticatedUser da request
│   │   │   └── public.decorator.ts       # @Public() libera endpoints do JwtAuthGuard global
│   │   ├── dto/
│   │   │   └── api-error-response.dto.ts
│   │   ├── exceptions/
│   │   │   └── domain.exception.ts
│   │   ├── filters/
│   │   │   ├── global-http-exception.filter.ts
│   │   │   └── global-http-exception.filter.spec.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts         # Guard global JWT respeitando @Public()
│   ├── prisma/
│   │   ├── prisma.module.ts      # @Global() PrismaModule
│   │   └── prisma.service.ts     # PrismaClient com ciclo de vida OnModuleInit/OnModuleDestroy
│   └── modules/
│       ├── health/
│       │   ├── health.module.ts
│       │   ├── health.controller.ts      # GET /api/v1/health (@Public())
│       │   └── health.controller.spec.ts
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts        # /api/v1/auth (register, login, oauth/google, oauth/apple, refresh, logout, forgot-password, reset-password)
│       │   ├── auth.service.ts           # Argon2id, criação de usuário + 4 lembretes padrão, emissão e rotação de Refresh Token SHA-256
│       │   ├── oauth.service.ts          # Verificação Google (google-auth-library) e Apple + suporte a OAUTH_DEV_MOCK_ENABLED
│       │   ├── password-reset.service.ts # Código numérico de 6 dígitos (15 min) + envio via Nodemailer/Mailpit (RF04)
│       │   ├── auth.service.spec.ts
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts       # Validação de Bearer Token e verificação de existência ativa do usuário
│       │   └── dto/
│       │       ├── register.dto.ts
│       │       ├── login.dto.ts
│       │       ├── refresh-token.dto.ts
│       │       ├── oauth-login.dto.ts
│       │       ├── forgot-password.dto.ts
│       │       ├── reset-password.dto.ts
│       │       └── auth-response.dto.ts
│       └── usuarios/
│           ├── usuarios.module.ts
│           ├── usuarios.controller.ts    # GET/PATCH/DELETE /api/v1/usuarios/me
│           ├── usuarios.service.ts       # Consulta/edição de perfil (horasSonoDiarias RF05) e expurgo em cascata LGPD (RNF07)
│           ├── usuarios.service.spec.ts
│           └── dto/
│               ├── update-profile.dto.ts
│               └── delete-account.dto.ts
└── test/
    ├── jest-e2e.json
    ├── health.e2e-spec.ts        # Teste E2E de /api/v1/health, seed dos 7 pilares e trigger RN01
    └── auth-usuarios.e2e-spec.ts # Teste E2E da jornada completa de Auth, OAuth, Reset de Senha e Delete Cascade LGPD
```

---

## 4. Camadas, Módulos e Padrão de Erros

### 4.1 Prefixo Global, Segurança e Documentação
- Todas as rotas HTTP expõem o prefixo `/api/v1`.
- `JwtAuthGuard` é registrado globalmente via `APP_GUARD` em `AppModule`. Apenas rotas explicitamente decoradas com `@Public()` permitem acesso anônimo.
- Documentação Swagger disponível em `http://localhost:3000/api/docs`.

### 4.2 Autenticação Híbrida (`AuthModule` — `ADR-005`)
- **Hash de Senha (`RF02`, `RNF05`)**: Algoritmo `Argon2id` (`argon2.hash(senha, { type: argon2.argon2id })`), com regex estrita exigindo `>= 8` caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.
- **Cadastro Transacional (`RF01`)**: `POST /api/v1/auth/register` cria em uma única transação Prisma o registro em `usuario`, os **4 registros padrão em `lembrete_config`** (`AGUA`, `ALONGAMENTO`, `SONO`, `FECHAMENTO_SEMANAL`) e a primeira sessão em `sessao_refresh`.
- **Duplo Token (`RNF05`)**:
  - `accessToken`: JWT `HS256` stateless com expiração de `15m`.
  - `refreshToken`: Token opaco aleatório (`48 bytes` hex) com expiração de `30d`, persistido apenas como hash `SHA-256` em `sessao_refresh`. A rota `POST /api/v1/auth/refresh` invalida o token anterior (`revokedAt = now()`) e emite um novo par.
- **OAuth 2.0 Google & Apple (`RF03`)**:
  - `POST /api/v1/auth/oauth/google` e `POST /api/v1/auth/oauth/apple` verificam o `idToken` (via `OAuth2Client.verifyIdToken` em produção, ou tokens determinísticos `mock-google-token:<email>:<nome>` / `mock-apple-token:<email>:<nome>` quando `OAUTH_DEV_MOCK_ENABLED=true` e `NODE_ENV !== 'production'`).
- **Recuperação de Senha (`RF04`)**:
  - `POST /api/v1/auth/forgot-password` gera código numérico de 6 dígitos (`100000..999999`), armazena apenas o hash `SHA-256` em `token_recuperacao_senha` (`expiresAt = +15 min`) e dispara o e-mail para o servidor SMTP (`Mailpit` em desenvolvimento).
  - `POST /api/v1/auth/reset-password` valida o código, grava o novo hash `Argon2id`, marca `usadoEm = now()` e revoga todas as sessões de refresh do usuário.

### 4.3 Perfil do Usuário e Direito ao Esquecimento LGPD (`UsuariosModule` — `RF05`, `RNF07`)
- `GET /api/v1/usuarios/me`: Retorna os dados do usuário autenticado omitindo `senhaHash`.
- `PATCH /api/v1/usuarios/me`: Permite atualizar `nomeCompleto`, `horasSonoDiarias` (`4..12`, base do cálculo de capacidade útil `RN02`) e `onboardingConcluido`.
- `DELETE /api/v1/usuarios/me`: Executa exclusão física de `usuario` no PostgreSQL, disparando `ON DELETE CASCADE` em todas as tabelas filhas (`sessao_refresh`, `token_recuperacao_senha`, `pilar_ativo_mes`, `matriz_energia`, `projeto`, `tarefa`, `sessao_pomodoro`, `habito`, `registro_execucao_habito`, `checklist`, `item_checklist`, `fechamento_reflexao`, `lembrete_config`).

### 4.4 Envelope Padronizado de Erros (`GlobalHttpExceptionFilter`)
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

### 4.5 Catálogo Canônico de `errorCode` (`DomainException`)
- `VALIDATION_ERROR` (`400`)
- `INVALID_CREDENTIALS` (`401`)
- `TOKEN_EXPIRED_OR_INVALID` (`401`)
- `RESOURCE_NOT_FOUND` (`404`)
- `EMAIL_ALREADY_REGISTERED` (`409`)
- `RESET_TOKEN_INVALID` (`400`)
- `MAX_ACTIVE_PILLARS_EXCEEDED` (`422` — RN01: `"Selecione apenas 3 pilares por mês!"`)
- `MENTAL_FATIGUE_LIMIT_EXCEEDED` (`422` — RN02: `"Limite de horas atingido, reagende a atividade."`)
- `INTERNAL_SERVER_ERROR` (`500`)

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
- **`docker-compose.yml` autocontido em `apps/ads-tg-api/` (`DEC-001`)**: Ajustado `build.context: .` e `env_file: ./.env` para refletir a separação de repositórios definida pelo Arquiteto Coordenador.
- **Compatibilidade Dual nos DTOs de OAuth (`OAuthLoginDto`)**: Aceita tanto `{ idToken, nomeCompleto }` quanto `{ identityToken, fullName }` (nomenclatura nativa do Apple Sign-In), evitando divergências de contrato com o cliente mobile.

---

## 8. Changelog por Tarefa

### `E01-T01` — Inicializar Repositório `apps/ads-tg-api`, Docker Compose e NestJS Base
- Criados `docker-compose.yml` (`postgres:16-alpine` e `axllent/mailpit:latest`), `Dockerfile`, `.env.example`, `package.json`, `tsconfig.json` e `eslint.config.mjs`.
- Configurado `main.ts` com prefixo `/api/v1`, `ValidationPipe` global, `helmet`, `CORS` e Swagger em `/api/docs`.
- Implementados `DomainException`, `GlobalHttpExceptionFilter` e `HealthController` (`GET /api/v1/health`) com testes unitários e E2E.

### `E01-T02` — Implementar Schema Prisma Completo, Trigger SQL `RN01` e Seed dos 7 Pilares de Vida
- Criado `prisma/schema.prisma` com todos os 16 models e 10 enums canônicos do TCC.
- Gerada e aplicada a migration inicial `20261108195554_init` contendo o DDL completo e a trigger `trg_enforce_max_3_pilares_mes` (`RN01`).
- Implementado `prisma/seed.ts` com `upsert` dos 7 Pilares de Vida.
- Criado `PrismaModule` (`@Global()`) + `PrismaService` e integrado `SELECT 1` ao `HealthController`, com testes E2E validando os 7 pilares e o bloqueio do 4º pilar no PostgreSQL.

### `E02-T01` — Implementar no NestJS `AuthModule` (Register, Login, Argon2id, JWT + Refresh Rotation)
- Criados decorators `@Public()` e `@CurrentUser()`, `JwtAuthGuard` global (`APP_GUARD` no `AppModule`) e `JwtStrategy`.
- Implementado `AuthService` e `AuthController` (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`) com validação estrita de senha forte (`RF02`), hash `Argon2id`, seed automático dos 4 `lembrete_config` padrão e rotação de Refresh Token com hash `SHA-256` em `sessao_refresh`.

### `E02-T02` — Implementar no NestJS OAuth 2.0 (Google/Apple), Reset de Senha (`RF04`) e `UsuariosModule` (Perfil + LGPD `RNF07`)
- Implementado `OAuthService` (`POST /api/v1/auth/oauth/google` e `POST /api/v1/auth/oauth/apple`) com `google-auth-library` e suporte a `OAUTH_DEV_MOCK_ENABLED=true` para testes determinísticos em desenvolvimento.
- Implementado `PasswordResetService` (`POST /api/v1/auth/forgot-password` e `POST /api/v1/auth/reset-password`) com código numérico de 6 dígitos (`SHA-256`, expiração de 15 min) enviado via `nodemailer`/Mailpit e revogação de sessões após redefinição.
- Implementado `UsuariosModule` (`GET /api/v1/usuarios/me`, `PATCH /api/v1/usuarios/me`, `DELETE /api/v1/usuarios/me`) garantindo atualização de `horasSonoDiarias` (`RF05`) e exclusão definitiva em cascata no PostgreSQL (`RNF07` LGPD).
- Adicionados testes unitários (`auth.service.spec.ts`, `usuarios.service.spec.ts`) e suíte E2E completa (`test/auth-usuarios.e2e-spec.ts`).
