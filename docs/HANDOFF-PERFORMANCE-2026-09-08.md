# CALI Workspace — Handoff de performance e continuidade

**Registrado em:** 08/09/2026  
**Status estimado do produto:** ~60% concluído  
**Escopo:** CALI Workspace / app.cali

## Baseline aprovado de produção — congelado

A versão que está no ar em `app.calirh.com` após a rodada de performance de 08/09/2026 é o **baseline visual, funcional e de conteúdo aprovado** do CALI Workspace.

A partir deste registro, nenhuma otimização, refatoração ou correção técnica pode alterar, remover, reorganizar, simplificar ou retroceder qualquer item já visível/funcional nessa versão sem autorização explícita da Patrícia. Isso inclui layout, textos, cores, tipografia, espaçamentos, modais, estados, regras comerciais, fluxos, logos, imagens, comportamento admin/cliente, PDF, e-mails e integrações.

O estado de produção usado como referência técnica desta aprovação é o deploy associado ao commit `c47c296f9dd31ad5a0f0beb737a1925f1dd63e47`, com as otimizações anteriores de autenticação, code splitting, runtimes por rota e banco já aplicadas.

### Regra para novas otimizações

- Primeiro medir e diagnosticar; não alterar por suposição.
- Não fazer consolidação visual/CSS diretamente em produção.
- Não remover runtime ou CSS apenas porque parece legado; provar antes que está superseded.
- Toda mudança técnica precisa preservar render final idêntico ao baseline aprovado.
- Alterações com potencial de mudar a renderização devem ser feitas isoladamente e comparadas antes/depois em admin + cliente, claro + noite, desktop + mobile.
- Se houver dúvida entre ganho de performance e risco de regressão visual/funcional, preservar o baseline e não aplicar a mudança.
- O objetivo da próxima rodada é reduzir o carregamento progressivo perceptível de fotos, elementos e acabamentos sem mudar o resultado final da página.

## Diretriz executiva

O projeto ainda terá páginas, fluxos, conteúdo e componentes para melhorar. Portanto, qualquer evolução futura deve preservar estabilidade e evitar acumular novos hotfixes, runtimes paralelos ou camadas redundantes que prejudiquem performance, responsividade e previsibilidade visual.

A partir deste ponto, performance é requisito estrutural do produto, não uma etapa final de acabamento.

## Sintoma observado

A navegação entre páginas apresenta períodos de "Carregando", lentidão e, em alguns momentos, piscadas/re-renderizações visíveis. Isso já afetou tanto a área administrativa quanto a área do cliente.

Após as primeiras otimizações, o sintoma residual percebido é diferente: a página abre, porém fotos, alguns elementos e partes do acabamento/layout entram alguns instantes depois. Não é uma espera longa, mas o carregamento progressivo é visível e deve ser tratado sem modificar o baseline aprovado.

## Diagnóstico confirmado

1. `ProtectedRoute` revalidava sessão e perfil/role a cada troca de rota protegida. Isso recriava o estado de loading e gerava espera perceptível na navegação interna.
2. As páginas principais eram importadas estaticamente no `App.tsx`, fazendo o bundle principal carregar código de áreas que o usuário ainda não abriu.
3. O build de produção anterior gerava bundle JS principal acima de 1 MB e CSS próximo de 1 MB, com warning de chunk acima de 500 kB.
4. O `main.tsx` inicializava muitos runtimes globais e importa várias gerações de CSS/hotfixes, mesmo quando o usuário não estava nos respectivos módulos.
5. O Supabase apresenta dívida de performance: foreign keys sem índice de cobertura, políticas RLS com reavaliação de `auth.*` por linha e múltiplas políticas permissivas para a mesma operação.
6. O projeto Supabase está em região dos EUA. Isso aumenta o custo de múltiplas consultas sequenciais para usuários no Brasil, portanto a prioridade é reduzir round-trips e duplicações antes de considerar qualquer mudança de região.
7. O carregamento progressivo residual deve ser investigado especialmente em: imagens/avatares/logos, fontes, CSS crítico da rota, chunks lazy e runtimes de acabamento que entram depois do primeiro paint.

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

