# Arquitetura do aplicativo

O bootstrap em [main.tsx](../src/main.tsx) monta os providers de Query, Auth e Router. A [árvore de rotas](../src/app/router.tsx) mantém as URLs publicadas e carrega os módulos de página sob demanda. Admin e Cliente usam o shell persistente. Partner tem composição própria. As guardas de autenticação, MFA e termos protegem a montagem de rotas privadas e seus efeitos.

## Mapa de pastas

```text
src/
  app/                      Composição da SPA e árvore de rotas
  hooks/                    Hooks compartilhados, um por arquivo
  auth/                     Contexto, provider e guardas de acesso
    hooks/                  Hooks de autenticação
  modules/
    admin/<fluxo>/          Páginas exclusivas de Admin
    client/<fluxo>/         Páginas exclusivas de Cliente
    partner/                Área e seções do Partner
    access/<fluxo>/         Login e callbacks
    public/<fluxo>/         Landing, Forms, DISC e páginas legais
    shared/<fluxo>/         Páginas e lógica de fluxo usadas por vários papéis
  components/
    ds/                     Primitivas com tokens e variantes
    navigation/             Link e Navigate
    <domínio>/              Componentes reutilizados por fluxos distintos
  api/<domínio>/            Transporte, contratos e projeções por domínio
  domain/                   Regras, tipos e valores de domínio
  lib/                      Utilitários e infraestrutura compartilhada
  runtime/                  Ativação dos efeitos legados por rota
  styles/                   Tokens, Tailwind e folhas usadas em várias áreas
  v2/                       Shell e seleção do sistema visual
supabase/
  migrations/               Mudanças de estrutura e autorização no banco
  functions/                Edge Functions e efeitos externos
```

A página fica na raiz da pasta do fluxo. Peças exclusivas ficam em `components/` do fluxo. Componentes usados entre fluxos ficam em `src/components/<domínio>`. Uma página com a mesma implementação em vários papéis fica em `src/modules/shared/<fluxo>` e preserva seu escopo por papel. Criar diretórios quando houver arquivos reais.

O CSS acompanha a página, o componente ou o fluxo que o usa. Um conjunto carregado em ordem fica com seu `styles.ts` no módulo. Tokens, base e folhas transversais ficam em `src/styles`. A ordem da cascata é parte do contrato durante a migração. [Design system](DESIGN_SYSTEM.md)

## Hooks, estado e dependências

- Cada hook próprio tem um arquivo com o mesmo nome, inclusive hooks locais. Importe pelo arquivo dono. Hooks nativos e de bibliotecas continuam importados da fonte.
- Hooks de navegação compartilhados ficam em [src/hooks](../src/hooks). Hooks de Auth ficam em [src/auth/hooks](../src/auth/hooks). Hook de tela fica em `hooks/` do fluxo. Hooks que forem contrato de dados de vários módulos podem ficar na pasta da API do domínio.
- URL guarda filtros, seleção e parâmetros compartilháveis. Formulário guarda rascunhos. Query guarda dados remotos por ator, empresa e filtros relevantes. Escopo privado limpa ou revalida cache ao trocar identidade. O [hook de Partner](../src/modules/partner/hooks/usePartnerWorkspace.ts) usa chave por ator, cancela leituras com o sinal da consulta e descarta cache ao desmontar.
- A camada `api` valida entrada e retorno onde houver contrato de dados estruturado. O [cliente Supabase](../src/api/supabase.ts) atende Auth, Data API, Storage e Edge. Axios atende os fluxos HTTP que já têm consumidor. Os módulos legados que consultam o SDK diretamente migram por fluxo, preservando parâmetros, vínculos, estados e efeitos.
- Tipos inferidos de schemas e valores `as const` mantêm o vocabulário do domínio. Revisar estados persistidos antes de renomear valores. Utilitário específico fica perto do consumidor. Uma abstração compartilhada precisa ter uso concreto.

## Compatibilidade do runtime

Os hooks [useLocation](../src/hooks/useLocation.ts), [useSearchParams](../src/hooks/useSearchParams.ts), [useNavigate](../src/hooks/useNavigate.ts) e [useParams](../src/hooks/useParams.ts) adaptam histórico e URLs existentes ao Router. Preservar query repetida, fragmento, links externos e Back/Forward.

O [gerenciador de runtimes](../src/runtime/RouteRuntimeManager.tsx) mantém efeitos de páginas já em uso. A retirada de um efeito exige prova de gatilho, resultado, foco, rolagem e cleanup na rota que o usa. A precedência visual está no [design system](DESIGN_SYSTEM.md). Acesso direto e regras do servidor estão em [contratos de dados](DATA_CONTRACTS.md).
