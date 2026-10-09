# CALI Workspace — substituição estrutural pela V2 (diagnóstico, auditoria e estado)

Data: 09/10/2026 · Branch: `feat/client-visual-v2-inplace-20261008` · Referência visual: `patricia258/cali-workspace-v2@7c0a232`.
Este documento substitui, como fonte de estado, `V2_MAPA_ESTRUTURAL_2026-10-09.md` e `VISUAL_V2_HOMOLOGACAO_2026-10-09.md`.

## 1. Diagnóstico

A tentativa anterior transportou o CSS da V2 para dentro do aplicativo, mas o manteve convivendo com as
folhas antigas. Medido nas rotas do cliente, em repouso (1440 px, dados QA):

- 56 folhas de estilo e 7.391 regras carregadas; no máximo ~690 regras casavam com algum elemento.
- 8.416 `!important` no CSS anterior à V2; a camada V2 precisou de mais 576 `!important` para vencê-los.
- 703 de 935 regras de `styles/client-modules.css` e 296 de 337 de `styles/client-home.css` eram cópias
  das regras da V2 com outro prefixo.
- Sintomas visíveis: topbar e ícones da sidebar diferentes da V2, padding duplicado nas páginas, título
  “CALI Partner” ilegível na home, grade semanal do calendário quebrada.

Causa: duas identidades visuais ativas ao mesmo tempo. Correção adotada: o cliente deixa de carregar o CSS
anterior e passa a usar o CSS da V2 literalmente.

## 2. Arquitetura adotada

| Peça | Papel |
|---|---|
| `scripts/port-v2-css.cjs` | Gera `src/client-v2/v2.generated.css` a partir do repositório aprovado, byte a byte e na ordem de cascata do bundle de referência, apenas envolvendo as regras no escopo `html[data-workspace-ui='client-v2']`. Não editar o arquivo gerado. |
| `src/client-v2/ClientShell.tsx` | Composição aprovada `.app > .sidebar + .main > .topbar + .content`. Recebe prontos os componentes operacionais (sessão, notificações, perfil, frentes, agendamento, bridges). |
| `src/client-v2/operational.css` | Encaixes: estilos de elementos que existem no oficial e não no protótipo, com os valores dos padrões aprovados. Não redefine regras da V2. |
| `src/client-v2/visualSystem.ts` | Garante uma única implementação visual no documento: V2 nas rotas `/cliente`; folhas anteriores na landing, login, administradora e papel de impressão de relatório. |
| `src/styles/legacy/index.ts` | As 45 folhas globais anteriores, na ordem original, montadas somente fora do cliente. Serão removidas quando a administradora for migrada. |

Nenhuma consulta, mutação, permissão, rota ou runtime operacional foi alterado. `DirectProfileControl` ganhou
uma prop opcional `trigger` (apresentação do gatilho); a administradora não a utiliza.

## 3. Auditoria da branch (tentativas anteriores)

| Classe | Itens |
|---|---|
| **Reaproveitar** | JSX das páginas do cliente já escrito com as classes da V2 (Horas, Projetos/Entregáveis, Documentos, Relatórios, Ocorrências, Home); marcadores `data-v2-operation` usados pelos runtimes de conversa/aprovação; `scripts/verify-v2-operation.cjs` (guarda de bindings); método de QA com backend simulado. |
| **Refatorar** | Equipe (cabeçalho V2, mas diretório/ferramentas na composição antiga); Calendário (JSX `client-agenda-*`/`client-week-*`, não a estrutura `wf-*` aprovada); `styles/client-calendar.css` (332 regras próprias); cores noturnas por variável. |
| **Descartado nesta etapa** | `styles/client-modules.css` e `styles/client-home.css` (cópias da V2); shell intermediário do cliente em `WorkspaceShell` (`client-v2-globalbar`, `client-v2-tools`); carregamento global de CSS em `main.tsx`/`App.tsx`. |
| **A decidir** | `styles/workspace-admin-v2.css` e `workspace-shared-modules-v2.css`: reestilização da administradora feita antes de consultar a referência administrativa. Mantidas intactas por ora para não alterar a administradora nesta etapa. |

