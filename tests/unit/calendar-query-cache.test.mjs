import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { refreshCalendarEventCache } from '../../src/api/calendar/query-cache.ts';
import { calendarKeys } from '../../src/api/calendar/query-keys.ts';

test('excluir evento atualiza os meses da Agenda, descarta o detalhe e preserva o cache de outro ator', async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  const target = calendarKeys.googleEventsByMonth('admin', 2026, 10);
  const adjoiningMonth = calendarKeys.googleEventsByMonth('admin', 2026, 11);
  const otherActor = calendarKeys.googleEventsByMonth('admin-other', 2026, 10);
  const detail = calendarKeys.googleEvent('admin', 'event-1');
  const otherDetail = calendarKeys.googleEvent('admin', 'other-event');
  const workspace = calendarKeys.workspaceByRole('admin', 'admin');
  client.setQueryData(target, [{ id: 'event-1' }]);
  client.setQueryData(adjoiningMonth, [{ id: 'event-1' }]);
  client.setQueryData(otherActor, [{ id: 'private' }]);
  client.setQueryData(detail, { id: 'event-1' });
  client.setQueryData(otherDetail, { id: 'other-event' });
  client.setQueryData(workspace, { events: [{ id: 'event-1' }] });
  const activeList = new QueryObserver(client, {
    queryKey: target,
    queryFn: () => [],
    refetchOnMount: false,
  });
  t.after(activeList.subscribe(() => undefined));

  await refreshCalendarEventCache(client, 'admin', 'event-1', true);

  assert.deepEqual(client.getQueryData(target), []);
  assert.equal(client.getQueryState(adjoiningMonth)?.isInvalidated, true);
  assert.equal(client.getQueryState(workspace)?.isInvalidated, true);
  assert.equal(client.getQueryState(detail), undefined);
  assert.equal(client.getQueryState(otherDetail)?.isInvalidated, false);
  assert.equal(client.getQueryState(otherActor)?.isInvalidated, false);
});

test('a resposta atrasada de um evento excluído não recria o detalhe', async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  const detail = calendarKeys.googleEvent('admin', 'event-1');
  let signal;
  let finish;
  const response = new Promise((resolve) => { finish = resolve; });
  const request = client.fetchQuery({
    queryKey: detail,
    queryFn: (context) => {
      signal = context.signal;
      return response;
    },
  });
  const cancellation = assert.rejects(request);

  await refreshCalendarEventCache(client, 'admin', 'event-1', true);
  assert.equal(signal.aborted, true);
  finish({ id: 'event-1' });
  await cancellation;
  assert.equal(client.getQueryState(detail), undefined);
});

test('excluir durante a primeira leitura do mês cancela a lista antiga', async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  const month = calendarKeys.googleEventsByMonth('admin', 2026, 10);
  let firstSignal;
  let finishFirstRequest;
  const firstResponse = new Promise((resolve) => { finishFirstRequest = resolve; });
  let calls = 0;
  const list = new QueryObserver(client, {
    queryKey: month,
    queryFn: ({ signal }) => {
      calls++;
      if (calls !== 1) return [];
      firstSignal = signal;
      return firstResponse;
    },
  });
  t.after(list.subscribe(() => undefined));

  await refreshCalendarEventCache(client, 'admin', 'event-1', true);
  assert.equal(firstSignal.aborted, true);
  finishFirstRequest([{ id: 'event-1' }]);
  assert.equal(calls, 2);
  assert.deepEqual(client.getQueryData(month), []);
});
