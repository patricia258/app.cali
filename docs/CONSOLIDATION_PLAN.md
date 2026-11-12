# Consolidação do CALI Workspace

## Base e sequência

O `app.cali` é a base operacional e visual. A revisão de referência começa em `773c9d4`. O checkout V2 em `8a5bcfd` e seus candidatos locais fornecem contratos, testes e implementações aproveitáveis. A revisão de cada lote identifica a origem do código portado.

A entrega usa a branch `codex/cali-consolidacao`, com commits revisáveis por etapa e um Preview para o aceite do Felipe. A conversa principal integra e revisa. Até três auxiliares atuam em paralelo nos recortes independentes de acesso/backend, Admin/Cliente e interface compartilhada, público e Partner. Mudanças compartilhadas em dependências, rotas e schema passam pela integração da conversa principal.

## Etapas e critérios de passagem

| Etapa | Trabalho | Critério de passagem |
| --- | --- | --- |
| 1. Documentação | Consolidar regra de produto, dados, permissões e aceite. Separar o funcionamento atual do contrato aprovado. | Regras e provas têm documento dono, com divergências explícitas. |
| 2. Bibliotecas | Integrar TanStack Router, Query e Form, Zod, Axios, date-fns e Tailwind. Fixar versões compatíveis. Preservar React, Vite, rotas, estilos e contratos em uso. | Instalação reproduzível e build tipado. Rotas, sessão, query, validação e CSS têm integração verificável. |
| 3. Estrutura do app existente | Organizar arquivos por domínio. Revisar componentes, tokens, variantes, valores persistidos, hooks, utilitários e runtimes. | Fluxos existentes continuam acessíveis pelas mesmas URLs. CSS, estados, componentes e efeitos preservam o comportamento documentado. |
| 4. Caracterização local | Exercitar todos os fluxos atuais e perfis antes de aplicar requisitos novos. | Paridade funcional verificada. Divergências preexistentes ficam registradas no lote corretivo correspondente. |
| 5. Segurança e backend | Reconciliar catálogo, recuperação, identidade, MFA, termos, sessão e escopo de dados. Preparar mudanças compatíveis com leitores e escritores atuais. | Contratos e negativas provados no ambiente de teste, incluindo chamadas diretas e revogação. |
| 6. Admin e Cliente | Ficha, pré-cadastro, responsáveis, Ocorrências, histórico e satisfação por encerramento. | Jornadas A/B com isolamento, liberação atômica e dados coerentes em tela e PDF. |
| 7. Continuidade e privacidade | DISC, Forms, Google Calendar/Meet e Drive. Alinhar executor, telas e documentos para eliminação em 30 dias. | Links e acervo compatíveis, integração idempotente, destinação verificada com dados sintéticos. |
| 8. Partner e envios | Cronômetro e horas com aprovação. Revisão de Avisos e materiais. Entrega após dupla confirmação onde exigida. | Atribuição, fila, retomada e entrega externa verificadas com destinatários de teste. |
| 9. Aceite local e Preview | Validação visual e funcional em Playwright, limpeza dos testes temporários e nova execução de build e tipos. | Tudo aprovado localmente antes de publicar o Preview no Vercel. Felipe recebe a URL e o roteiro de aceite. |

## Organização da aplicação

| Dono | Conteúdo |
| --- | --- |
| `src/app` | Composição, rotas e layouts. Integra as APIs do produto sem implementar regras de escrita. |
| `src/auth` | Sessão, vínculo, MFA, aceite e integração com guardas de rota. |
| `src/modules/<domínio>` | Telas, formulários, estados de interface e hooks específicos do domínio. |
| `src/api/<domínio>` | Operações tipadas, schemas Zod nas entradas e respostas externas, keys de consulta com `as const` e hooks de acesso aos dados. Query controla cache, cancelamento e invalidação. |
| `src/components` e `src/styles` | Primitivas compartilhadas, tokens derivados da aparência atual, variantes tipadas e estilos por rota. |
| `src/domain` e `src/lib` | Regras puras do domínio e utilitários compartilhados. Manter funções específicas próximas do consumidor. |
| `supabase/migrations` e `supabase/functions` | DDL reconciliado, RPCs, autorização, estado persistido e efeitos externos. |

O SDK Supabase é o transporte para Auth, Data API, Storage e funções próprias. Axios atende operações HTTP quando houver um consumidor concreto. Rascunhos ficam no formulário, filtros compartilháveis ficam na URL e respostas remotas no cache de Query com escopo de ator e empresa. Revisar enums e valores de status com base nos contratos persistidos antes de renomear qualquer literal.

Rotas, templates de PDF, formulários e regras de produto preservam as identidades e vínculos existentes. Cada runtime removido tem verificação do efeito correspondente, incluindo foco, rolagem, eventos, temporizadores e cancelamento ao sair da rota.

## Fontes de aceite

- [Regras de produto](PRODUCT_RULES.md) define o comportamento e os públicos.
- [Dados e permissões](DATA_CONTRACTS.md) define as superfícies e a evidência exigida no backend.
- [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) cobre perfis, cenários e evidência de teste.
