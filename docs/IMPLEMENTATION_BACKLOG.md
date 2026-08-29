# CALI Workspace · backlog de implementação

Regra de execução: uma página por vez. Só iniciar a próxima depois de a página atual estar funcional, responsiva, testada pela Patrícia e explicitamente aprovada.

## Página 1 — Shell global + Visão Geral Admin
Status: **aprovada**

Critério de concluído:
- menu retraído automaticamente e opção de manter aberto;
- símbolos oficiais lima/folha alternando no menu fechado;
- marca CALI oficial e alinhamento consistente no menu aberto;
- perfil somente no rodapé do menu, editável;
- notificações funcionais no topo;
- saída no topo;
- tema Dia/Noite global, automático às 06:00/18:00 e alternância manual no topbar;
- modais cobrindo toda a viewport e fundo integralmente desfocado;
- saudação por horário;
- consumo de horas por cliente e ritmo previsto;
- status de entregáveis;
- evolução de NPS por cliente, legenda e tooltip;
- alertas/ações prioritárias;
- mini calendário + próximos compromissos;
- deadlines próximos com cliente, tipo e prazo;
- carteira de clientes com serviço, horas, ciclo/deadline, NPS e próximo passo;
- exportação CSV, Word e PDF; Drive preparado para OAuth;
- coerência entre totais, horas, percentuais e datas;
- desktop, tablet e mobile.

## Página 2 — Clientes / Gestão da Conta
Status: **em validação visual e funcional**

Escopo: gestão completa da relação comercial e operacional com cada cliente. A linha da carteira abre uma ficha 360º em modal, organizada por abas, sem transformar a página em uma ficha longa.

Abas da ficha:
- **Dados cadastrais:** logo da empresa, razão/nome de exibição, segmento, endereço, cidade/UF, bairro, filiais e localidades, serviço CALI, horas contratadas, decisor, cargo, e-mail de acesso, telefone e WhatsApp.
- **Contrato:** início, término, duração calculada, renovação automática, multa/condições de rescisão, contrato e aditivos.
- **Financeiro:** valor, frequência/recorrência, forma de pagamento, regra de vencimento, primeiro dia útil quando aplicável, antecedência da cobrança e histórico financeiro.
- **Operação:** horas, NPS, responsabilidades da CALI, projetos vinculados, Drive, relatório, e-mail e WhatsApp.
- **Histórico:** eventos relevantes da conta, alterações, bloqueios, arquivamentos, encerramentos e justificativas.

Refinamento obrigatório antes de aprovar:
- topo da página com indicadores de contas ativas, entradas do mês, saídas do mês e saldo;
- carteira pesquisável e filtrável, com logo maior e bom espaçamento;
- linha inteira clicável e indicação visual de seleção/hover;
- ações rápidas por conta: editar, bloquear temporariamente, arquivar, encerrar contrato e reativar quando aplicável;
- ações destrutivas sempre com confirmação e justificativa;
- upload da logo da empresa e uso consistente no Workspace e acesso do cliente;
- cadastro inicial em etapas/abas, sem modal excessivamente alto;
- lista de segmentos com opção “Outro”;
- lista atual de serviços CALI;
- horas como horas contratadas no contrato, não “horas do ciclo” no cadastro comercial;
- situação financeira calculada pela operação, não escolhida manualmente no cadastro inicial;
- documentos em storage privado;
- base para futura leitura assistida do contrato, com revisão humana antes de salvar campos extraídos;
- base para cobrança automática por e-mail/app com relatório + Pix/boleto/link; disparo real somente quando o provedor financeiro estiver definido;
- bloqueio/desativação retirando acesso do cliente de forma controlada;
- comportamento correto em Dia/Noite;
- desktop, tablet e mobile.

## Página 3 — Documentos
Status: **bloqueada até aprovação da Página 2**

Escopo: biblioteca em cards com capa; links; versões; origem; categorias; cliente/projeto; comentários; status final/rascunho; Drive; visualização e organização por contexto.

## Página 4 — Calendário
Status: **bloqueada**

Escopo: calendário real em mês/semana/agenda; mini calendário; cores por evento; filtros; criação por dia; reuniões, validações, deadlines e marcos; Google Calendar/Meet/Workspace via OAuth; notificações.

## Página 5 — Projetos + Entregáveis / Cronograma
Status: **bloqueada — complexa, exige revisão completa do fluxo Connect antes da implementação**

Escopo: cronograma em rascunho; revisão interna; envio ao cliente; aprovação/ajuste; ativação do projeto; Kanban arrastável; estados completos dos entregáveis; comentários; anexos; aprovação interna; aprovação do cliente; ajustes; histórico; imutabilidade após aprovação; NPS; deadlines; fluxo inspirado no Connect.

Pré-requisito: revisar novamente o código e documentação do Connect página por página antes de alterar este módulo.

## Página 6 — Horas
Status: **bloqueada — complexa**

Escopo: timer; lançamento manual; vínculo com cliente/projeto/entregável; consumo; ritmo previsto; alertas configuráveis; histórico; visibilidade ao cliente; exportação; reflexo em relatórios e gestão da conta.

Pré-requisito: fechar modelo de ciclos/projetos e regras de contabilização antes da implementação final.

## Página 7 — Relatórios
Status: **bloqueada — complexa e dependente de Projetos/Horas**

Escopo: geração mensal; horas; entregáveis; NPS; atividades; interpretação executiva; PDF; e-mail; app; Drive; histórico de publicação/ciência; vínculo com cobrança quando aplicável.

Pré-requisito: Projetos e Horas estarem funcionalmente estáveis para evitar relatório baseado em dados incompletos.

## Página 8 — Experiência completa do Cliente
Status: **bloqueada**

Escopo: início; cronograma; entregáveis; horas; documentos; relatórios; comentários/anexos; validações; prazos; perfil e notificações, eliminando duplicidades de contexto.

Ordem oficial após Página 2: **Documentos → Calendário → Projetos/Entregáveis → Horas → Relatórios → Experiência completa do Cliente**. Projetos, Horas e Relatórios ficam deliberadamente para a fase final do painel administrativo porque concentram as regras de negócio mais sensíveis e interdependentes.