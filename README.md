# CALI Workspace

Workspace compartilhado entre a CALI RH e seus clientes para acompanhar projetos, entregáveis, horas, calendário, documentos, relatórios e decisões do trabalho.

## Princípio do produto

**CALI administra. Cliente acompanha, participa, valida e dá NPS.**

O Workspace não é um SaaS para o cliente operar. É o ambiente de relacionamento e execução da CALI com cada empresa.

## Documentação

- [Índice](docs/INDEX.md)
- [Fluxos de produto](docs/flows/README.md)
- [Arquitetura e mapa de pastas](docs/ARCHITECTURE.md)
- [Testes de lógica, jornadas e contratos](docs/TESTING.md)

## Desenvolvimento

```bash
npm ci
npm run dev
```

Validação de tipos, build e lógica local.

```bash
npm run test:smoke
```

## Fluxo de construção

As páginas são fechadas e validadas uma a uma. A branch `main` permanece como base de produção; trabalhos ainda não aprovados ficam em branches de desenvolvimento.

O [plano de consolidação](docs/CONSOLIDATION_PLAN.md) registra a sequência da branch. O [runbook](docs/RUNBOOK.md) define configuração local, validação de dados e preparação do Preview.

<!-- deploy trigger: connected Vercel production -->
