# CALI Workspace · Solicitar Visita Extra — Especificação de Fluxo

> Status: **rascunho para validação da Pati, antes de qualquer código.**
> Pedido dela (28/09/2026): montar o fluxo completo (perfil cliente + perfil admin) antes de mexer em qualquer coisa no código. Este arquivo é essa proposta, sendo revisado em conjunto por Claude e Codex. Nada aqui foi implementado ainda.

## 0. Correção importante antes de tudo (Claude, depois de ver o achado do Codex)

Minha primeira versão deste documento (seções 1–9 abaixo) foi desenhada **como se fosse um recurso novo, do zero**. Não era certo: o Codex conferiu o código e encontrou que **já existe** um fluxo de solicitação de horário/visita em produção — `scheduling_requests` (`src/lib/schedulingRequestsRuntimeV65.ts`, `schedulingPolicyRuntimeV66.ts`/`V67`), acessível hoje pelo cliente em `/cliente/cronograma` e pelo admin em `/admin/calendario`. Ele já cobre: escolha entre reunião virtual e visita presencial, 2 opções de data/horário, contraproposta do admin, ciência de cobrança extra, e confirmação que vira evento na agenda. A tabela `companies` já tem `onsite_visits_included_per_month` (quantas visitas presenciais estão incluídas por mês no contrato) e `scheduling_requests` já tem `billable_extra`/`billing_acknowledged_at`/`billing_notice`.

**Isso muda a recomendação de implementação:** não faz sentido criar um botão e um fluxo paralelo do zero (o que as seções 2–7 abaixo descrevem). O caminho certo é **revisar as regras desse fluxo existente** — copy, política de cobrança, validações de data/horário — para refletir o que a Pati descreveu (seção 3), no lugar das regras antigas que estão lá hoje: o texto atual de "visita presencial adicional" fala em **até 1h30, taxa de deslocamento já incluída no valor, e multa de cancelamento de 20%** — nada disso bate com o que a Pati pediu agora (4h, deslocamento à parte comprovado, sem multa mencionada). Ver seção 10 (Codex) para o levantamento completo dessas diferenças e o plano de correção recomendado.

As seções 1 a 9 abaixo continuam valendo como **especificação das regras de negócio** (o que deve acontecer), só a arquitetura de "onde isso mora no código" muda: em cima do `scheduling_requests` existente, não um sistema novo.

## 1. Contexto

O cliente pode solicitar uma visita presencial extra da Patrícia, fora do que já está previsto no escopo do contrato. Isso precisa virar um fluxo formal na plataforma: pedido → regras e custos deixados claros → aceite formal do cliente → avaliação da Pati → confirmação na agenda → registro da realização e conciliação no faturamento.

Isso é tratado como uma extensão do contrato do cliente, não como um recurso solto: os parâmetros (valor da visita, duração incluída, condições de excedente e despesas) ficam configuráveis por cliente na página de Clientes (admin), junto com o resto do contrato — como já é o caso de `onsite_visits_included_per_month` hoje.

## 2. Gatilho — topbar do cliente

- Botão destacado no topbar da área do cliente: **"Solicitar visita extra"**.
- Abre o mesmo painel de solicitação que já existe (`scheduling_requests`, modo "Visita presencial"), com o texto e as regras de cobrança atualizados — não um componente novo do zero.

## 3. Texto de abertura do pedido (voz da Patrícia, 1ª pessoa)

Copy proposta (ajustável), substituindo o texto de política atual do fluxo existente:

> **Que legal que você quer uma visita presencial minha!**
> Pra fechar isso, só um resumo rápido antes de você escolher a data:
>
> - A solicitação é avaliada por mim em até **48 horas** a partir do envio.
> - A visita extra prevista neste contrato custa **R$ 800,00 por até 4 horas**. Se precisarmos de mais tempo, eu apresento um orçamento separado para sua aprovação antes de continuar.
> - **Não atendo às segundas-feiras** — minha agenda já é fechada nesse dia. Se for algo realmente importante, me conta no campo de observações que eu avalio ajustar.
> - Estacionamento, deslocamento e alimentação necessária, quando aplicáveis, **não estão inclusos** e serão discriminados com seus comprovantes, conforme as condições combinadas.
> - A visita realizada e as despesas aprovadas aparecerão no faturamento conforme o período correspondente ou em documento fiscal próprio.
> - Se a visita for desmarcada sem aviso (ou em cima da hora, sem justificativa), aplico uma **taxa de 20%** sobre o valor da visita. Avisos com antecedência ou motivos justificados (saúde, força maior) são avaliados por mim, sem cobrança.
> - E fica tranquilo(a): esse horário é **100% dedicado a você** — não vou estar atendendo outras contas ou resolvendo outras pendências nesse período.

