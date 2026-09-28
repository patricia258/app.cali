# CALI Workspace · Solicitar Visita Extra — Especificação de Fluxo

> Status: **rascunho para validação da Pati, antes de qualquer código.**
> Pedido dela (28/09/2026): montar o fluxo completo (perfil cliente + perfil admin) antes de mexer em qualquer coisa no código. Este arquivo é essa proposta, sendo revisado em conjunto por Claude e Codex. Nada aqui foi implementado ainda.

## 0. Correção importante antes de tudo (Claude, depois de ver o achado do Codex)

Minha primeira versão deste documento (seções 1–9 abaixo) foi desenhada **como se fosse um recurso novo, do zero**. Não era certo: o Codex conferiu o código e encontrou que **já existe** um fluxo de solicitação de horário/visita em produção — `scheduling_requests` (`src/lib/schedulingRequestsRuntimeV65.ts`, `schedulingPolicyRuntimeV66.ts`/`V67`), acessível hoje pelo cliente em `/cliente/cronograma` e pelo admin em `/admin/calendario`. Ele já cobre: escolha entre reunião virtual e visita presencial, 2 opções de data/horário, contraproposta do admin, ciência de cobrança extra, e confirmação que vira evento na agenda. A tabela `companies` já tem `onsite_visits_included_per_month` (quantas visitas presenciais estão incluídas por mês no contrato) e `scheduling_requests` já tem `billable_extra`/`billing_acknowledged_at`/`billing_notice`.

**Isso muda a recomendação de implementação:** não faz sentido criar um botão e um fluxo paralelo do zero (o que as seções 2–7 abaixo descrevem). O caminho certo é **revisar as regras desse fluxo existente** — copy, política de cobrança, validações de data/horário — para refletir o que a Pati descreveu (seção 3), no lugar das regras antigas que estão lá hoje: o texto atual de "visita presencial adicional" fala em **até 1h30, taxa de deslocamento já incluída no valor, e multa de cancelamento de 20%** — nada disso bate com o que a Pati pediu agora (4h, deslocamento à parte comprovado, sem multa mencionada). Ver seção 10 (Codex) para o levantamento completo dessas diferenças e o plano de correção recomendado.

As seções 1 a 9 abaixo continuam valendo como **especificação das regras de negócio** (o que deve acontecer), só a arquitetura de "onde isso mora no código" muda: em cima do `scheduling_requests` existente, não um sistema novo.

## 1. Contexto

O cliente pode solicitar uma visita presencial extra da Patrícia, fora do que já está previsto no escopo do contrato. Isso precisa virar um fluxo formal na plataforma: pedido → regras e custos deixados claros → aceite formal do cliente → avaliação da Pati → confirmação na agenda → reflexo no faturamento do ciclo correspondente.

Isso é tratado como uma extensão do contrato do cliente, não como um recurso solto: os parâmetros (valor da visita, horas inclusas) ficam configuráveis por cliente na página de Clientes (admin), junto com o resto do contrato — como já é o caso de `onsite_visits_included_per_month` hoje.

## 2. Gatilho — topbar do cliente

- Botão destacado no topbar da área do cliente: **"Solicitar visita extra"**.
- Abre o mesmo painel de solicitação que já existe (`scheduling_requests`, modo "Visita presencial"), com o texto e as regras de cobrança atualizados — não um componente novo do zero.

## 3. Texto de abertura do pedido (voz da Patrícia, 1ª pessoa)

Copy proposta (ajustável), substituindo o texto de política atual do fluxo existente:

> **Que legal que você quer uma visita presencial minha!**
> Pra fechar isso, só um resumo rápido antes de você escolher a data:
>
> - A solicitação é avaliada por mim com **pelo menos 48h úteis de antecedência** dos dias e horário propostos.
> - A visita tem **até 4 horas** inclusas na taxa de {valor_visita}. Passando disso, entro em contato pra alinhar um orçamento específico antes de qualquer coisa — nada é cobrado sem a gente combinar antes.
> - **Não atendo às segundas-feiras** — minha agenda já é fechada nesse dia. Se for algo realmente importante, me conta no campo de observações que eu avalio ajustar.
> - Deslocamento, estacionamento e alimentação **não estão inclusos** no valor da visita e são cobrados à parte, sempre com comprovante.
> - Tudo isso entra no faturamento do ciclo correspondente à visita.
> - E fica tranquilo(a): esse horário é **100% dedicado a você** — não vou estar atendendo outras contas ou resolvendo outras pendências nesse período.

