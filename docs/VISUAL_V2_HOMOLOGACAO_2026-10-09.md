# CALI Workspace — integração visual V2

Autor: Codex · 09/10/2026 · aprovação: aguardando homologação da Pati.

Repositório oficial: `patricia258/app.cali`. Branch: `feat/client-visual-v2-inplace-20261008`.
Base: `7d817c3d64e3839eb10475233b4e43b92a9914cb`.
Referência: `patricia258/cali-workspace-v2@7c0a2323bb221cfd61c0a8ed4ced8670c05cce78`, incluindo o handoff de 08/10.

## Escopo e decisões

- Aplicar a identidade V2 aos componentes oficiais; não importar o protótipo nem seus dados fictícios.
- Shell contínuo com navegação bordô compacta, topbar branco, superfícies editoriais e tabelas densas. Todos os atalhos e rotas continuam disponíveis.
- Manter o modo noturno oficial: a limitação diurna do protótipo não autoriza remover uma funcionalidade existente.
- Cliente: início, calendário, equipe, entregáveis, horas, ocorrências, documentos, relatórios e frentes. Administradora: visão geral, clientes, equipe, projetos, horas, calendário, ocorrências, documentos, relatórios, satisfação, propostas e Mapa de People.
- As telas executam as mesmas queries, cálculos, filtros, ações, permissões e integrações. Sem mudanças em Auth, RLS, SQL, funções, storage, histórico, dados ou envio de mensagens.
- Não modificar relatórios de headcount nem os componentes de papel/PDF.
- Home e calendário consolidados mantendo conteúdo e ordem anteriores: seis arquivos de versões substituídos por dois canônicos. Removidas 65 declarações antigas de geometria/superfície do shell substituídas pela V2.
- Não excluir componentes históricos sem auditar dependências. Ausência de rota isoladamente não prova ausência de uso.

## Arquivos

`src/styles/workspace-v2.css`, `workspace-client-v2.css`, `workspace-admin-v2.css` e `workspace-shared-modules-v2.css` fornecem a apresentação V2. Marcadores no shell limitam os estilos ao Workspace. `src/styles/client-home.css` e `client-calendar.css` substituem as versões consolidadas. Imports atualizados em `main.tsx`, `App.tsx` e `styles/routes/clientExperience.ts`.

## Validação executada

- `npm ci`: concluído.
- `npm run check`: typecheck e build passaram na base e após cliente, administradora e consolidação.
- `node scripts/verify-v2-operation.cjs`: passou. Compara 271 arquivos operacionais TS/TSX/SQL com a base; permite somente imports de CSS e dois atributos visuais do shell. Confirma conteúdo/ordem dos estilos consolidados e analisa a sintaxe CSS.
- `git diff --check`: passou.
- Queries, handlers, condições de permissão, campos, cálculos e integrações permanecem na fonte original. Nenhuma escrita em dados foi necessária.

## Impedimentos e validações pendentes

`scripts/verify-visual-v2.cjs` prepara um teste sintético das 21 rotas principais em 1440/1280/1024/390 px e screenshots noturnos. Intercepta requisições externas e bloqueia escritas. A execução inicial foi impedida pela ausência do Chromium; sua instalação retornou ZIP inválido/vazio. **Não contar esse teste como aprovado.**

Ainda não certificados: fidelidade visual de todos os estados com dados, overflow/contraste por largura, teclado/foco em overlays e regressão autenticada ponta a ponta. Antes da liberação, conferir em contas de teste:

- Login/recuperação, sessão expirada, papéis e isolamento de empresas.
- Horas: timer/manual, alertas, filtros, visibilidade mensal.
- Entregáveis: aceite, ajuste, avaliação, tarefas, anexos e chat.
- Ocorrências: criar, responder, encerrar, avaliar e reabrir.
- Equipe: importação, edição, confirmação mensal e histórico.
- Calendar/Meet: remarcação, cancelamento e convites.
- Documentos: arquivos, comentários, ciência e Drive.
- Relatórios: filtros, versões, publicação, ciência e PDF.
- Propostas/Mapa: edição, revisão, geração e envio.

## Deploy e rollback

Somente preview no projeto oficial Vercel `app-cali`, equipe `team_PwR4i7JBjPTWvWZobaKnMIng`, projeto `prj_dFMrnb5zqYA8iCvcN4w0mFLb9Lrh`. Não alterar domínio, produção, principal ou configurações de backend. Preview de código não significa banco isolado; esta rodada não executa ações autenticadas com efeitos externos para teste.

Rollback: reverter o commit desta rodada nesta mesma branch, restaurando arquivos e imports. Sem migrações de banco ou novos envs. READY indica build publicado, não aceite funcional/visual.