Na interface, o valor vem do contrato configurado para **cada cliente** (ver seção 6), nunca hardcoded no componente. O texto acima usa os R$ 800,00 do Anexo I da minuta CALI Partner, confirmado tanto por Claude quanto por Codex e **validado pela Pati em 28/09/2026 como valor único para todos os planos** (ver seção 8, item 1) — não é mais um exemplo, é o valor a implementar.

## 4. Formulário

- **Duas opções de data + horário obrigatórias** para visita presencial — o cliente propõe 2 combinações distintas de dia/hora, para dar folga de negociação sem já virar um vai-e-vem. O fluxo existente hoje só exige a opção 1 e deixa a 2 opcional; a opção 2 precisa passar a ser obrigatória especificamente para o modo "visita presencial" (mantém opcional no modo virtual).
- Campo de **observações** (já existe como "objetivo/contexto") — é onde o cliente sinaliza, por exemplo, se quer insistir numa segunda-feira.
- Checkbox de **ciente**: o fluxo existente já tem um checkbox de ciência de cobrança; a Pati pediu que o cliente digite o **nome completo por extenso** para confirmar, não só marque uma caixa. Texto do ciente:
  > "Estou ciente do valor da visita de até 4 horas e de que estacionamento, deslocamento e alimentação necessária, quando aplicáveis e comprovados, serão cobrados à parte. Qualquer visita acima de 4 horas dependerá de novo orçamento e da minha aprovação prévia. Estou ciente de que o cancelamento sem aviso prévio ou justificativa está sujeito a uma taxa de 20% sobre o valor da visita."
- Botão de envio só habilita com as 2 datas válidas preenchidas e o ciente confirmado.

## 5. Validações (client-side + repetidas no backend/RLS, fuso de Brasília)

| Situação | Comportamento |
| --- | --- |
| Data no passado | Bloqueia envio. Alerta: "Opa, essa data já passou! Escolha uma data a partir de {data mínima}." |
| Dentro da janela mínima de antecedência | Bloqueia envio. Alerta: "Preciso de pelo menos 48h pra avaliar — a data mais próxima possível é {data mínima calculada}." **Definido (28/09/2026): 48 horas corridas** contadas do envio do pedido, não "48h úteis"/dias úteis — não precisa cair dentro do horário comercial para contar. |
| Fora do horário comercial | Bloqueia envio. Alerta: "Só faço visitas entre 9h e 16h, de segunda a sexta." O horário de início também precisa garantir que a visita (até 4h) termine até as 16h — ou seja, último início possível às 12h. |
| Sábado ou domingo | Bloqueia envio. Mesmo alerta acima. |
| Segunda-feira | **Não bloqueia** — libera o campo, mas mostra um aviso persistente: "Segundas geralmente não têm visita na minha agenda. Se for importante pra você, conta no campo de observações que eu avalio." A decisão de aceitar fica manual, do lado da Pati — não é uma taxa automática. |

## 6. Configuração por contrato — página de Clientes (admin)

Campos a adicionar/ajustar no cadastro/edição de contrato do cliente:

- **Taxa da visita** (valor fixo, até 4h inclusas) — `visit_flat_fee`. **Definido (28/09/2026): R$ 800,00, valor único para todos os planos** (CALI Partner e CALI Full) — a Pati cogitou um valor diferente (R$ 980,00) para o CALI Full e decidiu não fazer essa diferenciação; fica um default global do produto, não um campo que varia por contrato, a menos que surja uma exceção pontual no futuro.
- **Duração incluída** — 4 horas. Acima disso, registrar **orçamento específico e novo aceite**, sem aplicar automaticamente uma tarifa por hora.
- **Despesas** — estacionamento, deslocamento e alimentação necessária, conforme o Anexo I; modalidade de transporte, comprovação e eventual limite são condições a explicitar antes do aceite. Ver seção 8, item 2 — parte disso está definida, a parte de quilometragem/carro próprio segue em aberto.
- **Taxa de cancelamento/no-show** — 20%, mantida do fluxo existente (ver seção 8, item 5). Precisa aparecer no texto de abertura e no ciente (seções 3 e 4), não é uma regra "de bastidor".
- Hoje não existe campo de "taxa da visita"; o mais próximo é `onsite_visits_included_per_month` (quantidade de visitas inclusas por mês, não um valor de visita extra). O botão "Solicitar visita extra" é estritamente para visitas **além** do que já está incluso no contrato — ver seção 8, item 3, sobre o novo recurso de agenda fixa mensal do CALI Full, que é uma peça separada e ainda não desenhada.
- Os demais parâmetros (janela de 48h, horário 9h–16h, bloqueio de segunda) começam como regra **global da Pati**, não por cliente — não há indicação de que variem de contrato para contrato. Se algum cliente precisar de regra diferente, tratamos como exceção quando aparecer.

