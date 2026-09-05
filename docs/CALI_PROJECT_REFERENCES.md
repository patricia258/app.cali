# CALI Workspace · referências permanentes do projeto

Este arquivo existe para manter, dentro do próprio projeto, as referências que devem ser consultadas antes de alterações relevantes de arquitetura/UX no Workspace.

## Repositórios de referência

1. `https://github.com/azudoka/azumi-connect1`
2. `https://github.com/azudoka/azumi-connect-hub-oficial`

O Connect é referência de profundidade operacional, organização de projetos, estados, entregáveis, histórico, validação do cliente e separação entre projetos vigentes e encerrados. A CALI não deve copiar identidade visual ou regras que não façam sentido para a operação solo da Patrícia; deve aproveitar a lógica que simplifica rastreabilidade e gestão.

## Regras consolidadas · Projetos e cronogramas

- A página principal de Projetos deve funcionar como portfólio por cliente, não como uma lista plana de projetos.
- Projetos não encerrados aparecem em **Em andamento**; projetos `closed/encerrados` aparecem em **Finalizados**.
- Múltiplos projetos da mesma empresa ficam agrupados sob a mesma empresa.
- A seleção principal da carteira deve começar por **cards pequenos de clientes**, com logo + nome. Os projetos aparecem somente depois de clicar no cliente, em modal central com fundo em blur.
- A faixa de clientes deve ter rolagem horizontal discreta/invisível e alternância entre **Ativos** e **Inativos**.
- O modal de projetos deve mostrar, no mínimo: nome do projeto, protocolo, data de criação, deadline/previsão e status atual.
- Busca deve localizar cliente, projeto ou protocolo; filtro de status continua disponível.
- Projeto em rascunho precisa ter liberdade para adicionar frente, editar/excluir frente, editar/excluir entregável e revisar o cronograma antes de enviar ao cliente.
- Uma mesma frente ativa não pode ser repetida dentro do mesmo projeto.
- Se uma frente em rascunho estiver vazia, pode ser excluída diretamente.
- Se uma frente em rascunho tiver entregáveis, a exclusão exige escolher outra frente do mesmo projeto e transferir os entregáveis antes da remoção.
- Catálogo-base de frentes CALI: Liderança; Cultura & Engajamento; Pessoas & Performance; Gestão & Governança de RH; Comunicação Interna; Estrutura & Processos; Outro.
- Ao escolher `Outro`, permitir nome personalizado.
- A frente organiza o trabalho; a janela M1–M… deve ser derivada dos entregáveis vinculados, em vez de exigir uma estimativa artificial antes de o escopo estar detalhado.
- Deve existir apenas um botão principal de **Adicionar frente** no rascunho.

## Regra de identidade visual das logos de clientes

- A logo é enviada **uma única vez** no cadastro/edição da empresa.
- O Workspace preserva duas versões:
  - `logo_url`: **original**, intacta, com identidade e cores do cliente. Usar em relatórios, documentos externos e peças em que a marca original do cliente precisa ser respeitada.
  - `logo_workspace_url`: **derivação automática para interface**, sem tratamento manual empresa por empresa.
- A versão Workspace deve preservar o símbolo/formato reconhecível da marca, neutralizar o fundo quando possível e converter a marca para o bordô CALI `#5A1E2D`.
- A versão Workspace é renderizada sobre **fundo marfim fixo `#F7F3EE`**, com respiro e proporção padronizados.
- O tile da logo **não muda entre tema Dia e tema Noite**. No modo Noite, continua marfim + bordô. O objetivo é impedir que a marca brigue com o tema dinâmico do aplicativo.
- Fotos de pessoas não recebem tratamento monocromático; permanecem fotos reais dentro do frame visual CALI.
- Se a logo original for alterada, a derivação Workspace anterior deve ser invalidada e recriada automaticamente.
- Se a logo não puder ser processada, usar fallback tipográfico/inicial no mesmo tile marfim, sem interromper o cadastro.
- Dentro da interface do Workspace, preferir sempre `logo_workspace_url`. Relatórios/documentos externos continuam preferindo `logo_url`.

