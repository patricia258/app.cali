# CALI Workspace — Handoff de performance e continuidade

**Registrado em:** 08/09/2026  
**Status estimado do produto:** ~60% concluído  
**Escopo:** CALI Workspace / app.cali

## Diretriz executiva

O projeto ainda terá páginas, fluxos, conteúdo e componentes para melhorar. Portanto, qualquer evolução futura deve preservar estabilidade e evitar acumular novos hotfixes, runtimes paralelos ou camadas redundantes que prejudiquem performance, responsividade e previsibilidade visual.

A partir deste ponto, performance é requisito estrutural do produto, não uma etapa final de acabamento.

## Sintoma observado

A navegação entre páginas apresenta períodos de "Carregando", lentidão e, em alguns momentos, piscadas/re-renderizações visíveis. Isso já afetou tanto a área administrativa quanto a área do cliente.

## Diagnóstico confirmado

1. `ProtectedRoute` revalida sessão e perfil/role a cada troca de rota protegida. Isso recria o estado de loading e gera espera perceptível na navegação interna.
2. As páginas principais são importadas estaticamente no `App.tsx`, fazendo o bundle principal carregar código de áreas que o usuário ainda não abriu.
3. O build de produção atual gera bundle JS principal acima de 1 MB e CSS próximo de 1 MB, com warning de chunk acima de 500 kB.
4. O `main.tsx` inicializa muitos runtimes globais e importa várias gerações de CSS/hotfixes, mesmo quando o usuário não está nos respectivos módulos.
5. O Supabase apresenta dívida de performance: foreign keys sem índice de cobertura, políticas RLS com reavaliação de `auth.*` por linha e múltiplas políticas permissivas para a mesma operação.
6. O projeto Supabase está em região dos EUA. Isso aumenta o custo de múltiplas consultas sequenciais para usuários no Brasil, portanto a prioridade é reduzir round-trips e duplicações antes de considerar qualquer mudança de região.

## Plano aprovado de otimização

### Fase 1 — Navegação e autenticação

Prioridade máxima.

- Criar contexto/sessão global do Workspace.
- Validar usuário, role, perfil e empresa uma vez por sessão, com revalidação apenas quando necessário.
- Remover o estado de loading completo a cada troca interna de rota.
- Manter shell/sidebar/topbar montados e trocar apenas o conteúdo da página.
- Não criar novo overlay/loader global para mascarar o problema.

**Meta:** navegar entre módulos sem tela intermediária de carregamento.

### Fase 2 — Code splitting e carregamento por rota

Prioridade muito alta.

- Migrar páginas pesadas para `React.lazy` / `dynamic import()`.
- Carregar Mapa de People, relatórios, propostas, documentos, calendário e demais módulos somente quando acessados.
- Fazer prefetch discreto apenas das rotas mais prováveis após estabilização da sessão.
- Revisar `vite.config.ts` para chunking coerente, sem apenas aumentar `chunkSizeWarningLimit` para esconder warning.

**Meta:** reduzir significativamente o bundle inicial e o tempo até interação.

### Fase 3 — Consolidar runtimes e CSS históricos

Prioridade alta.

- Mapear cada runtime instalado globalmente no `main.tsx`.
- Identificar quais ainda são fonte de verdade, quais estão superseded e quais existem apenas como correção histórica.
- Não apagar em massa.
- Migrar runtimes específicos para ativação por módulo/rota quando possível.
- Consolidar CSS por domínio e remover somente versões comprovadamente obsoletas depois de QA visual Day/Night, desktop/mobile e admin/client.
- Evitar novos arquivos `vXX`, `hotfix`, `polish` sem consolidar o anterior.

**Meta:** parar o crescimento de camadas paralelas e reduzir reflows/reprocessamento global.

### Fase 4 — Banco de dados

Prioridade alta, depois da navegação.

- Revisar primeiro tabelas mais usadas no fluxo diário: `profiles`, `notifications`, `events`, `event_attendees`, `scheduling_requests`, `deliverables`, `hour_entries`, `reports` e tabelas diretamente relacionadas.
- Criar índices apenas para queries reais e FKs relevantes; não criar 71 índices indiscriminadamente.
- Otimizar RLS substituindo reavaliações repetitivas de `auth.*` por padrões recomendados, preservando segurança.
- Consolidar políticas permissivas duplicadas quando isso puder ser feito sem alterar o isolamento admin/client.
- Rodar advisors de segurança e performance depois de cada rodada de DDL.

**Meta:** reduzir latência de consultas sem enfraquecer RLS.

## Regras de não regressão

