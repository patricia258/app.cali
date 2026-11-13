# Comparação visual do CALI Workspace

A referência é o build da `main` no commit `773c9d4`. O candidato é a revisão da branch de consolidação. Compare versões com os mesmos papéis, dados sintéticos, data, viewport e navegador. A documentação de [regras de produto](PRODUCT_RULES.md) explica mudanças deliberadas, como a revisão do Partner e o histórico por empresa.

## Páginas inteiras

```sh
npm run test:visual:pages -- --reference 773c9d4 --candidate HEAD --output /tmp/cali-visual-pages \
  --viewport desktop --viewport laptop --viewport tablet --viewport mobile
```

O comando gera os dois builds a partir do Git, com dependências do lockfile e endpoint sintético. O npm precisa ter as dependências no cache para o build offline. Também aceita `--reference-dist` e `--candidate-dist` para builds sintéticos existentes. Nesse caso o relatório guarda SHA declarado e hash dos arquivos compilados. Use `--list` para listar os cenários, `--role`, `--case` e `--viewport` para recortes. Desktop e celular são o padrão. Notebook e tablet podem ser selecionados.

O comparador abre uma página por vez por padrão (`--jobs 1`). Cada referência fecha antes da captura candidata. O Chrome reinicia a cada quatro cenários (`--browser-batch 4`), e o relatório é atualizado após cada lote. As jornadas e as provas do design system também reciclam o navegador a cada quatro casos. O teste de rotas abre um Chromium por perfil para preservar o histórico da sessão no mesmo contexto. Execute as suítes em sequência no mesmo computador.

O runner verifica o espaço do volume temporário antes de abrir o Chromium e entre cenários. A execução encerra com menos de 1 GiB livre ou quando o macOS indica pressão de memória. Cada lote aguarda o encerramento do Chromium anterior. Em máquinas com pouca folga, use recortes com `--case` e reduza `--browser-batch`.

A matriz parte de todas as rotas registradas, cruza perfis e inclui deep links, menu, histórico, tema e interações selecionadas. Cada cenário guarda a página inteira, estado de navegação, títulos, diálogos e geometria. A diferença de pixels aponta a região a revisar. Uma diferença intencional precisa corresponder à regra de produto ou a uma correção reproduzida.

A comparação visual e as jornadas funcionais usam Chrome local em loopback e interceptam requisições. O relatório aponta limitações da referência e falhas no candidato. Os efeitos persistidos são verificados pelos [contratos do stack local](../tests/contracts/README.md).

### Memória do navegador

Em 13/11/2026, o ensaio local com uma aba e oito trocas entre Relatórios, Agenda, Ocorrências e Projetos atingiu 753 MiB de RSS agregado no Chrome na `main` e 773 MiB na branch. Após coleta de lixo, o heap JS terminou em 8,7 MiB na `main` e 10,7 MiB na branch. Em outro ensaio, abrir e fechar a mesma conversa oito vezes atingiu 863 MiB de RSS na branch, com heap final de 9,0 MiB. Os dados foram sintéticos. O pico relatado de aproximadamente 10 GB ficou sem reprodução. Na conversa aberta e ociosa, a troca da consulta periódica de encerramento por atualização por evento reduziu as requisições observadas em 10 segundos de 30 para 3. O ensaio da correção atingiu 873 MiB de RSS e heap final de 9,5 MiB.

O primeiro ensaio serial concluiu 20 cenários. O ensaio completo, com reciclagem do Chrome entre lotes, concluiu 276 capturas em desktop e celular. Pico amostrado de 1.247 MiB no Chrome e 1.995 MiB no conjunto Chrome e runner. O callback que interrompeu o ensaio com navegador persistente completou em ambas as larguras. RSS soma as medições dos processos e pode contar páginas compartilhadas mais de uma vez.

A primeira matriz completa registrou 80 comparações equivalentes, 193 com diferenças e três limitações na referência. A comparação da impressão Partner foi repetida após corrigir o carregamento das folhas A4 no acesso direto. O relatório longo sintético expôs sobreposição de 278,73 px na segunda folha. Após a correção, o Playwright conferiu 3 folhas A4 no PDF físico, com seções e rodapés separados também na prévia. O caso curto manteve duas folhas. A continuação distribui seções de Direção que cabem em uma folha. Fracionar um bloco individual maior que A4 exige paginação interna.

Na rodada de remoção dos runtimes, a matriz ampliada de desktop e celular registrou 284 comparações, com 66 equivalentes, 215 diferentes, três limitações da referência e zero falhas de execução no candidato. O comparador classificou 153 diferenças com regras conhecidas. Restaram 18 diferenças de pixels, 13 de layout e 28 de texto para inspeção, além de três resíduos de pixels. O comparador de componentes capturou 28 estados sem falha no candidato. A paridade global segue aberta.

