# Briefing — layouts de e-mail do CALI Workspace

Você vai me ajudar a desenhar os layouts de e-mail do CALI Workspace, um por vez. Eu sou a Patrícia Lima, dona da CALI RH (People Advisory Executive). Não sou desenvolvedora.

## Regras do trabalho

1. É só layout. Você não mexe em sistema, banco, código de envio nem integrações. Seu resultado é o visual e o texto de cada e-mail.
2. Um e-mail por vez. Mostre o layout, espere a minha aprovação e só então passe para o próximo. Não adiante vários.
3. Comece me perguntando por qual perfil e por qual e-mail quero começar.
4. Para cada e-mail, entregue: (a) o layout renderizado para eu ver; (b) o assunto; (c) o texto de pré-visualização; (d) o HTML final.
5. Quando eu aprovar, guarde o HTML final numa lista de "aprovados", com o nome do e-mail e o perfil. No fim eu levo essa lista para quem vai aplicar no sistema.
6. Escreva em português do Brasil, frases curtas, sem jargão técnico e sem repetir a mesma palavra no título e no texto.

## Regras técnicas do HTML (e-mail não é site)

- Estrutura em tabelas, largura máxima de 640px, estilos embutidos em cada elemento (sem folha de estilo externa, sem JavaScript, sem fontes baixadas).
- Fonte: Arial/Helvetica no corpo; Georgia só no título principal, se fizer sentido.
- Tem de funcionar no Gmail, Outlook e no celular. Imagens sempre com texto alternativo; o e-mail precisa fazer sentido com as imagens bloqueadas.
- Um botão principal por e-mail, com o texto dizendo o que acontece ao clicar.
- Onde o conteúdo muda a cada envio, use marcadores entre chaves duplas, por exemplo `{{nome_do_cliente}}`, `{{empresa}}`, `{{titulo}}`, `{{mensagem}}`, `{{protocolo}}`, `{{prazo}}`, `{{link}}`. Liste no fim de cada e-mail os marcadores usados.

## Identidade visual da CALI

- Bordô principal `#5A1E2D`; dourado de apoio `#B58C52`; fundo creme `#F7F3EE`; cartão branco com borda `#E8DDD4`; texto `#2B2B2B`; texto secundário `#8C807A`.
- Alerta de atenção em âmbar (fundo `#FFF8E6`, faixa `#D9A514`); alerta que exige correção em vermelho (fundo `#FDECEA`, faixa `#B3261E`); confirmação positiva em verde (fundo `#EEF7F0`, faixa `#356448`).
- Tom: sóbrio, executivo, acolhedor. Sem emojis decorativos, sem excesso de caixas dentro de caixas, nada colado nas bordas.
- Cabeçalho atual: faixa bordô com o logotipo "CALI Workspace" à esquerda e a marca do carvalho à direita. Rodapé atual: "CALI Workspace · Patrícia Lima · People Advisory Executive".
- Remetente: CALI Workspace <patricia@calirh.com>.

## Como é o e-mail hoje (ponto de partida)

Um modelo único para quase tudo: cabeçalho bordô, a etiqueta "ATUALIZAÇÃO DO WORKSPACE", o título, um bloco opcional de contexto (empresa, tipo, protocolo, assunto), um parágrafo e o botão "Abrir no Workspace". O assunto sai como "CALI Workspace · Empresa · Título". Quero melhorar isso: cada tipo de e-mail deve parecer feito para aquela situação.

## E-mails que existem, por perfil

### Cliente recebe
1. Código de acesso ao Workspace (login).
2. Cronograma enviado para validação.
3. Lembrete: cronograma aguardando aprovação.
4. Projeto concluído ou cancelado.
5. Entregável aguardando a validação do cliente.
6. Entregável com ajuste registrado, rebriefing ou cancelado.
7. Parte da entrega (subtarefa) aguardando aprovação.
8. A CALI precisa de um retorno seu (dependência registrada, com data limite).
9. Pendência em atraso (lembrete).
10. Prazo reprogramado (novo prazo e justificativa).
11. Documento final disponível / documento que exige ciência.
12. Relatório executivo do mês.
13. Resposta ao pedido de agendamento.
14. Ocorrência: mudança de situação e decisão sobre reabertura.
15. Atualização mensal da equipe (lembrete).
16. Alguém mencionou você em uma conversa (@).

### Administradora (eu) recebe
1. Cliente aprovou o cronograma.
2. Cliente pediu ajuste no cronograma.
3. Cliente aprovou o entregável / pediu ajuste / pediu rebriefing.
4. Cliente abriu uma ocorrência.
5. Cliente pediu reabertura de ocorrência.
6. Cliente pediu agendamento / agendamento confirmado.
7. Capacidade mensal do cliente em atenção (75%, 100%, excedente).
8. Documento com validade vencendo.
9. Alguém mencionou você em uma conversa (@).
10. Resumo diário, às 19h: tudo o que aconteceu no dia, organizado por cliente.

### Equipe CALI (Partner) recebe
1. Convite para fazer parte da Equipe CALI.
2. Boas-vindas à Equipe CALI.
3. Alguém mencionou você em uma conversa (@).

## O que não gera e-mail (não desenhar)

Mensagens comuns de conversa não saem por e-mail; só a menção com @.
