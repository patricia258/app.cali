# Handoff — interface V2 no cliente do CALI Workspace

Registro cronológico do que foi feito no repositório. Acrescentar uma entrada por sessão de trabalho,
no topo, com data, commits, verificação e pendências. Detalhe técnico e mapa V2 → oficial em
`docs/V2_SUBSTITUICAO_ESTRUTURAL_2026-10-09.md`.

- Branch: `feat/client-visual-v2-inplace-20261008` (30+ commits à frente de `main`; `main` sem commits novos).
- Referência visual: `patricia258/cali-workspace-v2@7c0a232`.
- Produção (`main` → app.calirh.com): **não alterada** até esta data.

## 09/10/2026 — Claude (Opus 5.5), com Patricia

### Commits desta sessão (do mais antigo ao mais recente)
- `a4cd864` refactor(client): V2 shell on verbatim approved CSS, legacy styles isolated from client
- `dfd2b0e` refactor(client): align home JSX to approved composition; V2 dialog, notification and account surfaces
- `3dd9961` refactor(client): calendar follows the approved single control row and business-week grid
- `0b0102e` refactor(client): follow the approved topbar and sidebar in full; client is day-only
- `8d0abfe` docs: record owner decisions on topbar, sidebar and day-only client
- `33dfb56` refactor(client): occurrences list follows the approved summary, status segments and tags
- `19fe2bf` refactor(client): team directory follows the approved context strip and toolbar
- `ca864af` fix(client): remove demo preview mode from deliverables and documents

### O que mudou
1. **Uma só identidade visual no cliente.** As rotas `/cliente` usam o CSS da V2 gerado literalmente do
   repositório aprovado (`scripts/port-v2-css.cjs` → `src/client-v2/v2.generated.css`) e não carregam mais
   nenhuma das 45 folhas anteriores. Essas folhas ficam em `src/styles/legacy`, montadas só na landing, login,
   administradora e impressão de relatório.
2. **Shell do cliente** (`src/client-v2/ClientShell.tsx`): topbar e sidebar da V2 por inteiro — marca, busca
   de módulos (⌘/Ctrl+K), notificações, menu de conta; 9 itens de menu incluindo Avisos.
3. **Páginas alinhadas ao JSX aprovado:** Visão Geral, Calendário, Ocorrências, diretório de Equipe.
4. **Decisões da proprietária aplicadas:** cliente somente diurno (alternador removido); botões remanejados
   para fora da topbar; “Abrir backoffice Admin” era só do ambiente de teste e não existe no cliente.
5. **Sem demonstração no cliente:** removido o “modo preview” de Projetos/Entregáveis e Documentos (dados
   fictícios e mensagens de sucesso sem gravação).
6. **Removido:** `styles/client-modules.css`, `styles/client-home.css`, shell intermediário do cliente,
   atalhos de frentes/relatórios da topbar.

### Verificação desta sessão
- `npm run check` (TypeScript + build): aprovado.
- 9 rotas do cliente e 8 diálogos renderizam sem erro, em ambiente local com backend simulado e host do
  banco inacessível. **Nenhum teste com sessão real nem de gravação foi feito.**
- Comparação com a V2 a 1440 px: shell idêntico em posição e tamanho; Visão Geral idêntica em toolbar,
  saudação, contratação e colunas.
- Nenhuma consulta, mutação, permissão ou política de banco alterada.

### Pendências do cliente
- Equipe: tabela ainda com colunas configuráveis; abas Estrutura, Movimentações e Indicadores, ficha e
  formulário de cadastro por alinhar.
- Acerto fino em Relatórios, Documentos, Projetos e Frentes; campos de alguns diálogos.
- Larguras 1280, 1024 e 390 px; fluxos de gravação com sessão real.
- Avisos: não existe origem de dados no banco; a página mostra estado vazio. Ligar exige criar a tabela e
  a publicação pela administradora (mudança de banco, precisa de autorização).
- `scripts/verify-v2-operation.cjs` precisa ser reescrito para a nova estrutura.

### Pontos de atenção antes de publicar no oficial
- A branch também contém a reestilização da administradora feita nas tentativas anteriores
  (`styles/workspace-admin-v2.css`). Publicar a branch muda a aparência da administradora.
- `ProtectedRoute`/`LoginPage` mantêm um atalho de entrada sem login (`cali-preview-role`) que funciona em
  `localhost` e em endereços `*.vercel.app`, não em app.calirh.com. Recomenda-se removê-lo junto com a
  migração da administradora, que ainda o utiliza.
- Reversão: `main` permanece no commit `a04c056`; voltar é reverter o merge.
