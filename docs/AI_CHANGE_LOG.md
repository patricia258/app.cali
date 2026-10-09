# Log de mudanças entre agentes (Claude + Codex)

## 2026-10-09 — Codex — integração visual V2 no aplicativo oficial

- Pedido: transportar a V2 aprovada para os fluxos reais, cliente primeiro e administradora depois, na branch `feat/client-visual-v2-inplace-20261008`, sem produção/merge.
- Apresentação V2 no shell e módulos oficiais; tema noturno e todos os atalhos preservados. Seis arquivos CSS consolidados em dois, com conteúdo e ordem idênticos. Removidas 65 declarações de shell substituídas.
- Integridade: 271 fontes operacionais comparadas com `7d817c3`, sem alterações além de imports CSS e marcadores de apresentação. Nenhuma alteração de banco/env/dados.
- Verificações: `npm ci`, typecheck/build por módulo, `git diff --check` e `scripts/verify-v2-operation.cjs` passaram. Chromium local indisponível; instalação falhou. Teste de navegador preparado, ainda não aprovado.
- Handoff e limites: `docs/VISUAL_V2_HOMOLOGACAO_2026-10-09.md`. Homologação visual e regressão autenticada pendentes; nenhum aceite presumido. Rollback por revert nesta branch.

## 2026-10-04 — Codex (conteúdo e hierarquia comercial de Frentes)

- **Pedido:** Pati rejeitou a repetição dos seis cards, o conteúdo raso e a uniformidade da área de ampliação. A página segue **pendente de aprovação visual**.
- **Cliente:** hero bordô mais contido; atalho Frentes identificado por texto no top bar (ícone apenas no mobile); núcleo do plano em uma linha com setas e rolagem discreta. Cada frente agora explica um problema concreto e dois exemplos próprios. A orientação de modalidade do Partner/Full aparece uma vez ao final da seção; há um único contato com a Pati para o que já faz parte do plano.
- **Possibilidades adicionais:** sanfona em duas colunas sem cards vazios esticados, com problema, exemplos e formato de contratação próprios. O botão de interesse abre o modal padrão; só o CTA final abre o WhatsApp administrativo. Frentes ativas, modalidades, números e elegibilidade não foram alterados.
- **Conteúdo:** os exemplos são ilustrativos para explicar o catálogo, não novos entregáveis contratuais. Revisar com a Pati antes de tratar essa copy como descrição jurídica do escopo.
- **Autor:** Codex. **Aprovação:** pendente da Pati. **Validação:** `npm run typecheck` e `npm run build` passaram no código da tela integrado a uma cópia local do app; QA autenticado em dia/noite/mobile ainda pendente.

## 2026-10-04 — Claude (terceira rodada visual de Frentes: padrões de referência)

- **Pedido:** a Pati ainda não aprovou a página ("ainda não gostei"). Ela mandou três telas de referência — uma sanfona de "Dúvidas frequentes", os cards de comparação do próprio site da Azumi RH ("Atração de Talentos ou Hunting Executivo") e um grid de ícones "Para quem serve" — pedindo para usar como referência de **comportamento de layout**, não de cor (app.cali continua em bordô/dourado da Cali, nunca no azul/roxo da Azumi).
- **"Já faz parte do seu plano" (`IncludedCard`):** passa a seguir o padrão do card de comparação da Azumi — etiqueta (`Núcleo {plano}`), título, primeira frase da descrição em destaque, checklist com ícone de check circular (reaproveitando `--theme-success`) com 2 itens (como a Cali atua nesse formato + cadência de acompanhamento), e botão CTA de largura total ("Falar sobre X") que abre o WhatsApp da Paty. Troquei o rodapé-link da rodada 2 pelo botão cheio, mais parecido com o CTA em pílula da referência.
- **"Podemos conversar sobre" (`PossibleCard`):** passa a ser uma sanfona (`<details>`) no estilo "Dúvidas frequentes" da primeira referência — resumo com ícone de cadeado + título + chevron que gira ao abrir; ao expandir, mostra a etiqueta de categoria, a descrição em destaque e a linha de modalidade, com o botão "Entender essa frente" (ADM) dentro da resposta. Grid próprio (`fronts-faq-grid`), lado a lado, sem agrupar por categoria.
- **Cards mais altos/largos** na linha de "Já faz parte" (`fronts-grid-row`), porque agora cada card carrega mais conteúdo (etiqueta + título + frase + checklist + botão) do que a versão anterior.
- **Limpeza:** removi a regra `.fronts-card.possible` (degradê dourado) que ficou sem uso depois que "Podemos conversar sobre" passou a usar `.fronts-faq-card` em vez de `.fronts-card`.
- **Conteúdo — mesmo limite assumido da rodada 2:** continuo sem inventar exemplos específicos por frente; o texto de cada card ainda é a descrição oficial do catálogo + a regra de modalidade da Matriz. Isto ainda não é uma aprovação de conteúdo final, só a estrutura visual pedida.
- **Não mudei:** catálogo, slots, RLS, migração e os dois números de WhatsApp continuam como nas rodadas anteriores.
- **Autor:** Claude. **Aprovação:** aguardando conferência da Pati — ela sinalizou explicitamente que ainda está iterando no design. **Verificação:** `npm run check` e `git diff --check` passaram.

## 2026-10-04 — Claude (segunda rodada visual de Frentes: cor, conteúdo, layout)

- **Pedido:** depois de ver a primeira rodada, a Pati pediu mais seis ajustes diretos: hero bordô sólida (dia e noite) com a folha da marca (`cali-lime-mark.svg`, já usada no menu/watermark) à direita; ícone de check verde abrindo "Já faz parte do seu plano"; cards do núcleo com degradê verde-claro, mais detalhe (tópicos) e um link no rodapé para falar com a Paty; "Podemos conversar sobre" com ícone de conversa, cards lado a lado em vez de empilhados por categoria, e degradê dourado; hover mudando de cor nos cards; destaque de palavras-chave nos tópicos.
- **Conteúdo dos tópicos — limite assumido:** cada card agora mostra 2 linhas: a descrição oficial do catálogo (já existente) e uma segunda linha genérica de "como funciona nesse formato" (derivada da regra de modularidade da Matriz: Partner diagnostica+recomenda+desenha, Full diagnostica+desenha+implanta+acompanha, etc.). Não inventei exemplos específicos por frente — não tenho essa informação com segurança — e deixei um aviso no card ("peça pra Paty detalhar no WhatsApp") em vez de fabricar conteúdo comercial. Se a Pati mandar os exemplos reais por frente, eu insiro.
- **Dois WhatsApp agora diferenciados dentro da própria página:** o link "fale com a Paty" nos cards do núcleo (pergunta sobre algo que já é do cliente) usa o número pessoal dela; o botão "Entender essa frente" (upsell) continua no ADM, como na rodada anterior.
- **Layout "Podemos conversar sobre":** voltou a ser um grid único (lado a lado), sem seções separadas por categoria; cada card leva uma etiqueta pequena (`Núcleo CALI Full` / `Por vaga` / `Serviço avulso` / `Projeto pontual`) e os detalhes ficam num `<details>` (sanfona) pra não pesar visualmente.
- **Não mudei:** catálogo, slots, RLS e migração continuam como o Codex implementou.
- **Autor:** Claude. **Aprovação:** aguardando conferência visual da Pati. **Verificação:** `npm run check` e `git diff --check` passaram.

## 2026-10-04 — Claude (ajuste visual de Frentes, pedido direto da Pati)

- **Pedido:** Pati revisou a tela publicada por Codex (`decd455`) e pediu seis ajustes diretos a mim, sem passar por comando para o Codex desta vez: card do topo menor; ponto de entrada da barra superior mais identificável; núcleo do plano em uma única linha com cards mais detalhados; "Contratadas à parte" fora da página quando vazia; "Podemos conversar sobre" sem card uniforme; hover consistente; e separação dos dois números de WhatsApp (pessoal da Pati vs. administrativo).
- **`ClientFrontsPage.tsx`:** hero reduzido e reescrito como saudação (`Olá, {empresa}!` + explicação do espaço, em vez do título genérico "Frentes de atuação"). "Já faz parte do seu plano" passa a rolar em uma única linha (`fronts-grid-row`), cards mais altos/largos, com rótulo "Núcleo {plano}". A seção "Contratadas à parte" some da página para Partner/Full (passa a viver só no atalho da barra superior); para Build ela continua inline como "Em implantação", porque ali é o conteúdo principal da tela, não um extra. "Podemos conversar sobre" agora agrupa por categoria do catálogo (recorrente/vaga/add-on/projeto), cada grupo com rótulo e ícone próprios, em vez de um grid uniforme.
- **`WorkspaceShell.tsx`:** novo componente `ClientFrontsTopWidgets` substitui o link simples por um atalho com tooltip (`Frentes · {plano}`, mesmo padrão visual e `::after` do atalho de Relatórios) e, só quando a empresa tem frente contratada à parte (Partner/Full), um segundo botão com contador que abre um modal (`modal-system-v3`) listando essas frentes — sem precisar entrar na página.
- **WhatsApp — dois números agora separados:** o CTA "Entender essa frente" (sinal de interesse/upgrade) passa a abrir no número administrativo **41 8787-9244** (`554187879244`), não mais no pessoal da Pati (41 98779-1933). Isso é intencional: upgrade, escopo e dúvidas administrativas vão para o ADM; contato direto com a Pati fica reservado para outros fluxos que pedem isso explicitamente. A mensagem/kicker do modal mudou de "Converse com a Paty" para "Fale com o time Cali" para não prometer a pessoa errada do outro lado.
- **Não mudei:** catálogo, slots, RLS, migração e lógica de ativação continuam exatamente como o Codex implementou — nenhum dado ou regra de negócio foi tocado.
- **Autor:** Claude. **Aprovação:** aguardando conferência visual da Pati (clique real, dia/noite e mobile). **Verificação:** `npm run check` e `git diff --check` passaram.



## 2026-10-03 — Codex (ajuste estrutural de Frentes, após revisão da Pati)

- **Pedido:** corrigir a camada visual e estrutural de Frentes sem alterar catálogo, slots, WhatsApp nem permissões. O resultado anterior ainda não estava aprovado.
- “Entender essa frente” usa o overlay e card de `modal-system-v3.css` (`modal-backdrop full-screen-modal` / `modal-card`), aberto por portal, com `body.workspace-modal-open`, fechamento por Esc, botão ou fundo.
- Removido `contract-fronts.css`. Estilos específicos foram consolidados em `workspace-system-v61.css`, com tokens `--theme-*` para dia e noite, sem duplicar paletas fixas. A entrada da página saiu do sidebar e passou a ser um botão no top bar do cliente; rota e lógica da página permanecem.
- **Autor:** Codex. **Aprovação:** aguardando conferência da Pati. **Validação:** `npm run check` e `git diff --check` passaram. O servidor local abriu, mas a automação visual não estava instalada neste ambiente; dia/noite e mobile ainda requerem clique real. Nenhuma alteração no Supabase nesta rodada.

---

## 2026-10-03 — Codex (pacotes e frentes contratuais)

- **Fonte corrigida pela Pati:** `CALI Workspace — Pacotes, Frentes e Comportamento de Upsell.pdf`. O arquivo anterior não é a referência desta rodada.
- Criado catálogo de frentes separado das frentes operacionais de projeto; ativação explícita por empresa com RLS e trava de slots Partner/Full/Build no banco. Migração `20261003170000_contract_fronts_v1.sql` aplicada no projeto oficial, com 15 itens de catálogo e **zero ativações de clientes**.
- Admin configura a frente na ficha da empresa; cliente vê o núcleo do plano, o que foi contratado à parte e outras possibilidades com conversa consultiva por WhatsApp. Nenhum checkout ou upgrade automático. Planos Build entram no cadastro sem herdar a agenda fixa de Full.
- **Autor:** Codex. **Aprovação:** aguardando Pati. **Verificação:** `npm run check`, catálogo/RLS e contador de ativações no banco; QA autenticado visual ainda pendente. Detalhes e limites em `FRONTES_CONTRATUAIS_2026-10-03.md`.

---

## 2026-10-02 — Codex (Equipe: importação e quadro após teste)

- Corrigido o modal que se fechava ao selecionar CSV: a prévia e o botão de importação permanecem na tela, com nome do arquivo e erro visível. O modelo CSV inclui senioridade, setor, liderança, modelo e unidade, mantendo compatibilidade com o anterior.
- Quadro mostra inicialmente cargo, senioridade, departamento, gestor direto, situação, contrato, jornada e admissão. O código fica na ficha; avatar criticado foi substituído por monograma neutro. Corrigido o contraste do subtítulo no cabeçalho bordô.
- Histórico exibe antes/depois da mudança e indicadores explicam o mês de referência. Ficha pode ser removida da equipe atual com confirmação; a função preserva meses e movimentações anteriores. Desligamento real continua sendo outra operação. Banco: `20261002160000_team_archive_member.sql` aplicado e verificado no projeto oficial. Nenhuma pessoa foi removida por Codex.
- **Autor:** Codex. **Aprovação:** aguardando teste da Pati em ADM e cliente. **Validação:** `npm run check`, estrutura e função no banco; upload autenticado da planilha dela ainda sem conferência visual.

---

## 2026-10-02 — Codex (refino da Equipe após teste real da Pati)

- **Correções de fluxo:** a ficha de pessoa só é enviada na quinta etapa; Enter nas etapas anteriores não grava uma ficha incompleta. Código interno vazio gera identificador CALI único na conclusão, mantendo códigos informados pelo cliente. Senioridade em lista, departamento com sugestões previamente cadastradas, setor opcional, localidade explicada e liderança explicitamente marcada, com indicação na ficha e ao selecionar gestor direto.
- **Revisão mensal:** cada etapa tem ilustração discreta e instrução com ação destacada; a última mostra data/hora da confirmação em São Paulo e mês de referência. Contratação na revisão também aceita código vazio com geração automática. Nenhuma etapa intermediária persiste dados.
- **Histórico e indicadores:** a data da admissão/desligamento é a data efetiva registrada na ficha; a data de cadastro aparece separada como registro. Movimentação antiga cadastrada agora não infla entradas deste mês. Gráficos identificam período e quantidade; o ponto único fica centralizado. A ficha foi redesenhada como modal central contido, com avatar estilizado e molduras coerentes no dia/noite e mobile.
- **Dados:** `team_members.is_leader` e `avatar_style` adicionados por migração; o ícone visual reflete a opção de gênero quando ela foi declarada com a confirmação exigida, enquanto gênero, filhos e remuneração permanecem na tabela privada. A RPC existente mantém a autorização e aceita os novos campos. Migração aplicada e colunas/função verificadas no Supabase oficial. Nenhuma ficha de cliente foi criada para teste.
- **Arquivos:** `src/pages/team/CompanyTeamPage.tsx`, `src/pages/team/TeamMonthWizard.tsx`, `src/pages/team/company-team.css`, `supabase/migrations/20261002133000_team_leader_avatar.sql`. **Autor:** Codex. **Aprovação:** pendente do teste da Pati em ADM e cliente. **Validação:** `npm run check`, `git diff --check` e consultas de estrutura/função no Supabase; interação visual autenticada ainda pendente.

---

## 2026-10-02 — Codex (identidade visual da Equipe para cliente e administrador)

- **Pedido:** aplicar à nova página Equipe os quatro modelos visuais enviados por Pati em 02/10, sobretudo fonte, tamanho, estrutura de cards e modais, para que ela possa testar os fluxos já construídos.
- **Mudança visual:** títulos e números em Inter, sem serifas; fundo com grade e folha discreta; molduras finas, raios e espaçamento no padrão do Workspace; faixa mensal bordô com ação dourada; tabela, filtros e indicadores mais claros. Os modais de cadastro, planilha e revisão mensal compartilham cabeçalho bordô, hierarquia de texto, superfície e rodapé; ficam centralizados com rolagem restrita ao conteúdo quando a altura é curta. Ajustes responsivos e contraste explícito no modo noite. Aplicação no componente compartilhado pelos dois perfis.
- **Escopo:** somente `src/pages/team/company-team.css`. Nenhuma alteração de lógica, dados, permissões ou Supabase. **Autor:** Codex. **Aprovação:** pendente de conferência visual da Pati em ADM e cliente. **Validação:** `npm run check` passou; QA visual autenticado e mobile em produção ainda dependem do teste com as contas reais.

---

## 2026-10-01 — Codex (correção do perfil e vínculo após os cinco prints da Pati)

- **Correção de escopo:** o exemplo MatDash era para a ficha do cliente em `Clientes`, não uma autorização para redesenhar livremente o perfil da pessoa. A versão anterior do perfil foi **reprovada**: abas quebradas, foto estreita, rolagem e assinatura duplicada. Não tratar a entrada anterior como aprovada.
- **Perfil em ambos os papéis:** o modal sai da árvore do sidebar por portal, para impedir que as regras do menu deformem as abas e a foto. Abas horizontais, moldura contida e campos compactos no desktop; no celular o conteúdo pode rolar verticalmente quando a tela for pequena, para manter campos e ações acessíveis. Ajuste da foto permanece recolhido.
- **Assinatura:** um único campo em fonte caligráfica, sem prévia gigante, lápis decorativo nem escolha de dez estilos. Assinaturas enviadas anteriormente continuam visíveis e podem voltar ao nome digitado; a alternativa de enviar imagem permanece discreta. O estilo gerado é caligráfico para ambos os perfis.
- **Cliente:** faixa de identidade com logo real resolvida do Storage, nome da empresa e texto objetivo “Perfil cliente”. Na ficha administrativa do cliente, aviso de vínculo em título e apoio, sem indicar uma “gestão de acesso” inexistente nessa tela.
- **Arquivos:** `src/components/DirectProfileControl.tsx`, `src/profile-correction-v67.css`, `src/main.tsx`, `src/pages/admin/AdminClientsPageV3.tsx`. **Autor:** Codex. **Aprovação:** aguardando Pati. **Validação:** `npm run check` passou; inspeção autenticada dia/noite e mobile ainda pendente. A política do Workspace segue sob redação do Cláudio, sem alteração neste commit.

---

## 2026-10-01 — Codex (revisão visual do perfil após correção da Pati)

- **Correção da Pati:** a revisão anterior resolveu a assinatura e os dados, mas não aplicou a estrutura visual dos prints do perfil. Os prints MatDash mostram agrupamento de foto e dados pessoais e navegação por áreas; a tela de termos foi referência apenas para a prévia caligráfica, sem copiar o texto ou inventar aceite.
- **Mudança:** modal de perfil comum a admin e cliente agora tem abas reais **Dados pessoais** e **Assinatura**. Foto e dados ficam em áreas lado a lado no desktop e empilhadas no celular. Zoom e posição da foto continuam disponíveis sob **Ajustar enquadramento**, sem ocupar a primeira tela. Assinatura fica em área própria com nome digitado e prévia. Mantidos os campos e a RPC existentes, sem criar funcionalidades fictícias de cobrança, notificações ou segurança a partir dos exemplos.
- **Privacidade:** Claude está encarregado pela Pati da redação de uma política que cubra o Workspace. Este ajuste visual não altera a política pública. O link atual segue identificado como política do site, Mapa e Portal; aguardar o texto novo antes de afirmar que cobre o app.
- **Arquivos:** `src/components/DirectProfileControl.tsx`, `src/profile-account-v66.css`, `src/main.tsx`. **Validação:** `npm run check` passou; inspeção visual com conta autenticada, modos dia/noite e celular ainda pendente. **Aprovação:** aguardando Pati. **Autor:** Codex.

---

## 2026-10-01 — Codex (perfil, decisor e auditoria de privacidade)

