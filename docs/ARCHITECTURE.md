# Arquitetura do aplicativo

O bootstrap em [main.tsx](../src/main.tsx) monta os providers de Query, Auth e Router. A [árvore de rotas](../src/app/router.tsx) mantém as URLs publicadas e carrega os módulos de página sob demanda. Admin e Cliente usam o shell persistente. Partner tem composição própria. As guardas de autenticação, MFA e termos protegem a montagem de rotas privadas e seus efeitos.

O shell persistente monta uma barra superior e um menu lateral por rota. No Admin, a barra acompanha o topo do viewport durante a rolagem e a troca entre páginas do shell compacto. O menu lateral conserva a largura durante a abertura e o fechamento no mobile. O contexto que sinaliza a presença do shell fica em módulo próprio para conservar a mesma identidade durante o Fast Refresh e no carregamento sob demanda das páginas. [Contexto do shell](../src/components/workspace/workspaceFrameContext.ts) · [Teste da navegação](../tests/e2e/workspace-components.cjs)

## Mapa de pastas

```text
src/
  app/                      Composição da SPA, rotas e seleção de superfície visual
  hooks/                    Hooks compartilhados, um por arquivo
  auth/                     Contexto, provider e guardas de acesso
    hooks/                  Hooks de autenticação
  modules/
    admin/<fluxo>/          Páginas exclusivas de Admin
    client/<fluxo>/         Páginas exclusivas de Cliente
    partner/                Área e seções do Partner
    access/<fluxo>/         Login e callbacks
    public/<fluxo>/         Landing, Forms, DISC e páginas legais
    <domínio>/              Fluxos com implementação comum a vários papéis
  components/
    ds/                     Primitivas com tokens e variantes
    navigation/             Link e Navigate
    workspace/              Shell, menu, perfil e composição visual
    <domínio>/              Componentes reutilizados por fluxos distintos
  api/<domínio>/            Transporte, contratos e projeções por domínio
  domain/                   Regras, tipos e valores de domínio
  lib/                      Utilitários e infraestrutura compartilhada
  styles/                   Tokens, Tailwind e folhas transversais
supabase/
  migrations/               Mudanças de estrutura e autorização no banco
  functions/                Edge Functions e efeitos externos
tests/
  unit/                     Lógica, componentes e convenções de arquitetura
  e2e/                      Jornadas no navegador com dados sintéticos
  contracts/                Provas SQL e HTTP com serviços locais
```

A página fica na raiz da pasta do fluxo. Páginas compõem o fluxo. Formulários, diálogos, cards e seções com responsabilidade própria ficam em arquivos separados. Quando a composição tiver subcomponentes exclusivos, eles podem ficar em `components/` junto do dono. Um auxiliar pequeno e exclusivo pode ficar no mesmo arquivo. Componentes usados entre fluxos ficam em `src/components/<domínio>`. Uma implementação comum fica em seu domínio, por exemplo [Ocorrências](../src/modules/records) e [Agenda](../src/modules/calendar). Cada entrada preserva seu escopo por papel. Criar diretórios quando houver arquivos reais.

Nomeie arquivos e diretórios pela função em todo o repositório, incluindo runtimes, CSS, scripts, assets e documentação. Distinga variantes ativas pelo papel, estado ou finalidade. Em Propostas, `AdminProposalPreviewPage` atende à rota e abre o PDF arquivado quando disponível. `GeneratedProposalPreview` monta a prévia da proposta antes do arquivamento. [Página de prévia](../src/modules/admin/proposals/AdminProposalPreviewPage.tsx) · [Prévia gerada](../src/modules/admin/proposals/GeneratedProposalPreview.tsx)

Registre versões reais no contrato, catálogo ou histórico correspondente. Os caminhos das migrations existentes identificam o histórico do banco. Ao renomear um asset publicado, preserve o endereço anterior por redirecionamento. A suíte de arquitetura verifica nomes no repositório. [Redirecionamentos](../vercel.json) · [Teste de arquitetura](../tests/unit/architecture.test.mjs)

