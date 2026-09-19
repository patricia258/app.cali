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

## 9. Mobile e iPad — em stand by

Decisão de produto em 18/09/2026: não alterar a experiência mobile/iPad nesta rodada. A possibilidade de transformar a área do Cliente em aplicativo dedicado será avaliada antes de retomar esse trabalho. As evidências abaixo permanecem registradas, sem implementação nem critério de promoção nesta entrega.

### Evidências preservadas

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

## 10. Pré-diagnóstico de estabilidade e carregamento — 19/09/2026

Escopo desta revisão: somente leitura e documentação. Nenhum código, banco, configuração ou domínio foi alterado.

### Evidências encontradas

- A produção não apresentou erros de runtime da Vercel nas últimas 24 horas no momento da consulta.
- A tela `Não foi possível concluir esta navegação` é exibida pelo `AppErrorBoundary` global quando ocorre uma exceção de renderização no navegador.
- O erro capturado pelo `AppErrorBoundary` é enviado apenas para `console.error`. Erros exclusivamente client-side podem, portanto, não aparecer nos logs de runtime da Vercel.
- Os módulos específicos de Relatórios, Ocorrências, Projetos, Calendário, Documentos, Horas e Mapa são carregados dinamicamente após cada troca de rota. Uma falha de chunk, exceção de inicialização ou conflito de runtime pode acionar o fallback global.
- Fotos e logos privados dependem da geração de URL assinada. Existe cache em memória e em `sessionStorage`, mas o runtime global de identidade só começa 900 ms após a inicialização e então consulta/aplica as mídias; isso pode explicar o aparecimento perceptivelmente tardio.
- A aplicação usa vários runtimes de acabamento baseados em `MutationObserver`. Eles devem ser medidos em conjunto, pois sucessivas mutações e reaplicações podem contribuir para travamentos durante navegação, sobretudo em páginas com chats, tabelas e drawers.
- A ausência de erro nos logs do servidor não permite declarar a navegação perfeitamente estável. O incidente relatado permanece classificado como intermitente e restrito ao cliente até existir telemetria do navegador.

### Hipóteses a validar, sem conclusão antecipada

1. exceção de renderização em uma rota específica ou na desmontagem da rota anterior;
2. falha transitória ao importar um chunk dinâmico durante a navegação;
3. disputa entre runtimes DOM/`MutationObserver` instalados ao entrar e sair de páginas;
4. sessão ou consulta do Supabase em estado transitório;
5. custo acumulado de CSS, observers, consultas e assinatura de mídias causando lentidão, sem necessariamente gerar erro de servidor.

### Próxima rodada de diagnóstico

- reproduzir com sessão real do Cliente, percorrendo em sequência: Início, Planejamento, Entregáveis, Horas, Ocorrências, Documentos e Relatórios;
- repetir o circuito nos temas Dia e Noite, com recarregamento completo e também por navegação interna;
- capturar Console e Network no momento da falha, incluindo nome do chunk, stack trace, rota anterior, rota seguinte e status das chamadas do Supabase/Storage;
- medir navegação e carregamento de foto de perfil, logo da empresa, avatares de chat e mídia do `Fale com a Pati` em cache frio e cache quente;
- verificar se o enquadramento canônico definido no Perfil permanece igual em todas as molduras depois de navegações sucessivas;
- conferir se cada rota deixa observers, canais realtime ou listeners ativos após ser fechada;
- testar rede lenta e perda breve de conexão, garantindo recuperação orientada sem perder a sessão;
- adicionar, em futura implementação autorizada, captura estruturada de erros client-side e eventos de performance. Não registrar mensagens, documentos, tokens, URLs assinadas ou dados pessoais sensíveis.

### Critérios de aceite da estabilidade

- nenhum fallback global em três circuitos completos consecutivos por perfil e tema;
- nenhuma requisição essencial 4xx/5xx e nenhum chunk com falha;
- navegação continua utilizável enquanto imagens são carregadas;
- imagem ausente ou lenta usa moldura estável e fallback, sem bloquear conteúdo;
- fotos respeitam posição e zoom do Perfil; logos respeitam o tratamento canônico empresarial;
- listeners, observers e canais não crescem a cada visita à mesma página;
- caso ocorra falha, o evento fica diagnosticável com rota, versão, stack e horário, preservando privacidade.

## 11. Novo perfil interno — People Partner

Criar futuramente um tipo de acesso interno chamado `People Partner`, distinto do Administrador CALI e do Cliente.

### Objetivo

Permitir cadastrar uma pessoa colaboradora/parceira para atuar somente nas contas às quais for explicitamente vinculada, sem acesso administrativo global ao Workspace.

### Escopo mínimo de acesso

- visualizar apenas clientes associados ao seu cadastro;
- acessar os projetos e entregáveis desses clientes;
- produzir e entregar atividades autorizadas;
- participar do chat visível ao cliente nos projetos/entregáveis associados;
- visualizar o contexto necessário para executar o trabalho, aplicando o princípio do menor privilégio;
- não visualizar outras contas, configurações globais, finanças, propostas, administração de usuários ou dados estratégicos sem permissão explícita futura.

### Cadastro e governança

- perfil com nome, e-mail, foto, cargo/função e status ativo/inativo;
- associação explícita entre People Partner e um ou mais clientes;
- possibilidade de revogar uma associação sem apagar o histórico de autoria;
- autoria identificada em mensagens, entregas e histórico;
- auditoria de concessão, alteração e revogação de acesso;
- regras de banco/RLS obrigatórias: esconder dados na interface não é controle de acesso suficiente;
- convite, primeiro acesso, recuperação de senha e desligamento devem preservar segurança e rastreabilidade.

### Referência de produto

Usar os dois repositórios criados pela Patrícia como referências oficiais de produto, fluxo, arquitetura e inspiração para o futuro perfil People Partner:

- [Azumi Connect Hub Oficial](https://github.com/azudoka/azumi-connect-hub-oficial) — repositório público, TypeScript, com aplicação publicada em `azumi-connect.vercel.app`;
- [Azumi Connect 1](https://github.com/azudoka/azumi-connect1) — referência complementar informada pela Patrícia. No registro de 19/09/2026, a integração do GitHub retornou 404; confirmar acesso/permissão antes da auditoria técnica.

Esses projetos devem orientar especialmente a análise de perfis internos, associação entre colaborador e cliente, limites de visualização, carteira atribuída e fluxos de execução. Eles não devem ser copiados de forma automática: regras, nomenclatura, identidade, segurança e experiência precisam ser adaptadas à realidade da CALI.

### Decisões ainda necessárias

- definir se o People Partner pode iniciar timer e lançar horas;
- definir se pode ver conversas internas CALI ou apenas conversas compartilhadas com o cliente;
- definir quem revisa/aprova uma entrega antes de ela chegar ao cliente;
- definir permissões para documentos, ocorrências, calendário e relatórios;
- definir se a permissão será apenas por cliente ou também por projeto/entregável;
- definir substituição temporária, férias e transferência de carteira.

### Fora de escopo desta etapa

Nenhum perfil, tabela, política, tela ou convite de People Partner foi criado. Esta seção é exclusivamente um registro para descoberta e especificação futura.
