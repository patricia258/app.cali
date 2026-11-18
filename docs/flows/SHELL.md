# Shell, perfil e notificações

## FLOW-14

**Minha conta e sino.** Admin, Cliente e Partner usam o shell autenticado. `/login` oferece ajuda antes da sessão.

**Atual.** Shell organiza menus, atalhos, tour, sino e perfil por papel. Minha conta oferece edição do perfil, Termos, Privacidade, contato de acesso e links institucionais em Sobre a CALI. O Cliente registra e acompanha pedidos de dados próprios. Admin e Partner usam o canal institucional de privacidade. O atalho de ocorrência respeita a disponibilidade do módulo no shell. [Shell](../../src/components/workspace/WorkspaceShellLayout.tsx) · [Minha conta](../../src/components/workspace/DirectProfileControl.tsx) · [Ajuda no login](../../src/modules/access/sign-in/LoginPage.tsx)

**Identidade.** Menu e saudação Admin compartilham o perfil do usuário autenticado. A saudação usa o primeiro nome cadastrado e acompanha a edição em Minha conta. Carregamento, nome vazio e falha usam saudação neutra. Se o perfil não carregou, Minha conta oferece nova tentativa e aguarda a leitura antes de liberar a gravação. Autoria sem identidade disponível usa “Equipe CALI”. A interface desconsidera o antigo cache de perfil em localStorage. Contato sem responsável definido usa o nome institucional, e organizador ausente é identificado como não informado. Autor com ID conhecido e perfil indisponível recebe identificação neutra, inclusive quando existe outro Admin na conversa. O sino carrega exclusivamente notificações da sessão, com lista vazia antes da resposta e em falha inicial.

**Dados e integrações.** Identidade e preferências do usuário, versão dos Termos, pedido de dados, notificação, destino, estado de leitura, empresa e público. Login e Minha conta usam o mesmo endereço institucional. [Contatos](../../src/domain/caliContacts.ts)

**Alvo.** Abrir Minha conta para perfil, suporte e dados. Abrir o sino para acompanhar ações e abrir o destino autorizado na sessão atual. [Privacidade e encerramento](CLIENT.md#flow-18)

**Aceite.** Editar perfil sem mudar papel ou vínculo. Testar busca/atalho, tour, abrir/ler no sino e acesso a link após perder autorização. Conferir suporte e termos em Minha conta e acompanhar pedido pela conta Cliente.

**Evidência e lacunas.** A regressão da saudação cobre outro nome Admin, edição, nome vazio, cache legado e recuperação após falha do perfil. Conversas verificam autor desconhecido, e o sino verifica falha sem itens fictícios. Na rodada de 17/11/2026, passaram lint, tipos, build, 134 testes da suíte base e 97 cenários de navegador dos fluxos afetados, incluindo retestes no build final. Playwright sintético cobriu Login, Cliente, Admin e Partner com módulo limitado, incluindo consulta e submissão de pedido Cliente, navegação e links. A operação de tratamento dos pedidos depende de responsáveis CALI. [Provas de Minha conta](../../tests/e2e/account-and-overview.cjs)

## RESUMO-01

**Resumo diário Admin.** O cron chama a Edge às 19h de Brasília, todos os dias. A rotina verifica o hook privado, considera ações do dia até o corte e envia aos Admins ativos com endereço elegível. O resumo de conversas das 8h permanece desativado. [Agendamento](../../supabase/migrations/20261112152100_isolate_workspace_email_hooks.sql) · [Edge do resumo](../../supabase/functions/workspace-admin-daily-summary/index.ts)

**Dados e integrações.** Avisos elegíveis, horário, empresa, destino Admin, horas por data trabalhada e endereço do destinatário. O mesmo aviso recebido por várias pessoas na mesma ação conta uma vez. A chave de entrega é estável por Admin e data. [Seleção e totais](../../supabase/functions/workspace-admin-daily-summary/summary.ts)

**Aceite.** Verificar domingo, janela de Brasília, dia vazio, dia com horas apenas, Admin ativo/inativo e separação de Cliente e Partner. Ordenar empresas pelo volume. Exibir **O cliente fez** e **A CALI fez**, até 12 itens por bloco com hora, título, link e 180 caracteres. Exibir excedente e totais completos. Excluir chat, avisos internos e pendências antigas. Repetir a chamada com uma entrega por Admin.

**Evidência e lacunas.** Cinco testes unitários cobrem as regras. PostgreSQL, Edge e Mailpit locais confirmaram uma entrega em duas chamadas na mesma data, com 13 ações Cliente, uma ação CALI, excedente indicado e exclusão de itens internos, chat e pós-corte. O ensaio simulou o relógio e acionou a Edge pela rede interna. O cron do laboratório permanece suspenso. Verificar o cron e destinatários no ambiente de teste hospedado. A versão Partner depende de decisão sobre escopo e conteúdo. [Testes do resumo](../../tests/unit/admin-daily-summary.test.mjs) · [Regra de produto](../PRODUCT_RULES.md#resumo-diário-cali)