A página ou componente dono da marcação declara layout e estados com Tailwind. CSS necessário para bibliotecas, keyframes e impressão fica ao lado do consumidor. Tokens e reset ficam em `src/styles`. A integração de uma biblioteca define escopo e precedência em uma folha própria. [Design system](DESIGN_SYSTEM.md#tokens-e-tailwind)

Importe uma folha local pelo consumidor. Valide acesso direto e navegação entre rotas para verificar a cascata. Quando vários componentes de um domínio compartilham folhas, mantenha a ordem explícita no ponto de entrada do domínio.

## Hooks, estado e dependências

- Cada hook próprio tem um arquivo com o mesmo nome, inclusive hooks locais. Importe pelo arquivo dono. Encapsule `useQuery`, `useInfiniteQuery`, `useMutation` e leituras imperativas como `fetchQuery` em hooks por operação. Aplique a mesma separação à lógica de navegação baseada em `useSearchParams`, `useLocation` e operações equivalentes. Hooks nativos de estado, efeito e refs podem permanecer junto do componente que os usa.
- Cada formulário que usa TanStack Form tem um hook com os valores iniciais, validadores e submissão. Componentes cuidam da marcação, dos rótulos e do feedback. Links e botões usam os hooks locais de navegação. A composição da árvore de rotas e os providers ficam na inicialização do app.
- Hooks de navegação compartilhados ficam em [src/hooks](../src/hooks). Hooks de Auth ficam em [src/auth/hooks](../src/auth/hooks). Hook de tela fica em `hooks/` do fluxo. Hooks que forem contrato de dados de vários módulos podem ficar na pasta da API do domínio.
- URL guarda filtros, seleção e parâmetros compartilháveis. Formulário guarda rascunhos. Query guarda dados remotos por ator, empresa e filtros relevantes. Escopo privado limpa ou revalida cache ao trocar identidade. O [hook de Partner](../src/modules/partner/hooks/usePartnerWorkspace.ts) usa chave por ator, cancela leituras com o sinal da consulta e descarta cache ao desmontar.
- A camada `api` concentra Auth, Data API, Storage e Edge em adaptadores por domínio, com validação nos contratos estruturados. O [cliente Supabase](../src/api/supabase.ts) fica dentro dessa camada. O [Portal comercial](../src/api/commercial/portal.ts) usa Axios no transporte HTTP. A [suíte de arquitetura](../tests/unit/architecture.test.mjs) verifica a fronteira de acesso e a organização dos hooks.
- Tipos inferidos de schemas e valores `as const` mantêm o vocabulário do domínio. Variantes de interface ficam na primitiva que as renderiza. Revisar estados persistidos antes de renomear valores. Utilitário específico fica perto do consumidor. Uma abstração compartilhada precisa ter uso concreto.

## TanStack Query e cache

- Defina chaves em `query-keys.ts` no domínio dono, como [Agenda](../src/api/calendar/query-keys.ts), [Projetos](../src/api/projects/query-keys.ts) e [Ocorrências](../src/api/records/query-keys.ts). Use tuplas `as const` na ordem domínio, recurso, ator e recorte. Inclua empresa, perfil, identificador, modo, período e filtros quando alterarem a leitura. Normalize posições opcionais para `null`. Use `null` na posição do ator em leituras realmente anônimas. Links públicos de acesso permanecem em cache transitório, sem persistência ou registro do token.
- O hook dono define a consulta, as condições de execução e a política de atualização. Passe o `AbortSignal` até o transporte nas leituras canceláveis. Use `skipToken` ou `enabled` para bloquear leituras sem identidade ou parâmetros obrigatórios. A interface pode pedir atualização manual como ação da pessoa.
- Após gravação, use o resultado confirmado para atualizar dados já presentes ou invalide as consultas afetadas. Reutilize a mesma fábrica para escrever, consultar e invalidar. Use `exact: true` para um registro ou lista única. Exponha um prefixo nomeado com ator quando a alteração afetar várias páginas ou recortes. Reserve `mutationKey` para consumidores que precisem identificar ou agrupar a operação.
- O [hook de sessão](../src/auth/hooks/useWorkspaceAccess.ts) descarta os caches na troca de ator, sessão, nível de acesso ou papel. A renovação do token da mesma sessão e do mesmo nível preserva as leituras. Capture o escopo no início da mutação com [captureQueryScope](../src/api/query-client.ts) quando o resultado for atualizar cache, disparar eventos compartilhados ou acionar callbacks de sucesso. Confira o escopo de novo depois de uma espera antes de aplicar o resultado. Escreva só em entradas ainda existentes quando a conclusão puder chegar depois do descarte da consulta.
- Use `staleTime` conforme a atualidade exigida e `gcTime: 0` para dados transitórios que não precisam sobreviver sem observador, como tokens públicos e resultados privados de DISC. Prefira Realtime, invalidação após gravação e atualização ao voltar à tela. Quando a integração exigir polling, registre a frequência, o motivo e o comportamento em segundo plano.
- Na Agenda, exclusão e sincronização atualizam o detalhe por evento, a lista Google nos meses do ator e a projeção do calendário. A exclusão remove o detalhe do cache. Aprovações de solicitações atualizam a fila do papel e o calendário afetado. Eventos DOM que também atendem consumidores fora de Query continuam no contrato do fluxo. [Cache da Agenda](../src/api/calendar/query-cache.ts)

O descarte de sessão cancela leituras com transporte abortável e protege as atualizações locais contra respostas antigas. Uma gravação já iniciada pode concluir no servidor. Operações com várias etapas conferem o escopo antes de iniciar a próxima gravação. A política do [QueryClient](../src/api/query-client.ts) desativa tentativa automática e atualização ao focar por padrão. O hook que precisar ativa cada opção para o próprio fluxo.

| Fluxo | Atualização |
| --- | --- |
| Agenda e Google | Invalidação e Realtime para a projeção local. Listas Google do Admin consultam o provedor a cada cinco minutos enquanto visíveis. A desconexão do Cliente descarta eventos pessoais do cache. |
| Mapa | O envio invalida a consulta de entrega da resposta exata no escopo do ator. A confirmação e a leitura do anexo conferem o escopo antes de enviar. |
| Conversas e encerramento | Realtime atualiza mensagens. A consulta de encerramento usa polling somente enquanto há estado pendente que depende de resposta de outra pessoa. |
| Horas e Projetos | Cronômetros globais reagem ao evento compartilhado e atualizam a cada 15 segundos enquanto visíveis. O histórico de entregas atualiza a cada 10 segundos enquanto visível e ao voltar à aba. |
| Relatórios | O acompanhamento e as leituras de identidade e despesas usam intervalos de cinco segundos enquanto visíveis para refletir confirmações recebidas por outros canais. A correção de relatório invalida acompanhamento, histórico e lista de versões que podem ser retiradas. |

## Bibliotecas nos fluxos

| Biblioteca | Integração e prova |
| --- | --- |
| TanStack Router | Árvore de rotas, guardas e adapters de histórico e parâmetros. Playwright verifica entrada direta, retorno, parâmetros repetidos e papel. [Rotas](../src/app/router.tsx) · [Teste](../tests/e2e/routes.cjs) |
| TanStack Query | Sessão e perfil, Partner, Equipe, Mapa, Auditoria, Satisfação, Documentos e Relatórios do Cliente, Frentes, histórico da empresa e de entregas, dependências. Leituras privadas usam a identidade e o recorte na chave. Jornadas verificam troca de empresa, recuperação e paginação. [Histórico da empresa](../src/modules/records/CompanyConversationHistory.tsx) · [Matriz](../tests/e2e/COVERAGE.md) |
| TanStack Form | Código de acesso, pré-cadastro, pedido de acesso adicional e dúvida de relatório. Formulários nativos preservam validação do navegador, submissão por teclado e foco. [Login](../src/modules/access/sign-in/LoginPage.tsx) · [Pré-cadastro](../src/modules/public/pre-registration/PreRegistrationPage.tsx) · [Testes](TESTING.md) |
| Zod | Códigos, MFA, termos, ficha, recibos comerciais, Forms, Mapa, histórico, Agenda e operações de Horas. As validações ficam no limite dos contratos, com estados opcionais conforme o domínio. [Contratos do app](../tests/unit/workspace-api.test.mjs) · [Contratos de acesso](../tests/unit/access-api.test.mjs) |
| Axios | Transporte HTTP do Portal comercial para proposta e operações de envio. [Adapter](../src/api/commercial/portal.ts) · [Testes](../tests/unit/commercial-api.test.mjs) |
| date-fns | Períodos de Horas, Satisfação e Visão geral, datas comerciais e prazos e dependências de projeto. Horários contratuais mantêm a referência de Brasília nos fluxos que a exigem. [Dependências](../src/components/projects/DeliverableDependencies.tsx) · [Testes](TESTING.md) |
| Tailwind | Primitivas, utilitários de composição, tokens e folhas de fluxo. [Design system](DESIGN_SYSTEM.md) · [Comparação visual](VISUAL_QA.md) |

## Renderização e efeitos

Renderize interfaces React em JSX. Props, estado e eventos governam conteúdo, montagem e interação. Use refs do componente dono para foco, rolagem, impressão e integrações. Evite `querySelector`, `innerHTML` e listeners globais para montar ou controlar a interface. Saídas que exigem HTML serializado, como e-mail e exportação, ficam no gerador da saída. Preserve a ordem de foco, as transições e a limpeza de listeners, timers, assinaturas e observadores ao sair da rota.

As confirmações compartilhadas usam [WorkspaceActionDialog](../src/components/feedback/WorkspaceActionDialog.tsx). O chamador aguarda a decisão. O diálogo nativo é renderizado em JSX, abre por ref, bloqueia confirmações concorrentes e devolve foco ao sair. Forms e DISC renderizam a marcação de texto em [RichText](../src/components/public/RichText.tsx).

O componente que mostra uma prévia local controla sua duração. Use [useObjectUrl](../src/hooks/useObjectUrl.ts) para liberar a URL do arquivo ao trocar, remover ou desmontar a prévia. Libere também a referência ao arquivo quando terminar o fluxo.

Perfil e Home do Cliente renderizam avatar e assinatura com identidade explícita. O [hook de mídia](../src/components/workspace/hooks/useResolvedWorkspaceMedia.ts) resolve referências privadas no escopo do ator depois do aceite dos termos. Edição e salvamento mantêm a referência original. Horas e Agenda recebem os dois caminhos de logotipo pela empresa do registro. O [componente de logotipo](../src/components/workspace/WorkspaceCompanyLogo.tsx) tenta a imagem original, a derivada e então as iniciais. [Perfil](../tests/e2e/workspace-components.cjs) · [Agenda](../tests/e2e/agenda-visits.cjs)

A [geração de logotipos derivados](../src/lib/companyLogoBackfill.ts) é um efeito separado da renderização. Ela roda no escopo da sessão, nas rotas administrativas elegíveis, ao entrar, focar a janela, receber mudança de empresa e selecionar arquivo no formulário. A montagem dos logotipos usa os dados de cada fluxo.

Conversas identificam o autor pelo registro e carregam o avatar no próprio fluxo. Relatórios resolvem avatar e assinatura do snapshot antes de renderizar o documento. [As guardas](../tests/e2e/guards.cjs) verificam assinatura de mídia depois da confirmação dos termos e suspensão ao trocar a sessão.

## Compatibilidade de rotas e dados

Os hooks [useLocation](../src/hooks/useLocation.ts), [useSearchParams](../src/hooks/useSearchParams.ts), [useNavigate](../src/hooks/useNavigate.ts) e [useParams](../src/hooks/useParams.ts) adaptam histórico e URLs existentes ao Router. Preservar query repetida, fragmento, links externos e Back/Forward.

Cada fluxo monta seus efeitos e desmonta seus listeners, timers e assinaturas. O [histórico de entregas](../src/modules/projects/components/ProjectDeliveryHistory.tsx) usa a seleção React e Query por ator e projeto. O [histórico de ocorrências](../src/modules/records/CompanyConversationHistory.tsx) usa cursor composto e cancela a leitura ao trocar o recorte. A precedência visual está no [design system](DESIGN_SYSTEM.md). Autorizações e regras de servidor estão em [contratos de dados](DATA_CONTRACTS.md).

A [base de testes](TESTING.md) registra como provar lógica, jornadas e contratos em ambiente local isolado.
