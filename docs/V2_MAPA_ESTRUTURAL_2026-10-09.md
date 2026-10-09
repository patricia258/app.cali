# Substituição estrutural V2 — mapa de integração

Oficial: `patricia258/app.cali`, branch `feat/client-visual-v2-inplace-20261008`, base atualizada `eaf5805`. V2 determinante: `7c0a2323bb221cfd61c0a8ed4ced8670c05cce78`; os 19 arquivos de apresentação/configuração locais foram comparados byte a byte com o GitHub. A árvore completa dos dois repositórios foi inventariada; versões legadas não são referências visuais.

| Experiência | Apresentação determinante | Operação oficial / ações a preservar |
|---|---|---|
| Início | ClientHome.tsx / client-home.css | ClientDashboard: consultas, métricas, contato, agendas, links e mensagens; ClientHomeTeam: equipe por empresa |
| Navegação / conta | main.tsx / styles.css | WorkspaceShell, DirectProfileControl, WorkspaceChrome: tema, perfil, notificações, sessão, acessos a frentes e relatórios |
| Horas | main.tsx: hours-context / hours-ledger | ClientHoursPage: get_client_hours_summary, lançamentos por empresa/período/visibilidade, filtros, expansão e meses não habilitados |
| Documentos | WorkflowViews: DocumentsView / workflows.css | ClientDocumentsPage: publicação, categorias, arquivos privados, ciência, comentários, validade, OAuth Drive e cópia |
| Relatórios | WorkflowViews: ReportsView / workflows.css | ClientReportsPageV5: publicações, versões, filtro, leitura/contadores, ciência e ReportPrintPageV17/PDF |
| Calendário | WorkflowViews: CalendarView / workflows.css | ClientTimelinePage: eventos, solicitações, cronograma, aprovação/ajuste, detalhes e histórico |
| Equipe | main.tsx / TeamEnhancements / IndicatorExtras | CompanyTeamPage e componentes team: diretório, ficha, privacidade, estrutura, movimentos, snapshots, revisão mensal, importação/exportação, indicadores |
| Ocorrências / canal | WorkflowViews: RecordsView / workflows.css | WorkspaceRecordsPage: protocolos, contexto, filtros, thread, anexos, controle de mensagem, encerramento, avaliação e reabertura |
| Projetos / entregáveis | main.tsx: v4-projects; DeliverablesView / deliverables.css | ClientDeliverablesPage: frentes, etapas, planejamento, aceite/ajuste, revisões, conversas e históricos |
| Frentes | composição de projetos/menus da V2 | ClientFrontsPage e contractFronts: catálogo e contratação; conservar acesso adicional da sidebar |
| Avisos | NoticesView / notices.css | Não localizada fonte oficial persistida; estado indisponível, sem inventar consulta ou ciência |
| Administradora | AdminPreview / admin-preview.css | Somente após cliente integrado e validado; nenhuma extensão automática do cliente |

## Arquitetura

Substituição em lugar do JSX de cada página. CSS transportado da referência com namespace de cliente, mantendo ordem das regras e media queries; nomes de componentes V2 determinam a apresentação. Consultas, funções de mutação, tratamento de autorização e callbacks permanecem no módulo operacional original. Estados visuais adicionais não substituem dados. Não manter a composição antiga escondida nem versões paralelas.

A guarda de integridade compara AST de instruções não visuais e todos os bindings de evento/valor/desabilitação/navegação anteriores. Alterações explícitas necessárias de estado de apresentação devem ser auditadas separadamente. Nenhum resultado dessa guarda vale como teste funcional autenticado.

## Encaixes necessários

Horas conserva o filtro de contexto e expansão dos detalhes (ausentes na V2) dentro do cabeçalho do extrato e da linha selecionada. Documentos conserva ciência e Drive junto às ações do arquivo, e validade junto à versão. Relatórios conserva catálogo/versões e links de exportação junto ao seletor e à leitura executiva. Esses encaixes serão registrados e comparados, sem dados fictícios.

## Limites de validação

A referência foi aberta com acesso temporário oficial da Vercel, sem alterar proteção. O preview está autenticado em uma conta de cliente via o fluxo normal de e-mail e código. A comparação autenticada inicial de Horas foi registrada; a revisão seguinte recebeu comparações locais em quatro larguras e ainda exige nova conferência autenticada após a publicação. Testes de escrita devem ocorrer em isolamento comprovado; preview da aplicação não isola o banco de produção. Produção, RLS, Auth e integrações não recebem mudanças.

