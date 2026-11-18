import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { projectKeys } from '../../src/api/projects/query-keys.ts';
import { recordKeys } from '../../src/api/records/query-keys.ts';

test('a invalidação de conversa atualiza mensagens e contador só no escopo da entrega', async () => {
  const client = new QueryClient();
  const affected = [
    projectKeys.conversationCount('actor-a', 'company-a', 'delivery-a'),
    projectKeys.conversationMessages('actor-a', 'company-a', 'delivery-a', true),
    projectKeys.conversationMessages('actor-a', 'company-a', 'delivery-a', false),
  ];
  const unaffected = [
    projectKeys.conversationCount('actor-a', 'company-a', 'delivery-b'),
    projectKeys.conversationCount('actor-a', 'company-b', 'delivery-a'),
    projectKeys.conversationMessages('actor-b', 'company-a', 'delivery-a', true),
  ];
  try {
    for (const key of [...affected, ...unaffected]) client.setQueryData(key, { result: 'existing' });
    await client.invalidateQueries({ queryKey: projectKeys.conversationScope('actor-a', 'company-a', 'delivery-a') });
    for (const key of affected) assert.equal(client.getQueryState(key)?.isInvalidated, true);
    for (const key of unaffected) assert.equal(client.getQueryState(key)?.isInvalidated, false);
  } finally {
    client.clear();
  }
});

test('chaves de revisão e encerramento distinguem ator, empresa e papel', async () => {
  const client = new QueryClient();
  const firstReview = projectKeys.adminSchedule('actor-a', 'project-a');
  const secondReview = projectKeys.adminSchedule('actor-b', 'project-a');
  const pending = projectKeys.clientSchedule('actor-a', 'project-a', 'company-a', 'client_review');
  const adjustment = projectKeys.clientSchedule('actor-a', 'project-a', 'company-a', 'adjustment_requested');
  const otherCompany = projectKeys.clientSchedule('actor-a', 'project-a', 'company-b', 'client_review');
  const adminClosure = recordKeys.closure('actor-a', 'admin', 'record-a', 'completed');
  const clientClosure = recordKeys.closure('actor-a', 'client', 'record-a', 'completed');
  const otherRecord = recordKeys.closure('actor-a', 'admin', 'record-b', 'completed');
  try {
    for (const key of [firstReview, secondReview, pending, adjustment, otherCompany, adminClosure, clientClosure, otherRecord]) {
      client.setQueryData(key, { result: 'existing' });
    }
    await client.invalidateQueries({ queryKey: firstReview, exact: true });
    await client.invalidateQueries({ queryKey: projectKeys.clientScheduleScope('actor-a', 'project-a', 'company-a') });
    await client.invalidateQueries({ queryKey: recordKeys.closureScope('actor-a', 'admin', 'record-a') });
    for (const key of [firstReview, pending, adjustment, adminClosure]) assert.equal(client.getQueryState(key)?.isInvalidated, true);
    for (const key of [secondReview, otherCompany, clientClosure, otherRecord]) assert.equal(client.getQueryState(key)?.isInvalidated, false);
    assert.deepEqual(recordKeys.timer(undefined, 'record-a'), recordKeys.timer(null, 'record-a'));
  } finally {
    client.clear();
  }
});
