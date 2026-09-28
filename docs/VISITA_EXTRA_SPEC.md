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
> - A solicitação é avaliada por mim com **pelo menos 48h úteis de antecedência** dos dias e horário propostos.
> - A visita extra prevista neste contrato custa **R$ 800,00 por até 4 horas**. Se precisarmos de mais tempo, eu apresento um orçamento separado para sua aprovação antes de continuar.
> - **Não atendo às segundas-feiras** — minha agenda já é fechada nesse dia. Se for algo realmente importante, me conta no campo de observações que eu avalio ajustar.
> - Estacionamento, deslocamento e alimentação necessária, quando aplicáveis, **não estão inclusos** e serão discriminados com seus comprovantes, conforme as condições combinadas.
> - A visita realizada e as despesas aprovadas aparecerão no faturamento conforme o período correspondente ou em documento fiscal próprio.
> - E fica tranquilo(a): esse horário é **100% dedicado a você** — não vou estar atendendo outras contas ou resolvendo outras pendências nesse período.

Na interface, o valor vem do contrato configurado para **cada cliente** (ver seção 6), nunca hardcoded no componente. O texto acima usa os R$ 800,00 do Anexo I da minuta CALI Partner (confirmado tanto por Claude quanto por Codex — ver seção 8, item 1) apenas como exemplo concreto.

## 4. Formulário

- **Duas opções de data + horário obrigatórias** para visita presencial — o cliente propõe 2 combinações distintas de dia/hora, para dar folga de negociação sem já virar um vai-e-vem. O fluxo existente hoje só exige a opção 1 e deixa a 2 opcional; a opção 2 precisa passar a ser obrigatória especificamente para o modo "visita presencial" (mantém opcional no modo virtual).
- Campo de **observações** (já existe como "objetivo/contexto") — é onde o cliente sinaliza, por exemplo, se quer insistir numa segunda-feira.
- Checkbox de **ciente**: o fluxo existente já tem um checkbox de ciência de cobrança; a Pati pediu que o cliente digite o **nome completo por extenso** para confirmar, não só marque uma caixa. Texto do ciente:
  > "Estou ciente do valor da visita de até 4 horas e de que estacionamento, deslocamento e alimentação necessária, quando aplicáveis e comprovados, serão cobrados à parte. Qualquer visita acima de 4 horas dependerá de novo orçamento e da minha aprovação prévia."
- Botão de envio só habilita com as 2 datas válidas preenchidas e o ciente confirmado.

## 5. Validações (client-side + repetidas no backend/RLS, fuso de Brasília)

| Situação | Comportamento |
| --- | --- |
| Data no passado | Bloqueia envio. Alerta: "Opa, essa data já passou! Escolha uma data a partir de {data mínima}." |
| Dentro da janela mínima de antecedência | Bloqueia envio. Alerta: "Preciso de pelo menos 48h úteis pra avaliar — a data mais próxima possível é {data mínima calculada}." — ver seção 8, item 4: "48h úteis" precisa ser definido com precisão (2 dias úteis corridos vs. 48h dentro do expediente) antes de implementar. |
| Fora do horário comercial | Bloqueia envio. Alerta: "Só faço visitas entre 9h e 16h, de segunda a sexta." O horário de início também precisa garantir que a visita (até 4h) termine até as 16h — ou seja, último início possível às 12h. |
| Sábado ou domingo | Bloqueia envio. Mesmo alerta acima. |
| Segunda-feira | **Não bloqueia** — libera o campo, mas mostra um aviso persistente: "Segundas geralmente não têm visita na minha agenda. Se for importante pra você, conta no campo de observações que eu avalio." A decisão de aceitar fica manual, do lado da Pati — não é uma taxa automática. |

## 6. Configuração por contrato — página de Clientes (admin)

Campos a adicionar/ajustar no cadastro/edição de contrato do cliente:

