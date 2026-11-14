# CALI Workspace

## Entrega e aceite

- Decisões de implementação ficam com o agente. Mudanças de escopo e exceções aos critérios de aceite precisam de decisão explícita do responsável pelo projeto.
- Soluções intermediárias são etapas de trabalho. Continue até o resultado acordado. Registre cada critério com a prova correspondente na revisão final. Use build, comparação visual, testes de comportamento e provas de contrato para os respectivos critérios.
- Se houver um bloqueio real, indique o item, a evidência e a dependência que falta. Conclua o trabalho independente e mantenha o critério bloqueado como pendente.
- Siga o [plano de consolidação](docs/CONSOLIDATION_PLAN.md) na branch `codex/cali-consolidacao`. A conversa principal integra e revisa o trabalho de até três agentes.
- Use o dump de estrutura do CALI MAPA como base de QA, aplique as migrations da branch no banco local isolado e valide com dados de teste. A restauração usa o dump como pré-requisito. Produção permanece separada.
- Rode e registre todo o aceite local antes de publicar um Preview. O Preview usa backend e destinos de teste isolados.
- Documente cada regra nova ou alterada no mesmo lote. Use [regras de produto](docs/PRODUCT_RULES.md), [contratos de dados](docs/DATA_CONTRACTS.md) ou [arquitetura](docs/ARCHITECTURE.md), conforme o assunto. Atualize as fichas de fluxo afetadas e vincule a prova de teste quando houver.
- Nomeie arquivos e diretórios pela função em todo o repositório. Distinga variantes por papel, estado ou finalidade. Registre revisões no documento ou contrato correspondente. Migrations versionadas preservam seus caminhos como parte do histórico do banco.
- Valide o repositório inteiro com `npm run lint` antes de integrar. O lint exige zero erros e zero avisos, sem baseline. Corrija a origem das ocorrências. [Regras e comandos de lint](docs/TESTING.md#lint)
- Renderize interfaces React em JSX. Use props, estado, eventos e refs locais para controle da interface. Separe páginas, formulários, cards e diálogos por responsabilidade. Subcomponentes exclusivos podem ficar em `components/` junto do dono. Componentes reutilizados entre fluxos ficam na área de componentes do domínio.
- Aplique a regra de JSX em toda a aplicação. Texto formatado vira elementos React. Integrações com foco, impressão, iframes ou geometria usam refs dos componentes donos. Efeitos liberam listeners, timers, assinaturas e observadores ao desmontar. O teste de arquitetura detecta montagem imperativa de HTML e observação global da marcação.
- Encapsule `useQuery`, `useMutation` e lógica de navegação em hooks próprios, um por arquivo, com nome pela operação. O componente consome o hook e renderiza o estado. [Arquitetura](docs/ARCHITECTURE.md#hooks-estado-e-dependências)
- Escreva layout, aparência e estados próprios com utilitários Tailwind no componente que renderiza a marcação. Use CSS colocalizado para integrações de biblioteca e recursos que precisam de folha própria. Escopo, ordem da cascata e justificativa ficam no [design system](docs/DESIGN_SYSTEM.md#tokens-e-tailwind).
- Importe o CSS indispensável pelo componente ou módulo dono. Confira acesso direto, navegação interna e recarga. A aparência de uma tela deve independer das rotas visitadas antes.

## Comunicação

Use a skill `caveman` em modo `full` para respostas. Preserve a precisão técnica e a clareza em decisões de escopo. Mantenha o modo até o usuário pedir `normal mode` ou `stop caveman`.

## Referências de bibliotecas

Use Context7 para perguntas sobre bibliotecas, frameworks, APIs, SDKs e CLIs, incluindo sintaxe, configuração e migrações de versão. Resolva primeiro o ID da biblioteca e consulte a documentação com a pergunta completa. Refatorações e testes de lógica de negócio seguem os contratos e exemplos versionados do projeto.
