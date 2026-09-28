# CALI Workspace · Solicitar Visita Extra — Especificação de Fluxo

> Status: **rascunho para validação da Pati, antes de qualquer código.**
> Pedido dela (28/09/2026): montar o fluxo completo (perfil cliente + perfil admin) antes de mexer em qualquer coisa no código. Este arquivo é essa proposta. Nada aqui foi implementado ainda.

## 1. Contexto

O cliente pode solicitar uma visita presencial extra da Patrícia, fora do que já está previsto no escopo do contrato. Isso precisa virar um fluxo formal na plataforma: pedido → regras e custos deixados claros → aceite formal do cliente → avaliação da Pati → confirmação na agenda → reflexo automático na fatura do mês de uso.

Isso é tratado como uma extensão do contrato do cliente, não como um recurso solto: os parâmetros (valor da visita, horas inclusas, valor da hora extra) ficam configuráveis por cliente na página de Clientes (admin), junto com o resto do contrato.

## 2. Gatilho — topbar do cliente

- Botão destacado no topbar da área do cliente: **"Solicitar visita extra"**.
- Abre um painel/modal de solicitação (mesmo padrão visual do "Fale com a Pati", mas com formulário próprio).

## 3. Texto de abertura do pedido (voz da Patrícia, 1ª pessoa)

Aparece no topo do painel, antes do formulário. Copy proposta (ajustável):

> **Que legal que você quer uma visita presencial minha!**
> Pra fechar isso, só um resumo rápido antes de você escolher a data:
>
> - A solicitação é avaliada por mim com **pelo menos 48h úteis de antecedência** dos dias e horário propostos.
> - A visita tem **até 4 horas** inclusas na taxa de {valor_visita}. Passando disso, é cobrado adicional por hora ({valor_hora_extra}/h).
> - **Não atendo às segundas-feiras** — minha agenda já é fechada nesse dia. Se for algo realmente importante, me conta no campo de observações que eu avalio ajustar.
> - Deslocamento e alimentação **não estão inclusos** no valor da visita e são cobrados à parte, mediante comprovante (Uber, nota fiscal).
> - Tudo isso entra na **fatura do mês de uso** da visita.
> - E fica tranquilo(a): esse horário é **100% dedicado a você** — não vou estar atendendo outras contas ou resolvendo outras pendências nesse período.

Os valores entre `{}` vêm do contrato configurado do cliente (ver seção 6), nunca hardcoded no componente.

## 4. Formulário

- **Duas opções de data + horário** (não uma janela única) — o cliente propõe até 2 combinações de dia/hora, para dar folga de negociação sem já virar um vai-e-vem.
- Campo de **observações** (opcional) — é onde ele sinaliza, por exemplo, se quer insistir numa segunda-feira.
- Checkbox de **ciente**: campo de texto livre onde o cliente digita o nome completo por extenso para confirmar. Texto ao lado:
  > "Declaro que estou ciente dos valores acima, incluindo eventuais custos adicionais de deslocamento e alimentação, que serão lançados na fatura do mês de uso desta visita."
- Botão de envio só habilita com as 2 datas válidas preenchidas e o ciente confirmado.

## 5. Validações (client-side + repetidas no backend/RLS)

| Situação | Comportamento |
| --- | --- |
| Data no passado | Bloqueia envio. Alerta: "Opa, essa data já passou! Escolha uma data a partir de {data mínima}." |
| Data dentro da janela de 48h úteis a partir de agora | Bloqueia envio. Alerta: "Preciso de pelo menos 48h úteis pra avaliar — a data mais próxima possível é {data mínima calculada}." |
| Fora do horário comercial (antes das 9h ou depois das 16h) | Bloqueia envio. Alerta: "Só faço visitas entre 9h e 16h, de segunda a sexta." |
| Sábado ou domingo | Bloqueia envio. Mesmo alerta acima (fora do horário comercial CALI). |
| Segunda-feira | **Não bloqueia** — libera o campo, mas mostra um aviso persistente: "Segundas geralmente não têm visita na minha agenda. Se for importante pra você, conta no campo de observações que eu avalio." A decisão de aceitar fica manual, do lado da Pati (ver seção 7) — não é uma taxa automática. |