- Não mudar layout, conteúdo, regras comerciais ou fluxos já aprovados durante a rodada de performance, salvo se forem causa direta do gargalo.
- Não esconder lentidão com loaders mais elaborados.
- Não introduzir novo observer, timer, polling ou runtime global sem justificar impacto.
- Não duplicar fonte de verdade.
- Não consultar perfil/empresa repetidamente se a informação já está válida na sessão.
- Não carregar módulos pesados antes de o usuário precisar deles.
- Não remover CSS/runtime legado sem comparar antes/depois nas rotas afetadas.
- Cada otimização deve ser pequena, reversível e testada antes da próxima.
- QA obrigatório: admin + cliente, tema claro + noite, desktop + mobile, navegação entre módulos e refresh direto da rota.

## Métricas mínimas a acompanhar

Antes/depois de cada fase registrar:

- tamanho do JS principal e gzip;
- tamanho do CSS principal e gzip;
- quantidade de chunks;
- tempo visual entre clique no menu e conteúdo útil;
- quantidade de consultas de autenticação/perfil por navegação;
- quantidade de requests por página crítica;
- erros de console/network;
- ocorrência de flicker/layout shift.

## Ordem de execução aprovada

1. Sessão global + `ProtectedRoute` sem reload entre páginas.
2. Code splitting das rotas.
3. Carregamento condicional/consolidação de runtimes.
4. Consolidação gradual de CSS histórico.
5. Índices e RLS das tabelas mais consultadas.
6. Nova auditoria de performance e segurança.

## Execução realizada em 08/09/2026

### Fase 1 — concluída

- Criado `WorkspaceAuthProvider` para manter sessão, usuário, role e estado ativo em memória durante a SPA.
- `ProtectedRoute` deixou de executar `auth.getSession()` + consulta a `profiles` em toda troca de rota.
- A validação agora ocorre na inicialização/autenticação e reage a mudanças reais de sessão.

### Fase 2 — concluída

- Todas as páginas principais foram migradas para `React.lazy`.
- Adicionado prefetch discreto de rotas prováveis após a página inicial estabilizar.
- Resultado de build: o JS principal caiu de aproximadamente **1,47 MB** para **438,35 kB** minificado; gzip de **126,64 kB**.
- O chunk principal saiu do alerta de 500 kB do Vite.

### Fase 3 — parcialmente concluída com ganho estrutural relevante

- Criado `RouteRuntimeManager`.
- Runtimes de Relatórios, Calendário/Agenda, Registros, Projetos, Documentos, Horas, Dashboards e Mapa deixaram de ser instalados globalmente no `main.tsx` e passam a ser carregados somente quando a rota correspondente é visitada.
- Permaneceram globais apenas os comportamentos considerados transversais: tema, identidade, navegação/experiência de notificações e identidade corporativa do Workspace.
- Próxima etapa desta fase: consolidar CSS históricos por domínio. Não remover CSS em massa; fazer por módulo com QA visual antes/depois.

### Fase 4 — primeira rodada concluída

- Criados índices somente nos hot paths de `profiles`, `notifications`, `events`, `event_attendees`, `scheduling_requests`, `deliverables`, `hour_entries`, `reports`, `report_client_events`, `event_outcomes` e `google_calendar_credentials`.
- Advisors do Supabase: foreign keys sem índice caíram de **71 para 56**.
- RLS com reavaliação de `auth.*` por linha caiu de **22 para 19** após otimização de `profiles_self_select`, `notifications_self_select` e `event_attendees_client_update_own`.
- As múltiplas policies permissivas restantes não foram consolidadas nesta rodada para evitar qualquer alteração precipitada de isolamento admin/client.

### Estado técnico após a rodada

- Deploy de produção `READY` em `app.calirh.com`.
- Sem erros de runtime reportados pela Vercel na checagem pós-deploy.
- CSS principal ainda está alto: aproximadamente **918,46 kB** minificado / **138,41 kB gzip**. Esta passa a ser a principal dívida de frontend para a próxima rodada de performance.

## Definição de pronto para esta frente

Esta frente não termina quando "carrega um pouco mais rápido". Considerar concluída quando:

- trocar de página interna não desmonta o Workspace nem exibe loading total;
- não há piscadas perceptíveis na navegação normal;
- cada rota carrega apenas o necessário;
- bundle inicial está dividido de forma coerente;
- não há runtimes globais desnecessários executando em todas as páginas;
- queries centrais têm índices/políticas adequadas;
- nenhum ajuste de performance altera visual, permissões, persistência ou regras de negócio aprovadas.

## Orientação para qualquer futuro handoff

Ao retomar o projeto, antes de criar uma nova camada de correção, consultar este documento e verificar se a mudança pode ser feita dentro da arquitetura existente. O CALI Workspace está aproximadamente 60% pronto; ainda haverá evolução funcional e visual, portanto preservar performance e capacidade de manutenção agora é condição para chegar aos 100% sem transformar cada ajuste novo em uma regressão em outra área.