## Regra de privacidade do rascunho

- **Rascunho é exclusivamente interno da CALI.** O cliente não pode enxergar projeto, frente, entregável, etapa, documento, comentário ou histórico pertencente a um projeto `draft`.
- Essa proteção deve existir no banco/RLS, não apenas visualmente no frontend.
- O cliente só passa a enxergar o cronograma quando a CALI aciona **Enviar ao cliente** e o projeto entra em `client_review`.
- Um cronograma não pode ser enviado se não tiver entregáveis, se existir frente vazia ou se houver entregável sem deadline.

## Fluxo de aprovação do cronograma

1. **Draft interno CALI** — Patrícia estrutura frentes, entregáveis, sequência e deadlines. Cliente não vê nada.
2. **Enviar ao cliente** — o cronograma entra em `client_review`, torna-se visível ao cliente e uma revisão formal é aberta.
3. **Cliente revisa** — vê todas as frentes, todos os entregáveis compartilhados, complexidades, sequência M1–M…, deadline de cada entregável e previsão total do cronograma.
4. **Até 2 pedidos de ajuste do cronograma** — o cliente pode pedir prioridade de uma frente, mudança de prazo/ordem de um entregável ou outro ajuste geral. Cada pedido fica registrado com alvo e justificativa.
5. **Análise CALI** — Patrícia recebe notificação, acolhe ou não o pedido e responde obrigatoriamente com justificativa. Depois o cronograma volta para validação do cliente.
6. **Aprovação final do cliente** — somente esta ação transforma o cronograma em projeto ativo.
7. **Início oficial** — o prazo do projeto começa na data da aprovação formal. Se a aprovação ocorrer depois da data usada na montagem, as deadlines são reposicionadas em dias úteis preservando os intervalos planejados.
8. **Notificação** — Patrícia é notificada quando o cliente solicita ajuste e quando aprova oficialmente o cronograma.

Os dois pedidos de ajuste acima pertencem à **fase de aprovação do cronograma**. Eles são independentes das regras posteriores de ajuste de uma entrega já em execução.

## Regras consolidadas · Prazo e inteligência de planejamento

- `target_end_date` representa **meta desejada**, opcional. Não é promessa automática de prazo.
- `roadmap_end_date` representa **Previsão CALI**, recalculada a partir das deadlines dos entregáveis vigentes.
- Sem entregáveis suficientes, a interface deve dizer `Previsão em construção` em vez de inventar uma data final.
- O sistema deve avisar quando a previsão calculada ultrapassar a meta desejada.
- Baseline inicial e explícito para sugestão de produção por complexidade: MC1 = 3 dias úteis; MC2 = 5 dias úteis; MC3 = 8 dias úteis. É uma regra de planejamento assistido, não uma redefinição do significado de MC.
- O prazo sugerido continua editável pela Patrícia.
- Atraso do cliente nunca aprova automaticamente. Ele gera aviso, histórico e deslocamento das próximas deadlines.
- Baseline inicial de remobilização após atraso: MC1 = 0 dia adicional; MC2 = +1 dia útil; MC3 = +2 dias úteis, além do atraso efetivo. Manter essa regra transparente e revisável.

## Regras consolidadas · Conversas

- Todo chat do Workspace deve seguir o mesmo padrão visual e comportamental definido em Ocorrências e Solicitações: identidade/avatar, cores por lado da conversa, reações, emoji, link, anexo e atualização em tempo real.
- Não exibir estados intermediários do renderer antigo durante sincronização.
- Conversas do cliente e notas internas CALI permanecem separadas por visibilidade e nunca devem vazar entre canais.

## Regra de consulta

Antes de mudanças estruturais em Projetos, Entregáveis, Cronograma, conversas ou histórico, consultar este documento e, quando necessário, o Connect para recuperar padrões operacionais já validados.