- Não mudar layout, conteúdo, regras comerciais ou fluxos já aprovados durante a rodada de performance, salvo se forem causa direta do gargalo e houver autorização explícita.
- Não esconder lentidão com loaders mais elaborados.
- Não introduzir novo observer, timer, polling ou runtime global sem justificar impacto.
- Não duplicar fonte de verdade.
- Não consultar perfil/empresa repetidamente se a informação já está válida na sessão.
- Não carregar módulos pesados antes de o usuário precisar deles.
- Não remover CSS/runtime legado sem comparar antes/depois nas rotas afetadas.
- Cada otimização deve ser pequena, reversível e testada antes da próxima.
- QA obrigatório: admin + cliente, tema claro + noite, desktop + mobile, navegação entre módulos e refresh direto da rota.
- O baseline aprovado de produção prevalece sobre qualquer refatoração técnica.

## Métricas mínimas a acompanhar

Antes/depois de cada fase registrar:

- tamanho do JS principal e gzip;
- tamanho do CSS principal e gzip;
- quantidade de chunks;
- tempo visual entre clique no menu e conteúdo útil;
- quantidade de consultas de autenticação/perfil por navegação;
- quantidade de requests por página crítica;
- erros de console/network;
- ocorrência de flicker/layout shift;
- tempo de carregamento de imagens/logos/avatares;
- elementos que entram após o primeiro paint.

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
- Próxima etapa desta fase: consolidar CSS históricos por domínio. **Esta etapa fica congelada até existir comparação visual segura contra o baseline aprovado.** Não remover CSS em massa; fazer por módulo com QA visual antes/depois.

### Fase 4 — primeira rodada concluída

- Criados índices somente nos hot paths de `profiles`, `notifications`, `events`, `event_attendees`, `scheduling_requests`, `deliverables`, `hour_entries`, `reports`, `report_client_events`, `event_outcomes` e `google_calendar_credentials`.
- Advisors do Supabase: foreign keys sem índice caíram de **71 para 56**.
- RLS com reavaliação de `auth.*` por linha caiu de **22 para 19** após otimização de `profiles_self_select`, `notifications_self_select` e `event_attendees_client_update_own`.
- As múltiplas policies permissivas restantes não foram consolidadas nesta rodada para evitar qualquer alteração precipitada de isolamento admin/client.

### Estado técnico após a rodada

- Deploy de produção `READY` em `app.calirh.com`.
- Sem erros de runtime reportados pela Vercel na checagem pós-deploy.
- CSS principal ainda está alto: aproximadamente **918,46 kB** minificado / **138,41 kB gzip**. Esta é uma dívida técnica, mas não será atacada removendo estilos sem comparação contra o baseline aprovado.

## Próxima frente segura — sem alteração visual

Antes de qualquer nova refatoração de CSS ou runtime, a próxima rodada deve ser somente de diagnóstico e otimizações que preservem o mesmo resultado final:

1. medir quais imagens, logos e avatares chegam atrasados;
2. identificar chunks de rota e runtimes que ainda entram depois do conteúdo principal;
3. verificar carregamento de fontes e CSS crítico;
4. reservar dimensões/aspect ratio de mídia para impedir layout shift;
5. avaliar prefetch/preload apenas dos recursos necessários da rota provável;
6. comparar visualmente antes/depois antes de qualquer merge com potencial de alterar renderização.

## Definição de pronto para esta frente

Esta frente não termina quando "carrega um pouco mais rápido". Considerar concluída quando:

- trocar de página interna não desmonta o Workspace nem exibe loading total;
- não há piscadas perceptíveis na navegação normal;
- cada rota carrega apenas o necessário;
- bundle inicial está dividido de forma coerente;
- não há runtimes globais desnecessários executando em todas as páginas;
- queries centrais têm índices/políticas adequadas;
- fotos, logos e acabamentos não surgem de forma perceptivelmente tardia;
- nenhum ajuste de performance altera visual, permissões, persistência ou regras de negócio aprovadas.

## Orientação para qualquer futuro handoff

Ao retomar o projeto, antes de criar uma nova camada de correção, consultar este documento e verificar se a mudança pode ser feita dentro da arquitetura existente. O CALI Workspace está aproximadamente 60% pronto; ainda haverá evolução funcional e visual, portanto preservar performance e capacidade de manutenção agora é condição para chegar aos 100% sem transformar cada ajuste novo em uma regressão em outra área.