- **Pedido da Pati:** deixar claro a que produto pertence a política publicada; revisar completude do Workspace; melhorar perfil em ambos os papéis, sobretudo a assinatura; vincular decisor cadastrado à pessoa que realmente acessa a empresa.
- **Privacidade:** página pública de 21/08 cobre expressamente site, Mapa e Portal, sem inventário suficiente do app. O link no login e no perfil foi nomeado conforme seu escopo atual. `docs/WORKSPACE_PRIVACY_AUDIT_2026-10-01.md` lista lacunas de dados, retenção, terceiros e aceites. Revisão jurídica e inventário operacional continuam abertos; não apresentar a página como completa para o Workspace.
- **Perfil:** assinatura reduzida a uma prévia caligráfica do nome digitado ou imagem enviada, sem seletor longo; agrupamento menor e contraste explícito nos temas. Salvar perfil não equivale a ciência de documento. O cliente vê a empresa à qual seu acesso está vinculado.
- **Vínculo de dados:** após ativação, o perfil principal com mesmo par empresa/e-mail é fonte do nome, cargo e contatos; o convite continua sendo referência antes do acesso. Migração `20261001110000_primary_contact_profile_link.sql` sincroniza salvamento do próprio perfil e da ficha administrativa em uma RPC restrita ao admin; e-mail vinculado não muda por edição cadastral comum. O registro de teste divergente foi conciliado a partir do perfil real, sem apagar a conta. A tela administrativa indica o vínculo.
- **Validação:** migração aplicada no projeto Supabase e divergência do cadastro principal reduzida de 1 para 0; `npm run check` passou. QA visual autenticado, tela pequena e aceite real de relatório ainda exigem conferência. **Autor:** Codex. **Aprovação visual:** aguardando Pati. Não alterar esse fluxo sem verificar os dois sentidos da sincronização e o convite pendente.

---

## 2026-10-01 — Codex (detalhe do calendário, link de privacidade e revisão do handoff legal)

- **Pedido da Pati:** convidados cortados no detalhe do calendário; modal com tamanho moderado; link de privacidade removido da barra lateral e colocado no perfil; leitura crítica do levantamento legal do Claude.
- **Interface:** no evento Google, a área de informações rola dentro do modal compacto e mantém convidados e ações acessíveis. O link de privacidade permanece no login, sai da barra lateral recolhida/expandida e aparece dentro de **Perfil e canais de contato**, tanto para cliente como admin. Sem alteração de dados nem da agenda.
- **Correção ao levantamento de 30/09, preservado abaixo com autoria Claude:** a página pública de 21/08 diz expressamente que explica o **site, Mapa e Portal**, e apenas contém um link para o Workspace. Não descreve suficientemente o tratamento interno do app (contas, documentos, relatórios, ocorrências, agenda/Google, retenção por categoria e encerramento). A seção 06 condiciona eliminação/anonimização a "quando aplicável"; não promete expurgo automático no instante do encerramento. Mesmo assim, a retenção real sem rotina/prazo definido precisa ser mapeada e explicada antes de apresentar a página como política completa do app.
- **Modelo comercial confirmado pela Pati:** Workspace é parte do contrato de consultoria Partner/Full/Build, não um SaaS separado. Um acesso incluído e acesso adicional cobrado são regras comerciais desejadas, **ainda não comprovadas como limite automático de usuários nem como cobrança implementada**. Cadastrar login de cliente não cria por si uma cadeira paga na Vercel: as cadeiras Vercel são de membros que administram/deployam o projeto. Supabase Auth cobra/limita por usuários ativos mensais, além de uso de banco, storage, tráfego e funções. Conferir cotas e conta efetiva antes de prometer custo zero por cliente.
- **Pendências com responsáveis:** (1) Pati + jurídico: revisar anexo do contrato para acesso incluído/adicionais, titularidade e acesso aos dados, papéis de controlador/operador por fluxo, encerramento/exportação, prazos de guarda, suboperadores e incidentes; (2) jurídico + produto: publicar aviso/política específica do Workspace ou ampliar a atual com categorias, bases, finalidades, compartilhamento/transferência e retenção reais; (3) engenharia: inventário dos dados, localização de armazenamento/fornecedores, limites de acesso, backup/restauração, retenção/eliminação por categoria e evidências de ciência; (4) operação: canal de titulares e procedimento de incidentes. **Não tratar link como aceite ou como conformidade completa.** Não publicar termos jurídicos fictícios nem exclusão automática antes dessas decisões.
- **Fontes verificadas em 01/10/2026:** https://calirh.com/privacidade.html ; https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado ; https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022 ; https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 ; https://supabase.com/docs/guides/platform/billing-on-supabase ; https://vercel.com/docs/plans/pro-plan .
- **Arquivos:** `src/page4-calendar.css`, `src/components/WorkspaceShell.tsx`, `src/components/DirectProfileControl.tsx`, `src/styles.css`, este log. **Verificação:** `npm run check` passou; QA visual autenticado do modal e do perfil ainda pendente. **Aprovação:** posicionamento do link e correção solicitados por Pati; resultado visual aguardando conferência. **Autor:** Codex.

---

## 2026-09-29 — Codex (prévias de agenda, recusa e contraste noite)

- **Pedido da Pati:** os prints das 14h04–14h07 mostram o modo noite com contraste falho, uma solicitação reduzida a “2 opções”, recusa chamada “não confirmado”, prazo de entregável sem projeto e necessidade de ver as duas datas propostas como simulação na agenda administrativa e do cliente.
- **Implementação:** cada opção pendente aparece em sua data e duração reais, com título, etiqueta de prévia extra e borda pontilhada. A prévia informa que não confirma nem reserva a agenda; não participa dos indicadores de compromissos nem do carrossel administrativo. A agenda administrativa consulta pedidos reais e atualiza ao receber mudança no Supabase. A recusa recebe texto “Recusado”, estado vermelho e datas riscadas no cliente; a ação administrativa pede justificativa com o verbo “Recusar”. O prazo de entregável mostra seu projeto quando cadastrado. Contraste do modo noite foi definido explicitamente para eventos e cabeçalhos dos detalhes.
- **Arquivos:** `src/domain/calendar.ts`, `src/pages/admin/AdminCalendarPage.tsx`, `src/pages/client/ClientTimelinePage.tsx`, `src/page4-calendar.css`, `src/client-timeline-v3.css`, `src/lib/schedulingRequestsRuntimeV65.ts`, `src/components/AgendaChangeInbox.tsx`.
- **Autor:** Codex. **Aprovação:** aguardando conferência da Pati nas contas reais. **Verificação:** `npm run check` passou. As prévias são calculadas a partir de `scheduling_requests`; nenhum evento foi criado, confirmado ou cobrado por esta mudança. Respeitar o contraste dia/noite também em futuros modais e estados.

---

## 2026-09-29 — Codex (respiro e legibilidade do calendário administrativo)

- **Pedido da Pati:** os prints das 13h32–13h36 mostram semana estreita, filtros e busca truncados, legendas e horários apertados, eventos sobrepostos com texto ilegível e detalhe Google com espaço e ícones mal distribuídos. O calendário semanal é a prioridade visual.
- **Ajuste:** a semana usa toda a largura disponível; mini mês e tipos de evento ficam abaixo, em cartões proporcionais com rótulos legíveis. Busca ganha largura mínima; eixo de horas não invade “Dia inteiro”. Eventos do Workspace recebem fundo opaco na sobreposição e os do Google escolhem texto claro/escuro pela luminosidade da cor efetiva. Detalhe Google usa ícone de agenda, título com quebra de linha e ações próximas ao conteúdo, sem altura vazia forçada.
- **Arquivos:** `src/page4-calendar.css`, `src/pages/admin/AdminCalendarPage.tsx`. **Autoria:** Codex. **Aprovação:** aguardando conferência visual da Pati nos modos dia/noite e em telas menores. **Verificação:** `npm run check` passou; não houve alteração de dados, sincronização ou regras da agenda. Não usar o antigo layout de lateral estreita como referência em novos ajustes.

---

## 2026-09-29 — Codex (agenda compacta, detalhe e semana do cliente)

- **Pedido da Pati:** remover dois cards enormes (alterações e histórico de reuniões); mostrar próximos compromissos em carrossel acima dos filtros; reduzir mini calendário e tipos; empilhar eventos sobrepostos; respeitar a cor escolhida no Google; detalhe de evento enxuto, em português, com horário, anotações e endereço clicável. No perfil do cliente, abrir por semana, permitir escolher o que ver e reduzir cards grandes.
- **Implementação:** alterações de reuniões ficam em botão compacto com contador, abrindo o mesmo fluxo de análise; histórico passa a botão/modal com os filtros e transcrições preservados. Os próximos compromissos formam carrossel horizontal. O painel Google e a lateral foram compactados. Eventos sobrepostos usam leve deslocamento na mesma coluna para manter cada faixa clicável. A API prioriza a cor específica do evento Google e deduplica cópias preferindo a que guarda essa cor. O detalhe pessoal abre em formato de linhas, com edição direcionada ao Google, compartilhamento por e-mail, data/horário em pt-BR, notas e mapa clicável; não foi criada exclusão falsa sem permissão de escrita.
- **Cliente:** a navegação passa a chamar “Agenda e Planejamento”; visão semanal e lista com filtros para reuniões, solicitações, prazos e, opcionalmente, compromissos da própria conta Google conectada. Consulta desses compromissos é protegida por JWT e verifica usuário e empresa, sem revelar a agenda da administradora. O painel de conexão fica recolhível; métricas compactas e detalhe com linhas mais claras. Eventos simultâneos na semana do cliente ficam levemente deslocados e clicáveis; cores claras do Google recebem texto escuro para manter contraste. A grade semanal do cliente também tem eixo de horas visível.
- **Arquivos:** `src/components/AgendaChangeInbox.tsx`, `src/components/agenda-change-inbox.css`, `src/pages/admin/AdminCalendarPage.tsx`, `src/page4-calendar.css`, `src/pages/client/ClientTimelinePage.tsx`, `src/client-timeline-v3.css`, `src/components/WorkspaceShell.tsx`, `src/domain/calendar.ts`, `supabase/functions/workspace-google-calendar-read/index.ts`.
- **Autor:** Codex. **Aprovação:** aguardando avaliação visual da Pati. **Verificação:** `npm run check` passou; Edge Function versão 4 ativa. Teste visual com conta Google autenticada ainda pendente. A conexão Google do cliente pode exigir nova autorização de leitura se tiver sido feita com escopo antigo.

---

## 2026-09-29 — Codex (visão semanal do calendário administrativo)

- **Pedido da Pati:** abrir o calendário pela semana, distinguir os eventos importados do Google dos criados no Workspace, reproduzir as cores do Google e fazer cada bloco ocupar exatamente sua duração (por exemplo, 10h–10h30), inclusive quando há eventos simultâneos.
- **Implementação:** grade semanal posicionada por minuto, com largura dividida entre compromissos sobrepostos, faixa separada para dia inteiro e rótulo de origem. Eventos Google usam a cor do próprio evento ou da agenda por meio da API Colors; eventos internos mantêm a identidade CALI. A visualização mensal continua disponível. Contraste calculado para fundo claro/escuro. A função de leitura mantém a verificação JWT e não expõe títulos aos clientes.
- **Arquivos:** `src/pages/admin/AdminCalendarPage.tsx`, `src/page4-calendar.css`, `src/domain/calendar.ts`, `supabase/functions/workspace-google-calendar-read/index.ts`.
- **Autor:** Codex. **Aprovação:** aguardando conferência visual da Pati. **Validação:** `npm run check` passou; função Edge implantada (versão 3). Conferência visual autenticada com eventos reais ainda pendente.

---

## 2026-09-29 — Codex (agenda Google e horários ocupados)

- **Pedido da Pati:** mostrar no calendário administrativo os compromissos da agenda real do Google Workspace. Avisar ao cliente que uma opção está ocupada, sem impedir pedido de análise excepcional. Bloquear envio duplicado de horários pendentes da mesma empresa.
- **Implementação:** a reconexão Google solicita leitura. A função protegida consulta todas as agendas da conta administrativa; títulos e detalhes são visíveis só à administradora, e clientes recebem apenas um indicador de ocupado. A agenda administrativa lê o mês e os meses adjacentes ao abrir, atualiza a cada cinco minutos enquanto a tela está aberta e não duplica eventos CALI já vinculados ao Google. Horários ocupados exigem confirmação específica no modal; a decisão final continua com a Pati. Uma trava transacional no banco bloqueia pedidos pendentes sobrepostos da mesma empresa.
- **Arquivos:** `supabase/functions/google-calendar-oauth/index.ts`, `supabase/functions/workspace-google-calendar-read/index.ts`, `src/pages/admin/AdminCalendarPage.tsx`, `src/components/ExtraVisitRequest.tsx`, `src/components/extra-visit-request.css`, `supabase/migrations/20260929152000_scheduling_duplicate_pending_slots.sql`.
- **Autor:** Codex. **Aprovação:** aguardando conferência visual da Pati. **Ativação:** `patricia@calirh.com` estava conectada com permissão antiga. É necessário usar **Autorizar leitura da agenda** e aceitar a nova permissão na conta Google. Antes disso o produto sinaliza que não conferiu a disponibilidade. Não guarda detalhes pessoais do Google no banco; a leitura ocorre sob demanda e a cada cinco minutos na tela do calendário.

---

## 2026-09-29 — Codex (revisão da visita extra, calendário e agenda)

- **Pedido e aprovação:** observações da Pati nos prints das 21h23–22h01 de 28/09. Ela solicitou alterações; resultado visual ainda `aguardando avaliação`.
- **Visual e copy:** contraste explícito entre fundo e texto/ícones nos modos dia e noite; cabeçalho da visita usa Inter, branco sobre bordô e folha CALI. Condições terminam em “Vamos prosseguir?”. Campos separados de endereço, empresa, anexo opcional e justificativa para segunda-feira; confirmação mostra dia da semana e horários destacados. Botões do topbar menores e coerentes com o Workspace.
- **Admin:** botão de solicitações só no calendário, painel com blur e entrada suave, um pedido por vez com paginação; capa com logo, solicitante, status, local clicável, anexos e ações existentes. Gastos da visita em linhas repetíveis (deslocamento, estacionamento, alimentação e horas adicionais), com comprovante opcional. Para horas adicionais, exige quantidade e referência do orçamento aprovado. Protocolo em cada linha e auditoria interna.
- **Cliente:** agenda em cartões compactos com botão “Ver detalhes” explícito; modal legível e responsivo. Comprovantes e protocolos das despesas ficam no histórico da visita. Relatório executivo mostra visitas concluídas e despesas da competência numa página para conciliação (não gera fatura).
- **Banco e arquivos:** `src/components/ExtraVisitRequest.tsx`, `ExtraVisitExpenses.tsx`, estilos correspondentes, `src/lib/schedulingRequestsRuntimeV65.ts`, `src/pages/client/ClientTimelinePage.tsx`, `src/client-timeline-v3.css`, `src/components/reports/ExecutiveReportPaperV17.tsx`, migração `20260929012000_extra_visit_ux_evidence.sql`. A migração cria anexo privado por pedido, flexibiliza comprovante de despesa, registra protocolo e auditoria, restringe as funções a usuários autenticados. Aplicada ao Supabase e confirmada por consulta de catálogo; `npm run check` validado. Fluxo real autenticado e aparência em navegador seguem para conferência após deploy.
- **Handoff:** regra permanente de contraste: fundo claro → texto/ícone escuro; fundo escuro → texto/ícone claro, em ambos os temas e perfis. FAQ contextual por pacote registrado em `docs/VISITA_EXTRA_SPEC.md` como item aberto para especificação. Carro próprio (R$/km), aprovação formal de horas adicionais e emissão de fatura continuam fora deste fluxo; não confundir registro de conciliação com cobrança automática.

---

## 2026-09-29 — Codex (reuniões, transcrições e detalhe da agenda)

- **Pedido:** botões “Solicitar visita presencial” e “Solicitar reunião online”, deixando as condições de cobrança dentro do respectivo pedido. Reorganizar o detalhe do evento no administrador com estados por cor e ações agrupadas. Consultar reuniões online/presenciais por período e resultado; disponibilizar transcrição no histórico com aviso automático por e-mail ao cliente.
- **Implementação:** o pedido de reunião iniciado pelo cliente é classificado como adicional e requer orçamento informado pela CALI e aceito pelo cliente antes da confirmação; os encontros incluídos no Partner/Full continuam organizados pela CALI. Não foi presumido um preço fixo para reunião online. No cliente, reagendamento/cancelamento abre um alerta separado, com justificativa e duas datas, e entra em análise; o evento ordinário fica intacto até a decisão. A visita extra mantém seu histórico específico e agora exige 48 horas úteis para as datas de reagendamento, enquanto a primeira solicitação mantém 48 horas corridas.
- **Administrador:** seção recolhível de histórico com filtros por mês, formato e situação, incluindo canceladas e não realizadas. Modal de detalhe com cabeçalho verde, amarelo ou vermelho conforme estado e duas áreas de ações. Registro e anexo de transcrição continuam no detalhe do encontro. Ao salvar um novo link ou anexo, trigger cria notificação para cada usuário ativo da conta e aciona o hook existente de e-mail; atualizações apenas da observação não repetem o aviso.
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `src/lib/schedulingRequestsRuntimeV65.ts`, `src/lib/schedulingPolicyRuntimeV66.ts`, `src/lib/schedulingPostConfirmationV69.ts`, `src/pages/admin/AdminCalendarPage.tsx`, `src/pages/client/ClientTimelinePage.tsx`, CSS relacionados e `supabase/migrations/20260929040000_agenda_changes_and_meeting_records.sql`.
- **Autor:** Codex. **Aprovação:** pendente de conferência da Pati. **Regra para Claude e Codex:** em ambos os temas, texto/ícones devem ter contraste legível; dados de agenda e histórico vêm do Supabase, não de mock. Evitar mexer nos componentes citados sem ler esta entrada e a migration. **Em aberto:** desenho próprio da agenda fixa mensal CALI Full, quilometragem de carro próprio e timing fino do faturamento; orçamento de reunião online é individual.

---

## 2026-09-29 — Codex (entrada única para agendamentos adicionais)

- **Pedido da Pati:** reaproveitar o botão do topbar, amarelo nos temas dia e noite, com o texto “Agende aqui um papo com a Pati”. A primeira tela escolhe visita presencial na sede ou bate-papo online e explica que o espaço é só para encontros fora da agenda mensal incluída. Cada caminho mostra suas condições antes de pedir duas datas, seguido da revisão e da ciência. Remover a faixa grande “Agenda com a CALI / Reunião online” do Planejamento.
- **Entrega:** `ExtraVisitRequest` agora oferece escolha de formato e usa a mesma moldura e transição para as três etapas de cada caminho. A visita conserva R$ 800/4h, endereço, segunda-feira sob análise, despesas e sua RPC. O online permite duração de 30–90 minutos, duas opções até as 16h, informa que orçamento e aceite vêm antes da confirmação e registra nome completo e ciência em `client_request_online_extra_v2`. A RPC antiga `v1` deixou de ser executável diretamente pelo cliente. O card de origem da reunião online foi retirado; uma faixa compacta só aparece quando existe orçamento ou proposta de horário esperando resposta, para não esconder a ação necessária. Histórico geral de pedidos continua na agenda do cliente; encontros confirmados ficam como eventos para consulta da transcrição.
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `src/components/extra-visit-request.css`, `src/lib/schedulingRequestsRuntimeV65.ts`, `src/lib/schedulingPolicyRuntimeV66.ts`, `src/pages/client/ClientTimelinePage.tsx`, `supabase/migrations/20260929130000_online_extra_unified_request.sql`.
- **Autor:** Codex. **Aprovação:** aguardando conferência visual da Pati, sobretudo no celular. **Verificações:** `npm run check` passou; schema/RPC/permissões consultados no Supabase. Nenhum preço de reunião online foi presumido. **Separação importante para Claude:** Partner e Full têm encontros contratuais organizados pela CALI; este botão cria apenas pedidos adicionais.

---

## 2026-09-28 — Codex (modal da visita extra)

