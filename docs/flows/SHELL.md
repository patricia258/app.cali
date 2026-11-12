# Shell, perfil e notificações

## FLOW-14

**Minha conta, sino e resumo diário.** Admin, Cliente e Partner usam o shell autenticado. `/login` oferece ajuda antes da sessão. O resumo diário é uma rotina administrativa.

**Atual.** Shell organiza menus, atalhos, tour, sino e perfil, com composição por papel. O sino lê notificações e abre os destinos respectivos. Há edição do perfil e upload de imagem. SQL agenda resumo Admin às 19h de Brasília e desativa o digest de chat das 8h. [Shell](../../src/v2/WorkspaceShellV2.tsx) · [Agendamento do resumo](../../supabase/migrations/20261018150000_admin_daily_summary_schedule.sql)

**Dados e integrações.** Identidade e preferências do próprio usuário, notificação e destino de ação, estado de leitura, empresa, evento, horário e público. A Edge de resumo agrega eventos elegíveis do dia, separa os blocos por empresa e entrega e-mail. [Edge do resumo](../../supabase/functions/workspace-admin-daily-summary/index.ts)

**Alvo.** Minha conta reúne perfil, termos, pedidos de dados e suporte. Login e Minha conta usam o mesmo e-mail institucional. Instagram e LinkedIn ficam em Sobre a CALI. Sino abre destino autorizado e respeita troca de sessão. Às 19h de Brasília, inclusive fins de semana, enviar a Admins ativos se houver atividade elegível. Ordenar empresas por volume. Exibir **O cliente fez** e **A CALI fez**, até 12 itens por bloco com horário, título, link e até 180 caracteres, indicando excedente. Totais incluem itens além do limite e horas por empresa e gerais. Excluir chat, aviso interno e pendência antiga. [Resumo diário](../PRODUCT_RULES.md#resumo-diário-cali) · [Privacidade e encerramento](CLIENT.md#flow-18)

**Aceite.** Editar perfil sem mudar papel ou vínculo. Testar busca/atalho, tour, abrir/ler no sino e acesso a link após perder autorização. Conferir suporte e termos em Minha conta. Testar dia sem atividade, fim de semana, recorte de Brasília, Admin secundário ativo/inativo, mais de 12 itens e retry com entrega única a cada destinatário.

**Lacunas.** Conferir cron e destinatários efetivos no destino. Distribuição e conteúdo de eventual resumo Partner seguem pendentes. Validar foco e retorno ao abrir notificações com diferentes shells.
