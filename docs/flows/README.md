# Fluxos do CALI Workspace

Fichas de jornada para manutenção do app.cali. A referência funcional é o app.cali em `773c9d4`. O estado **Atual** descreve as fontes da branch indicadas em cada ficha. As fichas reconciliam o levantamento e as jornadas da V2 com as decisões vigentes. [Mapa das rotas](../../src/app/router.tsx)

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
| [14 · Minha conta, sino e resumo diário](SHELL.md#flow-14) | Shell autenticado | Admin, Cliente, Partner |
| [15 · Equipe CALI e Partner](PARTNER.md#flow-15) | `/admin/equipe-cali`, `/equipe` | Admin, Partner |
| [16 · Satisfação e auditoria](ADMIN.md#flow-16) | `/admin/satisfacao`, `/admin/auditoria` | Admin |
| [17 · Coleta pública e devolutivas](PUBLIC.md#flow-17) | `/perfil/:slug`, `/f/:slug`, `/admin/mapa-de-people` | Respondente, Admin, Cliente, Partner atribuído |
| [17a · DISC](PUBLIC.md#flow-17a) | `/perfil/:slug`, `/admin/perfil-comportamental` | Respondente, avaliador CALI, gestão Cliente |
| [17b · CALI Forms](PUBLIC.md#flow-17b) | `/f/:slug`, `/admin/formularios` | Respondente, Admin |
| [17c · Mapa de People](PUBLIC.md#flow-17c) | `/admin/mapa-de-people`, portal | Admin, Partner atribuído, destinatário |
| [18 · Frentes, ajuda, privacidade e encerramento](CLIENT.md#flow-18) | `/cliente/frentes`, `/cliente/ajuda`, `/admin/clientes` | Cliente, Admin, titular |

## Contexto comum

Admin seleciona empresa e período. Cliente deriva empresa do vínculo autenticado. Partner combina vínculo, módulo e atribuição conforme a operação. Menu, filtro e parâmetro de URL guiam navegação. Cada destino valida de novo o acesso ao registro. Na troca de empresa ou sessão, conferir detalhe, arquivos, notificações e rascunhos no novo contexto.

O teste de jornada inclui acesso direto e volta à lista, sessão expirada ou revogada, teclado e dispositivos móveis, erro recuperável, tentativa repetida e negativa por papel e empresa. Preservar IDs, protocolos, slugs, links emitidos e histórico compatível. Para arquivos, conferir também os bytes. Para e-mail e Google, conferir o efeito no destino de teste e o recibo correspondente. Evidência de UI, API, Storage e entrega deve identificar SHA, ator, origem e ambiente. [Critérios de aceite](../CONSOLIDATION_ACCEPTANCE.md)