- **Pedido:** Pati mostrou o modal abrindo com o topo fora da tela e pediu centralização, fundo desfocado e conteúdo sem rolagem sempre que possível.
- **Ajuste:** `ExtraVisitRequest.tsx` agora renderiza o overlay no `document.body`, fora do topbar que usa `backdrop-filter`; bloqueia a rolagem da página enquanto está aberto e organiza condições, datas e ciência em três etapas curtas. `extra-visit-request.css` centraliza o painel no viewport, mantém blur atrás e oferece rolagem interna somente em telas excepcionalmente baixas. O aceite e as validações continuam iguais.
- **Verificação:** typecheck/build e revisão estática. O navegador automatizado local não tinha binário Chromium disponível para teste visual nesta sessão; aguarda conferência no ambiente autenticado.
- **Autoria/aprovação:** Codex; ajuste solicitado pela Pati, visual final `aguardando avaliação`.

---

## 2026-09-28 — Codex (implementação da visita extra)

- **Escopo:** Workspace, agenda do cliente e calendário administrativo, com migrações Supabase. Pedido explícito da Pati: “você vai codar”, após aprovar as regras documentadas por Claude em `docs/VISITA_EXTRA_SPEC.md`.
- **Mudança:** botão “Solicitar visita extra” no topbar do cliente; formulário em voz da Patrícia com R$ 800,00/4h para todos os planos, duas datas, antecedência mínima de 48 horas corridas, 9h–16h Brasília, segunda-feira sinalizada para avaliação manual, despesas comprovadas à parte, taxa de 20% sujeita a decisão manual, nome completo digitado e ciência gravada. O pedido reutiliza `scheduling_requests` com snapshot de termos/preço e `meeting_entitlement=extra`, sem consumir a visita incluída. Admin confirma uma opção diretamente na agenda ou envia duas alternativas; cliente pode responder com duas novas datas. Notificações e evento são persistidos no Supabase. Após a realização, admin anexa comprovantes de despesas em armazenamento privado; cliente pode abri-los no histórico. Não ocorrência recebe avaliação expressa da taxa (R$ 160,00 ou isenção), com motivo registrado.
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `ExtraVisitExpenses.tsx`, `extra-visit-request.css`, `WorkspaceShell.tsx`, `src/lib/schedulingRequestsRuntimeV65.ts`, `schedulingPolicyRuntimeV66.ts`, migrações `20260928223000`–`20260928223400`.
- **Limites:** quilometragem/carro próprio permanece sem lançamento automático até definição de R$/km. A visita de mais de 4 horas exige orçamento e aprovação em procedimento separado; não há tarifa automática. Os valores são registrados para conciliação na competência da visita, mas **não criam nem alteram fatura automaticamente**. A agenda fixa recorrente mensal do CALI Full é outro recurso ainda sem desenho aprovado. Validação local: `npm run check`; migrações aplicadas no projeto Supabase da CALI. Teste autenticado ponta a ponta e inspeção visual dependem de acesso às contas cliente/admin.
- **Aprovação:** regras aprovadas pela Pati; implementação `aguardando avaliação`.

---

Registro contínuo, por ordem cronológica, de toda mudança feita por qualquer um dos dois agentes neste repositório. Formato herdado do handoff `docs/HANDOFF-CODEX-CALI-2026-09-26.md` (seção 8), para manter os dois agentes na mesma referência.

| Campo | Registrar |
| --- | --- |
| Agente/data | Nome de quem fez, data e qual solicitação da Pati atendeu. |
| Superfície/escopo | Site, Portal, Mapa ou Workspace; visual, conteúdo ou funcionalidade. |
| Mudança e copy | Arquivos, componentes, trechos de texto antes/depois quando relevante, comportamento. |
| Entrega | Repositório/branch/commit/PR, deploy e verificação realizados. |
| Aprovação | Frase ou pedido expresso da Pati; marcar `aprovado`, `ajustes pedidos` ou `aguardando avaliação`. |
| Limites | O que não foi testado ou depende de inspeção; conflitos conhecidos. |

## Regra permanente (Pati, 26/09/2026)

Qualquer ajuste visual/funcional feito numa "view" (tela, componente ou padrão) que exista replicada nos diferentes perfis (admin e cliente) precisa ser aplicado de forma **idêntica** nos dois lados — mesma regra, mesmo comportamento. Não vale corrigir só a versão do admin e deixar a do cliente com o bug antigo (ou vice-versa). Antes de marcar uma correção como concluída, checar explicitamente se existe uma versão da mesma tela/componente no outro perfil e replicar lá também, ou registrar por que não se aplica (ex.: a tela só existe em um dos perfis).

## Regra permanente (Pati, 28/09/2026 — modais e day/night)

Duas regras técnicas, pro handoff entre Claude e Codex, a partir do bug encontrado no modal "Despesas de visitas extras":

1. **Todo modal/dialog de tela cheia (`position:fixed` cobrindo o backdrop) precisa ser renderizado via `createPortal(..., document.body)` em React** (ou equivalente, anexado direto ao `<body>`, se for código vanilla). `.topbar` tem `backdrop-filter: blur(...)`, e qualquer ancestral com `backdrop-filter`/`filter`/`transform` vira o "containing block" de um descendente `position:fixed` — ou seja, se o modal for renderizado como filho de algo dentro do topbar (ex.: ao lado do botão que o abre), ele para de se posicionar em relação à tela inteira e quebra (fica descentralizado, cortado, com blur no lugar errado). O componente `ExtraVisitRequest.tsx` já fazia isso certo (comentário no CSS registra o motivo); `ExtraVisitExpenses.tsx` não fazia — corrigido nesta entrada.
2. **Um modal com fundo de cor fixa (não muda entre dia/noite) não deve ter o texto dependendo de variável de tema** (`var(--theme-text)` etc.) — o texto dele deve ser uma cor fixa própria, compatível com aquele fundo específico, senão corre o risco de ficar ilegível (ex.: texto escuro sobre fundo bordô) dependendo do que a página ao redor está fazendo. Elementos com fundo adaptável (`var(--theme-surface)`) continuam usando as variáveis normalmente — a regra vale só pra fundo fixo.

---

## 2026-09-26 — Claude

- **Superfície/escopo:** Workspace (`app.cali`). Funcionalidade — geração da imagem de logo do cliente. Sem alteração visual de layout, texto, cor de tela, e-mail ou Resend.
- **Mudança e copy:** `src/lib/companyWorkspaceLogo.ts`, função `createWorkspaceLogoBlob`. Antes: todo pixel de primeiro-plano detectado na logo original era pintado com a cor sólida da marca CALI (`WORKSPACE_MARK #5A1E2D`), produzindo uma silhueta monocromática sobre fundo marfim. Depois: os mesmos pixels de primeiro-plano mantêm sua cor original (`pixels.data[i/i+1/i+2]`); o recorte automático do fundo, o enquadramento centralizado e o preenchimento da moldura (tile 256px, padding, fit por bounding box) continuam idênticos. Removida a função auxiliar `rgb()` e a variável `mark`, que ficaram sem uso.
- **Entrega:** Commit `9d08117`, enviado a `main` (`patricia258/app.cali`). `npm run check` (typecheck + build) executado localmente — passou sem erros.
- **Aprovação:** Pati descreveu o problema e pediu explicitamente a remoção da recoloração, mantendo a moldura, em mensagem de 26/09/2026 às 21:00 ("ok" ao resumo do escopo). `aprovado` para este escopo específico.
- **Limites:** Só corrigia a geração de **novas** logos Workspace. Ver entrada seguinte (mesmo dia) — havia um segundo sistema, independente, que ainda aplicava a versão gerada/recolorida por cima do que a tela já renderizava corretamente. Nenhuma alteração em Supabase, Edge Functions, e-mail/Resend ou banco de dados.

---

## 2026-09-26 — Claude (2ª correção, mesmo dia)

- **Superfície/escopo:** Workspace (`app.cali`). Funcionalidade — de onde vem a imagem de logo do cliente exibida em toda a aplicação (admin e cliente). Sem alteração de layout, texto, e-mail ou Resend.
- **Mudança e copy:** Depois do primeiro deploy, a Pati relatou (26/09, 21:20) que ao dar refresh a logo aparecia em 3 estágios ("logo azul, logo maior, logo menor"). Investigando, encontrei a causa real: existem dois sistemas independentes escrevendo na mesma imagem — (1) cada página React já resolve e mostra a logo original (`logo_url`) corretamente; (2) um conjunto de rotinas de fundo que rodam em paralelo (`companyWorkspaceIdentityRuntimeV39.ts`, `hoursCompanyLogoRuntimeV41.ts`, `documentsIdentityRuntimeV42.ts`, `identityMediaRuntime.ts`, e o registro central em `companyWorkspaceLogo.ts`) — essas ainda buscavam e sobrescreviam a imagem pela versão gerada/recortada em tile (`logo_workspace_url`), assíncrona e depois do primeiro render, causando a troca visível. Mudei a ordem de preferência nesses 5 arquivos para sempre usar `logo_url` (original) primeiro, com `logo_workspace_url` só como reserva se não houver original. Removidas as chamadas que geravam a versão em tile sob demanda (`ensureCompanyWorkspaceLogo`) em `hoursCompanyLogoRuntimeV41.ts` e `projectsClientPortfolioRuntimeV39.ts`, já sem uso. Nenhuma mudança na moldura/CSS de enquadramento.
- **Entrega:** Commit `828f64c`, enviado a `main` (`patricia258/app.cali`). `npm run check` (typecheck + build) passou sem erros.
- **Aprovação:** Pati relatou o sintoma pós-deploy e pediu explicitamente "apareça apenas a logo azul... foto original da logo em todos os lugares" (26/09/2026, 21:20). Confirmou em seguida (21:28) que funcionou: "Deu certo agora". `aprovado`.
- **Limites:** Empresas que já têm `logo_workspace_url` gravado no banco (da geração antiga, recolorida) não foram limpas/regeneradas; como `logo_url` agora tem prioridade em todos os pontos de leitura, isso não deveria mais aparecer na tela, mas a coluna antiga continua no banco até uma limpeza futura, se a Pati quiser. Não toquei em `src/components/reports/ExecutiveReportPaperV16.tsx` (PDF de relatório) nem em nada de e-mail/Resend — fora do escopo pedido.

---

## 2026-09-26 — Claude (3ª e 4ª correções, mesmo dia)

- **Superfície/escopo:** Workspace (`app.cali`). Duas correções visuais/performance separadas, pedidas juntas na mesma mensagem (21:28).
- **Mudança e copy (1 — enquadramento da logo):** Logo confirmada funcionando, mas Pati notou que uma logo retangular real (cadastrada num cliente) aparecia "encolhida" dentro da moldura quadrada de cantos arredondados, em vez de preencher completamente (como uma foto de perfil recortada). Causa: `object-fit: contain` em vez de `cover` em 7 arquivos CSS (`dashboard-overview-live.css`, `documents-v3.css`, `global-timer.css`, `page2-account-tabs.css`, `page4-calendar.css`, `project-approval-workflow-v38.css`, `project-client-portfolio-v39.css`), cobrindo Visão Geral admin, Documentos, timer global, Calendário, Satisfação, Projetos e o editor de logo da conta. Trocado para `cover` e removido padding que deixava vão entre imagem e borda.
- **Mudança e copy (2 — sidebar lento):** Pati relatou que o menu lateral abre/fecha devagar no hover ("tempo demais"). Causa: `src/uxui-shell-dashboard-preview.css` tinha 3 blocos duplicados/conflitantes controlando a mesma transição de largura (.34s → .46s "refinamento final" → .34s "última palavra de especificidade") mais um quarto bloco em .32s — sobras de iterações anteriores não consolidadas, sem relação com este pedido, encontradas ao investigar. Reduzidas as 4 ocorrências para .18s, no mesmo ritmo já usado nos links do menu.
- **Entrega:** Commits `0e05c6f` (logo/moldura) e `e31a480` (sidebar), ambos em `main`. `npm run check` validado localmente nos dois.
- **Aprovação:** Pati pediu ambas explicitamente na mensagem de 26/09/2026 21:28. `aguardando avaliação` — ainda não confirmou visualmente nenhuma das duas.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. Não toquei em `people-map-report.css` (`.pmr-logo`, capa do relatório do Mapa de People) nem em `reports-v14-clarity.css` (`.reports-v14-official-logo`) — são contextos de documento/impressão, fora do que a Pati descreveu como "telas com foto do cliente"; se ela quiser o mesmo tratamento lá, preciso de confirmação explícita antes, por tocarem em material que pode ser exportado/enviado ao cliente.

---

## 2026-09-26 — Claude (piloto: remover card de título duplicado)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — remoção do card de identidade da página (ícone + categoria + h1 + descrição) que se repetia por baixo do topbar, que já mostra o nome da página. Piloto de um padrão a aplicar em todas as páginas depois de validado.
- **Mudança e copy:** Pati mandou print da página Projetos (admin) e pediu para remover esse card duplicado em todas as páginas, admin e cliente, preservando qualquer botão de ação que exista nele (reposicionado dentro da página). Pediu para testar primeiro numa página do lado do cliente antes de tentar em Projetos, que ela marcou como mais complexa. Escolhi `src/pages/records/WorkspaceRecordsPage.tsx` — é o único componente que já serve tanto o admin ("Registros e solicitações") quanto o cliente ("Ocorrências e solicitações") a partir do mesmo arquivo, então o teste cobre os dois papéis de uma vez. Removido o bloco `.workspace-page-identity` (ícone, categoria, h1, parágrafo) e o card visual ao redor (`.records-v13-heading`: fundo em gradiente, sombra, decoração circular, variante modo noite, responsivo). O botão de ação ("Novo registro"/"Nova solicitação") foi preservado, movido para uma linha própria (`.records-v13-actions`) acima da barra de busca/filtros, sem card ao redor.
- **Ponto que a Pati levantou e que confirma um padrão real:** ela notou que ajustes anteriores pareciam "empilhar" código sem apagar o anterior. Confirmado neste caso: a mesma classe `.records-v13-heading` tinha regras definidas em 3 arquivos CSS diferentes (`records-v12.css`, `records-v20-conversation-polish.css`, `uxui-shell-dashboard-preview.css`), cada um de uma leva de mudanças. Removi as três, não apenas a mais recente — é o cuidado que vou manter daqui pra frente em qualquer ajuste.
- **Entrega:** Commit `ca40014`, em `main`. `npm run check` validado localmente.
- **Aprovação:** Pati pediu o piloto nesta mensagem (26/09/2026, 21:36) e disse explicitamente que ainda não ia ler a resposta agora. `aguardando avaliação`.
- **Limites:** Não testei visualmente. Só a página de Registros/Ocorrências foi alterada — nenhuma outra página (incluindo Projetos) foi tocada ainda; isso espera aprovação do piloto. Não mexi no topbar/Shell (já mostrava o nome da página corretamente, sem necessidade de mudança).

---

## 2026-09-26 — Claude (rollout completo: remover card de título duplicado de todas as páginas)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — mesma remoção do piloto anterior, agora estendida a todas as páginas restantes do admin e do cliente que tinham o card duplicado.
- **Mudança e copy:** Pati aprovou o piloto e pediu para seguir com as demais páginas ("pode seguir com as demanis paginas... sempre pensando em como pode impactar a experiencia do cliente/adm/usuario e o visual"). Levantei todas as páginas efetivamente roteadas em `src/App.tsx` (não as versões antigas/sem uso que ainda existem no repositório) e conferi uma a uma quais tinham o card. Removido nas seguintes, sempre preservando e reposicionando qualquer botão/controle funcional do card:
  - **Admin:** Clientes (botão "Cadastrar cliente"), Calendário ("Novo evento"), Documentos ("Adicionar via Drive" / "Adicionar documento"), Horas (seletor de período + "Iniciar timer"), Relatórios (filtros de Cliente/Tipo/Período), NPS & satisfação ("Atualizar"), Mapa de People ("Atualizar" / "Abrir Mapa público"), Projetos ("Novo cronograma" — a página que ela usou de referência no print original, tratada por último por ser a mais complexa, como ela pediu).
  - **Cliente:** Agenda e próximos passos (`ClientTimelinePage`, sem botão de ação, o bloco saiu por completo). As demais páginas do cliente (Início, Entregáveis, Horas, Documentos, Relatórios) já não tinham esse card — conferido antes de tocar em qualquer arquivo.
  - Registros/Ocorrências (`WorkspaceRecordsPage`) já tinha sido tratada no piloto.
- **Limpeza de código (o ponto que a Pati pediu para manter sempre):** cada card tinha CSS decorativo próprio (gradiente, sombra, decoração circular, variantes de modo noite e responsivo) espalhado por `uxui-shell-dashboard-preview.css` e, em alguns casos, também em arquivos específicos da página (`page4-calendar.css`, `client-timeline-v2.css`, `client-timeline-v3.css`). Toda essa CSS foi apagada por completo, não sobreposta. Ao final, com nenhuma página mais usando o ícone/kicker do card, as classes globais compartilhadas (`.workspace-page-identity`, `.workspace-page-icon`, `.workspace-page-copy`, `.workspace-page-kicker`) ficaram sem nenhum uso — confirmado por busca em `src/pages` antes de remover — e foram excluídas também.
- **Entrega:** 3 commits em `main`: `79c4667` (Clientes/Calendário/Documentos/Horas/Relatórios), `daecd9f` (NPS/Mapa de People/Agenda), `998f98f` (Projetos + limpeza final das classes compartilhadas). `npm run check` (typecheck + build) validado localmente após cada commit, sem erros.
- **Aprovação:** Pedido explícito da Pati em 26/09/2026 ("pode seguir com as demanis paginas"). `aguardando avaliação` — ainda não confirmou visualmente.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. Não toquei em nenhuma página que já não tivesse o card (Visão Geral/Dashboard, Propostas, editor/preview de proposta, revisão/relatório do Mapa de People, impressão de relatório, Início/Entregáveis/Horas/Documentos/Relatórios do cliente) — nenhuma dessas tinha o padrão de card duplicado. Também não toquei em nenhum arquivo de versão antiga/sem uso que ainda existe no repositório (ex.: `AdminDocumentsPage.tsx`, `AdminReportsPageV3`–`V16`, `ClientReportsPageV4`) — não estão roteados em `App.tsx`, então ficaram fora do escopo; a CSS ainda compartilhada com esses arquivos mortos foi deixada intacta para não arriscar quebrar algo fora do meu campo de visão.
  - **Correção (mesmo dia):** a afirmação acima de que Início/Entregáveis/Horas/Documentos/Relatórios do cliente "já não tinham esse card" estava errada — a varredura que fiz buscava só os nomes de classe usados no admin (`page-heading`/`workspace-page-identity`); essas 5 páginas do cliente tinham o mesmo card com nomes de classe próprios, que passaram batido. Corrigido na entrada seguinte, depois da Pati apontar que ficaram pendentes.

---

## 2026-09-26 — Claude (correção: páginas do cliente que ficaram pendentes)

- **Superfície/escopo:** Workspace (`app.cali`). Layout — mesma remoção do rollout anterior, agora nas 5 páginas do cliente que a varredura anterior não pegou (ver correção acima).
- **Mudança e copy:** Pati avisou que algumas páginas do cliente não tinham recebido a atualização. Removido o card duplicado em:
  - Início (`ClientDashboard`): cabeçalho "Olá, {nome}" + eyebrow + descrição removidos; card de contratação (horas do ciclo/status) preservado, reposicionado em linha de ações própria; função `firstName` removida por ficar sem uso.
  - Entregáveis (`ClientDeliverablesPage`): eyebrow + h1 + descrição + ícone removidos; seletor de projeto (quando há mais de um) preservado.
  - Horas do ciclo, Documentos e Relatórios (`ClientHoursPage`, `ClientDocumentsPage`, `ClientReportsPageV5`): removidos por completo, sem botão de ação para preservar.
