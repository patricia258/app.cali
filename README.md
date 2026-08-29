# CALI Workspace

Workspace compartilhado entre a CALI RH e seus clientes para acompanhar projetos, entregáveis, horas, calendário, documentos, relatórios e decisões do trabalho.

## Princípio do produto

**CALI administra. Cliente acompanha, participa, valida e dá NPS.**

O Workspace não é um SaaS para o cliente operar. É o ambiente de relacionamento e execução da CALI com cada empresa.

## Arquitetura atual

- React + TypeScript + Vite
- Supabase com schema isolado `cali_workspace`
- Vercel
- Resend para comunicações transacionais
- Integração Google Workspace/Drive preparada para evolução

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação:

```bash
npm run typecheck
npm run build
```

## Fluxo de construção

As páginas são fechadas e validadas uma a uma. A branch `main` permanece como base de produção; trabalhos ainda não aprovados ficam em branches de desenvolvimento.
