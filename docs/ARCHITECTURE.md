# Arquitetura do aplicativo

O bootstrap em [main.tsx](../src/main.tsx) monta os providers de Query, Auth e Router. A [árvore de rotas](../src/app/router.tsx) mantém as URLs publicadas e carrega os módulos de página sob demanda. Admin e Cliente usam o shell persistente. Partner tem composição própria. As guardas de autenticação, MFA e termos protegem a montagem de rotas privadas e seus efeitos.

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

- Cada hook próprio tem um arquivo com o mesmo nome, inclusive hooks locais. Importe pelo arquivo dono. Encapsule `useQuery` e `useMutation` em hooks por operação. Chaves, consulta, mutação e invalidação pertencem ao hook que expõe a operação à interface. Aplique a mesma separação à lógica de navegação baseada em `useSearchParams`, `useLocation` e operações equivalentes. Hooks nativos de estado, efeito e refs podem permanecer junto do componente que os usa.
- Hooks de navegação compartilhados ficam em [src/hooks](../src/hooks). Hooks de Auth ficam em [src/auth/hooks](../src/auth/hooks). Hook de tela fica em `hooks/` do fluxo. Hooks que forem contrato de dados de vários módulos podem ficar na pasta da API do domínio.
- URL guarda filtros, seleção e parâmetros compartilháveis. Formulário guarda rascunhos. Query guarda dados remotos por ator, empresa e filtros relevantes. Escopo privado limpa ou revalida cache ao trocar identidade. O [hook de Partner](../src/modules/partner/hooks/usePartnerWorkspace.ts) usa chave por ator, cancela leituras com o sinal da consulta e descarta cache ao desmontar.
- A camada `api` concentra Auth, Data API, Storage e Edge em adaptadores por domínio, com validação nos contratos estruturados. O [cliente Supabase](../src/api/supabase.ts) fica dentro dessa camada. O [Portal comercial](../src/api/commercial/portal.ts) usa Axios no transporte HTTP. A [suíte de arquitetura](../tests/unit/architecture.test.mjs) verifica a fronteira de acesso e a organização dos hooks.
- Tipos inferidos de schemas e valores `as const` mantêm o vocabulário do domínio. Variantes de interface ficam na primitiva que as renderiza. Revisar estados persistidos antes de renomear valores. Utilitário específico fica perto do consumidor. Uma abstração compartilhada precisa ter uso concreto.

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

Renderize interfaces React em JSX. Props, estado e eventos governam conteúdo, montagem e interação. Use refs para foco, rolagem e integração no elemento dono. Substitua interfaces montadas com strings HTML, inserção imperativa e buscas no DOM por composição React. Preserve a ordem de foco, as transições e a limpeza ao sair da rota.

As confirmações compartilhadas usam [WorkspaceActionDialog](../src/components/feedback/WorkspaceActionDialog.tsx). O chamador aguarda a decisão. O diálogo nativo é renderizado em JSX, abre por ref, bloqueia confirmações concorrentes e devolve foco ao sair. Forms e DISC renderizam a marcação de texto em [RichText](../src/components/public/RichText.tsx).

O componente que mostra uma prévia local controla sua duração. Use [useObjectUrl](../src/hooks/useObjectUrl.ts) para liberar a URL do arquivo ao trocar, remover ou desmontar a prévia. Libere também a referência ao arquivo quando terminar o fluxo.

Perfil e Home do Cliente renderizam avatar e assinatura com identidade explícita. O [hook de mídia](../src/components/workspace/hooks/useResolvedWorkspaceMedia.ts) resolve referências privadas no escopo do ator depois do aceite dos termos. Edição e salvamento mantêm a referência original. Horas e Agenda recebem os dois caminhos de logotipo pela empresa do registro. O [componente de logotipo](../src/components/workspace/WorkspaceCompanyLogo.tsx) tenta a imagem original, a derivada e então as iniciais. [Perfil](../tests/e2e/workspace-components.cjs) · [Agenda](../tests/e2e/agenda-visits.cjs)

A [geração de logotipos derivados](../src/lib/companyLogoBackfill.ts) é um efeito separado da renderização. Ela roda no escopo da sessão, nas rotas administrativas elegíveis, ao entrar, focar a janela, receber mudança de empresa e selecionar arquivo no formulário. A montagem dos logotipos usa os dados de cada fluxo.

Conversas identificam o autor pelo registro e carregam o avatar no próprio fluxo. Relatórios resolvem avatar e assinatura do snapshot antes de renderizar o documento. [As guardas](../tests/e2e/guards.cjs) verificam assinatura de mídia depois da confirmação dos termos e suspensão ao trocar a sessão.

## Compatibilidade de rotas e dados

Os hooks [useLocation](../src/hooks/useLocation.ts), [useSearchParams](../src/hooks/useSearchParams.ts), [useNavigate](../src/hooks/useNavigate.ts) e [useParams](../src/hooks/useParams.ts) adaptam histórico e URLs existentes ao Router. Preservar query repetida, fragmento, links externos e Back/Forward.

Cada fluxo monta seus efeitos e desmonta seus listeners, timers e assinaturas. O [histórico de entregas](../src/modules/projects/components/ProjectDeliveryHistory.tsx) usa a seleção React e Query por ator e projeto. O [histórico de ocorrências](../src/modules/records/CompanyConversationHistory.tsx) usa cursor composto e cancela a leitura ao trocar o recorte. A precedência visual está no [design system](DESIGN_SYSTEM.md). Autorizações e regras de servidor estão em [contratos de dados](DATA_CONTRACTS.md).

A [base de testes](TESTING.md) registra como provar lógica, jornadas e contratos em ambiente local isolado.