- **Limpeza de código:** CSS decorativa (gradiente, sombra, decoração, ícone, variantes de modo noite e responsivo) apagada por completo em `uxui-shell-dashboard-preview.css`, `client-deliverables-v33.css` e `client-home-v2.css` (incluindo trechos embutidos em linhas minificadas). Preservadas as regras ainda compartilhadas com páginas antigas/sem uso (ex.: `.hours-connect-header`, usado por `AdminHoursPageV2.tsx`, não roteado).
- **Entrega:** Commit `bffe2d4`, em `main`. `npm run check` validado localmente.
- **Aprovação:** Pati apontou a pendência em 26/09/2026, 22:16 — segue o mesmo pedido já aprovado de remover o card em todas as páginas. `aguardando avaliação`.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build.

---

## 2026-09-26 — Claude (correção: saudação removida por engano + logo do cliente não replicada + regra permanente)

- **Superfície/escopo:** Workspace (`app.cali`). Duas correções pedidas juntas na mesma mensagem (26/09, 22:2x).
- **Mudança e copy (1 — saudação removida por engano):** Pati apontou que a entrada anterior (`bffe2d4`) removeu "Olá, {nome}" do Início do cliente por engano — não é um título duplicado, é uma saudação pessoal exibida quando o cliente entra na plataforma, e não podia sair. Restaurado por completo: cabeçalho original (`<header className="client-home-heading">`, eyebrow + h1 "Olá, {nome}." + parágrafo + aside "contract-card"), a função `firstName()`, e toda a CSS correspondente (`client-home-v2.css` inteiro restaurado a partir do commit anterior à remoção; blocos específicos de `.client-home-v3 .client-home-heading` reinseridos em `uxui-shell-dashboard-preview.css`).
- **Mudança e copy (2 — logo do cliente, `object-fit`):** Pati confirmou o ajuste `contain` → `cover` (moldura da logo) em 7 lugares do admin e perguntou se havia sido replicado no cliente. Investigado: o portal do cliente não renderiza a própria logo em nenhuma tela própria (Visão Geral/Início, Documentos, etc. do cliente não mostram a logo da empresa), exceto no componente compartilhado `ExecutiveReportPaperV17` (preview de relatório, usado tanto pelo admin quanto pelo cliente), que usa `object-fit: contain` por ser um contexto de "papel timbrado" (logo retangular no cabeçalho de um documento formal), diferente da moldura quadrada tipo avatar usada nas demais telas. Além disso, encontrado (não relatado pela Pati) um bug do mesmo tipo em `src/components/GlobalTimerBar.tsx`: a logo do timer global tinha `object-fit: contain` fixado inline no `style` do `<img>`, sobrescrevendo silenciosamente a regra CSS já corrigida em `global-timer.css` — corrigido para `cover`.
- **Regra permanente registrada:** a Pati pediu para memorizar que qualquer ajuste feito numa view replicada entre admin e cliente precisa ser aplicado de forma idêntica nos dois lados — texto adicionado no topo deste arquivo ("Regra permanente", linha 14).
- **Entrega:** Commits `72e0af9` (restauração da saudação) e `8ce815a` (fix do GlobalTimerBar + regra permanente), ambos em `main`. `npm run check` validado localmente nos dois.
- **Aprovação:** Pati corrigiu explicitamente o erro da saudação e pediu a memorização da regra (26/09/2026). `aprovado` para a restauração; regra do `object-fit: contain` do relatório respondida na entrada seguinte, a pedido dela.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build.

---

## 2026-09-26 — Claude (redesign: página Início do cliente)

- **Superfície/escopo:** Workspace (`app.cali`), `ClientDashboard.tsx` (Início do cliente). Layout e conteúdo — não é mais remoção do card duplicado, é redesenho do topo da página a partir de um print real (`app.calirh.com/cliente`, modo escuro) que a Pati anexou.
- **Decisão comunicada (pedida explicitamente pela Pati):** sobre a logo do "papel timbrado" em `ExecutiveReportPaperV17` (pergunta em aberto da entrada anterior) — mantive `object-fit: contain`, minha recomendação, porque ali a logo funciona como marca d'água/timbre de um documento formal e pode ser um wordmark retangular; cortar para preencher (`cover`) arriscaria cortar texto/logotipo em clientes com logo não-quadrada. Nas demais telas (avatar-like, moldura quadrada pequena) `cover` continua sendo a regra certa, como já estava.
- **Mudança e copy:**
  - Removida a moldura/card ao redor de "Olá, {nome}." e o parágrafo descritivo abaixo ("Seu acompanhamento executivo..."); a saudação continua como texto simples (eyebrow + h1), sem card ao redor.
  - Adicionada a logo da empresa do cliente dentro do card "Sua contratação", em moldura quadrada com `object-fit: cover` — mesma regra do lado admin. Antes, essa logo era injetada por um runtime paralelo baseado em `MutationObserver` (`clientHomeCompanyIdentityRuntimeV40.ts`), que tentava casar o nome da empresa por texto e claramente não estava aparecendo no print da Pati; removido por completo (arquivo deletado, chamada removida de `RouteRuntimeManager.tsx`) e substituído por renderização direta de `data.company.logo_url`.
  - Nome do plano em "SUA CONTRATAÇÃO" agora passa por um rótulo de marca: "partner" vira "Cali Partner"; qualquer outro valor cai num fallback "Cali <Valor>" em vez de mostrar o dado cru do banco (ex.: era só "partner" no print).
  - Card "Sua contratação" agora mostra duas métricas lado a lado — horas consumidas no mês e total de horas do contrato — em vez de um único número no canto.
  - "STATUS DO CICLO" deixou de ser banner de largura total: agora é um card do mesmo tamanho/alinhamento de "Sua contratação", empilhado logo abaixo dele, na mesma coluna. Botão "Ver entregas"/"Revisar agora" reduzido para um CTA menor e mais discreto.
  - Avaliada a redundância pedida pela Pati entre os 4 cards pequenos: removido "Horas do ciclo" (repetia a informação que passou a viver em "Sua contratação"); mantidos Entregas do ciclo, Percepção das entregas e Conclusão das entregas — medem coisas diferentes entre si (contagem/status, nota de avaliação, percentual de aprovação), não são redundantes uns com os outros. Grade passou de 4 para 3 colunas.
- **Limpeza de código:** `client-home-v2.css` reescrito por extenso (deixou de ser uma única linha minificada, ficando legível para futuras edições); removidas por completo (não sobrepostas) as regras antigas de `.client-home-heading > div:first-child` (moldura do header, incl. variantes de modo noite e responsivo), `.contract-metric` e `.client-contract-logo-v40` em `uxui-shell-dashboard-preview.css`.
- **Entrega:** Commit `57aee9e`, em `main`. `npm run check` (typecheck + build) validado localmente, sem erros.
- **Aprovação:** Pedido detalhado e explícito da Pati nesta mensagem (26/09/2026), com print anexado, restrito a esta página ("MAS VAMOS AJUSTAR PRIMEIRO AQUI NESSA PAGINA"). `aguardando avaliação`.
- **Limites:** Não testei visualmente (sem navegador/computador vinculado nesta sessão) — só typecheck/build. A discussão mais ampla que a Pati sinalizou — reduzir o excesso de cards em geral pela aplicação, citando o "espaço compartilhado" como exemplo — não foi iniciada; ela pediu explicitamente para resolver esta página primeiro. Não toquei em nenhuma outra página nem no componente `ExecutiveReportPaperV17`.

---

## 2026-09-26 — Codex (revisão da home do cliente após print 2)

- **Superfície/escopo:** Workspace (`app.cali`), somente a home `/cliente`. Continuação do ajuste visual pedido pela Pati após avaliar o redesign de Claude (`57aee9e`).
- **Mudança e copy:** removido o eyebrow genérico “ESPAÇO COMPARTILHADO · CALI WORKSPACE”; preservada a saudação “Olá, {nome}” fora de qualquer card. “Sua contratação” e “Status do ciclo” ocupam duas colunas iguais, com altura igual no desktop e empilhamento no celular. A logo da empresa permanece diretamente no card, recortada com `cover`. Nome do serviço com CALI em caixa alta; números e rótulos maiores. O dado `monthly_hours_contracted` passou de “total do contrato” para “contratadas no mês”, pois é uma franquia mensal no banco. No status, removida a afirmação genérica “Seu trabalho com a CALI está em movimento” e corrigida a contagem que antes chamava entregáveis de “frentes”: agora diz “X entregas para acompanhar”, mantendo a CTA discreta. Nenhuma query, cálculo ou regra de horas/validação mudou.
- **Hierarquia:** Entregas, percepção/NPS e percentual de conclusão passaram de três cards com sombra para indicadores abertos separados por linhas. “Dado real do ciclo” e texto explicativo redundante foram substituídos por percentual direto. Projetos e agenda perderam as molduras pesadas; as quatro caixas de resumo repetidas abaixo foram substituídas por um link simples com contagem de relatórios. Navegação para entregas, relatórios e conversa preservada.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v2.css`, `src/client-home-v5.css`, `src/styles/routes/clientExperience.ts` e este registro. O CSS novo entra somente na rota do cliente, depois dos estilos anteriores, sem editar o arquivo compartilhado `uxui-shell-dashboard-preview.css`. Não se aplica ao administrativo: a saudação, o bloco de contratação do cliente e as métricas desta home são exclusivos de `/cliente`.
- **Entrega/verificação:** desenvolvido sobre `b99ff484`; publicado no commit [`cc1c704`](https://github.com/patricia258/app.cali/commit/cc1c704a0100dfc82b418d9bbb57b671f8ffe6dd), com deploy de produção `READY`. `npm run check` (typecheck + build) e `git diff --check` passaram. O layout autenticado não foi validado visualmente com uma sessão de cliente.
- **Aprovação:** Pati rejeitou o print 2 e pediu correção. Estado desta revisão: `aguardando avaliação` após publicação. Não confundir pedido de conserto com aprovação da nova composição.
## 2026-09-28 — Codex (perfil do cliente: linha do tempo e molduras)

- **Superfície/escopo:** home autenticada do cliente `/cliente`, painel “Em movimento”, molduras dos painéis e indicadores da mesma página. Pedido da Pati: print 1 é a tela existente; print 2 do MatDash é referência apenas de estrutura/layout, adaptada à CALI. O arquivo MatDash gratuito enviado não contém o componente “Weekly Schedules” do print; usei o print como referência visual, sem importar dados ou conteúdo demonstrativo.
- **Mudança:** as quatro entregas visíveis do projeto atual agora aparecem em trilhas horizontais, ordenadas pelo prazo real, com cápsulas posicionadas em um eixo calculado com `due_at`. O estado real fica junto ao título; prazos ausentes aparecem como “Prazo a definir”, sem sugerir data ou duração. Em telas pequenas, cada trilha vira uma linha legível com prazo ao lado. O link “Ver projeto” e a origem dos dados permanecem iguais.
- **Molduras:** restaurada uma linha dourada fina ao redor de “Em movimento”, “Agenda compartilhada”, conjunto dos três indicadores e link de relatórios, com contraste próprio nos temas dia e noite. Sem sombra pesada.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css` e este registro. Sem alterações de query, status, permissões ou cálculos financeiros.
- **Entrega/verificação:** publicado no commit `41e4776d4f3344560d3a23508b03e330ee595998` em `main`, deploy de produção `READY`. `npm run check` (typecheck e build) e `git diff --check` passaram. A tela autenticada ainda precisa ser conferida visualmente com uma conta cliente nos dois temas e no celular.
- **Aprovação:** solicitado pela Pati em 28/09/2026; `aguardando avaliação`. Não confundir a referência MatDash com aprovação final da adaptação.

---
## 2026-09-28 — Codex (carregamento e cores secundárias do cliente)

- **Escopo:** correção do carregamento interno do Workspace e apresentação da linha do tempo “Em movimento” em `/cliente`, após avaliação da Pati. O carregamento é um padrão compartilhado por admin e cliente; a mesma correção foi aplicada nos dois perfis. A linha do tempo da home do cliente não possui uma réplica do mesmo componente no admin.
- **Causa e mudança do carregamento:** `.data-loading` mostrava simultaneamente dois pseudoelementos, e `.cali-symbol-loading` mostrava até três ícones. Agora a Lima e a folha ocupam exatamente a mesma posição e alternam suavemente, uma por vez, nos estados internos. O carregamento da rota já tinha sobreposição e mantém esse comportamento. Removido `loading-brand-standard.css`, um estilo antigo concorrente, e sua importação de `main.tsx`.
- **Linha do tempo:** grades verticais mais visíveis entre as datas; cápsulas com cores secundárias relacionadas aos estados reais, sem mudar rótulos nem dados. Cartela proposta e usos em `docs/CALI_SECONDARY_PALETTE.md`; sem cor como único sinal de status. Mantida a apresentação compacta no celular.
- **Arquivos:** `src/loading-illustrations-final.css`, `src/loading-brand-standard.css` (removido), `src/main.tsx`, `src/client-home-v5.css`, `docs/CALI_SECONDARY_PALETTE.md`, este registro.
- **Aprovação:** Pati pediu a correção e aceitou receber uma proposta de cores; a escolha visual final segue `aguardando avaliação`. Não confundir o pedido com aprovação do resultado.

---
## 2026-09-28 — Codex (conclusão das entregas e cor das datas)

- **Escopo:** home autenticada `/cliente`; print 1 (indicador “Conclusão das entregas”) adaptado à composição do print 2 do MatDash. Não existe cópia desse componente no administrativo.
- **Aprovação recebida:** Pati aprovou a cartela secundária proposta anteriormente. Esclarecido no guia que “ameixa” é acinzentada e fechada, não roxo vivo. Ela observou que as novas cores não apareciam nas datas quando as entregas estavam todas “Não iniciadas”; agora elas alternam entre azul ardósia, ameixa, terracota e sálvia, inclusive no celular. Esta alternância é decorativa; o estado continua escrito por extenso.
- **Mudança no indicador:** removido o donut e a repetição “0% / 0% aprovadas”. A nova composição mostra título, percentual do projeto atual, contagem de entregas aprovadas e cinco barras de contagem real por etapa (não iniciadas, em andamento, revisão CALI, com o cliente, aprovadas). Barra zerada é só uma linha discreta; nenhum número foi inventado. O percentual agora é calculado das entregas do projeto exibido, evitando misturar todos os projetos enquanto o texto diz “projeto atual”.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v2.css`, `src/client-home-v5.css`, `docs/CALI_SECONDARY_PALETTE.md` e este registro. Nenhuma query ou regra de negócio foi alterada.
- **Estado da composição nova:** `aguardando avaliação` da Pati.

---
## 2026-09-28 — Codex (percepção das entregas e cores mais vivas)

- **Escopo:** home `/cliente`, segundo par de prints da Pati. Print 1 era o indicador atual “Percepção das entregas”; print 2 do MatDash serviu de referência estrutural para informações à esquerda e medidor em semicírculo à direita.
- **Mudança:** indicador agora mostra quantidade real de avaliações e estado da média, com nota real (0–5) num arco proporcional. Sem avaliações, arco sem preenchimento e “— / Sem nota”; não há valor demonstrativo nem estrelas preenchidas falsas. Texto antigo “Sua avaliação aparece aqui...” foi substituído por “Disponível após uma aprovação”. Mantida a origem real `data.nps`/`data.npsCount`.
- **Cor:** Pati considerou as cores aprovadas opacas; aumentada a intensidade da paleta secundária em cápsulas de prazo, barras de conclusão e elementos do indicador de percepção, em desktop e celular. Novos tons e usos em `docs/CALI_SECONDARY_PALETTE.md`. Os significados continuam escritos, sem depender da cor.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v2.css`, `src/client-home-v5.css`, `docs/CALI_SECONDARY_PALETTE.md` e este registro. Sem mudanças em query, permissões ou fluxos.
- **Aprovação:** Pati pediu estes ajustes; resultado visual novo `aguardando avaliação`.

---

## 2026-09-28 — Codex (distribuição das entregas do ciclo)

- **Escopo:** indicador “Entregas do ciclo” na home `/cliente`. Print 1 era a apresentação atual; print 2 do MatDash foi referência de hierarquia e gráfico de rosca, adaptados aos dados e à cartela CALI.
- **Mudança:** total do projeto em destaque, gráfico de rosca e legenda com quantidades reais de aprovadas, pendentes e canceladas. “Pendentes” inclui todos os estados que ainda não foram aprovados ou cancelados, como não iniciadas, em andamento e aguardando validação. Cores secundárias aprovadas: sálvia, âmbar e coral, com rótulos e números sempre visíveis. Estado vazio recebe apenas o anel neutro.
- **Dados:** `loadClientDashboardReality` já retorna entregas canceladas visíveis ao cliente; a home deixava de recebê-las por um filtro local. Agora elas entram apenas no total/distribuição do novo indicador. Lista, cronograma e percentual de conclusão continuam ignorando cancelamentos como antes; os estados e fluxos de aprovação não mudaram.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css` e este registro.
- **Aprovação:** solicitado pela Pati em 28/09/2026; resultado visual `aguardando avaliação`.

---

## 2026-09-28 — Codex (composição da home do cliente e agenda)

- **Escopo:** `/cliente`, a partir dos quatro prints enviados pela Pati às 11h57–11h59. Os três indicadores aprovados de entregas/percepção/conclusão foram preservados.
- **Topo:** a saudação e o card da responsável executiva ficam lado a lado no desktop (empilhados no celular). O card com foto e contato foi preservado, menor e próximo do nome do cliente. A contratação mantém logo, plano e horas, com altura reduzida.
- **Atalhos com dados reais:** o antigo card redundante “Status do ciclo” foi substituído por dois acessos: quantidade e último título de documento publicado; quantidade de ocorrências compartilhadas em aberto. As consultas respeitam empresa e visibilidade do cliente; erro de consulta mostra “—”, sem inventar zero. Quando existe entrega aguardando validação, mantém-se um link discreto para revisá-la.
- **Agenda:** exibe somente compromissos futuros publicados, em linha do tempo com dia, mês e horário. A responsável deixou de estar dentro da agenda e os prazos/estados das entregas continuam apenas em “Em movimento”. “Relatórios publicados” virou atalho compacto após os painéis.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css`, este registro. Sem alterações em inserção, fluxo, permissões ou estados dos registros.
- **Aprovação:** mudanças solicitadas pela Pati; composição final `aguardando avaliação`.

---

## 2026-09-28 — Codex (relatórios no top bar do cliente)

- **Escopo:** top bar compartilhado por todas as rotas do cliente e remoção do atalho isolado no fim da home `/cliente`. Os cards de documentos e ocorrências não foram alterados; a Pati quer revisá-los depois.
- **Mudança:** atalho com desenho de documento em dourado, dica “Relatórios” ao passar o mouse ou focar pelo teclado, nome acessível para leitores de tela e bolha numérica quando há relatórios disponíveis. O contador acompanha a lista da própria página de relatórios: estados `sent`/`published`, filtrados pela empresa do cliente; atualiza em tempo real e quando a janela volta ao foco. O acesso à página pela sidebar permanece.
- **Consistência:** a resposta rápida “Relatórios” do chat da home passa a contar os mesmos estados da lista, para não divergir do top bar. Sem relatório, o ícone permanece visível, sem bolha. Falha na consulta não se transforma em zero exibido.
- **Arquivos:** `src/components/WorkspaceShell.tsx`, `src/pages/client/ClientDashboard.tsx`, `src/main.tsx`, `src/client-reports-top-shortcut.css` e este registro. Nenhum fluxo de criação, publicação ou permissão foi alterado.
- **Aprovação:** solicitado pela Pati em 28/09/2026; resultado `aguardando avaliação`.

---

## 2026-09-28 — Codex (capa dos documentos e cartões recentes)

