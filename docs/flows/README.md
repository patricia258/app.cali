# Fluxos do CALI Workspace

Fichas de jornada para manutenção do app.cali. A referência funcional é o app.cali em `773c9d4`. As fichas reconciliam o levantamento, as jornadas da V2 e o código da branch de consolidação. [Mapa das rotas](../../src/app/router.tsx)

- **Atual** registra comportamento localizado no código ou em migrations versionadas. Um link SQL identifica a versão inspecionada do contrato. O catálogo e o comportamento hospedados exigem evidência própria.
- **Alvo** deriva das [regras de produto](../PRODUCT_RULES.md) e dos [contratos de dados](../DATA_CONTRACTS.md). As fichas detalham as transições e os pontos de integração da jornada.
- **Aceite** indica cenários a executar, com a [matriz de validação](../CONSOLIDATION_ACCEPTANCE.md) como roteiro comum. **Lacunas** identifica o que ainda exige decisão, compatibilização ou prova.

## Acesso às fichas

| Fluxo | Entrada principal | Atores |
| --- | --- | --- |
| [01 · Login, convite e sessão](ACCESS.md#flow-01) | `/login`, `/auth/callback` | Admin, Cliente, Partner, convidado |
| [02 · Ficha da empresa e acessos](ACCESS.md#flow-02) | `/admin/clientes` | Admin, Cliente, candidato a acesso |
| [03 · Propostas e portal](ADMIN.md#flow-03) | `/admin/propostas` | Admin, Partner atribuído, destinatário |
| [04 · Início e Visão geral](CLIENT.md#flow-04) | `/cliente`, `/admin` | Cliente, Admin |
| [05 · Projetos e cronograma](DELIVERY.md#flow-05) | `/admin/projetos`, `/cliente/cronograma`, `/equipe/projetos` | Admin, Cliente, Partner atribuído |
| [06 · Entregáveis](DELIVERY.md#flow-06) | `/admin/projetos`, `/cliente/entregaveis` | Admin, Cliente, Partner atribuído |
| [07 · Horas e cronômetro](OPERATIONS.md#flow-07) | `/admin/horas`, `/cliente/horas`, `/equipe/horas` | Admin, Cliente, Partner |
| [08 · Equipe da empresa](CLIENT.md#flow-08) | `/admin/equipe`, `/cliente/equipe`, `/equipe/pessoas` | Admin, Cliente, Partner atribuído |
| [09 · Agenda, Calendar e Meet](OPERATIONS.md#flow-09) | `/admin/calendario`, `/cliente`, `/equipe/calendario` | Admin, Cliente, Partner atribuído |
| [10 · Ocorrências e histórico](OPERATIONS.md#flow-10) | `/admin/registros`, `/cliente/registros`, `/equipe/ocorrencias` | Admin, Cliente, Partner atribuído |
| [11 · Documentos e Drive](DELIVERY.md#flow-11) | `/admin/documentos`, `/cliente/documentos`, `/equipe/documentos` | Admin, Cliente, Partner atribuído |
| [12 · Relatório mensal e PDF](ADMIN.md#flow-12) | `/admin/relatorios`, `/cliente/relatorios`, `/equipe/relatorios` | Admin, Cliente, Partner atribuído |
| [13 · Avisos](OPERATIONS.md#flow-13) | `/admin/avisos`, `/cliente/avisos`, `/equipe/avisos` | Admin, Cliente, Partner atribuído |
| [14 · Minha conta e sino](SHELL.md#flow-14) | Shell autenticado | Admin, Cliente, Partner |
| [RESUMO-01 · Resumo diário](SHELL.md#resumo-01) | Edge acionada pelo cron às 19h | Admin |
| [15 · Equipe CALI e Partner](PARTNER.md#flow-15) | `/admin/equipe-cali`, `/equipe` | Admin, Partner |
| [16 · Satisfação e auditoria](ADMIN.md#flow-16) | `/admin/satisfacao`, `/admin/auditoria` | Admin |
| [17 · Coleta pública e devolutivas](PUBLIC.md#flow-17) | `/perfil/:slug`, `/f/:slug`, `/admin/mapa-de-people` | Respondente, Admin, Cliente, Partner atribuído |
| [17a · DISC](PUBLIC.md#flow-17a) | `/perfil/:slug`, `/admin/perfil-comportamental` | Respondente, avaliador CALI, gestão Cliente |
| [17b · CALI Forms](PUBLIC.md#flow-17b) | `/f/:slug`, `/admin/formularios` | Respondente, Admin |
| [17c · Mapa de People](PUBLIC.md#flow-17c) | `/admin/mapa-de-people`, portal | Admin, Partner atribuído, destinatário |
| [18 · Frentes, ajuda, privacidade e encerramento](CLIENT.md#flow-18) | `/cliente/frentes`, `/cliente/ajuda`, `/admin/clientes` | Cliente, Admin, titular |

## Fechamento da auditoria local

| Fluxo | Evidência local | Aceite pendente no destino |
| --- | --- | --- |
| [01](ACCESS.md#flow-01) | Auth, MFA, termos, sessão revogada e controles de acesso | Configuração hospedada e caixa externa de teste |
| [02](ACCESS.md#flow-02) | Ficha, pré-cadastro e liberação verificados em Playwright e PostgreSQL | Reconciliar contratos e acessos legados |
| [03](ADMIN.md#flow-03) | Revisão, proposta, duas confirmações, PDF arquivado e transporte de teste | Conferir vínculo com amostra do portal e caixa de teste |
| [04](CLIENT.md#flow-04) | Início por empresa e carteira com paginação, falha parcial e recarga | Navegação a ocorrências legadas |
| [05](DELIVERY.md#flow-05) | Navegação e operações em fixtures | Cronograma, recálculo e concorrência no catálogo hospedado |
| [06](DELIVERY.md#flow-06) | Revisões, ajuste obsoleto, arquivo e controles por clique, toque e teclado | URLs previamente emitidas e casos legados |
| [07](OPERATIONS.md#flow-07) | Presença, pausa, justificativa e lançamento único em PostgreSQL | Cadência do cron e entrega externa aos dois destinatários |
| [08](CLIENT.md#flow-08) | Acessos A1/A2 equivalentes, negativa B e métricas por papel | Conferir fórmulas e exportações do contrato de Equipe |
| [09](OPERATIONS.md#flow-09) | Agenda e reconciliação com provedor Google simulado | Conta, calendário, Meet e convidados de teste |
| [10](OPERATIONS.md#flow-10) | Histórico por empresa, fechamento e reabertura com avaliação independente | Links e anexos legados |
| [11](DELIVERY.md#flow-11) | Projeções, Storage privado e cópia com provedor Google simulado | Pasta Drive de teste e URLs legadas |
| [12](ADMIN.md#flow-12) | Revisão, ciência, impressão e transporte para Mailpit | Conferir PDFs históricos e caixa externa de teste |
| [13](OPERATIONS.md#flow-13) | Revisão de aviso, negativa de publicação direta e publicação única | Público no catálogo hospedado |
| [14](SHELL.md#flow-14) | Navegação e Minha conta em Playwright, com Login, Cliente, Admin e Partner | Responsáveis CALI por tratar pedidos |
| [15](PARTNER.md#flow-15) | Partner atribuído/limitado, rotas, impressão e guardas | Conferir atribuições e catálogo hospedado |
| [16](ADMIN.md#flow-16) | Coorte de encerramento, resposta tardia e impressão | Cruzar vínculos legados e PDF da mesma coorte |
| [17](PUBLIC.md#flow-17) | DISC, Forms e Mapa exercitados separadamente | Amostras autorizadas, fidelidade de PDFs e destinatários de teste |
| [18](CLIENT.md#flow-18) | Prazo 29/30 dias, eliminação e retomada no Storage local | Instrumentos assinados, cópias externas e registros legados sem vínculo |
| [RESUMO-01](SHELL.md#resumo-01) | Cinco testes unitários e entrega única no Mailpit após repetir o acionamento | Cron e destinatários do ambiente de teste |

## Contexto comum

Admin seleciona empresa e período. Cliente deriva empresa do vínculo autenticado. Partner combina vínculo, módulo e atribuição conforme a operação. Menu, filtro e parâmetro de URL guiam navegação. Cada destino valida de novo o acesso ao registro. Na troca de empresa ou sessão, conferir detalhe, arquivos, notificações e rascunhos no novo contexto.

O teste de jornada inclui acesso direto e volta à lista, sessão expirada ou revogada, teclado e dispositivos móveis, erro recuperável, tentativa repetida e negativa por papel e empresa. Preservar IDs, protocolos, slugs, links emitidos e histórico compatível. Para arquivos, conferir também os bytes. Para e-mail e Google, conferir o efeito no destino de teste e o recibo correspondente. Evidência de UI, API, Storage e entrega deve identificar SHA, ator, origem e ambiente. [Critérios de aceite](../CONSOLIDATION_ACCEPTANCE.md)
