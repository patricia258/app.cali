import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { captureQueryScope, clearWorkspaceQueryCache } from '../../src/api/query-client.ts';
import { reportsKeys } from '../../src/api/reports/query-keys.ts';

test('uma leitura atrasada perde o transporte e não restaura cache após troca de sessão', async () => {
  const client = new QueryClient();
  const queryKey = reportsKeys.tracked('actor-a', 'relatorio-1');
  let releaseRead;
  let requestSignal;
  const request = client.fetchQuery({
    queryKey,
    queryFn: ({ signal }) => {
      requestSignal = signal;
      return new Promise((resolve) => { releaseRead = resolve; });
    },
  });
  const cancelled = assert.rejects(request, { name: 'Error', message: 'CancelledError' });

  clearWorkspaceQueryCache(client);
  assert.equal(requestSignal.aborted, true);
  releaseRead('resposta antiga');
  await cancelled;
  assert.equal(client.getQueryData(queryKey), undefined);
});

test('uma mutação que termina após a troca de escopo não escreve no cache da nova sessão do mesmo ator', async () => {
  const client = new QueryClient();
  const queryKey = reportsKeys.tracked('actor-a', 'relatorio-1');
  const isCurrent = captureQueryScope(client);
  let finishMutation;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => new Promise((resolve) => {
      finishMutation = resolve;
      markStarted();
    }),
    onSuccess: (result) => {
      if (isCurrent()) client.setQueryData(queryKey, result);
    },
  });
  const result = mutation.execute();
  await started;
  client.setQueryData(queryKey, 'sessão inicial');
  clearWorkspaceQueryCache(client);
  assert.equal(client.getMutationCache().getAll().length, 0);
  assert.equal(captureQueryScope(client)(), true);
  client.setQueryData(queryKey, 'nova sessão');
  finishMutation('resposta antiga');
  assert.equal(await result, 'resposta antiga');
  assert.equal(client.getQueryData(queryKey), 'nova sessão');
  client.clear();
});

test('a chave de despesas distingue ator, empresa, período e corte de aprovação', () => {
  const key = reportsKeys.paperVisits('actor-a', 'relatorio-1', 'empresa-a', '2026-07-01', '2026-07-31', null);
  assert.notDeepEqual(key, reportsKeys.paperVisits('actor-b', 'relatorio-1', 'empresa-a', '2026-07-01', '2026-07-31', null));
  assert.notDeepEqual(key, reportsKeys.paperVisits('actor-a', 'relatorio-1', 'empresa-b', '2026-07-01', '2026-07-31', null));
  assert.notDeepEqual(key, reportsKeys.paperVisits('actor-a', 'relatorio-1', 'empresa-a', '2026-08-01', '2026-08-31', null));
  assert.notDeepEqual(key, reportsKeys.paperVisits('actor-a', 'relatorio-1', 'empresa-a', '2026-07-01', '2026-07-31', '2026-08-01T00:00:00Z'));
});
