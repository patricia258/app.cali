# Migração de interface para React e Tailwind

As regras valem para toda a árvore de código. A fila de solicitações da Agenda serve como referência. Use os critérios do [plano](CONSOLIDATION_PLAN.md), o [mapa de arquivos e hooks](ARCHITECTURE.md) e as [regras de estilos](DESIGN_SYSTEM.md).

Listas, controles, cabeçalhos e diálogos operacionais usam primitivas do design system. Ocorrências mantém a gaveta e a conversa no módulo. Equipe mantém o overlay e os formulários no módulo. O carregamento compacto usa máscaras e keyframes na folha do design system.

## Inventário por fluxo

| Recorte | Implementação em revisão | Dependências a verificar |
| --- | --- | --- |
| Agenda | Solicitações, classificação, confirmação, resultados, transcrição, Google, grade e histórico em React. Consultas e mutações em hooks próprios. | Revisar a grade Admin e Cliente em diferentes larguras e conferir cada diálogo. |
| Projetos | Carteira oculta removida. Planejamento, previsão, frentes, acordeão, revisão Admin e Cliente, banner Cliente e Kanban em React. A revisão abre direto em Entregáveis. Cronômetro por tarefa e conversas Admin e Cliente usam componentes e hooks do fluxo. | Os formulários de projeto, frente e entregável compartilham o diálogo de formulário do workspace. Conferir carteira, cronograma e estados dos diálogos. O destaque animado da subtarefa tem keyframe colocalizado. |
| Ocorrências | Encerramento, avaliação, reabertura, exclusão antes da primeira leitura, acompanhamento, conversa, edição e rolagem em React. A conversa acompanha eventos por ocorrência e libera a assinatura ao fechar. Menções usam campo React nos fluxos que as oferecem. | Comparar painel, filtros, compositor, rodapé e suas interações em telas curtas. |
| Propostas e Mapa de People | Lista, briefing, editor e ações da prévia de Propostas usam Tailwind no JSX. A folha editorial mantém medidas, quebra A4 e hierarquia da proposta. Mapa compartilha o componente de envio, com dimensões próprias para lista e revisão. | Comparar navegação direta e após outra tela, abertura do briefing, revisão do Mapa, diálogo de envio e impressão da prévia. |
| Relatórios | Editor, controles, prévia, histórico, leitura e barra de impressão usam utilitários no JSX. O papel carrega medidas A4, marca vetorial, fontes, tabelas e mídia paginada no componente dono. | Comparar a barra, os diálogos, o histórico e as quebras de página com a referência. |
| Horas | Extratos Cliente e Admin, capacidade, visibilidade, filtros, formulários e cronômetros usam utilitários no JSX. Diálogos do Partner compartilham as primitivas de equipe. Timer, lançamento manual e interação externa usam o diálogo de formulário do workspace. | Comparar controles e estados de timer, aprovação e volume. O extrato Cliente mantém todas as colunas com rolagem horizontal em telas estreitas. |
| Home do Cliente | Moldura, grade, agenda, cronograma, cards, indicadores, avisos e equipe usam utilitários no JSX. Os estilos exclusivos saíram das folhas compartilhadas. | Comparar estados com dados, vazios, erro e cronograma no celular. |
| Frentes Cliente | Lista, cards, FAQ, expansão e diálogo de contato usam utilitários no JSX. As regras exclusivas saíram das folhas compartilhadas. | Compare catálogo contratado, indisponível e diálogo de contato. |
| Avisos | Mural, lista, filtros, detalhe, ciência, reações, Agenda, publicação e revisão usam utilitários no JSX. | Comparar o comunicado aberto nos três papéis e o compositor em largura estreita. |
| Formulários Admin e DISC | Lista, lixeira, editor, compartilhamento, tabela e gaveta de respostas usam Tailwind no JSX. Formulários e DISC compartilham tabela, indicador de estado e confirmação. | Conferir filtros, estados de carregamento, colunas fixas, restauração e gavetas com dados no desktop e no celular. |
| Privacidade | Ajuda e pedidos no perfil, painel de auditoria, orientação sobre documentos clínicos, dúvida de relatório, exportação e eliminação usam utilitários nos componentes. A folha operacional de privacidade saiu do shell. | Conferir pedido em aberto, atrasado, respondido, erro e foco de retorno após cancelar. |
| Acesso e público | Login, pré-cadastro, callbacks, MFA, termos, Forms e partes do DISC em componentes e hooks. Texto formatado de Forms e DISC usa JSX. | A Landing tem componentes próprios por seção. Seu CSS local cobre o documento e os tokens da marca. DISC mantém a folha A4. Compare menu, carrossel, movimento reduzido e exportação. |
| Shell e demais módulos | Consultas e mutações em hooks por operação. A apresentação informa a rota destacada ao shell por estado React. Presença e áudio limpam assinaturas e listeners. O relatório do Mapa recebe sessão pela janela vinculada ao fluxo. Avatares e logos são resolvidos por quem os renderiza. | Conferir lista, controles, diálogos, identidade e estados de carregamento nas capturas por papel. |

A migração removeu a folha gerada e as folhas operacionais transversais. A [comparação visual](VISUAL_QA.md) registra as capturas, o ambiente e os resultados.

Satisfação, Equipe e Projetos carregam as folhas de impressão ou movimento pelo módulo dono. O modal de exportação da Visão Geral Admin usa utilitários, e o papel A4 mantém a folha colocalizada para dimensões físicas e isolamento de tema. A aprovação Cliente usa utilitários no próprio painel. O teste de arquitetura impede reintroduzir módulos TypeScript que apenas importam uma folha isolada.

A moldura compacta, os links do menu lateral, a busca, o menu de conta, as notificações, os cabeçalhos Admin e a apresentação usam utilitários nos componentes donos. Os keyframes de entrada dos diálogos ficam junto da moldura. O shell importa apenas a própria folha de movimento. Reset e tema compacto entram no ponto de entrada e têm escopo de rota. Compare abertura e fechamento do menu, busca, navegação do teclado e perfil em Admin, Cliente e Partner. [Moldura](../src/components/workspace/WorkspaceShellLayout.tsx) · [Jornadas](../tests/e2e/workspace-components.cjs)

## CSS que permanece

| Dono | Escopo |
| --- | --- |
| [Estilos base](../src/styles/) | Tokens, fonte, resets por superfície, controles nativos em tema escuro e comportamento da raiz durante rolagem e impressão. |
| [Design system](../src/components/ds/) | Máscaras e movimento do carregamento e controles da base pública. |
| [Shell](../src/components/workspace/) | Tema documental, keyframes e escalonamento da entrada de seções. Navegação, topo, perfil e controles usam Tailwind nos componentes. |
| [Relatórios](../src/components/reports/), [Propostas](../src/modules/admin/proposals/) e [DISC](../src/modules/disc/components/) | Medidas físicas e regras de mídia paginada, fontes, quebras, composição editorial e escala de prévia. |
| [Equipe](../src/modules/team/), [Visão Geral](../src/modules/admin/overview/components/) e [Satisfação](../src/modules/admin/satisfaction/) | Regras de impressão no módulo dono. |
| Módulos com transições | Keyframes locais de cards, diálogos, toast e destaques. Layout e estados interativos ficam no JSX. |

O replay local restaura o dump e aplica 40 migrations. Os contratos SQL e HTTP usam o stack isolado. A validação de interface usa os dois builds com dados sintéticos.