## Controle dos vínculos no HTML

Conversas e aprovações usam runtimes com seletores DOM. O novo HTML utiliza `data-v2-operation`, separado das classes de apresentação da V2. Os runtimes aceitam tanto esses marcadores do cliente quanto as classes antigas da administradora, sem mudar consultas, mutações, eventos nem permissões. `scripts/v2-operational-hooks.json` registra cada seletor e fonte adaptada; a guarda normaliza somente esses argumentos de seleção antes de exigir igualdade das demais instruções.

Foram removidos os CSS exclusivos `client-deliverables-v31/v32/v33`, sem referências ativas após a substituição. Carregadores de Horas, Documentos, Ocorrências e Projetos do cliente passam a carregar o módulo visual V2; carregadores da administradora continuam iguais. Os callbacks do formulário mensal e dos cinco passos de cadastro permanecem inalterados.

O modo noturno existente mantém a composição V2. Variáveis de cor conservam os valores exatos da referência no modo diurno. As cores noturnas são um encaixe funcional da aplicação oficial; não fazem parte do protótipo aprovado.

## Evidências e limpeza da revisão de 09/10

O cabeçalho secundário foi removido do JSX do cliente. Agendamento, frentes e relatórios foram acomodados na topbar principal, mantendo seus callbacks. A sidebar usa as medidas e o gradiente medidos na referência: 56 px no desktop e 58 px aberta no mobile. A topbar mede 61 px; em Horas a página começa em x=91/y=87 no viewport 1440 px. A tipografia genérica antiga foi excluída dos descendentes `.v2-client-module`, e foi eliminado o título genérico intermediário que ainda alterava margens/altura da V2. O cabeçalho de Horas passou a medir 69 px em ambos os renders locais, com fontes externas interceptadas igualmente.

A visão mensal do calendário foi incorporada ao JSX V2, reaproveitando os mesmos eventos, filtros e `openItem`; conserva semana, lista e seleção horária. A única alteração na declaração de estado é a ampliação do tipo de apresentação `agendaView` com `month`, explicitamente normalizada pela guarda. Não há mudança em consultas/mutações.

A suíte local exercita o provedor de autenticação da aplicação com sessão e respostas de backend simuladas; remove o bypass `cali-preview-role`. As capturas da referência são produzidas pelo código exato aprovado, no mesmo navegador e nas larguras 1440, 1280, 1024 e 390 px. Registra geometria e pares de capturas, com dados QA claramente identificados. Essa verificação não equivale a testar RLS ou persistência no banco real. Capturas ficam fora do repositório público.

Interações verificadas localmente: abrir evento pela visão mensal; tentar comentário de documento e exibir falha simulada de gravação; inicializar ferramentas reais de anexo/link/emoji de conversa do entregável; abrir drawer de ocorrência; acessar o formulário de equipe; navegar pelo menu mobile; redirecionar cliente que tenta rota administrativa. Hover e foco da navegação também recebem capturas. Escritas permanecem bloqueadas no interceptor.

A conferência autenticada inicial de Horas ocorreu antes desta revisão do cabeçalho, em 1363×936 px. A nova inspeção autenticada foi rejeitada pela revisão automática por limite de uso da conta. Não foi contornada. A última revisão publicada precisa de nova conferência autenticada quando o acesso estiver disponível.

Pendências para homologação completa: fonte operacional de avisos institucionais não identificada; paridade dos estados secundários de perfil/notificações/canal e flyout de equipe; validação completa de CRUD, aprovação, ciência, anexos/Drive, exportações, persistência e isolamento em ambiente autorizado para escrita. A administradora não foi iniciada, conforme a ordem exigida. O aplicativo de produção, esquema/RLS/Auth e integrações não foram modificados, e não houve merge para a branch principal.

Na conferência final dos pares, foi corrigido o padding superior mobile de 25 para 26 px, conforme a revisão final da referência. A regra global V61 de tamanho dos controles foi excluída dos módulos e da topbar V2; os tamanhos voltam a ser os definidos nos componentes aprovados, sem acrescentar nova camada de sobrescrita. Horas separa a string do formatador operacional existente em horas e minutos menores na apresentação, com zeros visuais; nenhum consumo ou saldo é recalculado. Cabeçalhos mobile podem continuar com alturas distintas quando a ação demonstrativa da referência não existe no aplicativo real ou o texto de dados/ações se distribui em linhas diferentes.
