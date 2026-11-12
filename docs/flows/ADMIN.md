# Admin · Propostas, relatórios e satisfação

## FLOW-03

**Propostas e portal.** Admin abre `/admin/propostas`, o editor por `submissionId` e a prévia por `proposalId`. Partner atribuído prepara material. O destinatário responde pelos formulários e links do portal.

**Atual.** Resposta do portal → triagem Admin → edição → aprovação interna → envio. A oportunidade pode avançar para negociação, fechamento, recusa ou expiração. A proposta tem estado próprio e o editor gera PDF. A lista permite filtrar, arquivar e exportar respostas. [Lista Admin](../../src/modules/admin/proposals/AdminProposalsPageV2.tsx) · [Adapter do portal](../../src/api/commercial/portal.ts)

**Dados e integrações.** ID e protocolo da resposta, oportunidade, versão da proposta, valores, destinatário, PDF e recibo de envio. O portal continua recebendo respostas. A fila Admin reúne vínculos e histórico, inclusive respostas antigas.

**Alvo.** Rascunho Partner → submissão atribuída → Patrícia devolve ou aprova. Rascunho da Patrícia segue para envio direto. Antes de enviar ou reenviar, pedir “Deseja enviar?” e “Tem certeza?”. O servidor fixa destinatário autorizado e revisão aprovada. Cancelamento em qualquer etapa não produz envio. Após confirmação, registrar entrega real e resultado. Aceite ou recusa externa atualiza a oportunidade preservando a revisão enviada. [Regras de materiais](../PRODUCT_RULES.md#materiais-propostas-e-avisos) · [Envio de relatório e recibos](#flow-12)

**Aceite.** Abrir resposta antiga e nova, conferir proposta/PDF e seguir o vínculo de retorno. Negar Partner fora do escopo. Exercitar devolução, as duas confirmações e o cancelamento em cada uma. Simular timeout e repetir a mesma operação sem entrega adicional. Conferir caixa de teste, destinatário e revisão corretos no envio e no reenvio deliberado.

**Lacunas.** Reconciliar origem, IDs e respostas do portal, catálogo da Edge `portal-send-proposal` e identificação de destinatário antes de substituir o transporte atual. [Contratos de dados](../DATA_CONTRACTS.md)

## FLOW-12

**Relatório mensal, revisão e PDF.** Admin opera `/admin/relatorios`. Cliente lê `/cliente/relatorios` e a impressão autorizada. Partner prepara relatórios atribuídos em `/equipe/relatorios`.

**Atual.** Geração e curadoria Admin → revisão/aprovação → liberação → leitura e ciência Cliente. A área tem histórico, impressão A4, assinatura e ações de envio. A Edge legada recebe dados de destinatário no corpo, confere acesso e versão e envia antes de atualizar o estado local. [Editor Admin](../../src/modules/admin/reports/AdminReportsPageV17.tsx) · [Relatórios Cliente](../../src/modules/client/reports/ClientReportsPageV5.tsx) · [Edge de envio](../../supabase/functions/workspace-send-executive-report/index.ts)

**Dados e integrações.** Empresa, ciclo, entregáveis, horas, reuniões, decisões, avaliações e demais fatos da operação compõem o snapshot. Patrícia acrescenta síntese, riscos e próximos passos. Revisão aprovada vincula PDF privado, foto, assinatura e protocolo `CALI-TIPO-AAAA-NNNNNN`. Geração, aprovação, liberação, envio e ciência têm eventos próprios.

**Alvo.** Rascunho Partner → revisão pela Patrícia → devolução ou aprovação → liberação. Autoria da Patrícia permite envio direto. Em envio e reenvio, solicitar “Deseja enviar?” e depois “Tem certeza?”. Entregar por e-mail a revisão confirmada ao Cliente autorizado. Recibo e chave da operação distinguem nova tentativa de reenvio deliberado. Na correção, Admin registra motivo, preserva histórico e retira a revisão da visão Cliente durante o trabalho. Após reliberação, nova ciência só quando solicitada. O mesmo contrato de entrega se aplica a [Propostas](#flow-03) e [Mapa](PUBLIC.md#flow-17c). [Regras de relatório e materiais](../PRODUCT_RULES.md#relatório-mensal)

**Aceite.** Cobrir devolução e aprovação, acesso direto à impressão, ocultação de revisão em correção e reliberação com e sem nova ciência. Conferir A4, foto, assinatura, protocolo, PDF legado e bytes autorizados. Cancelar as duas etapas de confirmação, testar perda de resposta depois do envio e repetir. Conferir caixa de teste e recibo nas três modalidades.

**Lacunas.** Conciliar os leitores legados, o transporte atual e a fila proposta. O envio piloto por notificação interna prova a sinalização no Workspace. O recebimento real dos três materiais exige homologação própria. [Contratos por lote](../DATA_CONTRACTS.md#contratos-por-lote)

## FLOW-16

**Satisfação e auditoria.** Admin abre `/admin/satisfacao` para comparar notas, acompanhar respostas e registrar follow-up. `/admin/auditoria` reúne trilhas da operação. Cliente responde pelo [encerramento da ocorrência](OPERATIONS.md#flow-10) ou pela [aprovação da entrega](DELIVERY.md#flow-06).

**Atual.** Satisfação consulta respostas, fechamentos, notas, tendências e follow-ups. O indicador combina data de fechamento no denominador e data de resposta no numerador, com teto de 100%. O seletor de empresa deriva das respostas e pode omitir empresa sem nota. Auditoria lista fontes com identidades e ações próprias. [Satisfação](../../src/modules/admin/satisfaction/AdminSatisfactionPage.tsx) · [Auditoria](../../src/modules/admin/audit/AdminAuditPage.tsx) · [Follow-up](../../supabase/migrations/20261011200000_satisfaction_followups.sql)

**Dados e integrações.** Empresa, evento de origem, solicitação, resposta, nota de 1 a 5, comentário, encaminhamento e decisão Admin. Data do evento de origem define a coorte, em Brasília. Solicitação pendente pode ser respondida ou encerrada sem resposta por Admin. Auditoria registra autoria, data e alteração relevante com projeção mínima.

**Alvo.** Encerramento elegível → solicitação aguardando → respondida ou encerrada sem resposta. Cada novo fechamento após reabertura tem solicitação própria. Resposta tardia pertence à solicitação original. `solicitadas = respondidas + aguardando + encerradas sem resposta`. Apenas notas dadas entram na média. Tela e PDF usam a mesma empresa e mês padrão, com opção de histórico completo. [Regras de satisfação](../PRODUCT_RULES.md#ocorrências-histórico-e-satisfação)

**Aceite.** Empresa sem respostas, mês sem dados, virada de mês em Brasília, resposta no mês seguinte, volume superior a uma página e fechamento manual sem resposta. Reabrir e encerrar de novo, verificar duas solicitações e ausência de duplicidade no retry. Comparar totais, notas e recortes na tela e no PDF.

**Lacunas.** Definir destino de solicitação ainda aguardando quando a ocorrência for reaberta. Associar dados legados somente onde o vínculo com o evento de origem for comprovável. Conferir como nova aprovação de entregável corrigido aparece no histórico e na coorte.
