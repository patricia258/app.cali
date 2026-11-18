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
- Encapsule consultas, consultas infinitas, mutações e leituras imperativas do TanStack Query em hooks próprios, um por arquivo e por operação. Use chaves tipadas do domínio. A mutação atualiza ou invalida os dados afetados no escopo de origem, com proteção contra conclusão em sessão posterior. A lógica de navegação usa hooks próprios. [Arquitetura](docs/ARCHITECTURE.md#hooks-estado-e-dependências) · [Cache de Query](docs/ARCHITECTURE.md#tanstack-query-e-cache)
- Encapsule a configuração do TanStack Form em hooks de formulário. Componentes usam os adaptadores locais para hooks do TanStack Router. [Integrações TanStack](docs/ARCHITECTURE.md#bibliotecas-nos-fluxos)
- Escreva layout, aparência e estados próprios com utilitários Tailwind no componente que renderiza a marcação. Use CSS colocalizado para integrações de biblioteca e recursos que precisam de folha própria. Escopo, ordem da cascata e justificativa ficam no [design system](docs/DESIGN_SYSTEM.md#tokens-e-tailwind).
- Use tokens semânticos da paleta CALI e a escala de texto, espaçamento e raios tanto nas primitivas quanto em componentes, páginas e módulos. Prefira o passo mais próximo da escala quando a diferença visual for pequena. Registre medidas específicas de documento, cálculo, geometria e responsividade no fluxo dono quando precisarem de valor próprio.
- Campos comuns de formulário usam `Input`, `Select`, `Textarea` e `Checkbox` do DS. Preserve a semântica nativa. A seta e o texto de selects usam o mesmo recuo. Evite regras ancestrais de padding e de background que sobrescrevam a primitiva. [Campos de formulário](docs/DESIGN_SYSTEM.md#campos-de-formulário)
- Mantenha a paleta em `public/brand/color-palette.css`, com até sete tons nomeados por família. Use tokens de papel na interface. Ao editar a paleta, execute `node scripts/sync-cali-palette.mjs` e valide também e-mails e exportações que usam os valores resolvidos.
- Importe o CSS indispensável pelo componente ou módulo dono. Confira acesso direto, navegação interna e recarga. A aparência de uma tela deve independer das rotas visitadas antes.

## Identidade de usuários

- Saudação, nome, e-mail, cargo, avatar e autoria de ações vêm do perfil e da sessão correspondentes. Perfil ausente, em carregamento ou com falha usa apresentação neutra.
- Compartilhe a consulta do perfil por ator e reflita edições nos consumidores. Respostas antigas seguem a proteção de cache da sessão.
- Dados de demonstração pertencem às fixtures de teste. Carregamento, base vazia e falha de leitura usam os estados correspondentes.
- Ao revisar interfaces, confira identidades e valores de negócio fixados como substitutos de dados. Registre e comunique as ocorrências encontradas.

## Compatibilidade e corte

- Antes do merge de produção, restaure o catálogo de referência isolado, carregue fixtures representativas da versão anterior **antes** das migrations e compare IDs, campos, vínculos, históricos, anexos, acessos e operações em andamento depois do upgrade. Testes semeados apenas após o upgrade não comprovam migração dos dados antigos.
- Verifique separadamente a preservação dos dados, os contratos dos consumidores antigos durante a implantação e a configuração operacional do destino. Assinatura de RPC preservada não prova compatibilidade de resposta, autorização, estado ou efeito externo.
- Migrations de reconciliação são aditivas e reexecutáveis. Copie somente vínculos comprováveis, preserve a origem e reporte conflitos. Não reative convites, atribua usuários ou invente autores e datas para tornar o ensaio verde.
- Mudanças de login, termos, Storage e payloads exigem sequência de transição documentada e ensaiada. A revisão antiga só pode ser caminho de retorno se funcionar contra o backend já migrado. Registre os bloqueadores e os limites de cada prova em [Compatibilidade](docs/COMPATIBILITY.md).

- O aceite desta revisão está limitado à compatibilidade das migrations e à preservação de dados existentes. A única operadora fará uma pausa combinada com Felipe na implantação. Não introduza telas de manutenção, bloqueio de versões ou automação de corte por iniciativa própria. Acompanhe a execução quando Felipe a iniciar e informe o resultado verificado.

## Comunicação

Use a skill `caveman` em modo `full` para respostas. Preserve a precisão técnica e a clareza em decisões de escopo. Mantenha o modo até o usuário pedir `normal mode` ou `stop caveman`.

## Referências de bibliotecas

Use Context7 para perguntas sobre bibliotecas, frameworks, APIs, SDKs e CLIs, incluindo sintaxe, configuração e migrações de versão. Resolva primeiro o ID da biblioteca e consulte a documentação com a pergunta completa. Refatorações e testes de lógica de negócio seguem os contratos e exemplos versionados do projeto.