O valor entre `{}` vem do contrato configurado do cliente (ver seção 6) — ver seção 8/10 sobre por que ainda não tenho um valor confirmado pra usar como default.

## 4. Formulário

- **Duas opções de data + horário obrigatórias** para visita presencial (o fluxo existente hoje só exige a opção 1; a opção 2 precisa passar a ser obrigatória especificamente para este modo, mantendo opcional no modo virtual).
- Campo de **observações** (já existe como "objetivo/contexto") — é onde o cliente sinaliza, por exemplo, se quer insistir numa segunda-feira.
- Confirmação de **ciente**: o fluxo existente já tem um checkbox de ciência de cobrança; a Pati pediu que o cliente digite o **nome completo por extenso** para confirmar, não só marque uma caixa. Texto do ciente:
  > "Declaro que estou ciente dos valores acima, incluindo eventuais custos adicionais de deslocamento e alimentação, que serão lançados no faturamento do ciclo desta visita."
- Botão de envio só habilita com as 2 datas válidas preenchidas e o ciente confirmado.

## 5. Validações (client-side + repetidas no backend/RLS, fuso de Brasília)

| Situação | Comportamento |
| --- | --- |
| Data no passado | Bloqueia envio. Alerta: "Opa, essa data já passou! Escolha uma data a partir de {data mínima}." |
| Dentro da janela mínima de antecedência | Bloqueia envio. Alerta: "Preciso de pelo menos 48h úteis pra avaliar — a data mais próxima possível é {data mínima calculada}." — ver seção 10, item 5: "48h úteis" precisa ser definido com precisão (2 dias úteis corridos vs. 48h dentro do expediente) antes de implementar. |
| Fora do horário comercial | Bloqueia envio. Alerta: "Só faço visitas entre 9h e 16h, de segunda a sexta." O horário de início também precisa garantir que a visita (até 4h) termine até as 16h — ou seja, último início possível às 12h. |
| Sábado ou domingo | Bloqueia envio. Mesmo alerta acima. |
| Segunda-feira | **Não bloqueia** — libera o campo, mas mostra um aviso persistente: "Segundas geralmente não têm visita na minha agenda. Se for importante pra você, conta no campo de observações que eu avalio." A decisão de aceitar fica manual, do lado da Pati — não é uma taxa automática. |

## 6. Configuração por contrato — página de Clientes (admin)

Campos a adicionar/ajustar no cadastro/edição de contrato do cliente:

- **Taxa da visita** (valor fixo, até 4h inclusas) — hoje não existe esse campo; o mais próximo é `onsite_visits_included_per_month` (quantidade de visitas inclusas, não valor da visita extra). Precisamos decidir se o modelo é "N visitas grátis por mês, R$ fixo a partir da N+1" (o que já existe hoje) ou "toda visita fora do escopo ordinário custa R$ fixo", como a minuta (Anexo I) sugere. Ver seção 10, item 1.
- Não existe (e não deveria existir) campo de "valor da hora adicional" — acima de 4h não tem tarifa automática, vai para orçamento específico (seção 3).
- Os demais parâmetros (janela mínima de antecedência, horário comercial, bloqueio de segunda) começam como regra **global da Pati**, não por cliente.

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
6. Ao confirmar, registrar o valor aceito e a competência prevista, **sem emitir cobrança por uma visita que ainda não ocorreu**. Após a realização, conciliar valor fixo, eventual excedente aceito e despesas comprovadas (deslocamento/estacionamento/alimentação) no faturamento do ciclo, segundo a decisão da Pati sobre competência vs. emissão (seção 10, item 4).
7. Se a visita proposta já indicar necessidade de mais de 4h, ou isso ficar claro na hora, não existe cobrança automática — vira **orçamento específico**, alinhado à parte com o cliente antes de qualquer cobrança.