## 4. Mapa V2 → oficial (cliente)

| V2 | Oficial (operação preservada) | Estado |
|---|---|---|
| Shell `main.tsx` | `WorkspaceShell` → `ClientShell` | Estrutura e medidas iguais à V2 (sidebar 56 px, topbar 61 px, conteúdo em x=91/y=87) |
| `ClientHome` | `ClientDashboard`, `ClientHomeTeam` | Blocos na mesma posição e largura da V2; ver diferenças de dados abaixo |
| Horas (`main.tsx`) | `ClientHoursPage` | Estrutura V2; filtro de contexto e detalhe encaixados |
| Projetos / `DeliverablesView` | `ClientDeliverablesPage` | Estrutura V2; seletor de projeto e aviso de cronograma encaixados |
| `DocumentsView` | `ClientDocumentsPage` | Estrutura V2; ciência e Drive encaixados |
| `ReportsView` | `ClientReportsPageV5` | Estrutura V2; versões/ciência encaixadas; revisar espaçamentos |
| `RecordsView` | `WorkspaceRecordsPage` | Estrutura V2 parcial: faltam faixa de contagem e abas de situação |
| `CalendarView` | `ClientTimelinePage` | **Pendente**: JSX ainda na composição antiga |
| Equipe (`main.tsx`, `TeamEnhancements`, `IndicatorExtras`) | `CompanyTeamPage` e componentes | **Pendente**: diretório, ficha, formulário e indicadores |
| `NoticesView` | — | Sem fonte de dados oficial: card vazio na home, sem item de menu |
| — | `ClientFrontsPage` | Acesso pelo rodapé da sidebar, pela barra da home e pelo menu de conta |

## 5. Decisões da proprietária (09/10) e diferenças restantes

- **Topbar e sidebar seguem a V2 por inteiro.** Agendamento, Frentes e Relatórios saíram da topbar: o
  agendamento abre por “Solicitar agendamento” no Calendário, Frentes pela barra da Visão Geral, Relatórios
  pela sidebar.
- **Cliente somente diurno.** O alternador de tema foi retirado do cliente e as rotas `/cliente` sempre
  resolvem para o tema diurno. A administradora mantém o comportamento atual até ser migrada.
- **Busca da topbar** funciona como localizador de módulos (⌘/Ctrl+K); não pesquisa conteúdo.
- **“Abrir backoffice Admin”** do protótipo não se aplica ao papel cliente e não foi reproduzido.
- **Avisos**: item de menu e página na composição aprovada, com estado vazio; não existe origem de dados
  oficial e nenhum aviso fictício foi criado.
- **Escudo no rodapé da sidebar**: no protótipo é um aviso de ambiente de testes; aqui abre a política de
  privacidade já existente.
- **Administradora**: seguirá a mesma identidade, sobre a referência administrativa da V2 e alinhada às
  funções administrativas; ainda não iniciada.

## 6. Verificação realizada

Ambiente local, somente loopback, com `VITE_SUPABASE_URL` apontando para um host inexistente e todas as
respostas de backend simuladas; escritas recusadas. Nenhum acesso a produção.

- `npm run check` (TypeScript + build): aprovado.
- 9 rotas do cliente renderizam sem erro de runtime; pares V2 × oficial capturados a 1440 px.
- Geometria medida nas duas versões (home): toolbar, saudação e contratação idênticas em x, y, largura e
  altura; demais blocos idênticos em x e largura, com alturas dependentes dos dados.
- Administradora: 5 rotas comparadas antes/depois; diferenças dentro do ruído entre execuções idênticas
  (≤1%), exceto 9 px de altura em `/admin/calendario`, a investigar.

Não verificado ainda: 1280/1024/390 px, tema noturno, fluxos de escrita, ambiente autenticado real.