"48h úteis" = conta apenas dias úteis (seg–sex) a partir do momento do envio, ignorando fins de semana no cálculo.

## 6. Configuração por contrato — página de Clientes (admin)

Novos campos no cadastro/edição de contrato do cliente (mesma tela onde hoje ficam plano, horas contratadas etc.):

- **Taxa da visita** (valor fixo, até 4h inclusas) — `visit_flat_fee`.
- **Valor da hora adicional** (após as 4h) — `visit_extra_hour_rate`.
- Os demais parâmetros (janela de 48h úteis, horário 9h–16h, bloqueio de segunda) começam como regra **global da Pati**, não por cliente — não há indicação de que variem de contrato para contrato. Se algum cliente precisar de regra diferente, tratamos como exceção quando aparecer.

Isso é o que a Pati descreveu na abertura da conversa: "vai entrar algumas questões... primeiro eu preciso montar as regras... o correto é a gente deixar isso visível ali na plataforma" — os valores vêm do contrato de cada cliente, não de um texto fixo.

## 7. Fluxo — lado admin (Patrícia)

1. Notificação de nova solicitação de visita extra.
2. Pedido aparece com status **"Aguardando avaliação"** numa lista (provavelmente dentro de Calendário ou um novo bloco em Clientes — a definir no momento da implementação).
3. Duas ações possíveis:
   - **Aceitar uma das datas propostas** → vira compromisso confirmado automaticamente na agenda (ambos os lados notificados). Se envolveu segunda-feira, aceitar já resolve a exceção.
   - **Recusar com justificativa** → abre campo para a Pati sugerir **2 novas datas/horários** → envia contraproposta ao cliente.
4. Cliente recebe a contraproposta:
   - Aceita uma das novas datas → confirma, vira compromisso na agenda.
   - Recusa as duas → devolve uma nova sugestão de data para a Pati, reabrindo a avaliação (o ciclo do passo 3 se repete).
5. Em qualquer tela de "não deu match ainda" (recusa, contraproposta), o tom é leve e tranquilizador, mantendo a identidade da Pati — ex.: "Opa, essa data não encaixou na minha agenda 🙂 Mas vai dar tudo certo, só mais um ajuste!" — nunca um erro seco.
6. Ao confirmar, registrar o valor aceito e a competência prevista, sem emitir cobrança por uma visita que ainda não ocorreu. Após a realização, conciliar valor fixo, hora adicional previamente aceita e despesas comprovadas no relatório/faturamento segundo o ciclo financeiro aprovado pela Pati.

## 8. Em aberto — bloqueadores reais (preciso de você aqui, Pati)

Isso eu não posso decidir sozinho, preciso do dado ou da decisão:

1. **Valor da taxa de visita (`visit_flat_fee`) e da hora extra (`visit_extra_hour_rate`)** — a minuta foi anexada e conferida: informa mensalidade e ativação, mas não esses valores. Precisamos das tarifas específicas antes de exibi-las ao cliente; não é necessário inventar um default para novos contratos.
2. **Comprovação do seu próprio deslocamento** — você mesma colocou em aberto ("não sei como a gente pode fazer isso no caso"). Minha sugestão, pra você validar: você anexa o comprovante (nota fiscal/recibo) manualmente depois da visita, igual faria com Uber do cliente, e o valor entra como um lançamento avulso na fatura do mês — sem fluxo automático de "solicitação" nesse caso, porque é custo seu, não do cliente. Confirma se é assim ou se você tem outra ideia?

Fora esses dois pontos, o fluxo acima está fechado o suficiente pra eu começar a desenhar as telas assim que você validar. Não vou tocar em código antes disso.

## 9. Fora de escopo desta spec

- O bug do degradê do sidebar no modo dia (perfis admin e cliente) foi reportado na mesma mensagem e tratado à parte por Codex.

## 10. Complemento Codex — conferência da minuta e do fluxo existente (28/09/2026)