- **Taxa da visita** (valor fixo, até 4h inclusas) — `visit_flat_fee`. Default sugerido para CALI Partner: R$ 800,00 (Anexo I, item 2.1 da minuta) — ver seção 8, item 1, sobre confirmar se é o valor-padrão do produto ou específico de um contrato.
- **Duração incluída** — 4 horas. Acima disso, registrar **orçamento específico e novo aceite**, sem aplicar automaticamente uma tarifa por hora.
- **Despesas** — estacionamento, deslocamento e alimentação necessária, conforme o Anexo I; modalidade de transporte, comprovação e eventual limite são condições a explicitar antes do aceite.
- Hoje não existe campo de "taxa da visita"; o mais próximo é `onsite_visits_included_per_month` (quantidade de visitas inclusas por mês, não um valor de visita extra). Ver seção 8, item 3, sobre como os dois modelos se conciliam.
- Os demais parâmetros (janela de 48h úteis, horário 9h–16h, bloqueio de segunda) começam como regra **global da Pati**, não por cliente — não há indicação de que variem de contrato para contrato. Se algum cliente precisar de regra diferente, tratamos como exceção quando aparecer.

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

## 8. Em aberto — bloqueadores reais (preciso de você aqui, Pati)

1. **Valor da visita — resolvido entre Claude e Codex, falta sua confirmação final.** O Anexo I da minuta CALI Partner (item 2.1) prevê **R$ 800,00 por visita de até 4 horas**; despesas de estacionamento, deslocamento e alimentação necessária ficam à parte, comprovadas (item 2.2); acima de 4h não há tarifa por hora tabelada — vira orçamento específico com sua aprovação prévia (itens 2.3–2.4). Os R$ 350,00/h que também aparecem na minuta (itens 1.1–1.2) são de **capacidade remota adicional**, não de visita presencial — não valem aqui. (Histórico: o primeiro arquivo que o Codex conferiu era um PDF-modelo genérico sem esses valores; a minuta Word que você anexou, específica do contrato CALI Partner, tem os valores acima — os dois já convergiram na mesma leitura.)
   Falta confirmar: **esse R$ 800,00/4h é o valor-padrão a usar como default do sistema para todo CALI Partner, ou é específico de um contrato e cada cliente pode ter um valor diferente?**
   Sobre a regra em si: você descreveu de viva voz que passar de 4h gera cobrança automática "por hora" — o contrato diz o contrário (orçamento específico, sem tarifa automática). Recomendamos seguir o texto do contrato; se você realmente quiser uma tarifa automática por hora extra, isso precisa entrar no modelo de contrato também, não só na plataforma.
2. **Comprovação do seu próprio deslocamento/estacionamento/alimentação** — você mesma colocou em aberto ("não sei como a gente pode fazer isso no caso"). Sugestão, pra você validar: você anexa o comprovante (nota fiscal/recibo) manualmente depois da visita, e o valor entra como um lançamento avulso no faturamento do ciclo — sem fluxo automático de "solicitação" nesse caso, porque é custo seu, não do cliente. Confirma se é assim ou se você tem outra ideia?
3. **Modelo de "visitas inclusas" vs. "toda visita extra é paga"** — o sistema já tem `onsite_visits_included_per_month` (N visitas grátis por mês, configurável por cliente). Isso continua valendo, com a visita N+1 virando a "visita extra" paga de R$ 800,00? Ou esse contador deixa de existir e toda visita fora do cronograma ordinário é sempre paga? Preciso que você decida isso antes da gente desenhar a tela de configuração do contrato.
4. **"48h úteis"** — significam 2 dias úteis corridos (ex.: pedido numa quarta à tarde libera a partir de sexta) ou 48 horas somadas só dentro do horário comercial (o que pode passar de uma semana de calendário)? São regras bem diferentes na prática.
5. **Faturamento e cancelamento** — a cobrança da visita e das despesas aparece no ciclo do período em que a visita é realizada, ou na fatura seguinte? E: o texto atual do fluxo existente tem uma multa de 20% não reembolsável em caso de cancelamento após confirmação — você quer manter alguma multa pra visita extra, ou isso não deve ser herdado nas novas regras? Não vamos trazer o 20% para a nova regra sem confirmação sua.

Fora esses pontos, o fluxo acima está fechado o suficiente pra começar a desenhar as telas assim que você validar. Não vamos tocar em código antes disso.

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