Isso é o que a Pati descreveu na abertura da conversa: "vai entrar algumas questões... primeiro eu preciso montar as regras... o correto é a gente deixar isso visível ali na plataforma" — os valores vêm do contrato de cada cliente, não de um texto fixo.

## 7. Fluxo — lado admin (Patrícia)

1. Notificação de nova solicitação de visita extra (o fluxo existente já notifica).
2. Pedido aparece com status **"Aguardando análise"** na lista já existente em `/admin/calendario`.
3. Duas ações possíveis:
   - **Aceitar uma das datas propostas** → vira compromisso confirmado automaticamente na agenda (ambos os lados notificados). Se envolveu segunda-feira, aceitar já resolve a exceção.
   - **Recusar com justificativa** → sugerir **2 novas datas/horários** → envia contraproposta ao cliente.
4. Cliente recebe a contraproposta:
   - Aceita uma das novas datas → confirma, vira compromisso na agenda.
   - Recusa as duas → devolve uma nova sugestão de data para a Pati, reabrindo a avaliação.
5. Em qualquer tela de "não deu match ainda", o tom é leve e tranquilizador, mantendo a identidade da Pati — ex.: "Opa, essa data não encaixou na minha agenda 🙂 Mas vai dar tudo certo, só mais um ajuste!" — nunca um erro seco.
6. Ao confirmar, registrar o valor aceito e a competência prevista, **sem emitir cobrança por uma visita que ainda não ocorreu**. Após a realização, conciliar valor fixo, eventual orçamento adicional aceito e despesas comprovadas (deslocamento/estacionamento/alimentação) no faturamento, segundo a decisão da Pati sobre competência vs. emissão (seção 8, item 5).
7. Se a visita proposta já indicar necessidade de mais de 4h, ou isso ficar claro na hora, não existe cobrança automática — vira **orçamento específico**, alinhado à parte com o cliente antes de qualquer cobrança.
8. **Cancelamento após confirmação:** se o cliente simplesmente não avisa e não aparece, ou cancela em cima da hora sem justificativa, aplica-se a **taxa de 20%** sobre o valor da visita. Se avisar com antecedência (a Pati deu o exemplo de "um dia") ou apresentar um motivo justificado (saúde, força maior), a taxa não se aplica — essa avaliação é **manual, feita pela Pati**, não automática. A mesma lógica vale no sentido inverso, se for a Pati que precisar remarcar por força maior.

## 8. Decisões da Pati (28/09/2026) e o que ainda falta

Ela respondeu por áudio aos 5 bloqueadores anteriores. Registro aqui o que ficou decidido e o que ainda precisa de mais uma rodada.

