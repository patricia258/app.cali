# Consolidação do CALI Workspace

## Base e sequência

O `app.cali` é a base operacional e visual. A revisão de referência começa em `773c9d4`. O checkout V2 em `8a5bcfd` e seus candidatos locais fornecem contratos, testes e implementações aproveitáveis. A revisão de cada lote identifica a origem do código portado.

A entrega usa a branch `codex/cali-consolidacao`, com commits revisáveis por etapa e um Preview para o aceite do Felipe. A conversa principal integra e revisa. Até três auxiliares atuam em paralelo nos recortes independentes de acesso/backend, Admin/Cliente e interface compartilhada, público e Partner. Mudanças compartilhadas em dependências, rotas e schema passam pela integração da conversa principal.

A `main` publicada continua no ambiente de produção atual. Nesta entrega, a consulta ao catálogo de produção é em leitura e as migrations rodam em banco isolado. A homologação verifica também os contratos que o app publicado consome. O Preview recebe projeto, credenciais e callbacks de teste próprios.

A validação usa registros representativos do legado com dados sanitizados. Inclui valores nulos, estados antigos, IDs, vínculos, anexos, históricos e links emitidos. Em uma troca futura, o backfill precisa incluir as gravações feitas pela `main` até o corte e aceitar reexecução. Preservar os contratos antigos enquanto houver consumidores ativos e conferir o retorno à revisão anterior com os dados já processados.

A rodada de execução avança pelos critérios abaixo até o aceite local e o Preview previsto. Cada checkpoint registra o resultado e alimenta o lote seguinte. A execução continua após verificações e correções recuperáveis. Um bloqueio que depende de informação, acesso ou decisão externa exige comunicar o que falta e concluir o trabalho independente. O [ambiente de partida](RUNBOOK.md#ambiente-local-desta-consolidação) usa o schema restaurado e dados sintéticos.

## Critérios de encerramento

O agente decide a implementação. Reduções de escopo e exceções aos critérios de aceite dependem de decisão explícita do responsável pelo projeto. Uma solução intermediária preserva a operação durante o trabalho. A etapa fecha quando a revisão final demonstra cada critério. Um bloqueio tem item, evidência e dependência identificados. O trabalho independente continua.

| Área | Prova de encerramento |
| --- | --- |
| Tailwind | Layout, aparência, responsividade e estados no markup com utilitários e tokens. Retire as folhas substituídas e seus imports. Documente cada exceção de CSS colocalizado, como integração de biblioteca, fontes, keyframes e impressão. Compare dois workspaces locais e confira também a paridade com a branch antes da migração. [Inventário](TAILWIND_MIGRATION.md) |
| Arquitetura | Fluxos têm donos explícitos. Consultas e mutações usam adaptadores por domínio. Efeitos legados acordados para retirada têm substituto com prova de gatilho, resultado e limpeza. URLs, dados e permissões preservam os contratos publicados. |
| Bibliotecas | Inventário por fluxo mostra onde Router, Query, Form, Zod, Axios, date-fns e Tailwind se aplicam. Verifique a integração nos consumidores, com tipos, contratos e testes de comportamento. |
| Testes | Matriz relaciona ações de páginas e componentes, regras de módulos e contratos de APIs aos testes que os exercitam. Registre os cenários, o resultado e a revisão. Catálogo de RPCs, testes de comportamento e comparação visual têm provas próprias. |
| Lint | `npm run lint` na árvore inteira com zero erros e zero avisos, sem baseline. As regras ficam no [guia de testes](TESTING.md#lint). |
| Banco local | Restaurar o dump de estrutura do CALI MAPA no laboratório isolado, aplicar as migrations da branch e validar catálogo e comportamento com dados de teste. O replay parte desse dump. |
| Preview | Depois do aceite local, provisionar o projeto separado `CALI STAGING` na organização da CALI. Restaurar a estrutura e validar migrations, credenciais e destinos próprios de teste antes de publicar. |

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
| 9. Aceite local e Preview | Duas rodadas locais com a base versionada, comparação visual e limpeza dos artefatos temporários. | Tudo aprovado localmente antes de publicar o Preview no Vercel. Felipe recebe a URL e o roteiro de aceite. |

## Organização da aplicação

O [mapa de arquitetura](ARCHITECTURE.md) se aplica a todo o repositório. A fila React da [Agenda](../src/modules/calendar/scheduling/) exemplifica composição em JSX, subcomponentes exclusivos, hooks por operação e Tailwind na marcação. Cada lote compara a branch e a `main` em dois workspaces locais com os mesmos cenários. Registre as diferenças intencionais e cubra as correções com testes de comportamento.

Arquivos e diretórios usam nomes pela função em todo o repositório. Cada lote atualiza o documento dono das regras de produto, contratos ou convenções que introduz ou altera, com o teste correspondente quando houver.

## Fontes de aceite

- [Regras de produto](PRODUCT_RULES.md) define o comportamento e os públicos.
- [Dados e permissões](DATA_CONTRACTS.md) define as superfícies e a evidência exigida no backend.
- [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) cobre perfis, cenários e evidência de teste.

A [base versionada de testes](TESTING.md) permanece na branch. Capturas, dumps e scripts descartáveis ficam fora do repositório.
