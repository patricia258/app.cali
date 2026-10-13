# Página Documentos — entrega em formato de pasta (briefing)

Escrito em 2026-10-13 a pedido da Patricia, para ser usado por quem for desenhar a página (inclusive outra IA).
Descreve o que foi imaginado, o que já existe e o que ainda não foi resolvido.

## A ideia

Na CALI, um **entregável** é algo palpável que a assessoria entrega ao cliente: um fluxo, um programa, uma tabela, uma política,
um documento. Alguns entregáveis se **desdobram em partes** (subtarefas), e cada parte gera o seu próprio documento.

Exemplo usado só para ilustrar: um entregável "Kit da marca" com quatro partes — logo, manifesto, brand e conteúdo.
São quatro documentos, entregues e aprovados em momentos diferentes.

Hoje a página Documentos do cliente mostra **um cartão por documento**, com capa. Isso não funciona para um entregável com
partes. A solução imaginada é a **pasta**:

- Um entregável com desdobramentos aparece em Documentos como **uma pasta** com o nome dele.
- Ao clicar na pasta, o cliente vê **cada parte** (subtarefa) com o seu documento.
- O que ainda não foi entregue aparece como **"em produção"**, sem arquivo — o cliente vê a pasta desde o início e enxerga o que está por vir.
- Cada parte é **aprovada separadamente**; a pasta mostra o andamento ("2 de 4 entregues").
- O **documento do próprio entregável** (a versão consolidada, quando existir) fica **dentro da pasta**, nunca solto do lado de fora.
- Entregável **sem** desdobramento continua como documento único, com capa, como hoje.

## Quem vê o quê

| Perfil | O que vê | O que faz |
|---|---|---|
| Cliente | As pastas dos entregáveis com partes visíveis a ele; dentro, cada parte com o documento liberado ou "em produção" | Abre o documento, confirma o recebimento, conversa e aprova a parte |
| Administradora (Patricia) | A **mesma visualização** do cliente | Além disso: criar, liberar para o cliente, recusar proposta, suspender, excluir, editar/renomear |
| Equipe CALI (Partner) | A mesma visualização, só das empresas atribuídas | **Propõe** o arquivo como entrega final; quem libera para o cliente é a Patricia |

Regras fixas:
- Arquivo de trabalho (rascunho anexado numa conversa) **não** vira documento do cliente. Só o que for marcado como **entrega final** e **liberado pela Patricia**.
- O Partner nunca envia direto ao cliente nem exclui.
- O prazo de cada parte nunca passa do prazo do entregável.
- Ao liberar um documento, o cliente recebe aviso (sino e e-mail).

## O que já existe no sistema (2026-10-13)

- Subtarefa com modal próprio; aba **Arquivos** nela: cada arquivo anexado mostra o estado (arquivo de trabalho / aguardando liberação / liberado ao cliente / suspenso) e os botões de propor, liberar, recusar, suspender.
- Aba **Arquivos** do entregável (administradora e Partner): a pasta com as partes e os mesmos botões, mais "Excluir".
- Cliente › Documentos: seção **"Pastas de entregáveis"** — pasta com contador "N de M entregues"; ao abrir, lista das partes com documento ou "Em produção"; "Confirmar recebimento" por documento.
- Banco: `files.task_id` liga o documento à subtarefa; `files.deliverable_id` liga ao entregável.

## O que a Patricia NÃO gostou e precisa ser redesenhado

1. **O layout da pasta aberta**: hoje é uma lista simples de linhas dentro de uma caixa larga. Parece uma tabela vazia, não uma pasta de documentos. Falta hierarquia, capa, sensação de "acervo".
2. **A pasta fechada** é só uma faixa com ícone, nome e contador — não conversa com os cartões de documento com capa que ficam logo abaixo.
3. Havia o documento do entregável solto do lado de fora da pasta (corrigido: agora entra na pasta).

## Perguntas em aberto para o desenho

- A pasta deve ter **capa** (como os documentos têm) ou uma identidade própria de pasta?
- As partes dentro da pasta são **cartões com capa** (como os documentos avulsos) ou linhas?
- Como mostrar o **andamento** da pasta (barra, "2 de 4", selos por parte)?
- Onde ficam as ações da administradora (liberar, suspender, excluir, renomear) sem poluir a visão que é igual à do cliente?
- A pasta abre **no lugar** (expande) ou **entra** numa tela própria, com caminho de volta ("Documentos › Kit da marca")?
- Como diferenciar, numa mesma página, pastas (entregáveis com partes) de documentos avulsos (políticas, manuais, relatórios)?

## Padrões visuais da CALI que valem aqui

- Cartões nunca se tocam; bordas alinhadas; nada colado na moldura; sem moldura dentro de moldura.
- Controles de um mesmo grupo numa linha só, centralizados na vertical.
- Alerta precisa parecer alerta (âmbar = atenção, vermelho = corrigir) e dizer o que fazer.
- Sem palavras ou fatos repetidos na mesma tela.
- Sem barras de rolagem visíveis; avisos no fim da página; diálogos só no formato novo.
- Complexidade com cor: MC1 verde, MC2 amarelo, MC3 vermelho. Situação em seletor com ponto colorido; cabeçalhos com a cor cheia.
- Fonte Inter. A administradora usa só o tema claro. Não há modo escuro.