- **Escopo:** `/cliente/documentos` e home `/cliente` a partir de cinco prints da Pati às 12h11–12h15. Preservados os indicadores já aprovados, agenda e top bar.
- **Capa padrão:** a grade de documentos do cliente usava outro componente que o administrativo, por isso a capa automática não chegava nela. A capa visível agora usa a logo original da empresa centralizada e o fundo extraído da cor da logo, inclusive quando a logo é transparente; fallback marfim quando não há logo legível. A mesma capa aparece em escala reduzida na home. A versão do cliente prioriza esta capa de marca mesmo quando existe capa antiga enviada; não se altera o arquivo original nem o fluxo de upload.
- **Home:** a contratação fica em uma faixa compacta após a saudação. Os cards de documento e ocorrência passam para uma linha própria após os três indicadores, com bordas arredondadas moderadas. O documento mostra título e atualização do último arquivo publicado, sua capa e entrada no acervo. A ocorrência mostra a atividade mais recente compartilhada, status real, dias desde o registro e acesso direto ao detalhe; as imagens são dos contatos da conta e da CALI com a logo da empresa, sem afirmar que são os autores da mensagem. Se não houver registro, há estado vazio sem item demonstrativo.
- **Prazos:** `account_records` não expõe prazo de atendimento no fluxo consultado. O cartão não afirma “dentro/fora do prazo”; mostra dias decorridos para evitar informação inventada.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/pages/client/ClientDocumentsPage.tsx`, `src/components/ClientDocumentBrandCover.tsx`, `src/lib/documentsIdentityRuntimeV42.ts`, `src/client-home-v5.css`, `src/client-document-brand-cover.css`, `src/main.tsx` e este registro. Fluxo de comentários, ciência, Drive, ocorrências e permissões preservado.
- **Aprovação:** pedido da Pati; composição final `aguardando avaliação`.

---

## 2026-09-28 — Codex (molduras, ocorrências e consumo mensal)

- **Escopo:** home `/cliente`, revisão dos dois cartões recentes e da contratação com base nos prints das 12h29–12h30. Pedido e composição anteriores foram aprovados pela Pati; esta nova revisão aguarda avaliação.
- **Molduras e imagens:** documento e ocorrência recebem contornos próprios discretos com cantos arredondados iguais; as variáveis inválidas `--card` e `--border` da versão anterior foram trocadas pelas variáveis reais do tema. Os três avatares da ocorrência têm a mesma forma e tamanho, e a marca do cliente ocupa mais da sua área. A logo na capa dos documentos também cresce, mantendo o fundo extraído da marca.
- **Dados de ocorrências:** a home filtrava somente `record_type='occurrence'`, enquanto a página de registros admite conversas `occurrence`, `request`, `context_change` e `other`. A consulta e a contagem agora usam esses mesmos tipos, com filtro de empresa/visibilidade do cliente. A conversa mais recente aponta ao registro real. Um erro de consulta mostra estado de indisponibilidade em vez de afirmar incorretamente que não há registros. O estado sem `workflow_status` é exibido como “Registrada”, sem inferir abertura.
- **Horas:** para contas com horas visíveis e contratadas, a régua cresce de acordo com `visibleMinutes` do ciclo mensal e `monthly_hours_contracted`, com porcentagem calculada e marca de 50%. Verde, âmbar, laranja e vermelho indicam o avanço visual; horas e números permanecem explícitos. Sem limite contratado não há régua nem divisão inventada.
- **Verificação:** compilação e revisão de diffs. O Workspace utiliza o banco do projeto CALI MAPA com schema `cali_workspace`. Consulta de leitura confirmou na conta CALI · Ambiente de Teste dois registros `request` (um `waiting_client` e um `completed`) e um `leadership` concluído; o `request` com resposta aguardada tem a atividade mais recente e será exibido pela nova consulta. A política RLS existente restringe a leitura do cliente à sua empresa e `visibility='client'`. Conferir a apresentação na sessão autenticada após o deploy.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css`, `src/client-document-brand-cover.css` e este registro. Aprovação visual: `aguardando avaliação`.

---

## 2026-09-28 — Codex (auditoria de dados e atualização da home do cliente)

- **Pedido:** Pati aprovou os cartões e pediu que toda a home `/cliente` mostre dados atuais do Supabase, atualizando após mudanças sem depender de recarga manual. Nenhuma ação de exemplo foi inserida.
- **Fontes verificadas:** saudação em `profiles`; empresa/plano em `companies`; contato executivo em `get_client_account_contact`; entregas, distribuição, conclusão e projeto em `projects`/`deliverables`; percepção em `nps_responses`; documentos em `files` publicados; agenda em `events` futuros e visíveis; ocorrências em `account_records` compartilhados; relatórios em `reports` enviados/publicados. Estados vazios são resultado das consultas, não mockups. O vídeo da Pati é apenas decorativo.
- **Correção das horas:** a home antes somava `hour_entries` de todos os períodos e comparava com a franquia mensal de `companies`. Passou a usar o RPC já adotado na página `/cliente/horas`: `get_client_hours_summary` para o mês corrente no fuso de São Paulo, que respeita visibilidade, período, projeto operacional e eventual franquia de `service_cycles`. A consulta duplicada de horas sem período no carregador da home foi retirada; a página detalhada de entregáveis conserva sua consulta. Falha da consulta não é mostrada como 0h.
- **Tempo real:** o assinante existente já acompanha `projects`, `deliverables`, `nps_responses`, `files`, `hour_entries`, `events`, `reports` e alterações de `companies`; agora acompanha também `account_records` para status/título de ocorrência. O banco confirma essas tabelas na publicação `supabase_realtime`. Atualização ao voltar para a aba e conferência a cada 30 segundos enquanto ela está visível cobrem desconexão, alterações de perfil/contato e eventos que não cheguem pelo canal. Mudanças recebidas durante uma consulta em andamento geram uma nova consulta ao final, sem perder a última movimentação.
- **Verificação de dados:** consulta somente de leitura no banco `cali_workspace` da conta de teste encontrou 2 projetos, 5 entregáveis visíveis, 0 avaliações, 1 documento publicado, 1 compromisso futuro e 2 conversas compartilhadas. A página continua sujeita ao RLS do cliente para exibir apenas dados autorizados. Sem teste automatizado de uma sessão cliente autenticada neste ambiente; validar a atualização visual simultânea admin/cliente no app.
- **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/lib/clientDeliveryReality.ts`, este registro. **Autor:** Codex. **Aprovação:** correções solicitadas pela Pati, resultado `aguardando avaliação`.

---
## 2026-09-28 — Codex (percepção e conclusão unificadas na home do cliente)

- **Pedido:** incluir as avaliações de ocorrências e o andamento dos registros na percepção e na conclusão da home, junto aos entregáveis, no período do mês. A Pati apontou duas ocorrências avaliadas que não apareciam.
- **Origem dos dados:** novo RPC `get_client_home_work_metrics` agrega `nps_responses` e `account_record_feedback` da empresa no mês civil de São Paulo, sem duplicar a mesma linha de avaliação. A consulta é restrita a um perfil de cliente ativo da própria empresa, devolve somente média e quantidade agregadas, e não expõe notas e comentários individuais de outros usuários. O cliente de teste tem duas avaliações de registros no mês, notas 4 e 5, média 4,5; anteriormente a home mostrava zero por olhar só entregáveis.
- **Conclusão:** entram entregáveis visíveis e registros compartilhados com fluxo ativo que tenham sido criados, modificados, concluídos ou tenham horas visíveis vinculadas no período. Cada objeto é contado uma vez, em cinco estados. Para a conta de teste são 8 atividades no mês, 2 concluídas, 25%. “Entregas do ciclo” permanece específico do projeto, pois é outro recorte.
- **Horas sem vínculo:** a conta de teste tem um lançamento visível sem entregável nem registro associado. Ele é indicado separadamente no card; não foi atribuído arbitrariamente um estado de conclusão a uma hora sem objeto. Horas ocultas/internas ou fora do período não entram na contagem exposta ao cliente. Os indicadores são atualizados pelos canais existentes e pela conferência periódica de 30 segundos, inclusive após novas notas em registros.
- **Feedback em tempo real:** `account_record_feedback` entrou na publicação de Realtime e no assinante da home para refletir imediatamente as novas avaliações da própria pessoa cliente. O polling de 30 segundos continua cobrindo avaliações de outros usuários da mesma empresa, que a RLS individual não transmite pelo canal.
- **Verificação:** migrações aplicadas no projeto Supabase CALI; chamada do RPC sob o papel autenticado do cliente de teste retornou média 4,5, 2 avaliações e 2 de 8 atividades concluídas. `npm run check` e revisão do diff passaram. **Arquivos:** `src/pages/client/ClientDashboard.tsx`, `src/lib/clientDeliveryReality.ts`, `supabase/migrations/20260928193000_client_home_unified_work_metrics.sql`, `supabase/migrations/20260928194500_client_record_feedback_realtime.sql`, este registro. **Autor:** Codex. **Aprovação:** solicitado pela Pati; resultado `aguardando avaliação`.

---
## 2026-09-28 — Codex (sidebar de cliente e administrador, regra de dados reais)

- **Regra permanente aprovada pela Pati:** tanto o **Início do cliente** (`/cliente`) quanto a **Visão geral do administrador** (`/admin`) devem mostrar somente dados reais e atuais do Supabase. Antes de alterar qualquer indicador, conferir tabela/RPC, empresa, período, visibilidade e estados no banco; atualizar após movimentações e mostrar estados vazios/erros reais. Nunca preencher a tela com números de exemplo ou mockups. A home do cliente teve sua fonte auditada e a percepção/conclusão unificadas na entrada imediatamente anterior; a revisão equivalente da Visão geral administrativa fica para a próxima etapa solicitada pela Pati. Esta entrada registra a regra, sem alterar hoje a funcionalidade do dashboard do administrador.
- **Pedido visual atual:** o mesmo sidebar compartilhado entre os dois perfis piscava ao passar o cursor pelo espaço entre a borda esquerda da janela e a moldura flutuante. Preservar logo, ilustrações do rail compacto, foto, links, dimensões dos itens, expansão ao hover e comportamento de navegação. Remover apenas o afastamento externo do menu e a textura de desenhos/xadrez do próprio sidebar. Aplicar um degradê bordô e dourado contínuo tanto no rail quanto no menu aberto, inclusive no modo noite e no menu mobile.
- **Implementação:** `src/sidebar-edge-gradient.css` é a camada isolada do sidebar, importada ao final em `src/main.tsx`; elimina o vão externo e cantos de cartão, ancora o gradiente à esquerda com a mesma escala nos dois estados e acompanha a largura do conteúdo para não deixar faixa vazia. Ajusta contraste da marca e da navegação no modo noite. O xadrez das páginas fora do sidebar permanece como estava.
- **Autor:** Codex. **Aprovação:** regra dos dados reais e escopo visual solicitados pela Pati; resultado do sidebar `aguardando avaliação`.

---

---
## 2026-09-28 — Codex (biblioteca de relatórios do cliente)

- **Pedido:** simplificar `/cliente/relatorios` segundo os dois prints da Pati das 13h49–13h50, com logo real da empresa, menos informações, estados coloridos e uma única ação para ler/obter PDF. Aprovação da composição: `aguardando avaliação`.
- **Interface:** a tabela horizontal de seis colunas virou lista de relatórios expansível, com logo da empresa em moldura quadrada suave, título e período, tipo e versão, marcadores de “Novo/Visualizado” e “Ciência pendente/registrada”. Detalhes exibem apenas protocolo, envio e data de ciência quando existente. Não se mostram contadores de acessos, datas de cada abertura nem botão de ciência já registrada ao cliente. Layout responsivo e modo noite.
- **Ações:** “Ver relatório” abre a rota existente de leitura em outra aba; a barra dessa rota oferece “Imprimir / salvar PDF”, reunindo leitura e obtenção do arquivo. O botão “Registrar ciência” só aparece enquanto pendente; RPC de abertura e RPC de ciência existentes foram preservados. A rota de impressão continua registrando o evento PDF no banco. A janela de impressão não abre automaticamente nesse fluxo. “Voltar” na rota do cliente agora aponta explicitamente para a lista de relatórios, inclusive quando a rota foi aberta em aba nova.
- **Limite de verificação:** build e revisão do código; o travamento relatado após logout/abertura não pôde ser reproduzido sem a sessão autenticada da cliente. O novo fluxo evita a impressão automática e uma navegação de retorno sem histórico, duas fontes possíveis de confusão, sem afirmar que eram a causa observada.
- **Arquivos:** `src/pages/client/ClientReportsPageV5.tsx`, `src/pages/reports/ReportPrintPageV17.tsx`, `src/client-reports-list-v64.css`, `src/main.tsx` e este registro. **Autor:** Codex.

---
## 2026-09-28 — Codex (filtro, protocolo e molduras das imagens)

- **Pedido:** Pati aprovou a nova lista de relatórios do cliente, pediu moldura da logo menor e melhor preenchimento, filtro por período, protocolo visível e retirada de “Mensal · v3”. O segundo print mostrou três imagens do card de ocorrência com bordas sobrepostas e enquadramento desigual. Resultado desta revisão: `aguardando avaliação`.
- **Relatórios `/cliente/relatorios`:** moldura da empresa reduzida de 54px para 44px (40px no mobile); prioriza `companies.logo_workspace_url`, cuja versão quadrada já recorta as margens da marca, com fallback à logo original sem corte forçado. Filtro por período deriva apenas dos períodos reais dos relatórios enviados/publicados; mantém todas as versões do período selecionado. Número do protocolo fica na linha principal. “Mensal · v3” sai da linha; a versão continua no registro do relatório e na tela completa, sem ser um marcador confuso para o cliente. O período aparece no apoio só quando não estiver no título, evitando repetição.
- **Home `/cliente`:** as fotos do contato do cliente e da CALI e a logo da empresa têm três molduras independentes iguais, sem margem negativa/overlap e sem ampliar a logo além da borda. A foto do cliente passa a usar posição e zoom já salvos no perfil, como a foto da Pati; consulta de perfil inclui esses campos existentes. Nenhuma lógica de ocorrência, visibilidade ou ação foi alterada.
- **Arquivos:** `src/pages/client/ClientReportsPageV5.tsx`, `src/client-reports-list-v64.css`, `src/pages/client/ClientDashboard.tsx`, `src/client-home-v5.css` e este registro. **Autor:** Codex. **Verificação:** typecheck, build e revisão do diff; conferir a composição com a sessão autenticada nos modos dia/noite e mobile.

---

## 2026-09-28 — Claude (rascunho de spec: Solicitar Visita Extra)

- **Superfície/escopo:** Workspace (`app.cali`). Planejamento — nenhum código de produto alterado.
- **Pedido:** Pati trouxe (áudio transcrito) uma funcionalidade nova e mais complexa: o cliente poder solicitar uma visita presencial extra da Pati, com regras de valor, antecedência mínima, horário comercial, bloqueio de segunda-feira, deslocamento/alimentação à parte, ciente formal e um ciclo de aceite/contraproposta entre cliente e admin. Ela foi explícita: **"antes de mexer qualquer coisa no código, eu preciso montar o fluxo dessa regra"** — pediu o desenho completo (perfil cliente + perfil admin) antes de qualquer implementação.
- **Entregável:** `docs/VISITA_EXTRA_SPEC.md` — fluxo completo por escrito: gatilho no topbar do cliente, copy de abertura no tom da Pati (1ª pessoa), formulário com 2 opções de data/horário + campo de ciente, tabela de validações (data passada, 48h úteis, horário comercial, segunda-feira como exceção não-bloqueante), onde os valores (taxa da visita, hora extra) ficam configuráveis por contrato na página de Clientes, e o ciclo completo de aceite/recusa/contraproposta do lado admin, incluindo o tom leve nas telas de "não deu match".
- **Dois bloqueios reais sinalizados no documento**, que só ela pode resolver: (1) o valor da taxa de visita e da hora extra — ela mencionou que ia anexar um modelo de contrato com esses valores, ainda não chegou; (2) como tratar a comprovação do deslocamento da própria Pati — ela mesma colocou isso em aberto na mensagem original. Proposta minha registrada no documento, à espera de confirmação.
- **Sidebar (degradê ausente no modo dia):** ela reportou o mesmo bug no mesmo áudio, mas pediu explicitamente para desconsiderar essa parte por enquanto. Não mexi nisso — Codex já tem um ajuste de sidebar em `aguardando avaliação` na entrada anterior a esta, que pode ser o que ela está vendo ou não; não investiguei, por não ser o pedido desta vez.
- **Entrega:** Commit `da33675`, em `main`. Sem alteração de código de produto; `npm run check` não se aplica (só markdown).
- **Aprovação:** Pati pediu o fluxo por escrito antes de codar (28/09/2026). `aguardando validação` — nada será implementado até ela confirmar o documento e resolver os dois bloqueios acima.
- **Limites:** Nenhuma tela, rota, tabela ou RPC foi criada. Este registro documenta só a proposta de fluxo.

---

## 2026-09-28 — Claude (Visita Extra: valores reais do contrato + divergência sinalizada)

- **Pedido:** Pati anexou a minuta `CALI_RH_Minuta_CALI_PARTNER_KIE-TEC_revisada.docx`, o modelo de contrato que ela tinha prometido, com os valores reais da visita presencial adicional.
- **Valores extraídos (Anexo I da minuta):** visita presencial adicional = R$ 800,00 por visita de até 4 horas (cláusula 2.1); custos de estacionamento, deslocamento e alimentação cobrados à parte, mediante comprovação (cláusula 2.2); faturamento junto com a cobrança do período correspondente (cláusula 3.2).
- **Divergência real encontrada (sinalizada, não resolvida sozinho):** a Pati descreveu de viva voz que passar de 4h gera cobrança automática "adicional por hora". A minuta diz o contrário — visitas acima de 4h não têm tarifa por hora, viram "orçamento específico e aprovação prévia da CONTRATANTE" (cláusula 2.3), e nada extraordinário é cobrado sem alinhamento prévio entre as partes (cláusula 2.4). Recomendei seguir o texto do contrato (sem tarifa automática por hora extra) e registrei que, se ela realmente quiser uma tarifa automática, isso exige revisar a cláusula 2.3 do contrato-modelo também, não só a plataforma.
- **Atualização em `docs/VISITA_EXTRA_SPEC.md`:** copy do painel do cliente ajustada (visita acima de 4h vira alinhamento de orçamento, não "R$/h"); campo `visit_extra_hour_rate` removido do desenho de configuração por contrato (não existe base contratual pra ele); default de `visit_flat_fee` fixado em R$ 800,00; fluxo do admin (seção 7) ganhou o passo do orçamento específico quando a visita passa de 4h.
- **Entrega:** Commit `3e338b8`, em `main`. Sem alteração de código de produto.
- **Aprovação:** Pati anexou o contrato a pedido da entrada anterior (28/09/2026). `aguardando validação` — falta ela confirmar a divergência do item acima e o ponto 2 (comprovação do próprio deslocamento) antes de qualquer implementação.
- **Limites:** Não li o contrato inteiro linha a linha em busca de outras cláusulas fora do escopo de visita/Anexo I (ex.: rescisão, confidencialidade) — não era o pedido. Se houver outra cláusula relevante para esta funcionalidade que eu tenha deixado passar, preciso que ela aponte.

---

## 2026-09-28 — Codex (sidebar no tema dia e complemento ao fluxo da visita)

- **Sidebar:** a Pati pediu nesta mensagem a correção do degradê no tema dia em cliente e administrador. `src/sidebar-edge-gradient.css` agora usa um eixo vertical explícito em dia: o dourado aparece no rail compacto, menu aberto e mobile; tema noite e interação permanecem como estavam. A indicação anterior de que ela teria pedido para desconsiderar o sidebar não corresponde à mensagem recebida por Codex — provavelmente mensagens diferentes para cada agente; a que chegou ao Claude pedia para deixar de fora por enquanto, a que chegou ao Codex não trazia essa ressalva. **Resultado:** aguardando avaliação da Pati.
- **Visita extra:** Codex preservou `docs/VISITA_EXTRA_SPEC.md`, criado por Claude, e acrescentou complemento identificado como Codex após conferir a minuta anexada (um arquivo PDF diferente do docx que a Pati mandou para o Claude — ver seção 8, item 1 do documento) e o fluxo atual de agenda. O PDF conferido não informava tarifa de visita, excedente ou km. Achado importante: **já existe** em produção um fluxo de solicitação de horário/visita (`scheduling_requests`, `/cliente/cronograma`, `/admin/calendario`) com política própria — até 1h30, deslocamento incluído, multa de cancelamento de 20% — divergente das novas regras da Pati. Isso muda a recomendação de implementação: revisar esse fluxo existente, não construir um novo em paralelo. Claude reestruturou o documento (nova seção 0) para refletir essa correção, reconciliando os dois achados sobre o valor da visita e preservando integralmente o complemento do Codex (seção 10). Também foram corrigidas no rascunho as duas datas obrigatórias, a afirmação prematura de cobrança na confirmação e a referência de que o anexo não havia chegado. **Nenhum código funcional, migração ou preço foi alterado. Aprovação do fluxo:** pendente.
- **Autor:** Codex (sidebar + achado do fluxo existente) e Claude (reconciliação do documento). **Verificação:** `git diff --check`, `npm run check` (typecheck e build) passaram para o CSS; a proposta de fluxo depende das decisões da Pati.

---
## 2026-09-28 — Codex (minuta revisada Word, valor da visita extra)

- **Fonte nova:** `CALI_RH_Minuta_CALI_PARTNER_KIE-TEC_revisada(1).docx`, recebida após o PDF anterior. O Anexo I, item 2.1, prevê R$ 800,00 por visita presencial extra de até 4h **para esse contrato**. O item 2.2 prevê estacionamento, deslocamento e alimentação necessária aplicáveis à parte; os itens 2.3–2.4 exigem orçamento e aprovação prévios para visitas acima de 4h. R$ 350,00/h, com mínimo de 2h, é capacidade **remota** adicional (itens 1.1–1.2), não tarifa presencial. Esse valor de R$ 800,00/4h agora está confirmado de forma independente por Claude (docx original) e Codex (docx revisado) — mesmo número, duas fontes.
- **Alteração:** corrigi `docs/VISITA_EXTRA_SPEC.md` para remover a afirmação anterior de que o anexo não trazia o preço, não inventar uma hora presencial tabelada e conciliar o faturamento com o item 3.2. Nenhuma tela, RPC, migração ou regra operacional foi alterada. **Autor:** Codex. **Aprovação da proposta:** pendente de Pati.

---
## 2026-09-28 — Codex (molduras do card de ocorrências no início do cliente)

- **Pedido:** Pati mostrou três molduras diferentes e definiu a foto central da Patrícia como padrão exato de formato/cor para foto do cliente e logo da empresa; a logo deve preencher a moldura. Print das 17h46. **Autor:** Codex; **aprovação do resultado:** aguardando avaliação.
- **Alteração visual:** as três posições usam o mesmo quadrado de 38px, raio de 10px, borda dourada `#B58C52` e fundo escuro da foto central, inclusive no tema dia/noite. Removi as regras que deixavam o cliente com fundo azulado e a logo em fundo claro com imagem reduzida por `contain`/padding. A borda fica acima da imagem para evitar que um zoom salvo esconda a moldura.
- **Logo:** o card prioriza `companies.logo_workspace_url`, versão quadrada já preparada para preencher a moldura, com fallback para `logo_url`. A URL privada é resolvida pelo mesmo utilitário usado na biblioteca de relatórios. Os demais lugares que exibem a logo não foram alterados. **Arquivos:** `src/client-home-v5.css`, `src/pages/client/ClientDashboard.tsx` e este registro.

