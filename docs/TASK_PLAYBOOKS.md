# Roteiros de trabalho

## Revisar um fluxo

1. Localize o identificador nas [fichas](flows/README.md). Identifique entrada, perfil, estado inicial, resultado e próximos estados.
2. Compare a regra do produto, a rota e as operações que a tela usa. Confira o efeito externo quando fizer parte do resultado.
3. Identifique se a lacuna está no estado local, no contrato do módulo, na autorização do servidor ou no destino da integração.
4. Teste a menor superfície que prova a regra. Valide no navegador quando envolver interação, rota, documento visual ou integração entre módulos.

## Reorganizar código ou estilo

1. Confira a pasta dona no [mapa](ARCHITECTURE.md). Inventarie imports estáticos e dinâmicos, CSS, seletores e páginas que compartilham o código.
2. Mova o módulo preservando contrato e chamadas. Separe hooks próprios por arquivo. Mova o CSS junto do dono e preserve a ordem de montagem e importação. Preserve o comportamento dos hooks nativos e das bibliotecas.
3. Rode tipos e build. Compare o fluxo afetado com o mesmo perfil e dados, incluindo URL direta e interações.
4. Atualize links ativos, caminhos de referência e documentação que descreve a estrutura atual.

## Mudar acesso ou dados

1. Leia a [matriz de permissões](PERMISSIONS.md) e o [contrato de dados](DATA_CONTRACTS.md). Identifique o caminho da chamada e o dono da autorização.
2. Capture o catálogo vigente em leitura e ensaie a alteração no banco isolado. Use dados sintéticos representativos do legado.
3. Exercite a operação válida, outra empresa, papel indevido, sessão revogada e retry. Confira efeitos em todas as superfícies tocadas.
4. Registre revisão, ambiente, resultado e pendências segundo a [política de mudança](CHANGE_POLICY.md).

## Preparar Preview

Execute a [matriz local](CONSOLIDATION_ACCEPTANCE.md) e os passos de ambiente do [runbook](RUNBOOK.md). Entregue revisão, URL e roteiro curto de aceite.