A inspeção do texto das capturas de impressão confirmou a nova numeração do relatório longo. As diferenças nos três papéis incluem a folha de continuação que evita o corte do próximo ciclo. A Home em 390 px foi recapturada depois de separar documento e ocorrência em uma coluna e ajustar as datas na faixa do cronograma. Os dois ajustes passaram no teste de geometria.

### Migração de estilos

Na primeira rodada desta migração, os dois checkouts renderizaram 284 cenários em desktop e celular. Houve 26 equivalentes, 255 diferenças, três limitações na referência e zero falhas no candidato. Entre as diferenças, 151 foram associadas a mudanças conhecidas e 104 ficaram para inspeção de pixels, layout ou texto. A rodada capturou uma revisão intermediária. A inspeção levou a ajustes de espaçamento, tipografia e borda do shell, cronograma Cliente, cabeçalho da conversa e impressão. A repetição direcionada anterior ao último build comparou 37 estados em quatro larguras, com 36 diferenças, uma limitação da referência e zero falhas no candidato.

A rodada de Avisos, Propostas, Relatórios e Ficha registrou 72 comparações em quatro larguras, com quatro equivalentes e 68 diferenças, sem falha no candidato. As capturas identificaram o encolhimento da ficha por conversão de valores `rem` com a raiz compacta de 13 px. Após a correção, Dados cadastrais desktop passou de 25,90% para 0,37% de pixels diferentes. O aceite global exige revisar as diferenças que ainda aparecem em telas estreitas e nas prévias de impressão. A prova física da capa de Propostas conferiu coordenadas 0/0, formato A4 e seis folhas na fixture de rascunho.

Uma rodada local integrada passou 273 provas Playwright, incluindo a origem física da proposta, e 38 provas diretas de componentes. Depois da migração de Dependências, Auditoria e capas de Documentos, as 61 provas dirigidas passaram. A capa de Documentos voltou a ocupar a largura do cartão, com 112 px de altura e o logo centralizado. A captura confirmou a remoção da área de fundo reduzida. O comunicado aberto Cliente em 390 px passou de 12,82% para 2,78% de pixels diferentes após o ajuste do rodapé.

A repetição integral com o build que incluiu a correção das capas concluiu 284 comparações. Houve 20 equivalências, 261 diferenças, três limitações da referência e zero falhas de captura do candidato. A classificação reconheceu 148 mudanças. Ficaram para revisão 52 diferenças de texto, 31 de layout e 30 de pixels. A comparação é por captura de página inteira e inclui as diferenças de escopo, tipografia e responsividade entre as revisões. As mudanças posteriores são verificadas em rodada dirigida.

As provas de componentes passaram 38 casos. O comparador registrou 28 estados em quatro larguras e conferiu acesso ao contador, ao menu e às notificações. O extrato Cliente usa tabela com rolagem horizontal para manter todas as colunas no celular. O botão Fechar do diálogo de ajuste voltou a ficar ancorado ao próprio painel.

Uma rodada posterior comparou 28 capturas em quatro larguras de Propostas, Mapa, Histórico e Subtarefas, sem falha de captura. A revisão apontou sobreposição das colunas de Entregáveis Cliente em 390 px e ausência dos estilos do gráfico de prazos Admin. A lista passou a distribuir título e metadados em linhas distintas em largura estreita. Admin, Partner e Cliente passaram a compartilhar o componente de prazos. O perfil documental foi medido em quatro estados e manteve posição e tamanho do avatar. A subtarefa foi recapturada em seis estados após ajustar a borda da ficha e a largura do anexo.

No checkpoint seguinte, lint, TypeScript, build e 108 testes unitários passaram. Os contratos SQL e HTTP passaram no stack isolado. A última execução completa de Playwright e os 38 casos de componentes passaram no build anterior aos ajustes da lista e do gráfico. O caso de 390 px passou no build que os incluiu. A repetição depois da correção do seletor de notas internas passou essa jornada e encerrou por pressão de memória do macOS antes do próximo caso. A suíte integrada e as capturas finais permanecem pendentes.

### Fechamento das folhas transversais

