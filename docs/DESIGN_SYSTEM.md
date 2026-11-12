# Design system

A interface publicada fornece a referência de composição, tipografia, cores e estados. Os temas Dia e Noite usam a mesma estrutura de componentes. Formulários públicos, impressão e PDFs preservam a apresentação de seus fluxos.

## Tokens e Tailwind

[Tokens base](../src/styles/tokens.css) concentram a paleta CALI, tipografia, dimensões dos controles e carregamento. [Tokens de tema](../src/styles/theme-tokens.css) definem a superfície, o texto, o destaque, as bordas e os estados em Dia e Noite. A folha do shell mantém os valores próprios de sua composição.

[Configuração Tailwind](../src/styles/tailwind.css) expõe esses valores com `@theme inline`. Use utilidades `tw:` no JSX e tokens semânticos, como `tw:text-cali-accent`. O CSS mantém o reset e a precedência existentes. As folhas carregadas isoladamente referenciam o Tailwind com `@reference`. Use `@apply` quando um seletor já integra o contrato com o runtime, com um portal ou com o tema.

O CSS próprio acompanha a página, o componente ou o domínio. A [ordem do shell](../src/components/workspace/operational.css) e o [carregador legado](../src/styles/legacy/index.ts) preservam a sequência de sobrescritas durante a navegação. Regras de impressão, fontes, keyframes, máscaras, seletores de runtime e geometrias específicas continuam em CSS. A [folha gerada do shell](../src/components/workspace/v2.generated.css) reproduz a fonte aprovada e é regenerada pelo script de importação.

## Primitivas

| Componente | Contrato |
| --- | --- |
| [Button](../src/components/ds/Button.tsx) | Variantes tipadas, submissão nativa, ação em andamento e foco de teclado. Botões de fechamento têm nome acessível. |
| [FieldLabel](../src/components/ds/FieldLabel.tsx), [FilterSelect](../src/components/ds/FilterSelect.tsx), [GuidedField](../src/components/ds/GuidedField.tsx) | Mantêm rótulo, autocomplete, seleção, referência DOM e validação nativa. |
| [DialogFrame](../src/components/ds/DialogFrame.tsx), [DialogForm](../src/components/ds/DialogForm.tsx) | Nome acessível, entrada e retorno de foco, Tab circular e Escape quando há ação de fechar. Formulário continua sendo um formulário nativo. |
| [InlineNotice](../src/components/ds/InlineNotice.tsx), [EmptyState](../src/components/ds/EmptyState.tsx), [LoadingState](../src/components/ds/LoadingState.tsx), [WorkspaceRouteLoader](../src/components/ds/WorkspaceRouteLoader.tsx) | Feedback de erro, confirmação, vazio e carregamento. A cor complementa texto e estado semântico. |
| [StatusBadge](../src/components/ds/StatusBadge.tsx), [DataTable](../src/components/ds/DataTable.tsx) | Preservam o elemento semântico e as variantes usadas pelos fluxos. Rótulos e estados persistidos pertencem ao domínio. |

As primitivas preservam seletores que fazem parte da integração com estilos e runtimes. As ações, as permissões e o conteúdo ficam nos componentes de domínio.

## Aceite visual

Compare desktop, notebook, tablet e celular com fixtures equivalentes. Exercite tema, teclado, foco, vazio, carregamento e falha. Em diálogo ou gaveta, confira abertura, fechamento, rolagem, retorno do foco e ação primária com clique e toque. Em impressão, confira conteúdo, fonte, tamanho e quebra de página. [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md) · [Testes](TESTING.md)
