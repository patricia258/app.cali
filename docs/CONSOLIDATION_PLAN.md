# Consolidação do CALI Workspace

## Base e sequência

O `app.cali` é a base operacional e visual. A revisão de referência começa em `773c9d4`. O checkout V2 em `8a5bcfd` e seus candidatos locais fornecem contratos, testes e implementações aproveitáveis. A revisão de cada lote identifica a origem do código portado.

A entrega usa a branch `codex/cali-consolidacao`, com commits revisáveis por etapa e um Preview para o aceite do Felipe. A conversa principal integra e revisa. Até três auxiliares atuam em paralelo nos recortes independentes de acesso/backend, Admin/Cliente e interface compartilhada, público e Partner. Mudanças compartilhadas em dependências, rotas e schema passam pela integração da conversa principal.

A `main` publicada continua no ambiente de produção atual. Nesta entrega, a consulta ao catálogo de produção é em leitura e as migrations rodam em banco isolado. A homologação verifica também os contratos que o app publicado consome. O Preview recebe projeto, credenciais e callbacks de teste próprios.

A validação usa registros representativos do legado com dados sanitizados. Inclui valores nulos, estados antigos, IDs, vínculos, anexos, históricos e links emitidos. Em uma troca futura, o backfill precisa incluir as gravações feitas pela `main` até o corte e aceitar reexecução. Preservar os contratos antigos enquanto houver consumidores ativos e conferir o retorno à revisão anterior com os dados já processados.

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

O [mapa de arquitetura](ARCHITECTURE.md) define as pastas, os donos de código e as convenções para hooks, serviços, estado e estilos.

## Fontes de aceite

- [Regras de produto](PRODUCT_RULES.md) define o comportamento e os públicos.
- [Dados e permissões](DATA_CONTRACTS.md) define as superfícies e a evidência exigida no backend.
- [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) cobre perfis, cenários e evidência de teste.
