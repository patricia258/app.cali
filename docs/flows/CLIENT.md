# Cliente · Início, Equipe e ciclo da conta

## FLOW-04

**Início e Visão geral.** Cliente abre `/cliente` para acompanhar a própria conta. Admin abre `/admin` para acompanhar carteira, prioridades e recortes por empresa.

**Atual.** Início consulta plano, contato, agenda, horas, ocorrências, documentos e relatórios. A caixa de mensagem da home cria uma ocorrência na conta e sinaliza o administrativo. A Visão geral Admin compõe carteira, indicadores e atalhos. Cada bloco lê fontes próprias e pode falhar em separado. [Início Cliente](../../src/modules/client/home/ClientDashboard.tsx) · [Visão geral Admin](../../src/modules/admin/overview/AdminDashboard.tsx)

**Dados e integrações.** Plano e responsáveis vêm da [ficha](ACCESS.md#flow-02). Pendências e indicadores cruzam dados de contrato, Equipe, Agenda, entregas, Horas, Documentos e Relatórios. O destino do atalho verifica o acesso ao objeto novamente.

**Alvo.** Carregar empresa e plano → exibir Patrícia e Partner de apoio quando houver → abrir pendência ou conteúdo autorizado. Remover a caixa e a submissão de mensagens da home. O atalho de atendimento abre [Ocorrências](OPERATIONS.md#flow-10) e permite retomar o assunto autorizado. Na Visão geral, trocar empresa ou período atualiza totais e listas do mesmo recorte. Falha de um bloco mantém os demais disponíveis e identifica a informação indisponível. [Regras de navegação](../PRODUCT_RULES.md#navegação)

**Aceite.** Empresa com Patrícia apenas e com Partner de apoio. Nenhuma ação de envio na home. Histórico anterior preservado e acessível no assunto correto. Carteira com mais de uma página, mês vazio, falha parcial e recarga mantendo o recorte. Horas ocultas ficam indisponíveis ao Cliente.

**Lacunas.** Conferir paginação, recortes e fontes dos agregados da carteira antes de reutilizar projeções da V2. Conferir que registros já gerados pela home continuam acessíveis em Ocorrências.

## FLOW-08

**Equipe da empresa.** Cliente em `/cliente/equipe` e Admin em `/admin/equipe` usam a própria empresa ou o contexto escolhido. Partner autorizado abre `/equipe/pessoas` para a projeção funcional.

**Atual.** Diretório e ficha → edição ou importação → movimentação → confirmação mensal → indicadores. Há leitura de estrutura, vagas e exportação. A fonte legada distingue escrita de privados em operações específicas e leitura restrita. Os papéis observados variam por leitor, RPC e policy. [Equipe](../../src/modules/shared/team/CompanyTeamPage.tsx) · [Especificação de Equipe](../EQUIPE_EMPRESA_SPEC_2026-10-01.md) · [Trilha de campos privados](../../supabase/migrations/20261001210000_company_team_privacy_audit.sql)

**Dados e integrações.** Identidade por empresa e código, cargo, departamento, gestor, status e datas. Dados privados incluem remuneração, revisão salarial, gênero e filhos. Movimentação, vaga, snapshot, confirmação e métricas têm vínculos de mês e revisão. Arquivamento retira a pessoa do quadro atual e conserva o histórico. A ausência na importação não configura desligamento. [Confirmação de mês](../../supabase/migrations/20261002000902_team_monthly_review_v2.sql)

**Alvo.** Clientes equivalentes mantêm a Equipe e consultam privados da própria empresa. Admin pode manter e ler conforme escopo. Partner recebe apenas projeção funcional. Cliente lança as métricas mensais inicialmente. Após o lançamento, correção fica com Admin e registra motivo, autoria e antes/depois. Pedidos de preenchimento aparecem para Cliente. Importação e confirmação preservam a coerência de registros e snapshots. [Regras de Equipe](../PRODUCT_RULES.md#equipe-da-empresa-e-métricas)

**Aceite.** Usar dois Clientes da mesma empresa, Cliente B e Partner com e sem módulo. Conferir privados em UI, leitura direta e exportação. Importar com gestor inválido, conflito, ausência de linha e retry. Confirmar mês, corrigir como Admin, negar correção Cliente e comparar snapshots e métricas por período.

**Lacunas.** Reconciliar os leitores de dados privados com os termos e as policies. Confirmar fórmulas, janela de referência e critérios de exportação com o contrato dono, preservando o comportamento histórico onde aplicável.

## FLOW-18

**Frentes, ajuda, privacidade e encerramento.** Cliente abre `/cliente/frentes`, `/cliente/ajuda` ou Minha conta. Público consulta `/termos`, `/privacidade` e `/politica-do-site`. Admin opera pedido, exportação e encerramento pela ficha em `/admin/clientes`.

**Atual.** Frentes e Ajuda exibem conteúdo da conta. A ficha Admin reúne exportação e encerramento. O SQL legado habilita eliminação após 45 dias do fechamento. O fluxo legado remove objetos Storage em lotes antes do RPC final de eliminação. Falha parcial pode deixar objetos já removidos. Os textos legados usam 45 dias. [Páginas legais](../../src/modules/public/legal/LegalPage.tsx) · [Frentes contratuais](../FRONTES_CONTRATUAIS_2026-10-03.md) · [Exportação](../../supabase/migrations/20261021090000_admin_export_company_data.sql) · [Remoção de objetos](../../src/modules/admin/companies/companyDataElimination.ts) · [Executor legado](../../supabase/migrations/20261021230000_company_data_elimination.sql)

**Dados e integrações.** Pedido com identidade conferida e recibo, vínculo da empresa, status e data de encerramento. Exportação autorizada inclui somente o escopo devido. Manifesto de eliminação mapeia Auth, banco, objetos e versões, anexos, Forms e lixeira, DISC, portal, Drive/Calendar, outbox, cópias e backups. A trilha residual define fundamento, acesso e prazo próprios. [Auditoria de privacidade](../WORKSPACE_PRIVACY_AUDIT_2026-10-01.md)

**Alvo.** Pedido de dados em [Minha conta](SHELL.md#flow-14) → atendimento com recibo. Encerramento efetivo → corte de acesso → exportação quando aplicável → manifesto e validação de escopo → eliminação retomável → conferência final e trilha mínima. Concluir em até **30 dias corridos** do encerramento efetivo. Alinhar regra, termos, política, telas, executor e instrumentos contratuais aplicáveis. [Regras de privacidade](../PRODUCT_RULES.md#privacidade-e-encerramento)

**Aceite.** Identidade e empresa corretas no pedido, exportação autorizada, negativa após o corte e tentativa contra empresa vizinha. Simular falha entre Storage e banco, retomar pelo mesmo ID e reconciliar objetos, registros, cópias e trilha. Conferir prazo de 30 dias, alerta e versões dos textos aplicáveis.

**Lacunas.** Conferir contratos e aditivos assinados para tratar cláusulas legadas. Fechar a destinação de retenções residuais e a cobertura de cópias e restauração. Definir o destino e o responsável por interesse comercial nas Frentes.
