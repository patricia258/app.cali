# CALI Workspace · referências permanentes do projeto

Este arquivo existe para manter, dentro do próprio projeto, as referências que devem ser consultadas antes de alterações relevantes de arquitetura/UX no Workspace.

## Repositórios de referência

1. `https://github.com/azudoka/azumi-connect1`
2. `https://github.com/azudoka/azumi-connect-hub-oficial`

O Connect é referência de profundidade operacional, organização de projetos, estados, entregáveis, histórico e separação entre projetos vigentes e encerrados. A CALI não deve copiar identidade visual ou regras que não façam sentido para a operação solo da Patrícia; deve aproveitar a lógica que simplifica rastreabilidade e gestão.

## Regras consolidadas · Projetos e cronogramas

- A página principal de Projetos deve funcionar como portfólio por cliente, não como uma lista plana de projetos.
- Projetos não encerrados aparecem em **Em andamento**; projetos `closed/encerrados` aparecem em **Finalizados**.
- Múltiplos projetos da mesma empresa ficam agrupados sob a mesma empresa.
- Busca deve localizar cliente, projeto ou protocolo; filtro de cliente deve permitir `Todos os clientes`.
- Projeto em rascunho precisa ter liberdade para adicionar frente, editar/excluir entregável e revisar o cronograma antes de enviar ao cliente.
- Uma mesma frente ativa não pode ser repetida dentro do mesmo projeto.
- Catálogo-base de frentes CALI: Liderança; Cultura & Engajamento; Pessoas & Performance; Gestão & Governança de RH; Comunicação Interna; Estrutura & Processos; Outro.
- Ao escolher `Outro`, permitir nome personalizado.
- A frente organiza o trabalho; a janela M1–M… deve ser derivada dos entregáveis vinculados, em vez de exigir uma estimativa artificial antes de o escopo estar detalhado.

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