A migração retirou as folhas gerada, operacional, documental e de controles. O [inventário](TAILWIND_MIGRATION.md#css-que-permanece) registra as exceções. A revisão lado a lado corrigiu a densidade do diretório de Equipe, a ação de exportação Admin e a faixa de título na capa móvel de Propostas.

A matriz local cobriu os 302 estados de desktop e celular com a mesma referência `773c9d4`. A primeira execução salvou 268 estados antes da interrupção por pressão de memória. O restante e as recapturas dirigidas usaram o build final em lotes de dois, com uma página aberta por vez. O manifesto do primeiro build começa em `65ce2ce3` e o do final em `b94aff58`. As 28 capturas de componentes completaram sem falha no candidato.

A matriz consolidada tem 20 equivalências, 279 diferenças e três limitações na referência, no carrossel móvel e nas despesas de visita extra em duas larguras. Nenhuma captura da branch falhou. A classificação reconheceu 153 diferenças e deixou 126 para revisão, incluindo 62 de conteúdo, 62 de layout e duas de pixels. A paridade visual segue aberta. Revise especialmente o espaçamento e a altura de Indicadores em Equipe, o diálogo móvel de subtarefa, a Landing e as diferenças de conteúdo da revisão do Mapa. A continuação do relatório executivo é uma diferença deliberada, coberta pela prova física de três folhas A4.

Lint, TypeScript, build e 116 testes unitários passaram. Os 275 cenários funcionais passaram na execução integrada e nas repetições dirigidas. As 38 provas de componentes e os contratos SQL e HTTP no stack local também passaram. A prova final de Propostas abriu a capa em 390 px e confirmou o PDF de seis folhas A4 com a capa na origem.

## Correções verificadas

| Superfície | Comportamento corrigido | Prova |
| --- | --- | --- |
| PDF executivo do Partner | Quando as seções de Direção excedem a área útil, a seção seguinte vai para a continuação e a numeração acompanha as folhas A4. | [PDF curto, PDF longo e jornada Cliente](../tests/e2e/report-and-staff-actions.cjs) |
| Topo Admin | Os cronômetros ocupavam a barra e cortavam o contador, o sino e o perfil. O contador mantém acesso aos cronômetros em quatro larguras e devolve o foco ao fechar. O topo de Cliente e Partner mantém uma linha no celular. | [Comparador de componentes](../tests/ds/compare-components.mjs) |
| Cabeçalhos Admin e Partner | A base flex de desktop criava mais de 200 px vazios no celular. As telas que usam esse cabeçalho aproximam a ação do título e alinham os dois ao conteúdo. | [Visão geral](../tests/e2e/account-and-overview.cjs) · [Matriz visual](../tests/visual/pages/scenarios.cjs) |
| Mapa oficial | O cabeçalho em uma linha cortava as ações no celular. A barra quebra em linhas e conserva retorno, atualização, link original e impressão pelo iframe. | [Relatório Mapa](../tests/e2e/people-behaviors.cjs) |
| Agenda | Admin abre despesas pela Agenda. A decisão local continua visível quando a sincronização Google fica pendente. | [Visitas](../tests/e2e/agenda-visits.cjs) · [Decisões](../tests/e2e/agenda-components.cjs) |
| Entregáveis e Horas | Esc cancela a renomeação sem fechar o diálogo. Espaço abre subtarefa. O histórico de entregas mantém uma leitura por seleção e atualização programada. Respostas atrasadas de capacidade são descartadas ao trocar empresa ou mês. | [Projetos](../tests/e2e/project-components.cjs) · [Histórico](../tests/e2e/project-history.cjs) · [Capacidade](../tests/e2e/hours-capacity.cjs) |
| Acesso | A leitura de logotipos e o canal de empresas aguardam a admissão. A troca de ator descarta respostas e URLs assinadas da sessão anterior. | [Guardas](../tests/e2e/guards.cjs) |
| Home Cliente | Em tela estreita, os cartões de documento e ocorrência passam a uma coluna e os prazos ficam contidos nas faixas do cronograma. A `main` reproduz sobreposição e corte com os mesmos dados. | [Jornada da Home](../tests/e2e/journeys.cjs) |
| Ocorrências | Editar e excluir devolvem foco. Reabrir exibe as ações e o novo encerramento recebe outra avaliação. | [Histórico e atendimento](../tests/e2e/record-history.cjs) |
| Prévia de upload | A URL da imagem é liberada ao trocar a capa de Avisos, fechar o editor de Avisos ou Documentos, remover o anexo de Forms ou trocar de pergunta. | [Avisos](../tests/e2e/review-workflows.cjs) · [Documentos](../tests/e2e/page-behaviors.cjs) · [Forms](../tests/e2e/public-questionnaires.cjs) |
| Relatórios | A leitura registra abertura do PDF. Enviar dúvida abre o formulário do relatório e preserva rascunho e foco após uma falha. O envio Admin exibe o erro dentro da confirmação e o recibo após concluir. | [Relatórios Cliente](../tests/e2e/report-and-staff-actions.cjs) · [Envio](../tests/e2e/commercial-delivery.cjs) |
| Governança de relatórios | A simulação só mostra uma ação de visualização. Atualizar a prévia preserva a curadoria e o histórico abre pelo ID da versão exibida, inclusive quando a tabela inclui arquivos retirados. | [Prévia, simulação e histórico](../tests/e2e/report-draft.cjs) |
| Avisos | Falhas de comentário aparecem no diálogo. O Cliente consegue tentar novamente mantendo a mensagem. | [Avisos](../tests/e2e/review-workflows.cjs) |
| Agenda | Falhas de gravação e cancelamento preservam o formulário. Lembrete e transcrição seguem na própria gravação do evento. | [Agenda](../tests/e2e/agenda-visits.cjs) |
| Auditoria | A linha do tempo aceita os identificadores numéricos de atividades e mudanças de situação, conforme o schema do CALI. | [Comportamentos de página](../tests/e2e/page-behaviors.cjs) |
| Projetos | O Admin cadastra o primeiro projeto com a carteira vazia quando há empresa ativa. A lista de criação inclui empresas sem projeto anterior. A carteira continua filtrada pelos projetos existentes. | [Criação e frentes](../tests/e2e/project-creation.cjs) |
| Equipe | O cadastro individual preserva o código gerado em nova tentativa. Uma falha de resposta após a gravação mantém uma única ficha. | [Cadastro de colaborador](../tests/e2e/team-components.cjs) |

## Componentes e primitivas

```sh
CALI_COMPONENT_VISUAL_OUTPUT=/tmp/cali-ds npm run test:components
npm run test:visual:components -- \
  --reference /tmp/cali-visual-pages/reference-dist \
  --candidate /tmp/cali-visual-pages/candidate-dist \
  --output /tmp/cali-visual-components
```

Os testes diretos montam os controles em Chrome e exercitam rótulos, teclado, foco, variantes, estados pendentes e submissão. Use a galeria de primitivas para comparar tema e viewport dentro da mesma identidade. O comparador usa componentes montados pelas rotas das duas versões, incluindo o shell, Minha conta, sino, Horas e cronômetros. O [inventário dos componentes](../tests/ds/README.md) identifica a prova direta ou a rota de cada arquivo. Os arquivos de evidência ficam fora do Git.

Componentes específicos de fluxo também aparecem nas páginas inteiras. As suítes abaixo isolam ações que não são demonstradas por uma captura estática.

| Componente | Prova funcional |
| --- | --- |
| CompanyOnboardingPanel | Reemissão do link, Partner de apoio, anexo de contrato e liberação na [jornada 02](../tests/e2e/journeys.cjs). |
| ContractAgendaSettings, ContractFrontsAdmin, PrivacyRequestsPanel | Limites, persistência, escopo, revisão e resposta por teclado nas [abas Admin](../tests/e2e/admin-company-panels.cjs). |
| AgendaChangeInbox, ClientGoogleCalendarPanel | Decisão, retry, falha parcial e confirmação de desconexão na [Agenda](../tests/e2e/agenda-components.cjs). |
| DeliverableFiles, NoteLog, ClientSubtaskModal | Publicação, renomeação, suspensão, escopo interno e teclado em [Projetos](../tests/e2e/project-components.cjs). |
| ClientHomeTeam, ClientDocumentBrandCover | Responsáveis e documentos na [Home Cliente](../tests/e2e/journeys.cjs) e no comparador de páginas. |
| PeopleAnalyticsBoard, PointsRangeSelect, TeamMemberProfiles, GestaoBanner | Período, gráficos, escopo de Equipe e navegação nas [rotas](../tests/e2e/routes.cjs) e [jornadas de Equipe](../tests/e2e/people-behaviors.cjs). |
| TeamMonthWizard | Validação, revisão, retry e payload mensal no [fluxo mobile](../tests/e2e/team-components.cjs). |
| CapacityPanel | Respostas fora de ordem, histórico e avaliações vinculadas à empresa em [Horas](../tests/e2e/hours-capacity.cjs). |
| SubtaskPanel, GestaoReport, ProfileCharts, ProfileReports | Composição nas rotas correspondentes. Pontuação DISC e operações SQL têm testes dedicados. Ações internas adicionais ainda exigem casos diretos. |

## Tailwind e identidade

Use utilitários no dono da marcação. Confira valores computados, temas, animações e seus estados com movimento reduzido. A folha de integração de biblioteca fica colocalizada, com escopo e precedência explícitos. [Padrão e exceções](DESIGN_SYSTEM.md#css-colocalizado)

Para medir uma migração CSS isoladamente, compare o build imediatamente anterior à mudança com o build migrado, passando `--reference-terms` com a versão de termos anterior. Use as capturas e o relatório para confirmar tipografia, alinhamento, contraste, foco, responsividade e ausência de recorte. Os testes de teclado, erro e persistência complementam os pixels.
