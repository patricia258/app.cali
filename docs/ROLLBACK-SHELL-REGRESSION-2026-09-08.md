# Rollback de regressão visual — menu/shell

Em 08/09/2026, a tentativa de manter o shell do Workspace persistente entre rotas alterou visualmente o menu aprovado. A produção foi restaurada ao commit `cf0922af629f5154b95a94809f7d9193533c261c`, que preserva o baseline visual aprovado e as otimizações anteriores que não haviam gerado regressão visual observada.

As mudanças de shell persistente foram preservadas apenas na branch `perf-shell-regression-2026-09-08` para investigação isolada e não devem retornar à produção sem validação visual explícita.
