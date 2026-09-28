# CALI Workspace · Solicitar Visita Extra — Especificação de Fluxo

> Status: **rascunho para validação da Pati, antes de qualquer código.**
> Pedido dela (28/09/2026): montar o fluxo completo (perfil cliente + perfil admin) antes de mexer em qualquer coisa no código. Este arquivo é essa proposta. Nada aqui foi implementado ainda.
> Atualizado com os valores reais da minuta `CALI_RH_Minuta_CALI_PARTNER_KIE-TEC_revisada.docx` (anexada por ela em 28/09) — ver seção 8, que aponta uma divergência real entre o que está no contrato e o que ela descreveu de viva voz.

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
> - A visita tem **até 4 horas** inclusas na taxa de {valor_visita}. Passando disso, entro em contato pra alinhar um orçamento específico antes de qualquer coisa — nada é cobrado sem a gente combinar antes.
> - **Não atendo às segundas-feiras** — minha agenda já é fechada nesse dia. Se for algo realmente importante, me conta no campo de observações que eu avalio ajustar.
> - Deslocamento, estacionamento e alimentação **não estão inclusos** no valor da visita e são cobrados à parte, sempre com comprovante.
> - Tudo isso entra na **fatura do mês de uso** da visita.
> - E fica tranquilo(a): esse horário é **100% dedicado a você** — não vou estar atendendo outras contas ou resolvendo outras pendências nesse período.

O valor entre `{}` vem do contrato configurado do cliente (ver seção 6), nunca hardcoded no componente. Para o CALI Partner padrão, hoje é **R$ 800,00 por visita de até 4 horas** (Anexo I, cláusula 2.1 da minuta).

## 4. Formulário

- **Duas opções de data + horário** (não uma janela única) — o cliente propõe até 2 combinações de dia/hora, para dar folga de negociação sem já virar um vai-e-vem.
- Campo de **observações** (opcional) — é onde ele sinaliza, por exemplo, se quer insistir numa segunda-feira.
- Checkbox de **ciente**: campo de texto livre onde o cliente digita o nome completo por extenso para confirmar. Texto ao lado:
  > "Declaro que estou ciente dos valores acima, incluindo eventuais custos adicionais de deslocamento e alimentação, que serão lançados na fatura do mês de uso desta visita."
- Botão de envio só habilita com pelo menos 1 data válida preenchida e o ciente confirmado.

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

- **Taxa da visita** (valor fixo, até 4h inclusas) — `visit_flat_fee`. Default para novos contratos CALI Partner: **R$ 800,00** (Anexo I, cláusula 2.1 da minuta).
- Não existe campo de "valor da hora adicional" — ver seção 8, item 1: pela minuta, visita acima de 4h não tem tarifa automática, vai para orçamento específico.
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
6. Ao confirmar, o valor fixo da visita ({valor_visita}) entra automaticamente no relatório/fatura do mês de uso. Deslocamento, estacionamento e alimentação entram **depois**, quando a Pati anexar o comprovante — não no momento da confirmação.
7. Se a visita proposta pelo cliente já indicar necessidade de mais de 4h (ou isso ficar claro depois), não existe cobrança automática de hora extra — a Pati sinaliza no pedido que aquilo entra como **orçamento específico**, alinha o valor à parte com o cliente, e só depois de aprovado ele é lançado manualmente na fatura. O fluxo de aceite/agenda continua igual; só o valor cobrado muda de automático para manual nesse caso.

## 8. Em aberto — bloqueadores reais (preciso de você aqui, Pati)

1. **Resolvido pela minuta, mas com uma divergência que preciso que você confirme:** você descreveu de viva voz que, passando das 4h, seria "cobrado adicional por hora". A minuta que você anexou (Anexo I, cláusulas 2.1 e 2.3) diz outra coisa: a visita de até 4h custa R$ 800,00, e visitas **acima de 4h não têm tarifa por hora** — viram "objeto de orçamento específico e aprovação prévia da CONTRATANTE" (cláusula 2.3), e a cláusula 2.4 reforça que nada extraordinário é cobrado sem alinhamento prévio entre as partes.
   Minha recomendação: sigo a minuta, que é o documento que vale juridicamente — nada de tarifa automática por hora extra; passou de 4h, vira conversa/orçamento à parte, como descrevi na seção 7. Se você realmente quer uma tarifa automática por hora (ex.: para agilizar, sem precisar renegociar toda vez), isso exigiria revisar a cláusula 2.3 do contrato-modelo também, não só a plataforma — me avisa se é isso que você quer, porque aí o próximo passo não é só técnico.
2. **Comprovação do seu próprio deslocamento/estacionamento/alimentação** — você mesma colocou em aberto ("não sei como a gente pode fazer isso no caso"). A minuta só diz que esses custos são cobrados do cliente "efetivamente relacionados" (ou seja, comprovados), mas não define como você registra o comprovante no seu lado. Minha sugestão, pra você validar: você anexa o comprovante (nota fiscal/recibo) manualmente depois da visita, e o valor entra como um lançamento avulso na fatura do mês — sem fluxo automático de "solicitação" nesse caso, porque é custo seu, não do cliente. Confirma se é assim ou se você tem outra ideia?

Fora esses dois pontos, o fluxo acima está fechado o suficiente pra eu começar a desenhar as telas assim que você validar. Não vou tocar em código antes disso.

## 9. Fora de escopo desta spec

- O bug do degradê do sidebar no modo dia (perfis admin e cliente) foi reportado na mesma mensagem, mas ela pediu para desconsiderar por enquanto — tratado à parte quando ela pedir.
