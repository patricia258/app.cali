# Admin · Propostas, relatórios e satisfação

## FLOW-03

**Propostas e portal.** Admin abre `/admin/propostas`, o editor por `submissionId` e a prévia por `proposalId`. Partner atribuído prepara material. O destinatário responde pelos formulários e links do portal.

**Atual.** Resposta do portal → triagem Admin → edição → aprovação interna → envio. Partner atribuído submete para revisão. A oportunidade mantém seu próprio estado. Envio e reenvio exigem duas confirmações, a versão da prévia e o contato gravado no briefing. O primeiro envio pode arquivar o PDF selecionado. As próximas entregas usam o PDF oficial quando existe. [Lista Admin](../../src/modules/admin/proposals/AdminProposalsPageV2.tsx) · [Prévia arquivada](../../src/modules/admin/proposals/AdminProposalPreviewPageV3.tsx) · [Edge de envio](../../supabase/functions/portal-send-proposal/index.ts)

**Dados e integrações.** ID e protocolo da resposta, oportunidade, versão da proposta, valores, destinatário, PDF e recibo de envio. O portal continua recebendo respostas. A fila Admin reúne vínculos e histórico, inclusive respostas antigas.

**Alvo.** Rascunho Partner → submissão atribuída → Patrícia devolve ou aprova. Rascunho da Patrícia segue para envio direto. Antes de enviar ou reenviar, pedir “Deseja enviar?” e “Tem certeza?”. O servidor fixa destinatário autorizado e revisão aprovada. Cancelamento em qualquer etapa não produz envio. Após confirmação, registrar entrega real e resultado. Aceite ou recusa externa atualiza a oportunidade preservando a revisão enviada. [Regras de materiais](../PRODUCT_RULES.md#materiais-propostas-e-avisos) · [Envio de relatório e recibos](#flow-12)

**Aceite.** Abrir resposta antiga e nova, conferir proposta/PDF e seguir o vínculo de retorno. Negar Partner fora do escopo. Exercitar devolução, as duas confirmações e o cancelamento em cada uma. Simular timeout e repetir a mesma operação sem entrega adicional. Conferir caixa de teste, destinatário e revisão corretos no envio e no reenvio deliberado.

**Evidência e lacunas.** Playwright cobriu o cancelamento em cada confirmação e o reenvio do PDF oficial. Edge, PostgreSQL e Mailpit locais rejeitaram versão obsoleta, destinatário divergente e revisão Partner pendente. Repetir a operação conservou o recibo. Reconciliar origem, IDs e registros antigos do portal no destino e verificar a caixa de teste. Propostas legadas sem PDF arquivado exigem anexar o PDF da versão confirmada. [Smoke comercial](../../tests/contracts/commercial-http.mjs)

## FLOW-12

**Relatório mensal, revisão e PDF.** Admin opera `/admin/relatorios`. Cliente lê `/cliente/relatorios` e a impressão autorizada. Partner prepara relatórios atribuídos em `/equipe/relatorios`.

**Atual.** Geração e curadoria CALI → revisão → aprovação → liberação → leitura e ciência Cliente. Admin pode retirar a versão, registrar o motivo, corrigir e decidir se pede nova ciência. Após duas confirmações, a Edge valida a revisão e os endereços ativos da empresa, reserva recibo, envia link para a revisão e registra a confirmação do provedor. [Editor Admin](../../src/modules/admin/reports/AdminReportsPageV17.tsx) · [Relatórios Cliente](../../src/modules/client/reports/ClientReportsPageV5.tsx) · [Revisão e nova ciência](../../supabase/migrations/20261112152300_revise_delivered_reports.sql) · [Recibos](../../supabase/migrations/20261112152000_material_delivery_receipts.sql)

**Dados e integrações.** Empresa, ciclo, entregáveis, horas, reuniões, decisões, avaliações e demais fatos da operação compõem o snapshot. Patrícia acrescenta síntese, riscos e próximos passos. Revisão aprovada vincula PDF privado, foto, assinatura e protocolo `CALI-TIPO-AAAA-NNNNNN`. Geração, aprovação, liberação, envio e ciência têm eventos próprios.

**Alvo.** Rascunho Partner → revisão pela Patrícia → devolução ou aprovação → liberação. Autoria da Patrícia permite envio direto. Em envio e reenvio, solicitar “Deseja enviar?” e depois “Tem certeza?”. Entregar por e-mail a revisão confirmada ao Cliente autorizado. Recibo e chave da operação distinguem nova tentativa de reenvio deliberado. Na correção, Admin registra motivo, preserva histórico e retira a revisão da visão Cliente durante o trabalho. Após reliberação, nova ciência só quando solicitada. O mesmo contrato de entrega se aplica a [Propostas](#flow-03) e [Mapa](PUBLIC.md#flow-17c). [Regras de relatório e materiais](../PRODUCT_RULES.md#relatório-mensal)

**Aceite.** Cobrir devolução e aprovação, acesso direto à impressão, ocultação de revisão em correção e reliberação com e sem nova ciência. Conferir A4, foto, assinatura, protocolo, PDF legado e bytes autorizados. Cancelar as duas etapas de confirmação, testar perda de resposta depois do envio e repetir. Conferir caixa de teste e recibo nas três modalidades.

**Evidência e lacunas.** Edge e Mailpit locais confirmaram o envio e o recibo estável na repetição. Versão obsoleta, destinatário de outra empresa e revisão Partner pendente foram recusados. Confirmar assinatura, foto e PDF legado com amostras autorizadas e testar o recebimento externo na caixa de teste. [Smoke comercial](../../tests/contracts/commercial-http.mjs)

## FLOW-16

**Satisfação e auditoria.** Admin abre `/admin/satisfacao` para comparar notas, acompanhar respostas e registrar follow-up. `/admin/auditoria` reúne trilhas da operação. Cliente responde pelo [encerramento da ocorrência](OPERATIONS.md#flow-10) ou pela [aprovação da entrega](DELIVERY.md#flow-06).

**Atual.** Satisfação consulta respostas, solicitações de cada fechamento, tendências e follow-ups. As contagens e a taxa usam o mesmo conjunto de encerramentos. A média usa apenas notas recebidas. O seletor inclui empresas com solicitações sem resposta. A impressão/PDF usa o recorte da tela. Auditoria lista as ações por origem. [Satisfação](../../src/modules/admin/satisfaction/AdminSatisfactionPage.tsx) · [Auditoria](../../src/modules/admin/audit/AdminAuditPage.tsx) · [Coorte](../../supabase/migrations/20261112133000_record_closure_feedback.sql)

**Dados e integrações.** Empresa, evento de origem, solicitação, resposta, nota de 1 a 5, comentário, encaminhamento e decisão Admin. Data do evento de origem define a coorte, em Brasília. Solicitação pendente pode ser respondida ou encerrada sem resposta por Admin. Auditoria registra autoria, data e alteração relevante com projeção mínima.

**Alvo.** Encerramento elegível → solicitação aguardando → respondida ou encerrada sem resposta. Cada novo fechamento após reabertura tem solicitação própria. Resposta tardia pertence à solicitação original. `solicitadas = respondidas + aguardando + encerradas sem resposta`. Apenas notas dadas entram na média. Tela e PDF usam a mesma empresa e mês padrão, com opção de histórico completo. [Regras de satisfação](../PRODUCT_RULES.md#ocorrências-histórico-e-satisfação)

**Aceite.** Empresa sem respostas, mês sem dados, virada de mês em Brasília, resposta no mês seguinte, volume superior a uma página e fechamento manual sem resposta. Reabrir e encerrar de novo, verificar duas solicitações e ausência de duplicidade no retry. Comparar totais, notas e recortes na tela e no PDF.

**Evidência e lacunas.** O ensaio local cobre encerramentos independentes, resposta tardia na coorte original e encerramento manual da espera. Reabertura encerra a espera ativa do evento anterior no painel e preserva o vínculo de eventual resposta tardia. Conferir em amostra legada os vínculos reconstruídos e a consistência entre tela e PDF da mesma coorte.