---

## 2026-09-28 — Claude (Visita Extra: respostas da Pati aos 5 bloqueadores)

- **Superfície/escopo:** Workspace (`app.cali`). Planejamento — nenhum código de produto alterado.
- **Pedido:** Pati respondeu por áudio aos 5 bloqueadores registrados na seção 8 de `docs/VISITA_EXTRA_SPEC.md`.
- **Decisões registradas em `docs/VISITA_EXTRA_SPEC.md` (seção 8 revisada):**
  1. R$ 800,00/4h é valor único para todos os planos (CALI Partner e CALI Full) — ela cogitou R$ 980,00 para o CALI Full e decidiu não diferenciar.
  2. Estacionamento/alimentação: comprovação por nota fiscal, anexada por ela após a visita, como prestação de contas — confirmado. Quilometragem de carro próprio segue **em aberto** (ela não sabe ainda como quer documentar).
  3. "Solicitar visita extra" é só para visitas além do incluso no contrato. Ela revelou um recurso novo e **ainda não desenhado**: agenda fixa recorrente mensal para o CALI Full (1–2 datas fixas por mês, definidas em kickoff, ajustáveis na plataforma quando caem em fim de semana). Registrado como fora do escopo desta spec, precisa de desenho próprio.
  4. "48h" simplificado para 48 horas corridas (não "úteis"), contadas do envio do pedido.
  5. Mantém taxa de 20% para cancelamento sem aviso/justificativa; com aviso prévio ou motivo justificado (saúde, força maior) não cobra, avaliação manual dela. Precisa aparecer no app (copy de abertura + texto do ciente). Timing exato de faturamento (competência vs. fatura seguinte) não foi respondido explicitamente — seguimos a recomendação original (concilia no ciclo da visita) até ela dizer o contrário.
- **Atualizações no documento:** seções 3 (copy de abertura), 4 (texto do ciente), 5 (validação de antecedência), 6 (configuração por contrato) e 7 (fluxo admin, novo passo de cancelamento) ajustadas para refletir essas decisões. Seção 8 reescrita como "decisões + pendências menores" em vez de bloqueadores abertos.
- **Entrega:** commit nesta entrada, em `main`. Sem alteração de código de produto; `npm run check` não se aplica (só markdown).
- **Aprovação:** Pati respondeu por áudio (28/09/2026). Pendências menores antes de codar: modelo de km/deslocamento (item 2) e confirmação do timing fino de faturamento (item 5). O recurso de agenda fixa mensal do CALI Full (item 3) é uma spec separada, ainda não iniciada.
- **Limites:** Nenhuma tela, rota, tabela ou RPC foi criada ou alterada. Este registro documenta só as decisões de negócio.

---

## 2026-09-28 — Claude (Visita Extra: ajustes de review da Pati no fluxo já implementado pelo Codex)

- **Contexto:** Codex já implementou o fluxo completo de "Solicitar visita extra" (commits `331773e`, `02c5f7b`, `86bf03e`) — modal de 3 passos no cliente (`src/components/ExtraVisitRequest.tsx`), RPCs e migrations (`supabase/migrations/20260928223*.sql`), e cartão no painel admin (`src/lib/schedulingRequestsRuntimeV65.ts`). A Pati testou ao vivo em `app.calirh.com` e deu retorno detalhado por áudio, com prints do fluxo cliente e do painel admin.
- **Achado confirmado (preocupação dela sobre "fontes"):** o valor de R$ 800,00 está **hardcoded** (`FEE = 'R$ 800,00'` no componente e `extra_visit_fee_cents=80000` na função SQL), não lido de um campo configurável por contrato como a seção 6 da spec pedia. Bate com o valor que ela autorizou, então funcionalmente correto agora — mas é uma simplificação arquitetural que ela precisa saber que existe, para o dia em que um cliente precisar de valor diferente.
- **Ajustes aplicados (pedidos explícitos dela):**
  1. A frase "Esse tempo é 100% dedicado à sua empresa..." (passo 1) agora tem ícone de alerta e moldura própria (`.extra-visit-highlight`), separada da lista de condições.
  2. O card de revisão do passo 3 não repete mais "R$ 800,00 por até 4 horas" (já dito no passo 1) — mostra só "Visita presencial extra" + as datas escolhidas.
  3. Campo de nome no "ciente" não exige mais bater exatamente com o nome cadastrado no perfil — só pede nome completo (2+ palavras, 5+ caracteres) e o checkbox marcado. Isso valia tanto no client-side quanto na função SQL (`create_extra_visit_request_v1`); nova migration `20260928224000_extra_visit_ack_name_free_text.sql` substitui a checagem de igualdade exata por essa validação mais permissiva.
  4. Texto do "ciente" reescrito com tom mais humano sobre justificativa de cancelamento: reconhece que eventualidades acontecem, pede aviso com antecedência e motivo, e só então explica quando a taxa de 20% se aplica.
  5. **Painel admin redesenhado só para o cartão de visita extra:** a Pati achou a exibição desorganizada (badges soltos + parágrafo corrido). Troquei por um bloco distinto (`.scheduling-v65-extra`) com ícone de alerta, título, selo de valor destacado e uma mini-tabela de fatos (Ciência / Despesas / No-show-cancelamento) em vez de texto corrido. Os pedidos de agenda comuns (reunião virtual, visita presencial normal) não foram alterados — a mudança é específica de `request.extra_visit`.
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `src/components/extra-visit-request.css`, `src/lib/schedulingRequestsRuntimeV65.ts`, `supabase/migrations/20260928224000_extra_visit_ack_name_free_text.sql`.
- **Verificação:** `npm run check` (typecheck + build) passou. Sem acesso a navegador/dispositivo nesta sessão — nada foi verificado visualmente; a Pati precisa conferir ao vivo.
- **Autor:** Claude, em cima do código do Codex — nenhuma reestruturação do fluxo em si, só os pontos que ela apontou.
- **Aprovação:** pendente da revisão visual da Pati.

---

## 2026-09-28 — Claude (Visita Extra: 2ª rodada de review — remoção de destaque, painel admin flutuante, despesas na página de Clientes)

- **Pedido:** Pati testou de novo e trouxe 3 pontos novos, com prints.
- **1) Removido:** o card de destaque "Esse tempo é 100% dedicado à sua empresa" (adicionado na rodada anterior) — ela achou que não combinava logo depois do card que já falava sobre tempo dedicado. Voltou a ser texto simples dentro da lista de condições, como estava antes dessa rodada.
- **2) Painel admin de "Solicitações de agenda" virou botão flutuante + gaveta lateral.** Ela não gostou do painel estático ocupando o topo do Calendário com badges soltos. Agora: um botão flutuante no canto inferior direito (`.scheduling-v65-float`, ícone de sino + contador) só aparece quando existe pedido pendente de análise; ao clicar, abre uma gaveta lateral (`.scheduling-v65-drawer`, desliza da direita, ~420px) com a lista de pedidos, no mesmo padrão visual já usado pelo card de visita extra. Quando não há mais pedidos pendentes, o botão some e a gaveta fecha sozinha. O botão "Configurar encontros do contrato" continua sempre acessível, agora num bloco fixo mais discreto (`Agenda do contrato`) que não desaparece com a lista. A seção "Visitas extras não realizadas" (decisão manual de no-show) não foi mexida — ela não reclamou dessa parte.
  Referência de estilo usada: o widget "Fale com a Pati" do cliente (botão flutuante + painel lateral) — sem o vídeo animado da Pati, para não aumentar o bundle do admin com o asset de vídeo (~217KB); posso adicionar a animação depois se ela quiser, é só pedir.
- **3) Botão "Despesas das visitas" saiu do topo do Calendário e foi para a página de Clientes** (`/admin/clientes`) — ela achou o botão grande demais no topbar do Calendário. E o modal foi **redesenhado do zero**: antes usava o mesmo estilo "quente" (creme/dourado, serifada) do modal do cliente, o que destoava do resto do admin; agora usa CSS próprio (`extra-visit-expenses.css`) no padrão neutro do admin (cores de `--theme-surface`/`--theme-text`, sans-serif, cantos e sombras iguais aos outros modais do sistema).
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `src/components/extra-visit-request.css`, `src/components/ExtraVisitExpenses.tsx`, `src/components/extra-visit-expenses.css` (novo), `src/components/WorkspaceShell.tsx`, `src/lib/schedulingRequestsRuntimeV65.ts`.
- **Verificação:** `npm run check` (typecheck + build) passou. Sem navegador nesta sessão — nada verificado visualmente; ela precisa conferir ao vivo, principalmente a gaveta lateral do admin (é a peça nova mais arriscada visualmente).
- **Autor:** Claude. **Aprovação:** pendente da revisão visual da Pati.

---

## 2026-09-28 — Claude (Visita Extra: 3ª rodada — bug de posicionamento/cor no modal de despesas, redundância na gaveta admin)

- **Pedido:** Pati testou de novo (prints do modal "Despesas de visitas extras" e da gaveta admin) e trouxe 4 pontos.
- **1) Bug de posicionamento + cor achado e corrigido:** o modal "Despesas de visitas extras" (`ExtraVisitExpenses.tsx`) não usava `createPortal` como o modal irmão (`ExtraVisitRequest.tsx`) já usava — renderizava como filho do botão que fica dentro do topbar, e o topbar tem `backdrop-filter: blur(...)` (`src/styles.css`), que vira o "containing block" de qualquer `position:fixed` descendente. Resultado: o modal parava de se centralizar em relação à tela inteira, ficava cortado/deslocado, com blur no lugar errado — exatamente o sintoma que ela reportou (parte da tela sem blur, modal não centralizado). Corrigido: o modal agora é portado para `document.body`, igual ao componente irmão, com o mesmo scroll-lock (`extra-visit-open`). Registrei essa causa como **regra permanente** no topo deste arquivo, porque é um erro fácil de repetir em qualquer modal novo — vale tanto para mim quanto para o Codex.
- **2) Cor de texto em fundo fixo:** registrei também como regra permanente que um modal com fundo de cor fixa (não muda dia/noite) precisa de cor de texto fixa própria, nunca depender de `var(--theme-text)` — evita o texto ilegível que ela viu.
- **3) Redundância na gaveta do admin:** os dois horários propostos apareciam duas vezes — uma vez como "chips" informativos e de novo dentro do texto dos botões "Confirmar opção · ...". Removi os chips duplicados para pedidos com status `submitted`/`reschedule_review` (só nesse caso havia duplicação; mantive os chips onde não há repetição, ex.: `client_review`).
- **4) Visual "amontoado" da gaveta:** cada pedido agora tem cartão próprio (borda, cantos arredondados, fundo levemente diferenciado, espaçamento interno entre título/fatos/observações/ações), em vez de tudo grudado na lateral. Comprovantes de despesa (quando houver mais de um) agora aparecem como linhas separadas por divisórias, com nome da despesa, valor e link "Ver comprovante" bem distintos — igual uma linha de prestação de contas.
- **Arquivos:** `src/components/ExtraVisitExpenses.tsx`, `src/components/extra-visit-expenses.css`, `src/lib/schedulingRequestsRuntimeV65.ts`, `docs/AI_CHANGE_LOG.md` (regra permanente).
- **Verificação:** `npm run check` (typecheck + build) passou. Sem navegador nesta sessão — a causa do bug de posicionamento foi encontrada por inspeção de código (containing block do `backdrop-filter`), não por reprodução visual; ela precisa confirmar ao vivo que sumiu.
- **Autor:** Claude. **Aprovação:** pendente da revisão visual da Pati.

---

## 2026-09-29 — Claude (Bug: logo de cliente já cadastrado não atualizava)

- **Pedido:** Pati reportou que, ao trocar a logo de um cliente já cadastrado, a imagem não atualizava "em tempo real" nas telas com moldura (visão padronizada Workspace). Pediu também para registrar no handoff (sem implementar agora): o decisor poder trocar a própria logo/nome da empresa, e o nome do decisor precisar bater com o do perfil dele (ela viu uma divergência).
- **Causa raiz:** a plataforma gera e cacheia no banco (`companies.logo_workspace_url`) uma versão processada da logo (fundo removido, recortada e centralizada num quadrado padrão — a "moldura" usada no dashboard do cliente, relatórios, documentos etc., ver `src/lib/companyWorkspaceLogo.ts`). Essa geração só acontece **uma vez**: `ensureCompanyWorkspaceLogo()` sai de imediato se `logo_workspace_url` já estiver preenchido. Quando a Pati trocava a logo de um cliente em `/admin/clientes`, o admin atualizava `companies.logo_url` (a imagem original) mas nunca limpava `logo_workspace_url` — então toda tela que prioriza a versão "moldurada" (`ClientDashboard.tsx`, `ClientReportsPageV5.tsx`, `documentsIdentityRuntimeV42.ts`) continuava mostrando a logo **antiga**, para sempre, mesmo com a nova imagem já salva no banco.
- **Correção:** em `saveClient()` (`src/pages/admin/AdminClientsPageV3.tsx`), sempre que uma nova logo é enviada no upload de um cliente já cadastrado, o mesmo `update` na tabela `companies` agora também zera `logo_workspace_url` e `logo_workspace_generated_at`. Isso faz duas coisas: (1) as telas que caem para `logo_url` quando não há versão moldurada já passam a mostrar a logo nova imediatamente; (2) o job de backfill do admin (`backfillWorkspaceLogos`, roda automaticamente em rotas `/admin/*`) detecta o campo vazio e regenera a versão moldurada a partir da logo nova em segundo plano.
- **Arquivo:** `src/pages/admin/AdminClientsPageV3.tsx`.
- **Verificação:** `npm run check` (typecheck + build) passou. Sem navegador nesta sessão — corrigido por leitura de código (rastreei o campo `logo_workspace_url` até o ponto onde nunca era limpo), não por reprodução visual; a Pati precisa trocar uma logo de teste e conferir ao vivo (o normal é a moldura levar alguns segundos para regenerar depois da troca, já que roda em segundo plano).
- **Pendente no handoff (não implementado agora, por pedido explícito da Pati — resolver só a foto por enquanto):**
  1. Permitir que o decisor (usuário cliente) troque a própria logo e o nome da empresa pelo portal do cliente — hoje essa edição só existe no admin (`AdminClientsPageV3.tsx`).
  2. Investigar e corrigir a divergência entre o nome do decisor cadastrado em `companies`/`client_invites` e o nome no perfil dele (`profiles`) — a Pati notou que estão diferentes em pelo menos um cliente; precisa mapear onde cada um é editado antes de decidir qual é a fonte da verdade.
- **Autor:** Claude. **Aprovação:** pendente da confirmação visual da Pati (troca de logo) e de decisão sobre os dois itens de handoff acima.

---

## 2026-09-29 — Codex (histórico, alteração de visita extra e agenda contratual)

- **Pedido da Pati:** exibir ao cliente os dados que ele preencheu e os pedidos recusados; permitir cancelamento e reagendamento com justificativa antes e depois da confirmação; remover a sobreposição de dois modais; identificar a visita e a data nas notificações; colorir o card inteiro conforme o estado; transferir a configuração de agenda contratual do Calendário para os dados do cliente.
- **Cliente:** `/cliente/cronograma` mantém todas as visitas extras no histórico, inclusive recusadas e canceladas. O modal único mostra datas, endereço, objetivo, resposta da CALI e motivo da alteração. Cancelar ou sugerir duas novas datas exige justificativa e mostra o aviso sobre avaliação manual de eventual taxa. Cards confirmados ficam verdes, em análise amarelos, recusados/cancelados vermelhos, com contraste nos temas dia e noite. O modal antigo de detalhes de eventos da agenda deixa de ser aberto sobre o novo.
- **Admin:** alterações do cliente chegam como notificação e aparecem para avaliação no Calendário. A decisão da taxa de 20% é manual e justificada; pedidos não confirmados antes da alteração não podem receber a taxa. A aba **Agenda do contrato** fica dentro da conta específica em `/admin/clientes`; o botão e modal antigos foram removidos do Calendário.
- **Dados:** migration `20260929030000_extra_visit_client_changes.sql` cria RPCs com verificação de perfil, empresa e estado, guarda motivo, data antiga e histórico, cancela o evento vinculado e registra log/notificações. A notificação histórica genérica da visita recusada foi atualizada no banco. Relatório executivo inclui a taxa somente quando aprovada pela CALI, sem lançamento automático por pedido do cliente.
- **Autor:** Codex. **Aprovação visual:** aguardando conferência da Pati. **Limites:** sem QA autenticado de navegador; confirmar a sincronização do cancelamento com Google Calendar e o envio de e-mail pelo processamento existente. A agenda fixa mensal do CALI Full continua em desenho separado.