**Regra soberana:** o que está no ar e aprovado em 08/09/2026 é o baseline. Nenhuma otimização futura autoriza retrocesso visual ou funcional sem aprovação explícita da Patrícia.

## Registro de continuidade — 16/09/2026

A Patrícia confirmou que o carregamento em blocos continua sendo o problema percebido em vários pontos do produto, tanto no perfil Administrador quanto no perfil Cliente. Não há, neste momento, uma tela branca recorrente a ser tratada como sintoma principal; não reabrir o diagnóstico como se fosse um problema novo.

### Decisões confirmadas

- O trabalho deve considerar o site inteiro, com testes próprios em admin e cliente.
- PDFs estão funcionando e ficam fora desta rodada.
- Google Drive não é prioridade agora e não deve ser conectado nesta etapa.
- O `main` atual está preservado como referência segura; melhorias devem ocorrer separadas e somente depois de passar por verificação.
- A evolução visual deve trazer aparência de plataforma profissional, sem alterar regras de negócio, respostas do app, gerador de relatórios ou padrões já definidos.
- A consolidação de versões paralelas, CSS e componentes deve ser gradual, por grupo de páginas, com comparação visual e possibilidade de reversão.
- Revisão de segurança será tratada como frente própria, mas o alerta crítico do Supabase não deve ser ignorado antes da entrada online.

### Execução iniciada

