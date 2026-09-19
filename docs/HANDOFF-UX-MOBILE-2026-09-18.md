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

Criar futuramente um terceiro perfil de acesso chamado `People Partner`, distinto do Administrador CALI e do Cliente. Ele representa uma pessoa colaboradora/parceira da operação, com experiência própria e acesso limitado à carteira atribuída.

### Objetivo e experiência

A página inicial deve ser `Minha carteira`, mostrando somente:

- clientes associados ao People Partner;
- projetos e entregáveis sob sua responsabilidade;
- prazos próximos;
- mensagens novas;
- ocorrências atribuídas;
- agenda relacionada à carteira;
- horas registradas pela própria pessoa.

O perfil não deve ser apenas uma cópia visualmente reduzida do Administrador. Rotas, consultas e ações devem nascer restritas ao escopo autorizado.

### Estrutura dos perfis

| Perfil | Escopo |
|---|---|
| Administrador CALI | Controla toda a operação, usuários, clientes, regras e publicação |
| People Partner | Executa o trabalho somente nas contas e projetos associados |
| Cliente | Acompanha, conversa e valida conteúdos da própria empresa |

### Permissões recomendadas para a primeira versão

O People Partner pode:

- visualizar somente clientes associados;
- acessar projetos e entregáveis liberados;
- atualizar atividades sob sua responsabilidade;
- anexar documentos relacionados ao trabalho;
- participar do chat compartilhado com o cliente;
- participar do chat interno CALI quando houver autorização;
- iniciar timer e registrar as próprias horas, se a permissão estiver habilitada;
- consultar agenda relacionada à carteira;
- preparar uma entrega e encaminhá-la para revisão;
- acompanhar ocorrências atribuídas;
- consultar o histórico das próprias ações.

O People Partner não pode, por padrão:

- criar, excluir ou editar estruturalmente um cliente;
- alterar contrato, pacote, saldo ou horas contratadas;
- visualizar financeiro, propostas ou indicadores comerciais;
- administrar usuários e permissões;
- acessar clientes fora da carteira;
- publicar relatório executivo;
- aprovar definitivamente uma entrega;
- enviar conteúdo sensível diretamente ao cliente sem a etapa de revisão;
- visualizar dados estratégicos globais da CALI.

### Associação e granularidade

A área administrativa deve possuir uma seção `Equipe da conta`, na qual o Administrador poderá:

- escolher um People Partner;
- associá-lo a um ou mais clientes;
- liberar todos os projetos do cliente ou somente projetos selecionados;
- definir permissões específicas;
- determinar início e término do vínculo;
- suspender ou revogar o acesso.

Aplicar duas camadas mínimas de escopo:

1. **Cliente:** autoriza ou impede o acesso à conta.
2. **Projeto:** dentro da conta, autoriza todos os projetos ou somente os selecionados.

A arquitetura deve permitir granularidade futura por entregável, sem exigir essa complexidade na primeira versão.

### Fluxo de entrega

Fluxo padrão recomendado:

1. People Partner prepara ou atualiza o entregável.
2. Encaminha para `Revisão CALI`.
3. Administrador revisa.
4. Administrador libera ao cliente ou solicita ajustes.
5. Cliente recebe e valida somente após a liberação.

A permissão `Pode enviar diretamente ao cliente` deve ser excepcional, explícita e auditável.

### Conversas

Manter dois contextos visualmente inequívocos:

- **Cliente:** mensagens visíveis ao cliente.
- **Interno CALI:** alinhamentos entre Administrador e People Partner.

Requisitos:

- impedir envio acidental de mensagem interna ao cliente;
- identificar autoria, foto e função;
- preservar autoria após desligamento;
- registrar edição ou exclusão;
- notificar somente pessoas relacionadas à conta/projeto;
- permitir que a CALI defina se o People Partner vê todo o histórico anterior ou apenas o período posterior à associação.

### Cadastro e ciclo de acesso

Campos mínimos:

- nome;
- e-mail;
- telefone;
- foto com enquadramento canônico;
- função;
- mini bio opcional;
- status: convidado, ativo, suspenso ou encerrado;
- clientes e projetos associados;
- permissões;
- possibilidade de timer/horas;
- possibilidade de conversar com cliente;
- possibilidade excepcional de envio direto.

O acesso deve cobrir convite, criação de senha, primeiro acesso, recuperação, suspensão e desligamento. Revogar acesso não pode apagar autoria ou histórico.