---

## 2026-09-29 — Codex (mesma grade semanal para calendário admin e cliente)

- **Pedido:** Pati mostrou o calendário administrativo aparecendo por um instante sem CSS (em blocos), bordas de eventos pesadas e um calendário do cliente com estrutura e descrição diferentes. O administrativo é o padrão visual aprovado para replicar no cliente, preservando permissão e dados de cada perfil.
- **Alteração:** o CSS base dos dois calendários passa a carregar na entrada do app, antes da primeira renderização da rota. A semana do cliente usa as mesmas peças de grade do administrador: eixo de 07h a 19h, altura de 64px por hora, cabeçalho de dia, faixa de dia inteiro, cartões com título, horário e origem/situação. Solicitações extras permanecem como prévias; recusadas em vermelho, confirmadas em verde; Google preserva a cor da agenda. O cliente continua vendo só seus dados e ações autorizados. Bordas e sombras do administrador foram suavizadas, inclusive nas prévias.
- **Arquivos:** `src/App.tsx`, `src/page4-calendar.css`, `src/client-timeline-v3.css`, `src/pages/client/ClientTimelinePage.tsx`.
- **Verificação:** `npm run check` passou (TypeScript e build). Sem sessão autenticada dos dois perfis neste ambiente; checagem visual ao vivo e mobile permanece necessária.
- **Autor:** Codex. **Aprovação:** aguardando avaliação da Pati.

---

---

## 2026-09-29 — Claude (Bug real: upload de logo travava com .avif + erro invisível atrás do modal)

- **Pedido:** Pati tentou trocar a logo de um cliente de teste (para conferir a correção anterior), clicou em "Salvar alterações" e o modal simplesmente não fechava nem mudava nada — sem mensagem, sem feedback.
- **Causa raiz 1 (upload falhava de verdade):** o arquivo usado era `.avif` (`logotipo-abstrato-da-companhia_53876-120501.avif`). `optimizeImageForUpload()` (`src/lib/imageUpload.ts`) só aceitava `image/jpeg`, `image/png`, `image/webp` e `image/svg+xml` — qualquer outro tipo, incluindo AVIF, disparava `throw new Error('Use uma imagem JPG, PNG, WEBP ou SVG.')` antes mesmo de tentar o upload. Isso é pego pelo `catch` de `saveClient()`, que chama `setError(...)` e simplesmente não fecha o modal.
- **Causa raiz 2 (por isso pareceu "travado", sem nenhum aviso):** a mensagem de erro é renderizada num `<div>` no corpo da página (`{error&&<div className="inline-notice">...`), mas o modal de gestão da conta é um overlay de tela cheia com `z-index:100` por cima de tudo — então a mensagem de erro **existia**, só que ficava escondida atrás do próprio modal. Resultado: clicar em salvar parecia não fazer nada.
- **Correção:**
  1. `src/lib/imageUpload.ts`: adicionado suporte a `image/avif` (aceito e mantido com extensão `.avif`; se precisar redimensionar/comprimir, o canvas converte para WEBP normalmente, igual já acontecia com os outros formatos).
  2. `src/pages/admin/AdminClientsPageV3.tsx`: adicionado o mesmo aviso de erro **dentro do modal de Gestão da Conta**, logo acima do rodapé com os botões — agora qualquer falha ao salvar (logo em formato não suportado, erro de rede, etc.) aparece visível para quem está editando, sem precisar fechar o modal para ver.
- **Arquivos:** `src/lib/imageUpload.ts`, `src/pages/admin/AdminClientsPageV3.tsx`.
- **Verificação:** `npm run check` (typecheck + build) passou. Sem navegador nesta sessão — a causa foi confirmada pela mensagem de erro que o código gera para `.avif` batendo exatamente com o comportamento relatado (nada acontece, sem feedback); a Pati precisa testar de novo com a mesma imagem `.avif` e confirmar que agora sobe e a mensagem (se houver outro erro) aparece dentro do modal.
- **Nota para o handoff:** essa classe de bug (erro real acontecendo mas escondido atrás de um modal de tela cheia) é fácil de repetir em qualquer outro modal do admin — vale revisar se existem outros modais que dependem só do aviso de página (`inline-notice` fora do modal) em vez de mostrar erro dentro de si mesmos.
- **Autor:** Claude. **Aprovação:** pendente da confirmação da Pati.

---

## 2026-09-30 — Claude (Levantamento legal/LGPD da plataforma — hospedagem, política de privacidade, retenção de dado)

- **Pedido da Pati:** entender todas as obrigações legais da plataforma (hospedagem, termos que cliente assina, cobrança), a partir de uma dúvida de uma amiga que tem plataforma com modelo "um perfil pago por cliente". Depois de eu levantar isso, ela esclareceu: o acesso ao app **não é um SaaS vendido separado** — é um benefício incluído no contrato de consultoria de cada cliente (CaliPartner/CaliFull/CaliBuild), então não precisa de Stripe/assinatura/checkout dentro do app. Ela pediu então uma verificação mais a fundo da parte legal (LGPD/dado pessoal) para "ter 100% de certeza", e que qualquer política que faltasse já fosse criada e inserida na plataforma para o cliente ver.
- **Hospedagem (fato técnico, não muda com o esclarecimento acima):**
  - Frontend: Vercel, projeto `app-cali`, deploy único servindo todos os clientes.
  - Banco: Supabase, projeto "CALI MAPA" (compartilhado com mapa.calirh.com), organização "CALI RH" no **plano FREE**. Risco real: autopause por inatividade, teto de 500MB de banco e 1GB de storage, sem backup diário — recomendo migrar para o plano pago antes de crescer a carteira, independente do modelo de cobrança.
  - Projeto Supabase órfão **"Portal Cali"**, status INACTIVE — parece resquício de tentativa anterior; pendente da Pati decidir se apaga.
  - Multi-tenant já correto: isolamento por `company_id` via RLS (16 tabelas com RLS habilitada) — cadastrar cliente novo não gera custo de infraestrutura incremental, diferente do modelo "um perfil por cliente" da amiga dela.
- **Controle de acesso por status do contrato — já funciona, confirmado no código:** em `AdminClientsPageV3.tsx`, `applyLifecycle()` já desativa `profiles.active` de todos os usuários da empresa ao bloquear/arquivar/encerrar o contrato (e reativa ao reativar) — `ProtectedRoute.tsx` barra login de quem está com `active=false`. Ou seja, "acesso enquanto for cliente" já é a regra real hoje, sem trabalho adicional necessário.
- **Levantamento de dado pessoal tratado pela plataforma:**
  - Do decisor de cada cliente: nome, e-mail, telefone, WhatsApp, cargo, aniversário (`companies`/`client_invites`).
  - Do usuário logado: nome, e-mail, papel, horário do último acesso (`profiles`).
  - Documentos: contrato assinado, aditivos, comprovantes de despesa de visita extra (podem conter dado de nota fiscal/financeiro de terceiro).
  - Sem rastreamento de IP, geolocalização ou analytics de terceiro (Google Analytics, Meta Pixel, etc.) em nenhum lugar do código — footprint de coleta é enxuto.
  - Compartilhamento com terceiro: Resend (envio de e-mail transacional), Google Calendar e Google Drive (via OAuth, quando o admin conecta), Supabase (infraestrutura). Nenhum outro serviço externo recebe dado.
- **Achado importante: já existe Política de Privacidade publicada**, em `https://calirh.com/privacidade.html` (última atualização 21/08/2026), cobrindo site + Mapa de People + Portal de Propostas +, em linhas gerais, o CALI Workspace (app). Define a Pati/CALI RH como responsável pelo tratamento, `patricia@calirh.com` como canal do titular, e lista os direitos LGPD (acesso, correção, portabilidade, eliminação etc.).
- **Gap real encontrado (o ponto que merece decisão, não é só documentação):** a política publicada promete que o dado é eliminado ou anonimizado quando a finalidade/relação acaba (seção 06), mas **tecnicamente isso não existe** — quando um contrato é encerrado, o sistema só desativa o acesso (`profiles.active=false`); nenhum dado é apagado ou anonimizado, tudo permanece no banco indefinidamente. Isso é uma divergência real entre o que o texto promete e o que o sistema faz. Duas saídas possíveis, e a escolha é dela (com o advogado):
  1. Implementar uma rotina real de exclusão/anonimização de dado do cliente após um prazo definido do encerramento do contrato (ex.: X anos, alinhado com prazo de guarda fiscal/civil de contrato no Brasil — isso é pergunta pro advogado, não técnica).
  2. Ajustar o texto da política pra não prometer eliminação automática, e descrever o que de fato acontece (acesso encerrado, dado retido por prazo indeterminado/definido).
  Não implementei nenhuma das duas agora porque é decisão de negócio/jurídica com risco de reverter errado (ex.: apagar contrato antes do prazo legal de guarda é outro tipo de risco) — fica registrada como pendência de decisão dela.
- **O que já inseri na plataforma agora** (parte segura, sem exigir texto jurídico novo): a política existente não tinha nenhum link visível **dentro do app logado** — só no rodapé do site de marketing. Adicionei:
  - Um link "Privacidade e proteção de dados" no rodapé da tela de login (`src/pages/LoginPage.tsx` + `src/login-home-v2.css`), apontando para a política já publicada.
  - Um link equivalente no rodapé da barra lateral do Workspace (`src/components/WorkspaceShell.tsx` + `src/styles.css`), visível tanto para admin quanto para cliente logado.
- **Arquivos:** `src/pages/LoginPage.tsx`, `src/login-home-v2.css`, `src/components/WorkspaceShell.tsx`, `src/styles.css`.
- **Verificação:** `npm run check` (typecheck + build) passou. Sem navegador nesta sessão — os links foram conferidos por leitura do JSX/CSS, não visualmente; a Pati precisa abrir a tela de login e o menu lateral pra confirmar que o link aparece bem posicionado nos dois temas (dia/noite).
- **Importante — limite do que eu posso afirmar:** eu não sou advogado. Tudo acima é levantamento técnico (o que o código faz, o que está publicado, onde bate ou não bate) — a validação final do texto legal, do prazo de retenção e de qualquer anexo contratual precisa ser feita por um advogado. Não criei uma política nova porque já existe uma publicada e específica o bastante; o que falta é decisão sobre o gap de retenção/eliminação, não redação do zero.
- **Autor:** Claude. **Aprovação:** pendente da Pati revisar os links visualmente e decidir o que fazer com o gap de retenção (implementar exclusão real vs. ajustar o texto da política).

---

## 2026-09-29 — Codex (pente fino de logos e continuidade técnica)

- **Pedido:** Pati viu logos quebradas e pediu revisão das telas e leitura do handoff após a correção do Claude para troca de imagem/AVIF.
- **Achado:** algumas rotas ativas ainda renderizavam `companies.logo_url` diretamente. Um registro histórico guardava link assinado do Storage; um link assim expira. O resolver comum (`resolveWorkspaceMedia`) reemite o link a partir do caminho privado. Na consulta atual, a conta ativa tem original e versão processada em `private:`, ambas presentes. O defeito de leitura é distinto da invalidação da imagem processada ao trocar a logo, corrigida por Claude. Não alterei o upload AVIF nem o aviso de erro dentro do modal dele.
- **Correção:** Início do cliente, Clientes, Calendário, Documentos e Relatórios administrativos passam a resolver a imagem antes de renderizar, priorizando a logo original e usando a processada como reserva. A prioridade da original respeita a decisão registrada em 26/09, que evitou a troca visível de tamanho/recolorização após carregar. O arquivo de Clientes foi composto sobre o último conteúdo de Claude, preservando a invalidação de `logo_workspace_url`, o suporte AVIF e o erro dentro do modal. Rotas legadas de relatórios não montadas no `App.tsx` ficaram fora desta rodada.
- **Verificação:** `npm run check` passou (TypeScript + build) antes da publicação; inspeção das rotas ativas e do formato do dado no Supabase. Publicado no repositório oficial por atualização seletiva de cinco arquivos. Sem sessão autenticada de cliente/admin para confirmação visual da troca de logo, inclusive no tema noite e mobile; **aprovação:** aguardando avaliação da Pati.
- **Riscos e próxima rodada:** confirmar em uso real a troca AVIF e as cinco telas; medir navegação, imagens e CSS por rota antes de novas camadas de UI. Regras permanentes do handoff: mesma experiência admin/cliente, contraste dia/noite, modal de viewport via portal e dados reais. Não criar outro runtime, polling ou card redundante para resolver uma tela isolada. A ativação da leitura da agenda Google depende de nova autorização pela Pati; agenda fixa mensal CALI Full, R$/km, faturamento e FAQ por pacote seguem em aberto como fluxos separados.
- **Autor:** Codex. **Aprovação visual:** pendente.


---

## 2026-09-29 — Codex (agenda com foco na grade e seleção de horário)

- **Pedido:** Pati confirmou que a troca da logo PNG refletiu corretamente; não é necessário insistir no teste AVIF nesta rodada. Na agenda, pediu retirar os três resumos grandes do cliente, dar espaço à grade, corrigir a área espremida de dia inteiro/horário, escolher um horário por clique ou arrasto, navegar horizontalmente, sinalizar horários fechados, reduzir o botão amarelo de agendamento a um ícone com dica, pôr ícones nas escolhas presencial/online, transformar o histórico do cliente em botão/modal, corrigir contraste dos eventos Google no tema noite e compactar o modal de novo evento do administrador.
- **Alteração:** removidos os três cartões de resumo da agenda do cliente. A grade semanal permite clicar ou arrastar em horário vazio: no cliente abre o pedido de encontro extra com primeira opção preenchida, no administrador abre Novo evento com início/fim preenchidos. Não confirma nenhum encontro automaticamente. A navegação horizontal avança/volta semanas ao alcançar a borda; finais de semana e horas fora do atendimento aparecem fechados para seleção do cliente. O histórico de reuniões do cliente fica atrás de um botão e abre em modal. O botão de agendar no topo virou ícone amarelo com descrição no hover/foco; o seletor usa ícones de prédio e pessoa/microfone. A legenda à esquerda recebeu mais espaço. Cores claras de eventos Google forçam texto escuro legível inclusive no tema noite. O formulário Novo evento do administrador ficou mais compacto, com campos secundários recolhidos em “Mais detalhes”; ações e dados existentes continuam disponíveis.
- **Arquivos:** `src/components/ExtraVisitRequest.tsx`, `src/components/extra-visit-request.css`, `src/pages/client/ClientTimelinePage.tsx`, `src/client-timeline-v3.css`, `src/pages/admin/AdminCalendarPage.tsx`, `src/page4-calendar.css`.
- **Verificação:** `npm run check` passou (TypeScript e build). Atualização seletiva dos seis arquivos no repositório oficial, preservando as alterações do Claude. Não houve sessão autenticada de administrador e cliente para conferir o visual em navegador; Pati ainda precisa validar desktop/mobile, clique e arrasto, foco/teclado, tema dia/noite e horários ocupados.
- **Regra permanente de contraste:** em ambos os perfis e temas, todo texto, ícone, número, etiqueta e botão deve ser legível sobre o fundo real onde aparece. Fundo claro exige primeiro plano escuro; fundo escuro exige primeiro plano claro. Conferir estados de hover, seleção, eventos Google com cores próprias, modais e mobile antes de considerar a tela pronta.
- **Radar próximo:** permitir a Pati configurar feriados, fechamento e horário reduzido para bloquear/oferecer agenda corretamente; definir efeito em disponibilidade, fusos e pedidos já enviados antes de implementar. Verificar por que a marca CALI no sidebar só aparece cerca de dois segundos após expandir; manter o espaço e a imagem carregados sem salto. Refinar a rolagem horizontal por dia e a seleção em toque após teste real. Evitar cartões novos para avisos e dados que cabem em botões/modais. A responsabilidade específica do Claude será indicada pela Pati, sem trabalho concorrente nos mesmos arquivos.
- **Autor:** Codex. **Aprovação:** logo PNG confirmada pela Pati; alterações da agenda nesta rodada aguardam conferência visual.


---

## 2026-09-29 — Codex (revisão final da agenda e regras futuras)

- **Pedido e aprovação:** Pati testou a rodada anterior e informou que os demais ajustes solicitados funcionaram. Nesta rodada pediu aviso de proposta ocupando a largura do detalhe com ícone de atenção; filtros de tipo/cliente próximos da busca em vez de card lateral; detalhe administrativo menor; integração Google do cliente mais explicada. A aprovação visual destes quatro ajustes permanece pendente.
- **Feito:** aviso do cliente em linha de ponta a ponta com ícone; filtro de cliente e tipos de evento em popover junto à busca, preservando busca e alternância Mês/Semana/Agenda; remoção do card lateral de tipos; detalhe administrativo mais estreito e compacto, com conteúdo rolável e ações preservadas; chamada de integração Google explica a agenda pessoal, os compromissos CALI e o filtro de visualização. Arquivos: `src/pages/client/ClientTimelinePage.tsx`, `src/client-timeline-v3.css`, `src/pages/admin/AdminCalendarPage.tsx`, `src/page4-calendar.css`. `npm run check` passou. Sem teste visual autenticado.
- **Achado real — “Reuniao da Sede”, protocolo CALI-EVT-2026-000004:** o evento de Company IN em 09/10/2026 às 12h (horário de São Paulo) é presencial e veio de `scheduling_requests.id=a89b14bb-1d26-42b6-9dd8-e432633a485a`. A solicitação está confirmada com `billable_extra=true`; o evento tem `billing_applies=true`. Portanto **não há evidência de que consuma a reunião mensal incluída**. O campo legado `extra_visit=false` diverge do adicional faturável, e `companies.service_plan` dessa conta está nulo, apesar da identificação da Pati como CALI Partner. O texto no evento diz “Visita adicional” e “Deslocamento incluso”; conferir termos reais, cobrança e origem antes de excluir ou editar. Não foi alterado dado real nesta rodada.
- **Regra futura de pacotes:** matriz versionada por contrato e vigência, aplicada à criação/edição admin e às solicitações do cliente; mostrar o que está incluído, o que é extra autorizado e o que exige upgrade. Para Partner, reunião online mensal incluída, presencial não incluída; um pedido presencial adicional pode continuar disponível conforme regra comercial, com preço e ciência, sem ser confundido com benefício incluso. CALI Full tem agenda presencial fixa mensal separada do extra. Não inferir plano pelo título do evento; registrar a categoria no dado. Configurar plano ausente e migrar/classificar registros legados depois de revisão da Pati.
- **Ausência e comunicação — desenhar antes de codar:** Google Agenda pessoal pode bloquear disponibilidade sem expor título/detalhes ao cliente. Uma ausência CALI publicada pela Pati (feriado, férias, horário reduzido ou indisponibilidade) deve ter início/fim, escopo e orientação de urgência. Após confirmação explícita de publicação, avisar apenas clientes impactados no app/e-mail; manter solicitações e canal de atendimento abertos, mostrar prazo e quem responde. Reavaliar pedidos pendentes em conflito e não disparar avisos a partir de qualquer evento pessoal do Google. Permitir cancelar/editar a ausência com comunicação de mudança.
- **Primeiro acesso — backlog:** e-mail de boas-vindas com vídeo da Pati, e vídeo acessível também no Workspace por escolha editorial, sem duplicar reprodução automática. Tour curto e contextual com Próximo, Voltar, Pular e Rever; registrar versão e conclusão por usuário; funcionar nos temas e no mobile. O vídeo será fornecido pela Pati. Não enviar até o conteúdo e destinatários estarem definidos.
- **Integração Google:** verificar no uso real conexão, escopo autorizado, eventos pessoais no filtro “Minha agenda Google” e sincronização dos encontros CALI. O texto novo explica a intenção; ainda precisa de QA autenticado.
- **Autor:** Codex. **Aprovação:** rodada anterior funcionalmente validada pela Pati; ajustes desta rodada aguardam conferência. Claude receberá da Pati responsabilidades distintas.

