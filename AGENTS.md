# CALI Workspace

## Entrega e aceite

- Decisões de implementação ficam com o agente. Mudanças de escopo e exceções aos critérios de aceite precisam de decisão explícita do responsável pelo projeto.
- Soluções intermediárias são etapas de trabalho. Continue até o resultado acordado. Registre cada critério com a prova correspondente na revisão final. Use build, comparação visual, testes de comportamento e provas de contrato para os respectivos critérios.
- Se houver um bloqueio real, indique o item, a evidência e a dependência que falta. Conclua o trabalho independente e mantenha o critério bloqueado como pendente.
- Siga o [plano de consolidação](docs/CONSOLIDATION_PLAN.md) na branch `codex/cali-consolidacao`. A conversa principal integra e revisa o trabalho de até três agentes.
- Use o dump de estrutura do CALI MAPA como base de QA, aplique as migrations da branch no banco local isolado e valide com dados de teste. A restauração usa o dump como pré-requisito. Produção permanece separada.
- Rode e registre todo o aceite local antes de publicar um Preview. O Preview usa backend e destinos de teste isolados.

## Comunicação

Use a skill `caveman` em modo `full` para respostas. Preserve a precisão técnica e a clareza em decisões de escopo. Mantenha o modo até o usuário pedir `normal mode` ou `stop caveman`.

## Referências de bibliotecas

Use Context7 para perguntas sobre bibliotecas, frameworks, APIs, SDKs e CLIs, incluindo sintaxe, configuração e migrações de versão. Resolva primeiro o ID da biblioteca e consulte a documentação com a pergunta completa. Refatorações e testes de lógica de negócio seguem os contratos e exemplos versionados do projeto.