1. **Valor da visita — RESOLVIDO.** R$ 800,00 por visita de até 4 horas, **valor único para todos os planos** (CALI Partner e CALI Full). Ela cogitou diferenciar o CALI Full em R$ 980,00 e decidiu não fazer isso — fica um único default global (`visit_flat_fee = 800`), não um campo que varia por contrato. Acima de 4h continua sem tarifa automática por hora — vira orçamento específico com aprovação prévia dela, como já estava no contrato.
2. **Comprovação de despesas — parcialmente RESOLVIDO.** Estacionamento e alimentação: comprovação por **nota fiscal**, anexada por ela depois da visita, como uma prestação de contas — confirma a sugestão anterior. **Ainda em aberto:** quilometragem/deslocamento de carro próprio — ela não sabe ainda como quer documentar isso (quanto gastou de km, se declara valor ou usa alguma tabela de R$/km). Fica como pendência técnica: o formulário de despesas precisa de um jeito de registrar isso quando ela definir o modelo (provável R$/km + origem/destino, como o Codex já tinha sugerido na seção 10, item 3).
3. **Visitas inclusas vs. visita extra — RESOLVIDO, com um recurso novo identificado.** O botão "Solicitar visita extra" é estritamente para visitas **além** do que já está incluso no contrato — não mexe na franquia. Mas ela revelou um recurso adicional, ainda **não desenhado**: no CALI Full, a visita mensal inclusa não é avulsa — é uma **agenda fixa recorrente**, definida numa reunião de kickoff (ex.: "todo dia 3 do mês, das 9h às [hora]"), com 1–2 datas fixas possíveis por mês, ajustável na própria plataforma quando a data cai em fim de semana/feriado (ex.: dia 9 cai num domingo → reagenda pra dia 7 ou 10). Isso é uma tela/fluxo **separado** de "Solicitar visita extra" — ela mesma disse que "ainda vai desenhar como vai aparecer para o cliente". **Não faz parte do escopo desta spec** e não deve ser implementado junto; precisa de uma rodada de design própria antes.
4. **"48h" — RESOLVIDO.** Não precisa ser "úteis" — são **48 horas corridas**, contadas do envio do pedido, sem precisar cair dentro do horário comercial. É o prazo que ela tem para avaliar e aceitar/recusar a solicitação.
5. **Cancelamento — RESOLVIDO.** Mantém a **taxa de 20%** sobre o valor da visita em caso de não comparecimento/cancelamento sem aviso. Com aviso prévio (ela deu o exemplo de um dia de antecedência) ou motivo justificado (saúde, força maior), não cobra — avaliação manual, dela, sem automação. A mesma lógica vale ao contrário, se for ela a precisar remarcar. Essa regra **precisa aparecer no app** (copy de abertura + texto do ciente) — ela confirmou isso depois de um momento de dúvida na resposta.
   **Ainda não respondido explicitamente:** timing exato do faturamento (a cobrança entra no ciclo do mês em que a visita ocorre, ou na fatura seguinte?). Vou seguir com a recomendação original — concilia no ciclo em que a visita é realizada — a menos que ela diga o contrário.

Com isso, os 5 bloqueadores originais estão resolvidos (exceto o detalhe de km do item 2 e o timing fino de faturamento do item 5, que ficam como pendências menores, não bloqueadores). **O que segue de fato em aberto antes de codar:**

- Definir o modelo de km/deslocamento de carro próprio (item 2).
- Confirmar o timing de faturamento (item 5, detalhe fino).
- O novo recurso de **agenda fixa mensal do CALI Full** (item 3) precisa de uma spec própria — não é a mesma coisa que "Solicitar visita extra" e não deve ser misturado na implementação.

Fora esses pontos, o fluxo de "Solicitar visita extra" em si (seções 1–7) está fechado o suficiente pra começar a desenhar as telas. Ainda não codei nada — aguardando um sinal explícito dela pra começar a implementação.

## 9. Fora de escopo desta spec

- O bug do degradê do sidebar no modo dia (perfis admin e cliente) foi reportado na mesma mensagem — tratado à parte por Codex, fora deste documento.

## 10. Complemento Codex — conferência da minuta e do fluxo existente (28/09/2026)

**Autoria deste complemento: Codex. Aprovação: pendente.**

**Histórico das fontes:** o PDF anterior `22-CALI-RH-Minuta-de-Prestac-a-o-de-Servic-os-CALI-PARTNER-CONTRATANTE-.pdf` não trazia uma tarifa de visita. A minuta **revisada em Word**, `CALI_RH_Minuta_CALI_PARTNER_KIE-TEC_revisada(1).docx`, recebida depois, traz no Anexo I o valor de **R$ 800,00 por visita de até 4 horas** (item 2.1), despesas aplicáveis à parte (2.2) e orçamento com aprovação prévia para acima de 4 horas (2.3–2.4). A cláusula 5.4 da revisão remete expressamente a essa tabela. Os R$ 350,00/h dos itens 1.1–1.2 referem-se exclusivamente à capacidade remota adicional. O preço por km ainda não está definido.

**Diferenças no agendamento atual:** `/cliente/cronograma` e `/admin/calendario` já usam `scheduling_requests`, duas opções, contraproposta, ciência de cobrança e evento confirmado. O texto atual para adicional presencial menciona **1h30, deslocamento incluído e taxa de cancelamento de 20%**. Essas regras divergem da visita nova e precisam ser substituídas **nesse fluxo**, com migração segura, sem herdar a multa de 20% por engano. A opção 2 deveria ser obrigatória para a visita extra conforme pedido da Pati; a seção 4 hoje permite apenas uma.