---

## 2026-09-29 — Codex (filtro, contraproposta e cadastro de clientes)

- **Pedido da Pati:** o filtro administrativo ficava atrás da agenda; a contraproposta enviada continuava como pendência da CALI, com as datas antigas na agenda; a notificação levava o cliente à página genérica e o retorno repetia opções e texto confuso. Remover os quatro cartões de métricas da carteira e verificar o vínculo do CALI Partner. A conta Company IN é um cadastro de teste **real**, com dados persistidos, nunca um mockup.
- **Agenda:** filtro elevado acima da grade; após a CALI sugerir datas, o pedido permanece visível na gaveta com estado “Aguardando resposta do cliente”, mas sai do contador de ações pendentes e da prévia de horários da agenda administrativa. Uma atualização recebida enquanto a gaveta consulta dados é enfileirada para evitar tela antiga. A notificação de `scheduling_request` leva ao pedido específico por ID e foca o cartão de resposta fora da seção recolhível da integração Google.
- **Cliente:** a resposta mostra a mensagem da Paty e duas ações de aceite com data uma única vez, além de “Pedir outras opções”. Texto explica que a proposta inicial não encaixou e orienta o próximo passo. A integração Google foi resumida quando expandida. Os dados são lidos do Supabase; sem dados simulados.
- **Carteira:** removidos os quatro cartões de resumo; fica um contador discreto e o botão de cadastrar. O campo “Serviço” e a política de agenda consultavam colunas diferentes (`service_type` e `service_plan`). A ficha agora lê o plano efetivo, salva ambos ao selecionar CALI Partner ou Full e aplica as regras padrão de encontros quando o produto é alterado. Company IN foi corrigida em produção de `Ambiente de teste`/`service_plan=null` para `CALI Partner`/`partner`, preservando as regras preexistentes de 1 encontro online mensal e 0 visitas inclusas; a atualização foi condicional e retornou uma linha.
- **Revisão do cadastro, parcial:** a Matriz V3 e a minuta `V.2. CALI_RH_Minuta_CALI_PARTNER_KIE-TEC.docx` mostram razão social, CNPJ, CEP e identificação do representante como dados úteis. O modal agora edita a razão social em `companies.legal_name`. Ainda faltam CNPJ/CEP em `companies` e CPF do representante em `client_invites`. Revisar com os modelos de tela que a Pati enviará, planejar persistência e validação, sem assumir que todas as cláusulas da minuta são regra universal. Verificar também prazo contratual mínimo por produto (Partner 8 meses, Full 12 meses) antes de eventual bloqueio de cadastro. Não preencher esses dados com valores fictícios.
- **Primeiro acesso:** tour guiada e vídeo de boas-vindas aprovados como item futuro, ainda sem implementação; vídeo depende de material gravado pela Pati.
- **Mensagens após ações — próximo refinamento:** criar feedback contextual para confirmação, contraproposta, recusa e cancelamento, com estado real e próximo passo para cada persona. Nesta rodada, o fluxo de contraproposta recebeu copy e toast; não existe ainda uma camada universal de mensagens para toda a plataforma.
- **Autor:** Codex. **Aprovação visual:** aguardando teste da Pati. **Verificação:** `npm run check` passou; não houve QA autenticado ponta a ponta. O fluxo de contraproposta deve ser testado com duas sessões reais (admin/cliente) após o deploy.

### 2026-09-29 — Codex — Diagnóstico de eventos duplicados após aceite de proposta
- Pati confirmou filtro, Company IN e fluxo do cliente; relatou três blocos de “Visita presencial extra” no calendário administrativo e o indicador “1 cliente ativo” ao lado de Cadastrar cliente.
- Conferência em produção: há **um** evento do Workspace (`CALI-EVT-2026-000005`) e **três** eventos no Google no mesmo horário. O ID vinculado ao Workspace é `vpdvqbt5j9fa2uqcu3njsk1mv0`; `2bhnirrghcu1cq1rmqoab2i2po` e `2sf8r1p2lnqg965l8ccis3sps0` ficaram órfãos. A agenda exibe o evento Workspace e as duas cópias Google como pessoais.
- Causa: `google-calendar-oauth sync_event` por realtime e `workspace-sync-scheduled-event` após aceite podiam criar o mesmo evento simultaneamente antes de gravar `google_event_id`.
- Corrigido: o sincronizador genérico deixa a criação de `scheduling_request` para o fluxo dedicado; este usa ID Google estável e trata conflito 409 como o mesmo evento. Funções publicadas nas versões 6 e 2. Removido o contador avulso da página de clientes.
- As notificações “Novo convite de agenda” e “Horário confirmado pelo cliente” vieram de gatilhos distintos para o mesmo evento, uma para convite e outra para confirmação. Há redundância de mensagem para a administradora, não dois agendamentos do Workspace.
- **Pendente:** excluir as duas cópias órfãs do Google somente após autorização explícita para remover eventos. O evento vinculado e a solicitação confirmada devem permanecer. Revisar depois a redundância de notificação administrativa. A alteração desta rodada não foi ainda avaliada por Pati.

### 2026-09-30 — Codex — Agenda Google e detalhes de calendário
- **Autorização de Pati:** excluir as duas cópias órfãs da visita de 20/10/2026, preservar o evento vinculado. Excluídos do calendário principal Google `2bhnirrghcu1cq1rmqoab2i2po` e `2sf8r1p2lnqg965l8ccis3sps0`; busca posterior retornou somente `vpdvqbt5j9fa2uqcu3njsk1mv0`, vinculado ao evento `CALI-EVT-2026-000005`.
- **Proteção futura:** `google-calendar-oauth` v7 só sincroniza no Google eventos que pertencem ao usuário conectado, delega criação de solicitação à função específica e usa ID estável para inserções comuns; tentativa concorrente com conflito 409 consulta o mesmo evento em vez de criar outro. A função de visitas já havia recebido ID estável na versão 2. O calendário do cliente também filtra a cópia recebida pelo Google quando o compromisso CALI correspondente já está visível no Workspace.
- `workspace-google-calendar-read` v5 passou a devolver convidados, status de resposta e link Meet. O modal administrativo dos compromissos Google exibe esses dados. No evento da CALI, as ações foram compactadas numa linha desktop, com quebra responsiva no mobile; o aviso da taxa de cancelamento permanece apenas no detalhe do cliente e agora descreve corretamente a condição de ausência/cancelamento sem aviso.
- Menu e título da agenda do cliente agora usam **Calendário**. Interface clara e escura devem ser verificadas visualmente após o deploy.
- **Estado de aprovação:** ajustes desta rodada ainda aguardam conferência de Pati. Não criar solicitação real para teste automatizado sem necessidade, pois isso envia convites/notificações e pode gerar cobrança.

### 2026-09-30 — Claude (Cláudio) — Revisão crítica e publicação da política de privacidade em calirh.com

- **Pedido da Pati:** a política publicada em `https://calirh.com/privacidade.html` não cobria "nem a plataforma, nem o site, nem... nada" de forma suficiente. Pediu revisão crítica usando tudo já levantado nesta sessão (ver entrada anterior "Levantamento legal/LGPD") e publicação no mesmo link.
- **Repositório:** esse link é servido por outro repositório Git, `patricia258/sitecali` (deploy Vercel `sitecali`, domínio `calirh.com`), não por `app.cali`. Anexei esse repositório à sessão, clonei, registrei e trabalhei nele — é um projeto Vite/React simples, sem convenção de `AI_CHANGE_LOG.md` própria; por isso o registro desta ação fica aqui, no handoff compartilhado.
- **Reescrita de `privacidade.html`:** a versão anterior só mencionava site, Mapa de People e Portal de Propostas. A nova versão declara explicitamente o CALI Workspace como canal coberto, com: inventário de dados por canal (decisor/equipe, dados da empresa, documentos enviados, uso da plataforma, agenda Google quando a própria empresa conecta a conta); base legal separada por canal (execução de contrato no Workspace; consentimento no Mapa/Portal; legítimo interesse nas métricas do site); lista de operadores (hospedagem, banco de dados/armazenamento, e-mail transacional, integração Google) e isolamento de dados entre empresas contratantes; transferência internacional declarada; seção de direitos já cobrindo o caso de pedido feito por um usuário de equipe (validação com a empresa contratante) e o direito de reclamar à ANPD; seção sobre público infantojuvenil.
- **Correção deliberada da retenção:** a versão anterior prometia eliminação/anonimização automática "quando aplicável". A plataforma não implementa isso hoje. Reescrevi para descrever o que de fato acontece — eliminação/anonimização mediante pedido, dentro dos limites legais — em vez de manter uma promessa que não corresponde à implementação atual. **Decisão em aberto para a Pati:** se ela quiser prometer eliminação automática no futuro, isso exige um projeto de engenharia separado antes de alterar esse texto de volta.
- **Verificação:** `npm install`, `npm run build` e `npx tsc --noEmit` no `sitecali` sem erros; confirmei que `privacidade.html` é copiado como arquivo estático para `dist/` (fora do bundle). Commit `30dbca5` (tag `[claude]`) enviado a `main`; confirmado via Vercel que o deploy de produção mais recente (`dpl_GXd5jcXXcyqAS8oo4kaADgeqw8id`, estado `READY`) já serve esse commit em `calirh.com/privacidade.html`. Sem conflito de merge nesse repositório.
- **Atenção — cruzar com a auditoria do Codex:** ao sincronizar esta entrada, encontrei `docs/WORKSPACE_PRIVACY_AUDIT_2026-10-01.md`, criado por Codex no mesmo período, listando categorias do Workspace ainda não inventariadas em detalhe (documentos privados por projeto, relatórios, ocorrências, horas, avaliações, anexos, registros de aceite/assinatura específicos por fluxo, logs de acesso, transcrições de agenda, backup/resposta a incidentes, prazos de retenção por categoria). O texto que publiquei é deliberadamente geral e não afirma nada que não esteja confirmado nesta sessão — não inventei residência de dados, prazos específicos por categoria nem consentimento universal — mas **não substitui** o inventário detalhado que o Codex pede antes de uma política específica do Workspace. Recomendo à Pati tratar o texto publicado agora como a correção do erro mais grave (silêncio total sobre o Workspace) e revisar, com advogado, se o nível de detalhe do inventário do Codex deve virar uma seção própria depois.
- **Não alterado:** nenhum mecanismo de dados foi implementado (eliminação, anonimização, exportação). Esta rodada foi só de conteúdo/texto da política pública.
- **Autor:** Claude (Cláudio). **Aprovação:** publicação feita por pedido explícito da Pati; redação final e prazos de retenção ainda sujeitos a revisão de advogado, como já registrado na entrada anterior.

### 2026-10-01 — Codex — Identificação do papel e desenho da equipe da empresa

- **Pedido da Pati:** mostrar claramente seu papel de administradora geral, distinguir cliente e parceiro interno, e desenhar uma ficha da empresa com quadro de colaboradores, CSV e movimentações mensais visíveis ao cliente e à CALI.
- **Código:** o menu do perfil agora identifica `Administradora geral` ou `Perfil cliente`, e o editor do perfil mostra um selo discreto para a administradora em tema dia e noite. Nenhuma permissão mudou.
- **Produto:** criado `docs/EQUIPE_EMPRESA_SPEC_2026-10-01.md` com matriz inicial de papéis, página por empresa, campos mínimos, importação com prévia, histórico de admissão/promoção/transferência/desligamento, segurança e decisões em aberto. `docs/PRODUCT_RULES.md` aponta para o novo escopo e deixa explícito que parceiro interno ainda não existe no banco.
- **Situação:** a página de equipe, o CSV e o papel de parceiro **não foram implementados nem ativados**. Antes de aceitar planilhas reais, fechar permissões, RLS e tratamento dos dados. **Aprovação:** proposta desta rodada aguarda revisão da Pati; os requisitos expressos por ela estão registrados, e as sugestões do Codex aparecem como propostas.

### 2026-10-01 — Codex — Prévia visual da ficha de pessoas e adesão opcional ao Workspace

- **Nova direção da Pati:** a ficha deve apoiar conversas sobre pessoas concretas, histórico profissional, motivos de saída e People Analytics. E-mail profissional pode viabilizar convites futuros para instrumentos comportamentais, sem envio automático. O cliente pode não aderir ao Workspace; acesso depende de termo separado, não nasce automaticamente do pacote de assessoria.
- **Conferência documental:** a minuta CALI Partner fornecida não menciona Workspace nem direito automático à plataforma; suas cláusulas sobre dados e atualização são gerais, sem periodicidade mensal ou modelo CSV. O comprovante CNPJ é da prestadora CALI/AKAYKO AZUMI, não é o cadastro da empresa cliente.
- **Desenho:** atualizado `docs/EQUIPE_EMPRESA_SPEC_2026-10-01.md` com as decisões prévias do planejamento compartilhado em `Texto colado.txt` (parceiro vinculado a uma empresa, remuneração opcional e restrita, departamentos reutilizáveis, importação com prévia), ficha individual com linha do tempo e contextos, e fluxo de adesão/termo. `docs/design/equipe-empresa-preview.html` traz prévia visual responsiva, sem nomes fictícios, integrações ou coleta de dados. O protótipo não foi ligado à navegação nem ao banco.
- **Segurança e aprovação:** papéis/RLS, termo, inventário de dados e permissões de remuneração continuam necessários antes de ativar o recurso. Layout e redação desta rodada **aguardam revisão da Pati**; nenhuma alteração de dados reais ou contrato foi feita.
- **Atenção técnica:** `AdminClientsPageV3` já consulta/cria `client_invites`; o novo termo opcional exige um gate antes de enviar ou ativar o convite. O formulário atual não expõe CNPJ e CEP completos da empresa cliente; devem ser acrescentados, sem reutilizar o CNPJ da prestadora.

### 2026-10-01 — Codex · complementos da Pati para equipe e People Analytics
- **Entrada da Pati:** identidade de gênero, filhos, avatares, tabela com retratos, seleção de colunas, exportação futura em PDF e gráficos; diferenciação CALI Partner/Full com caminho de upgrade. Quatro referências visuais recebidas (linhas/áreas, barras empilhadas e tabela).
- **Desenho atualizado:** `docs/EQUIPE_EMPRESA_SPEC_2026-10-01.md` agora especifica campos opcionais, `Outra identificação` com texto livre separado de `Prefiro não informar`, estados não respondidos, regras de avatar, colunas, relatório futuro e matriz **proposta** de indicadores por pacote. O escopo comercial Full/Partner/Build ainda precisa de validação da Pati; nenhuma trava de plano foi ativada.
- **Prévia visual:** `docs/design/equipe-empresa-preview.html` ganhou seletor de colunas funcional no exemplo, aba Indicadores com estados sem dados fictícios, convite Full apenas ilustrativo e demonstração dos campos opcionais. Exportação PDF está desabilitada até definição do modelo e implementação com permissões.
- **Proteção de dados:** nenhum campo pessoal foi criado no banco; finalidade, base, origem da autodeclaração, acesso e tamanho mínimo para indicadores precisam de revisão antes da coleta. Nenhuma alteração na conta real ou no fluxo existente foi feita nesta rodada.
### 2026-10-01 — Codex — Página Equipe e movimentações

- **Autorização:** Pati pediu implementar agora a página e toda a estrutura necessária no banco oficial, com conferência repetida. A proposta visual e as regras vieram da conversa e de `docs/EQUIPE_EMPRESA_SPEC_2026-10-01.md`.
- **Banco:** três migrações `20261001203000`, `204500` e `210000` aplicadas ao projeto CALI MAPA, schema isolado `cali_workspace`. Equipe, respostas opcionais restritas, referências mensais, snapshots, movimentações e auditoria dos campos privados. RLS por empresa, leitura privada só para admin e gravação apenas pela RPC transacional com validação de papel, mês, código e gestor. Não importei colaboradores reais.
- **Aplicativo:** rotas `/admin/equipe` e `/cliente/equipe`, menu Equipe, cadastro/edição manual, CSV com prévia, pessoas ausentes preservadas, filtros, colunas, ficha, indicadores de dados confirmados e impressão PDF da tabela. Tema dia/noite, mobile e estados vazios. Sem números inventados ou trava comercial Partner/Full.
- **Verificação:** `npm run check` e `git diff --check` passaram. Teste da RPC como administradora e cliente principal em transações revertidas; RLS privada negou leitura ao cliente; nenhuma linha de teste permaneceu. A conferência visual autenticada no navegador ainda depende do uso no app publicado.
- **Pendências deliberadas:** termo específico e adesão opcional antes de convidar clientes; matriz do parceiro interno, finalidade jurídica dos campos opcionais e escopo comercial de People Analytics; modelo próprio de PDF, foto autorizada e convites a instrumentos. O código não cria acesso de parceiro nem envia e-mails/testes automaticamente.
- **Autor:** Codex. **Aprovação:** implementação autorizada pela Pati; conferência visual e regras comerciais/jurídicas específicas ainda aguardam validação.
### 2026-10-02 — Codex — Equipe mensal, vagas e modais

- **Pedido/autorização:** Pati pediu cadastro que caiba na tela, planilha didática, revisão mensal sequencial, vagas com SLA e migrações oficiais. Implementado no perfil cliente e admin, sem dados fictícios.
- **App:** modal de cadastro em cinco etapas acima da top bar; CSV com modelo destacado; revisão guiada de desligamentos, admissões, mudanças e vagas; indicadores de vagas. Interface dia/noite e responsiva. RPC transacional salva histórico; ausentes da planilha não são desligados.
- **Banco:** migrações `20261002000902`, `20261002001125` e `20261002113600` aplicadas no CALI MAPA, schema `cali_workspace`; lembrete no terceiro dia útil pergunta pelo mês anterior e usa o e-mail configurado. Edições avulsas não dispensam a revisão mensal.
- **Conferência:** RPC atual e anterior com lista vazia e criação/fechamento de vaga testadas com rollback; nenhuma linha de QA persistida; cron único. Compilação local verificada. E-mail real e UX autenticada ainda exigem QA sem avisar clientes reais.
- **Autor:** Codex. **Aprovação visual:** pendente de Pati.

### 2026-10-02 — Codex — Correções após teste da Equipe

- Pati relatou importação CSV desaparecendo, etapa final de cadastro inacessível, avatar quebrado, colunas atrás da tabela e xadrez duplicado. Revi a versão atual do `main` depois da atualização de outro agente.
- O modal de importação passa a ter estado de abertura próprio; erros de leitura permanecem visíveis. A etapa final explicita gênero/filhos e valida origem dos dados opcionais com mensagem, sem bloquear silenciosamente o botão. O seletor de colunas recebe camada superior, a tabela inicia com colunas essenciais e o xadrez local duplicado sai.
- Os três avatares aprovados pela Pati são arquivos estáticos WebP no app, com seleção pelo campo de gênero já existente. CSV fictício de dez pessoas entregue separadamente à Pati; nenhum desses dados foi inserido no banco por esta rodada.
- `npm run check` passou na cópia de trabalho. Aprovação visual e teste autenticado de importação continuam pendentes. Autor: Codex.

### 2026-10-02 — Codex — Etapas explícitas e auditoria independente da Equipe

- Pati informou que cadastrar/editar ainda fechava ou pulava a última etapa. Substituí a visibilidade frágil por posição CSS por `hidden` explícito em cada campo de cada etapa, mantive a etapa opcional própria e separei o botão de avançar do botão final de salvar.
- Comando de auditoria diagnóstica para Cláudio em `docs/AUDITORIA_EQUIPE_PARA_CLAUDIO_2026-10-02.md`: ele deve comparar código/spec/fluxo, reproduzir e apontar evidências sem editar nem publicar.
- `npm run check` passou. O navegador automatizado local não estava disponível; clique completo autenticado ainda **não** foi comprovado. Aprovação de Pati: pendente. Autor: Codex.