Foi criada a branch `improvement/quality-gates-2026-09-16` e o PR [#43](https://github.com/patricia258/app.cali/pull/43).

Nesta frente, sem alteração de tela:

- dependências congeladas com `package-lock.json`;
- criado `npm run check`, que executa typecheck e build;
- CI alterado para usar `npm ci` e bloquear mudanças que não compilam;
- corrigido o erro de TypeScript existente na conversa de Registros;
- CI validado com sucesso;
- preview da Vercel validado como `READY`;
- produção mantida intacta.

### Próxima execução autorizada

A próxima entrega deve atacar o carregamento em blocos por grupos de páginas, começando pela medição do CSS/chunks e pela separação segura de estilos de rota. Não apagar versões históricas em massa. Validar cada grupo em:

- Administrador e Cliente;
- tema claro e noite;
- desktop e mobile;
- navegação interna e atualização direta da rota;
- ausência de erros no console;
- manutenção das funções, respostas, permissões e persistência.

O próximo resultado para a Patrícia deve ser objetivo: informar qual grupo foi alterado, o que foi medido, o que melhorou e o roteiro exato de teste no cliente e no administrador.


### Segunda rodada de separação de CSS — 16/09/2026

A separação foi ampliada, sem apagar arquivos históricos e sem alterar lógica, PDFs, Drive, regras de negócio ou respostas do app.

Grupos movidos para carregamento sob demanda:

- Documentos — administrador e cliente;
- Horas — administrador e cliente;
- Visão Geral — administrador e cliente;
- Experiência do cliente — Dashboard, Cronograma e Aprovações;
- os grupos anteriores de Calendário, Registros, Relatórios, Satisfação e Entregáveis continuam separados.

Medição local do build:

- CSS inicial antes desta rodada: aproximadamente **461,33 kB** minificado / **74,34 kB gzip**;
- CSS inicial depois desta rodada: aproximadamente **320,19 kB** minificado / **52,75 kB gzip**;
- redução adicional: aproximadamente **141,14 kB minificado** e **21,59 kB gzip**;
- redução acumulada desde a medição inicial de aproximadamente **863,91 kB**: cerca de **63%** no CSS inicial;
- os estilos continuam disponíveis nas rotas corretas, em chunks próprios, sem remoção destrutiva.

Validação:

- typecheck + build local: sucesso;
- CI GitHub: sucesso no run 882;
- preview Vercel: `READY`;
- preview de referência: https://app-cali-ef51yg10h-cali11.vercel.app;
- produção não foi alterada.

O próximo teste da Patrícia deve cobrir, no Administrador e no Cliente, Documentos, Horas, Visão Geral, Cronograma e navegação entre módulos. O resultado esperado é a mesma aparência e funcionamento do baseline, com menos CSS no carregamento inicial e sem surgimento tardio perceptível de blocos da página.

### Limite desta rodada

A referência de “103 arquivos CSS” era a quantidade de imports/fontes de estilo no código, não 103 telas que precisem ser apagadas. Nesta rodada foi feita uma redução controlada do CSS inicial; ainda não foi feita uma limpeza indiscriminada das versões paralelas. A remoção definitiva só deve ocorrer após comparação visual das rotas e confirmação de que cada versão antiga está realmente substituída.


### Terceira rodada de separação de CSS — 16/09/2026

Foram separados os estilos de Clientes, Propostas, Projetos e Mapa de People para carregamento sob demanda. Nenhum CSS histórico foi apagado; a alteração apenas mudou o momento de carregamento e preservou a lógica das páginas.

Validação do commit `ffd1fdb202d8f4b97ae58928bc4478a1c49b595d`:

- typecheck: sucesso;
- build Vite: sucesso;
- CI GitHub: sucesso no run 885;
- Vercel: `READY`;
- preview: https://app-cali-618z7ekug-cali11.vercel.app;
- CSS inicial medido no build: **226,49 kB** minificado / **37,69 kB gzip**;
- chunks separados: Clientes **34,98 kB**, Propostas **38,26 kB**, Mapa **34,11 kB**, Projetos **91,98 kB**;
- produção não foi alterada.

O build ainda sinaliza um chunk JavaScript compartilhado acima de 500 kB (**532,78 kB**). Isso ficou identificado como próximo alvo técnico, separado da consolidação visual de CSS, para não misturar duas frentes de risco na mesma mudança.

### Quarta rodada de divisão de JavaScript — 16/09/2026

O JavaScript inicial também foi dividido por responsabilidade, sem alterar respostas, regras, dados ou comportamento do app:

- ícones, Supabase, datas e demais dependências passaram a ter chunks próprios;
- o chunk principal caiu de **532,78 kB / 151,72 kB gzip** para **125,32 kB / 36,59 kB gzip**;
- os fornecedores ficam carregados separadamente: dependências gerais **169,86 kB**, Supabase **220,90 kB** e ícones **41,31 kB**;
- typecheck, build e CI passaram;
- preview Vercel READY: https://app-cali-4cyqzwwtc-cali11.vercel.app;
- produção permaneceu intacta.

Esta rodada foi aprovada pela Patrícia somente para testar velocidade de abertura; não representa aprovação visual do preview.

### Diagnóstico dos “blocos” e camadas percebidas — 16/09/2026

A hipótese da Patrícia faz sentido tecnicamente, mas não há evidência de várias páginas React empilhadas. O que foi confirmado no código é:

- vários runtimes antigos e novos são instalados uma vez e permanecem vivos durante toda a sessão;
- esses runtimes usam `MutationObserver` no `body` ou no documento inteiro;
- ao navegar, observadores de Projetos, Calendário, Documentos e Relatórios podem continuar reagindo e aplicando CSS/ajustes tardios;
- as versões históricas de CSS também continuam em cascata quando a rota correspondente é carregada.

Isso pode produzir exatamente a sensação de uma camada anterior aparecendo e depois sendo substituída pela atual, principalmente em páginas vazias ou com mocks. A correção desta branch adiciona uma atividade de rota central e impede que os principais runtimes de Projetos, Calendário, Documentos e Relatórios executem novos ajustes quando a navegação já mudou de página. Não houve remoção em massa nem mutação estrutural do React.

Validação local da branch `improvement/runtime-lifecycle-cleanup-2026-09-16`:

- typecheck: sucesso;
- build Vite: sucesso;
- CSS inicial preservado em **226,49 kB / 37,69 kB gzip**;
- chunks de rota e JavaScript mantidos separados;
- alerta antigo de importação estática/dinâmica do runtime de logo continua identificado, sem impacto no build.

Próximo passo seguro: validar o preview nos fluxos Administrador e Cliente, navegando entre Projetos, Calendário, Documentos e Relatórios e observando se não há reaplicação tardia de blocos. Só depois dessa validação será avaliada a retirada de versões históricas realmente não usadas.