### Governança e segurança

- autorização efetiva no banco/RLS; ocultar menus não é segurança;
- consultas sempre filtradas pelos vínculos vigentes;
- acesso direto por URL deve ser bloqueado;
- registrar quem concedeu, alterou e revogou acesso;
- registrar clientes/projetos liberados e período do vínculo;
- preservar autoria de mensagens, entregas e horas;
- encerrar sessões e permissões imediatamente após suspensão;
- aplicar menor privilégio por padrão;
- separar permissão de visualizar, executar, revisar e publicar.

### Referências verificadas — Connect

Repositórios criados pela Patrícia e definidos como referências oficiais de produto, fluxo, arquitetura e inspiração:

- [Azumi Connect Hub Oficial](https://github.com/azudoka/azumi-connect-hub-oficial);
- [Azumi Connect 1](https://github.com/azudoka/azumi-connect1).

#### O que foi efetivamente verificado no Azumi Connect Hub Oficial

Revisão do código realizada em 19/09/2026:

- separação de papéis como `admin`, `consultor`, `cliente`, `cliente_avulso`, `trial`, `rh`, `rh_operacional`, `líder`, `colaborador`, `ceo`, `dp`, `contador` e `jurídico`;
- proteção de rotas por papel com `PrivateRoute`;
- perfil carregado da tabela `users_profile`, contendo papel, empresa, status, foto e assinatura;
- permissões organizadas por módulo e por nível: `operar`, `consultar` e `auditoria`;
- tela de usuários com papéis, status, permissões individuais, alteração de papel e desativação;
- divisão entre área administrativa/consultor, área do cliente e Hub;
- projetos com entregáveis, status, complexidade, prazos e etapas de validação interna e do cliente;
- previsão de conversa entre cliente e consultor ligada ao entregável;
- separação de documentos e ações conforme o perfil;
- timer global e área de horas;
- controle de módulos contratados pelo cliente.

#### O que deve ser aproveitado como referência

- matriz papel × módulo × nível de permissão;
- proteção de rotas;
- perfil vinculado a empresa;
- cadastro e desativação de usuários;
- separação entre execução interna e validação do cliente;
- estrutura de projetos, entregáveis, documentos, solicitações e horas;
- experiência distinta por tipo de usuário.

#### O que não deve ser copiado sem revisão

- no Connect, `admin` e `consultor` compartilham um conjunto amplo de rotas administrativas;
- o perfil `consultor` ainda não possui, no trecho auditado, uma limitação robusta e explícita por carteira de clientes;
- algumas telas e permissões da gestão de usuários permanecem mock/local;
- parte das permissões está aplicada no front-end e precisa ser garantida por políticas de banco;
- terminologia, módulos e hierarquia pertencem à Azumi e precisam ser traduzidos para a CALI.

Para a CALI, o People Partner deve partir do conceito de `consultor` do Connect, mas com escopo mais restrito, vínculo explícito por cliente/projeto e nenhuma herança automática das rotas administrativas.

#### Situação do Azumi Connect 1

O repositório foi informado pela Patrícia como referência complementar. Na consulta de 19/09/2026, a integração atual do GitHub retornou 404, possivelmente por privacidade ou ausência de permissão. O link deve permanecer registrado e o código deve ser auditado quando o acesso estiver disponível.

### Decisões ainda necessárias

- timer e lançamento de horas serão padrão ou permissão opcional;
- acesso ao chat interno CALI;
- responsável pela revisão final;
- permissões para documentos, ocorrências, calendário e relatórios;
- acesso a histórico anterior à associação;
- associação apenas por cliente ou também por projeto/entregável;
- substituição temporária, férias e transferência de carteira;
- possibilidade e critérios para envio direto ao cliente.

### Primeira versão recomendada

- carteira por cliente;
- restrição opcional por projeto;
- projetos e entregáveis;
- chat compartilhado e chat interno;
- documentos vinculados;
- timer e horas próprias mediante permissão;
- revisão obrigatória pelo Administrador;
- histórico e auditoria completos.

Relatórios executivos, Mapa de People, propostas, financeiro, administração geral e dados comerciais ficam fora da primeira versão.

### Fora de escopo desta etapa

Nenhum perfil, tabela, política, tela ou convite de People Partner foi criado. Esta seção é exclusivamente um registro para descoberta e especificação futura.