**Autoria deste complemento: Codex. Aprovação: pendente.** A Pati pediu também a correção do sidebar no tema dia nesta mensagem; ela foi tratada separadamente no CSS. Este complemento não implementa a visita.

**Minuta anexada:** `22-CALI-RH-Minuta-de-Prestac-a-o-de-Servic-os-CALI-PARTNER-CONTRATANTE-.pdf` foi conferida. A cláusula 5.4 prevê orçamento específico para visita, horas adicionais e deslocamento; 5.2 evita execução/cobrança extra automática sem alinhamento; 5.5 prevê aceite eletrônico inequívoco; 8.1, VI exclui visita não prevista. Os R$ 3.910,00 da mensalidade e R$ 782,00 da ativação **não são preço de visita**. A minuta não informa taxa para 4h, hora excedente ou km. Corrige a seção 8: o anexo chegou, mas esses valores não constam nele.

**Diferenças no agendamento atual:** `/cliente/cronograma` e `/admin/calendario` já usam `scheduling_requests`, duas opções, contraproposta, ciência de cobrança e evento confirmado. O texto atual para adicional presencial menciona **1h30, deslocamento incluído e taxa de cancelamento de 20%**. Essas regras divergem da visita nova e precisam ser substituídas **nesse fluxo**, com migração segura, sem herdar a multa de 20% por engano. A opção 2 deveria ser obrigatória para a visita extra conforme pedido da Pati; a seção 4 hoje permite apenas uma.

**Ajustes recomendados para fechar a regra antes de implementar:**

1. Na aba do contrato do cliente, configurar valor fixo até 4h, preço e fração da hora adicional, método de deslocamento e eventual limite de alimentação, além de visitas inclusas. Não habilitar pedido adicional com preço ausente. Cada pedido guarda a versão do preço/termos aceitos; alterações futuras não mudam o passado. Mostrar preço, despesas variáveis e ciclo financeiro ao cliente antes de pedir nome completo, checkbox, usuário e data/hora da ciência.
2. Validar datas/horários e autoridade também no servidor, no fuso de Brasília. Segunda-feira é **exceção solicitável**, com indicação própria e análise da Pati, sem tarifa automática. Duração proposta até 4h precisa terminar até 16h (último início às 12h). Se ultrapassar 4h na execução, pedir aceite do excedente antes de cobrá-lo. Cada contraproposta preserva histórico e não reserva agenda. Um evento único nasce somente da confirmação, com verificação de conflito.
3. Deslocamento: Uber/táxi com recibo; para veículo próprio, combinar **R$/km, origem, destino, rota/distância documentada e eventual teto** antes da ciência, ou desabilitar essa modalidade até definição. Alimentação por nota fiscal, conforme limites acordados. Anexar comprovantes e discriminar despesas posteriormente.
4. Registrar o valor fixo e a competência no pedido confirmado, mas **não afirmar que a fatura já foi emitida** nem cobrar serviço só por solicitar. Após realização, registrar horas efetivas, excedente aceito e despesas comprovadas e então conciliar com o financeiro. A frase “fatura do mês de uso” da seção 7 precisa distinguir competência e emissão: recomendação é competência no mês da visita e emissão no ciclo seguinte, sujeita à decisão da Pati.
5. Especificar se “48 horas úteis” significa **dois dias úteis** ou 48 horas corridas dentro do expediente (mais de uma semana); são regras muito diferentes. Decidir também política de cancelamento após confirmação e arredondamento do excedente. Não transportar automaticamente os 20% atuais.

**Estados propostos:** Aguardando análise → Confirmada; ou Aguardando cliente após justificativa e duas novas opções → Confirmada ou Aguardando análise com duas contrapropostas do cliente; Encerrada com motivo; Realizada após registro. Cliente e admin veem o mesmo status e recebem notificação após cada transição confirmada. A agenda e o lançamento financeiro precisam ser idempotentes para não duplicar eventos nem cobrança. Visita extra deve ser separada da franquia de encontros e das horas mensais, salvo regra contratual expressa.
