# ads-tg-api — Sistema Integrado de Gestão de Produtividade Pessoal

API Central construída com **NestJS 11**, **Prisma ORM 6** e **PostgreSQL 16** (FATEC Campinas — 2026).

## Documentação Completa

Consulte o guia arquitetural vivo deste repositório em **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** para detalhes sobre:
- Stack, versões e estrutura de diretórios;
- Envelope padronizado de erros (`GlobalHttpExceptionFilter`) e catálogo de `errorCode`;
- Esquema Prisma, trigger SQL `RN01` (`trg_enforce_max_3_pilares_mes`) e seed dos 7 Pilares de Vida;
- Instruções de execução com Docker Compose, migrations e suíte de testes unitários/E2E.