## 8. Em aberto — bloqueadores reais (preciso de você aqui, Pati)

1. **Valor da visita: duas fontes, dois resultados diferentes — preciso que você esclareça.** Você anexou `CALI_RH_Minuta_CALI_PARTNER_KIE-TEC_revisada.docx`, e nela o Anexo I (cláusula 2.1) traz um valor explícito: **R$ 800,00 por visita de até 4 horas**, mais estacionamento/deslocamento/alimentação à parte (cláusula 2.2), e visitas acima de 4h viram orçamento específico (cláusula 2.3), nunca cobrado sem alinhamento prévio (cláusula 2.4). O Codex conferiu um arquivo diferente, `22-CALI-RH-Minuta-de-Prestacao-de-Servicos-CALI-PARTNER-CONTRATANTE.pdf` — aparentemente o **modelo genérico** (contratante ainda como "[●]") — e esse **não tem esses valores no Anexo I**, só menciona mensalidade (R$ 3.910,00) e ativação (R$ 782,00), que não são preço de visita.
   Minha leitura: o arquivo que você me mandou (`KIE-TEC`) parece ser a minuta **já preenchida para um cliente específico**, com valores que podem ter sido negociados para aquele contrato — não necessariamente o valor-padrão do produto CALI Partner. Preciso que você confirme: **R$ 800,00/4h é o valor padrão do CALI Partner (e o modelo genérico só está desatualizado), ou foi um valor específico daquele cliente?** Isso decide se uso R$ 800 como default do sistema ou se preciso de um valor-padrão diferente, definido por você.
   Sobre a regra de cobrança em si (contrato manda, não a fala): você descreveu de viva voz que passar de 4h gera cobrança automática "por hora". A minuta KIE-TEC diz o contrário — acima de 4h não tem tarifa por hora, vira orçamento específico com aprovação prévia. Recomendo seguir o texto do contrato (sem tarifa automática); se você quiser mesmo uma tarifa automática por hora extra, isso precisa entrar no modelo de contrato também, não só na plataforma.
2. **Comprovação do seu próprio deslocamento/estacionamento/alimentação** — você mesma colocou em aberto ("não sei como a gente pode fazer isso no caso"). Minha sugestão, pra você validar: você anexa o comprovante (nota fiscal/recibo) manualmente depois da visita, e o valor entra como um lançamento avulso no faturamento do ciclo — sem fluxo automático de "solicitação" nesse caso, porque é custo seu, não do cliente. Confirma se é assim ou se você tem outra ideia?
3. **Modelo de "visitas inclusas" vs. "toda visita extra é paga"** (novo, a partir do achado do Codex) — o sistema já tem `onsite_visits_included_per_month` (N visitas grátis por mês, configurável por cliente). Isso continua valendo, com a visita N+1 virando a "visita extra" paga do valor de {valor_visita}? Ou esse contador deixa de existir e toda visita fora do cronograma ordinário é sempre paga? Preciso que você decida isso antes da gente desenhar a tela de configuração do contrato.
4. **"48h úteis"** — significam 2 dias úteis corridos (ex.: pedido numa quarta à tarde libera a partir de sexta) ou 48 horas somadas só dentro do horário comercial (o que pode passar de uma semana de calendário)? São regras bem diferentes na prática.
5. **Política de cancelamento após confirmação** — o texto atual do fluxo existente tem uma multa de 20% não reembolsável. Você quer manter alguma multa de cancelamento pra visita extra, ou isso não deve ser herdado nas novas regras? Não vou trazer o 20% para a nova regra sem confirmação sua.

Fora esses pontos, o fluxo acima está fechado o suficiente pra começar a desenhar as telas assim que você validar. Não vamos tocar em código antes disso.

## 9. Fora de escopo desta spec

- O bug do degradê do sidebar no modo dia (perfis admin e cliente) foi reportado na mesma mensagem — tratado à parte por Codex, fora deste documento.

