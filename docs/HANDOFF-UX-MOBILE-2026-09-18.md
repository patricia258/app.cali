# Handoff — UX, mobile e acabamento visual

Registro consolidado em 18/09/2026. Este documento descreve pendências e critérios de aceite. Nada listado aqui deve ser tratado como concluído sem teste autenticado nos perfis Cliente e Administrador.

## Incidente e reversão

- O pacote `V64` foi revertido integralmente no oficial.
- Causa do problema no “Fale com a Pati”: a nova camada de transição envolveu as páginas em `.workspace-route-stage` e manteve `transform` após a animação. Um ancestral transformado muda o referencial de elementos `position: fixed`; por isso o botão e o painel deixaram de se fixar ao viewport e passaram a acompanhar o conteúdo da página.
- Regra para a retomada: animações de rota não podem envolver nem transformar ancestrais de componentes flutuantes, overlays, drawers, modais ou elementos fixos.
- Antes de qualquer nova publicação: testar com sessão real, dados reais e todas as camadas flutuantes abertas.

## 1. Transições e movimento — sistema inteiro

Revisar Cliente e Administrador para aplicar, sem afetar posicionamento ou desempenho:

- transição suave ao mudar de página;
- entrada dos cards com leve flutuação;
- movimento discreto em modais, drawers e painéis;
- pequeno salto apenas para elementos realmente novos;
- consistência nos temas claro e noturno;
- respeito a `prefers-reduced-motion`;
- nenhuma animação em ancestral de elemento `fixed` ou `sticky`.

## 2. Histórico de horas do cliente

Exibir somente:

- data;
- tempo registrado;
- tarefa ou atividade;
- natureza: entregável, subtarefa, ocorrência etc.;
- projeto;
- origem: timer, lançamento semanal ou outro;
- comentário complementar, somente quando existir.

Remover horário de início/fim, repetições do nome do entregável e detalhes que apenas repetem a natureza. A expansão deve existir somente quando houver comentário ou contexto adicional real.

## 3. Tempo de acompanhamento em ocorrências

- usar apenas um título relacionado a tempo;
- mostrar o total de minutos uma única vez;
- remover `0 min registrados` duplicado e reticências cortadas;
- reduzir o destaque e o tamanho de `Atendimento encerrado`;
- manter o estado encerrado como informação secundária.

Estrutura de referência: etiqueta `ACOMPANHAMENTO`, informação principal `0 min registrados` e estado compacto `Encerrado`.

## 4. Relatórios do cliente

Manter no card:

- referência;
- data de envio;
- visualizado ou não;
- primeiro acesso;
- ciência/assinatura;
- data da ciência/assinatura;
- ações Abrir, PDF e Registrar ciência quando pendente.

Remover quantidade total de acessos, último acesso, acessos ao PDF, versão sem necessidade funcional e protocolo repetido. Reorganizar as ações e usar toda a largura do card.

## 5. Propostas e Mapa de People

Alterar somente a camada visual: tipografia, hierarquia, cards, filtros, tabelas, botões, bordas, espaçamento, temas e movimento.

Não alterar funcionalidades, integrações, regras, dados, navegação, geração de propostas ou funcionamento do Mapa de People.

## 6. Chats e componentes flutuantes

- `Fale com a Pati` deve permanecer sempre no canto inferior da tela, independentemente da rolagem;
- o painel aberto deve respeitar viewport, teclado e área segura do Safari;
- campo de mensagem fixo e mensagens como única região rolável;
- última mensagem visível ao abrir e após novo envio;
- chat de entregável consistente entre Cliente e Administrador;
- chat de ocorrências compacto, sem perder fotos e identificação;
- nenhuma barra de ação geral deve ocupar espaço dentro da aba Conversa quando não for necessária.

## 7. Imagens, logos e fotos de perfil

- reservar largura e altura antes do carregamento para impedir deslocamento de layout;
- usar fallback de iniciais;
- revisar cache, resolução e compressão;
- imagem lenta não pode bloquear o restante da página;
- validar logo da empresa, foto do perfil e vídeo/foto do `Fale com a Pati`.

## 8. Exportação do PDF executivo

- revisar a abertura do PDF do resumo no Administrador;
- garantir enquadramento, escala e rolagem corretos;
- validar impressão e download, não apenas a pré-visualização;
- testar temas sem transportar o fundo do aplicativo para o documento final.

## 9. Evidências mobile

Referências: `IMG_7055.PNG` a `IMG_7067.PNG`.

- autenticação no Safari: respeitar a barra inferior e a área segura;
- início do Cliente e `Fale com a Pati`: não cobrir a navegação nem sair do viewport;
- menu lateral: rótulos legíveis sem consumir quase toda a tela;
- perfil: modal integralmente visível, sem corte horizontal e com rolagem apenas vertical;
- Planejamento: cabeçalho não pode esconder avisos, títulos ou início dos cards;
- Entregáveis: não depender de tabela larga; textos e ações não podem ser cortados.

## Matriz obrigatória antes de produção

| Cenário | Largura | Critério de aceite |
|---|---:|---|
| Celular compacto | 375–390 px | Sem corte lateral; menu, perfil, chat, formulários e ações acessíveis |
| Celular amplo | 412–430 px | Hierarquia preservada e ações acima da barra do navegador |
| iPad retrato | 768–820 px | Cards, relatórios e modais sem tabela de desktop espremida |
| iPad paisagem | 1024 px | Uso adequado da largura, sem rolagem lateral global |
| Temas | claro e noite | Contraste, bordas, textos e estados equivalentes |
| Perfis | Cliente e Administrador | Teste autenticado com dados reais e comportamento equivalente |

Testar também rotação, teclado aberto, atualização completa, menu, perfil, notificações, chat flutuante, conversa de entregável, ocorrências e barra inferior do Safari.

## Regra de publicação

Preview visual sem acesso aos dados não serve como aprovação funcional. A próxima promoção ao oficial só pode ocorrer depois de validação autenticada ou de um plano de teste que cubra explicitamente os componentes indisponíveis na prévia.
