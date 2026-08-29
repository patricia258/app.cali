# CALI Workspace · Desempenho da operação

Status: mapeado / não entra no menu antes da aprovação da Página 1.

## Objetivo
Criar uma subpágina de leitura executiva da performance da CALI por período, cliente e ciclo. A Visão Geral continua resumida; esta página concentra análise, comparação e exportação.

## Referências de interação analisadas
O ZIP MatDash foi usado como referência de mecânica, não de identidade visual. Padrões úteis identificados:
- cards com comparação percentual e microtendência;
- seleção de período no próprio gráfico;
- gráficos responsivos com tooltip de hover;
- sparklines para tendência sem ocupar muito espaço;
- progressos com meta/ritmo;
- timeline de atividade para explicar o que provocou mudanças.

A identidade continua 100% CALI.

## Filtros globais
- período: mês, trimestre, semestre, ano e intervalo customizado;
- cliente;
- serviço;
- projeto/ciclo;
- situação: ativo, concluído, pausado;
- exportar PDF, CSV, Word e salvar no Google Drive.

## Bloco 1 · Saúde da carteira
- contas ativas no período;
- novas contas;
- contas encerradas/pausadas;
- renovação prevista;
- comparação com período anterior;
- receita contratada e receita em risco quando o financeiro estiver ativo.

## Bloco 2 · Horas e capacidade
- horas contratadas x consumidas;
- ritmo esperado x ritmo real por cliente;
- clientes acima/abaixo da curva de consumo;
- consumo por serviço/projeto/entregável;
- projeção até o fim do ciclo;
- alertas de estouro ou subutilização.

## Bloco 3 · Entregas
- entregáveis concluídos;
- em andamento;
- aguardando cliente;
- em ajuste;
- prazo médio;
- itens atrasados;
- taxa de aprovação sem ajuste;
- tempo entre envio e validação do cliente.

## Bloco 4 · NPS / satisfação
- série temporal por cliente;
- média da carteira;
- distribuição de notas;
- comentários vinculados aos pontos da curva;
- clientes em alta/queda;
- comparação com período anterior;
- drilldown de cada avaliação: cliente, projeto/entregável, data, nota e comentário.

## Bloco 5 · Agenda e cadência
- reuniões realizadas x previstas;
- compromissos futuros;
- decisões pendentes;
- atividades que geraram atraso ou replanejamento;
- integração com Google Calendar/Meet quando OAuth estiver ativo.

## Bloco 6 · Financeiro / conta
- contratos ativos;
- vencimentos;
- pagos, pendentes e atrasados;
- aditivos;
- renovação;
- cobrança enviada;
- relatório mensal vinculado à cobrança.

## Bloco 7 · Linha do tempo executiva
Uma timeline explica os movimentos do período: nova conta, aprovação importante, ajuste pedido, consumo crítico, reunião-chave, relatório publicado, renovação e cobrança.

## Interações obrigatórias
- hover com tooltip contextual;
- legenda clicável para exibir/ocultar séries;
- comparação período atual x anterior;
- clique em cliente abre drilldown;
- clique em ponto de NPS abre avaliação correspondente;
- clique em barra de horas abre lançamentos do período;
- nenhuma visualização depende apenas de cor.

## Dados necessários
A estrutura já existe em grande parte no schema `cali_workspace`. Quando essa página for implementada, consolidar queries/RPCs para:
- métricas por período;
- horas e projeção de consumo;
- NPS por cliente;
- entregáveis por status;
- agenda;
- contrato/cobrança;
- atividades relevantes.

## Regra de produto
A página só entra no menu depois que Shell + Visão Geral Admin estiverem aprovados. Até lá, este documento é o contrato de escopo para não perder o desenho futuro.
