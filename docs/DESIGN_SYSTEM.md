# Design system

A interface publicada fornece a referência de composição, tipografia, cores e estados. A adoção dos componentes ocorre por fluxo com comparação visual nos estados equivalentes.

## Código e estilos

- [Tokens](../src/styles/tokens.css) declaram valores semânticos com uso real. Use um token compartilhado quando o valor representa a mesma decisão de interface.
- [Tailwind](../src/styles/tailwind.css) usa o prefixo `tw:` e mantém o reset global fora da cascata.
- Folha exclusiva mora ao lado da página ou componente. Folhas de fluxo usadas por vários papéis ficam no módulo compartilhado. Agrupamentos como [Ocorrências](../src/modules/shared/records/styles.ts) e [Propostas](../src/modules/admin/proposals/styles.ts) preservam ordem de importação, seletores operacionais e carregamento da rota.
- Folhas transversais ficam em `src/styles`. O [carregador legado](../src/styles/legacy/index.ts) mantém a sequência de folhas e o ciclo de montagem existente. A [folha gerada do Workspace](../src/styles/v2.generated.css) é compartilhada pelo shell.
- Primitivas ficam em [src/components/ds](../src/components/ds). O [carregador de rota](../src/components/ds/WorkspaceRouteLoader.tsx) centraliza a marca, o layout e o anúncio acessível de carregamento. Componentes de domínio mantêm as informações e as ações do fluxo correspondente.
- Layout, contraste, tipografia e estados compartilhados usam tokens. Variantes de componente têm opções tipadas e recebem somente estados com consumidores. Mantenha os valores que fazem parte de payloads e persistência no domínio.

## Aceite visual

Confirme desktop e mobile, teclado e foco, estado vazio, carregamento e falha. Em modal ou drawer, confira abertura, fechamento, rolagem, retorno de foco e ação primária com clique ou toque. Em impressão, compare conteúdo, ordem e quebra de página com o modelo aprovado. Se houver runtime ligado ao DOM, exercite o efeito além da captura visual. [Matriz de aceite](CONSOLIDATION_ACCEPTANCE.md)