**Ajustes recomendados para fechar a regra antes de implementar:**

1. Na aba do contrato do cliente, configurar valor fixo até 4h, regra de orçamento separado acima de 4h, método de deslocamento e eventual limite de alimentação, além de visitas inclusas. Não habilitar pedido adicional com preço ausente. Cada pedido guarda a versão do preço/termos aceitos; alterações futuras não mudam o passado. Mostrar preço, despesas variáveis e ciclo financeiro ao cliente antes de pedir nome completo, checkbox, usuário e data/hora da ciência.
2. Validar datas/horários e autoridade também no servidor, no fuso de Brasília. Segunda-feira é **exceção solicitável**, com indicação própria e análise da Pati, sem tarifa automática. Duração proposta até 4h precisa terminar até 16h (último início às 12h). Se ultrapassar 4h na execução, pedir aceite do excedente antes de cobrá-lo. Cada contraproposta preserva histórico e não reserva agenda. Um evento único nasce somente da confirmação, com verificação de conflito.
3. Deslocamento: Uber/táxi com recibo; para veículo próprio, combinar **R$/km, origem, destino, rota/distância documentada e eventual teto** antes da ciência, ou desabilitar essa modalidade até definição. Alimentação por nota fiscal, conforme limites acordados. Anexar comprovantes e discriminar despesas posteriormente.
4. Registrar o valor fixo e a competência no pedido confirmado, mas **não afirmar que a fatura já foi emitida** nem cobrar serviço só por solicitar. Após realização, registrar horas efetivas, eventual orçamento adicional aceito e despesas comprovadas e então conciliar com o financeiro. O item 3.2 do Anexo I admite cobrança com o período correspondente ou em documento fiscal próprio; a Pati ainda precisa definir como isso aparecerá no calendário de faturas do app.
5. Especificar se "48 horas úteis" significa **dois dias úteis** ou 48 horas corridas dentro do expediente (mais de uma semana); são regras muito diferentes. Decidir também política de cancelamento após confirmação. Não transportar automaticamente os 20% atuais nem converter a tarifa remota em hora presencial.

**Estados propostos:** Aguardando análise → Confirmada; ou Aguardando cliente após justificativa e duas novas opções → Confirmada ou Aguardando análise com duas contrapropostas do cliente; Encerrada com motivo; Realizada após registro. Cliente e admin veem o mesmo status e recebem notificação após cada transição confirmada. A agenda e o lançamento financeiro precisam ser idempotentes para não duplicar eventos nem cobrança. Visita extra deve ser separada da franquia de encontros e das horas mensais, salvo regra contratual expressa.

## Complemento de UX — 29/09/2026 (Codex)

- Pedido do cliente em três etapas: condições; empresa/endereço e duas datas; ciência. Em fundo bordô, textos e ícones devem ser claros. Em superfícies claras, textos e ícones escuros; repetir o contraste no modo noite. A regra vale para qualquer nova tela, botão, número, ícone e ilustração, no perfil cliente e administrativo.
- Segunda-feira é possível somente com justificativa escrita e avaliação manual, sem taxa adicional. As visitas de até quatro horas começam de 9h a 12h para terminar até 16h. O cliente pode anexar um PDF ou imagem de até 10 MB ao pedido.
- No calendário administrativo, a ação de solicitações mostra uma solicitação por vez, com logo da empresa, solicitante, status, duas opções de data, anexo e endereço clicável. Confirmação e contraproposta reutilizam a lógica existente.
- A prestação de contas permite linhas de deslocamento, estacionamento, alimentação e horas adicionais, cada uma com valor, observação e comprovante opcional. Horas adicionais exigem quantidade e registro do orçamento aprovado; não calcular preço automaticamente. Cada linha recebe protocolo CALI-DESP e auditoria. No relatório executivo do mês/trimestre, visitas concluídas e linhas da competência aparecem como registros para conciliação; não há emissão automática de fatura.
- **Pendente para desenho com a Pati:** FAQ contextual por pacote (CALI Partner, Full, Build e demais). Definir respostas técnicas, limites de escopo e onde o botão de ajuda aparecerá, sem inventar respostas neste ciclo.
- **Ainda em aberto:** R$/km para carro próprio; faturamento formal e fluxo de aprovação de orçamento de horas extras. A anotação do orçamento aprovado no registro não substitui um aceite contratual separado.
