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
  runtime/<domínio>/        Adaptadores de efeitos legados e seus estilos
  styles/                   Tokens, Tailwind e folhas transversais
supabase/
  migrations/               Mudanças de estrutura e autorização no banco
  functions/                Edge Functions e efeitos externos
tests/
  unit/                     Lógica, componentes e convenções de arquitetura
  e2e/                      Jornadas no navegador com dados sintéticos
  contracts/                Provas SQL e HTTP com serviços locais
```

A página fica na raiz da pasta do fluxo. Peças exclusivas ficam em `components/` do fluxo. Componentes usados entre fluxos ficam em `src/components/<domínio>`. Uma implementação comum fica em seu domínio, por exemplo [Ocorrências](../src/modules/records) e [Agenda](../src/modules/calendar). Cada entrada preserva seu escopo por papel. Criar diretórios quando houver arquivos reais.

O CSS acompanha a página, o componente ou o fluxo que o usa. Um conjunto carregado em ordem usa o `styles.ts` do fluxo ou o manifesto do shell. CSS montado por um runtime fica ao lado do adaptador. Tokens, base e folhas transversais ficam em `src/styles`. A ordem da cascata é parte do contrato durante a migração. [Design system](DESIGN_SYSTEM.md)

## Hooks, estado e dependências

- Cada hook próprio tem um arquivo com o mesmo nome, inclusive hooks locais. Importe pelo arquivo dono. Hooks nativos e de bibliotecas continuam importados da fonte.
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

## Compatibilidade do runtime

Os hooks [useLocation](../src/hooks/useLocation.ts), [useSearchParams](../src/hooks/useSearchParams.ts), [useNavigate](../src/hooks/useNavigate.ts) e [useParams](../src/hooks/useParams.ts) adaptam histórico e URLs existentes ao Router. Preservar query repetida, fragmento, links externos e Back/Forward.

O [gerenciador de runtimes](../src/runtime/RouteRuntimeManager.tsx) inicializa os efeitos que dependem das páginas existentes. A retirada exige prova de gatilho, resultado e limpeza, com foco e rolagem onde se aplicam. O [histórico de entregas](../src/modules/projects/components/ProjectDeliveryHistory.tsx) usa a seleção React e Query por ator e projeto. O [histórico de ocorrências](../src/modules/records/CompanyConversationHistory.tsx) usa cursor composto e cancela a leitura ao trocar o recorte. A precedência visual está no [design system](DESIGN_SYSTEM.md). Autorizações e regras de servidor estão em [contratos de dados](DATA_CONTRACTS.md).

A [base de testes](TESTING.md) registra como provar lógica, jornadas e contratos em ambiente local isolado.
