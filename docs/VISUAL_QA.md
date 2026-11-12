# Comparação visual do CALI Workspace

A referência é o build da `main` no commit `773c9d4`. O candidato é a revisão da branch de consolidação. Compare versões com os mesmos papéis, dados sintéticos, data, viewport e navegador. A documentação de [regras de produto](PRODUCT_RULES.md) explica mudanças deliberadas, como a revisão do Partner e o histórico por empresa.

## Páginas inteiras

```sh
npm run test:visual:pages -- --reference 773c9d4 --candidate HEAD --output /tmp/cali-visual-pages \
  --viewport desktop --viewport laptop --viewport tablet --viewport mobile
```

O comando gera os dois builds a partir do Git, com dependências do lockfile e endpoint sintético. O npm precisa ter as dependências no cache para o build offline. Também aceita `--reference-dist` e `--candidate-dist` para builds sintéticos existentes. Nesse caso o relatório guarda SHA declarado e hash dos arquivos compilados. Use `--list` para listar os cenários, `--role`, `--case` e `--viewport` para recortes. Desktop e celular são o padrão. Notebook e tablet podem ser selecionados.

A matriz parte de todas as rotas registradas, cruza perfis e inclui deep links, menu, histórico, tema e interações selecionadas. Cada cenário guarda a página inteira, estado de navegação, títulos, diálogos e geometria. A diferença de pixels aponta a região a revisar. Uma diferença intencional precisa corresponder à regra de produto ou a uma correção reproduzida.

A comparação visual e as jornadas funcionais usam Chrome local em loopback e interceptam requisições. O relatório aponta limitações da referência e falhas no candidato. Os efeitos persistidos são verificados pelos [contratos do stack local](../tests/contracts/README.md).

## Correções verificadas

| Superfície | Comportamento corrigido | Prova |
| --- | --- | --- |
| Topo Admin | Os cronômetros ocupavam a barra e cortavam o contador, o sino e o perfil. O contador mantém acesso aos cronômetros em quatro larguras e devolve o foco ao fechar. O topo de Cliente e Partner mantém uma linha no celular. | [Comparador de componentes](../tests/ds/compare-components.mjs) |
| Cabeçalhos Admin e Partner | A base flex de desktop criava mais de 200 px vazios no celular. As telas que usam esse cabeçalho aproximam a ação do título e alinham os dois ao conteúdo. | [Visão geral](../tests/e2e/account-and-overview.cjs) · [Matriz visual](../tests/visual/pages/scenarios.cjs) |
| Mapa oficial | O cabeçalho em uma linha cortava as ações no celular. A barra quebra em linhas e conserva retorno, atualização, link original e impressão pelo iframe. | [Relatório Mapa](../tests/e2e/people-behaviors.cjs) |
| Agenda | Admin abre despesas pela Agenda. A decisão local continua visível quando a sincronização Google fica pendente. | [Visitas](../tests/e2e/agenda-visits.cjs) · [Decisões](../tests/e2e/agenda-components.cjs) |
| Entregáveis e Horas | Esc cancela a renomeação sem fechar o diálogo. Espaço abre subtarefa. O histórico de entregas mantém uma leitura por seleção e atualização programada. Respostas atrasadas de capacidade são descartadas ao trocar empresa ou mês. | [Projetos](../tests/e2e/project-components.cjs) · [Histórico](../tests/e2e/project-history.cjs) · [Capacidade](../tests/e2e/hours-capacity.cjs) |
| Acesso | A leitura de logotipos e o canal de empresas aguardam a admissão. A troca de ator descarta respostas e URLs assinadas da sessão anterior. | [Guardas](../tests/e2e/guards.cjs) |
| Ocorrências | Editar e excluir devolvem foco. Reabrir exibe as ações e o novo encerramento recebe outra avaliação. | [Histórico e atendimento](../tests/e2e/record-history.cjs) |
| Relatórios | A leitura registra abertura do PDF. Enviar dúvida abre o formulário do relatório e preserva rascunho e foco após uma falha. O envio Admin exibe o erro dentro da confirmação e o recibo após concluir. | [Relatórios Cliente](../tests/e2e/report-and-staff-actions.cjs) · [Envio](../tests/e2e/commercial-delivery.cjs) |
| Avisos | Falhas de comentário aparecem no diálogo. O Cliente consegue tentar novamente mantendo a mensagem. | [Avisos](../tests/e2e/review-workflows.cjs) |
| Agenda | Falhas de gravação e cancelamento preservam o formulário. Lembrete e transcrição seguem na própria gravação do evento. | [Agenda](../tests/e2e/agenda-visits.cjs) |

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

Use utilidades para layout estático e pesos tipográficos. Use os tokens fixos para a paleta da marca e tokens semânticos para superfícies que mudam entre Dia e Noite. Em seletores usados por portais, runtime ou folhas carregadas em ordem, `@apply` preserva especificidade e cascata. Mantenha CSS para gradientes, shorthands que redefinem várias propriedades, estilos de impressão, fontes, keyframes, geometrias e estados com precedência própria.

Para medir uma migração CSS isoladamente, compare o build imediatamente anterior à mudança com o build migrado, passando `--reference-terms` com a versão de termos anterior. Use as capturas e o relatório para confirmar tipografia, alinhamento, contraste, foco, responsividade e ausência de recorte. Os testes de teclado, erro e persistência complementam os pixels.