## 10. Complemento Codex — conferência da minuta e do fluxo existente (28/09/2026)

**Autoria deste complemento: Codex. Aprovação: pendente.**

**Minuta anexada:** `22-CALI-RH-Minuta-de-Prestac-a-o-de-Servic-os-CALI-PARTNER-CONTRATANTE-.pdf` foi conferida. A cláusula 5.4 prevê orçamento específico para visita, horas adicionais e deslocamento; 5.2 evita execução/cobrança extra automática sem alinhamento; 5.5 prevê aceite eletrônico inequívoco; 8.1, VI exclui visita não prevista. Os R$ 3.910,00 da mensalidade e R$ 782,00 da ativação **não são preço de visita**. A minuta não informa taxa para 4h, hora excedente ou km. (Ver seção 8, item 1, para a reconciliação com a minuta KIE-TEC que o Claude conferiu, que tem esses valores.)

**Diferenças no agendamento atual:** `/cliente/cronograma` e `/admin/calendario` já usam `scheduling_requests`, duas opções, contraproposta, ciência de cobrança e evento confirmado. O texto atual para adicional presencial menciona **1h30, deslocamento incluído e taxa de cancelamento de 20%**. Essas regras divergem da visita nova e precisam ser substituídas **nesse fluxo**, com migração segura, sem herdar a multa de 20% por engano. A opção 2 deveria ser obrigatória para a visita extra conforme pedido da Pati; a seção 4 hoje permite apenas uma.

**Ajustes recomendados para fechar a regra antes de implementar:**

1. Na aba do contrato do cliente, configurar valor fixo até 4h, preço e fração da hora adicional (se houver), método de deslocamento e eventual limite de alimentação, além de visitas inclusas. Não habilitar pedido adicional com preço ausente. Cada pedido guarda a versão do preço/termos aceitos; alterações futuras não mudam o passado. Mostrar preço, despesas variáveis e ciclo financeiro ao cliente antes de pedir nome completo, checkbox, usuário e data/hora da ciência.
2. Validar datas/horários e autoridade também no servidor, no fuso de Brasília. Segunda-feira é **exceção solicitável**, com indicação própria e análise da Pati, sem tarifa automática. Duração proposta até 4h precisa terminar até 16h (último início às 12h). Se ultrapassar 4h na execução, pedir aceite do excedente antes de cobrá-lo. Cada contraproposta preserva histórico e não reserva agenda. Um evento único nasce somente da confirmação, com verificação de conflito.
3. Deslocamento: Uber/táxi com recibo; para veículo próprio, combinar **R$/km, origem, destino, rota/distância documentada e eventual teto** antes da ciência, ou desabilitar essa modalidade até definição. Alimentação por nota fiscal, conforme limites acordados. Anexar comprovantes e discriminar despesas posteriormente.
4. Registrar o valor fixo e a competência no pedido confirmado, mas **não afirmar que a fatura já foi emitida** nem cobrar serviço só por solicitar. Após realização, registrar horas efetivas, excedente aceito e despesas comprovadas e então conciliar com o financeiro. A frase "fatura do mês de uso" precisa distinguir competência e emissão: recomendação é competência no mês da visita e emissão no ciclo seguinte, sujeita à decisão da Pati.
5. Especificar se "48 horas úteis" significa **dois dias úteis** ou 48 horas corridas dentro do expediente (mais de uma semana); são regras muito diferentes. Decidir também política de cancelamento após confirmação e arredondamento do excedente. Não transportar automaticamente os 20% atuais.

**Estados propostos:** Aguardando análise → Confirmada; ou Aguardando cliente após justificativa e duas novas opções → Confirmada ou Aguardando análise com duas contrapropostas do cliente; Encerrada com motivo; Realizada após registro. Cliente e admin veem o mesmo status e recebem notificação após cada transição confirmada. A agenda e o lançamento financeiro precisam ser idempotentes para não duplicar eventos nem cobrança. Visita extra deve ser separada da franquia de encontros e das horas mensais, salvo regra contratual expressa.
