import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterSatisfactionResponses, summarizeClosureCohort, summarizeSatisfaction,
} from '../../src/modules/admin/satisfaction/satisfactionSummary.ts';

const range = { start: new Date('2026-11-01T03:00:00Z'), end: new Date('2026-12-01T02:59:59.999Z') };

test('avaliação tardia pertence ao encerramento original e entregáveis sem coorte usam a data da resposta', () => {
  const responses = [
    { id: 'late', sourceType: 'record', score: 2, cohortAt: range.start.toISOString(), createdAt: '2026-12-04T15:00:00Z' },
    { id: 'older', sourceType: 'record', score: 5, cohortAt: '2026-11-01T02:59:59Z', createdAt: '2026-11-03T15:00:00Z' },
    { id: 'delivery', sourceType: 'deliverable', score: 5, createdAt: range.end.toISOString() },
  ];
  assert.deepEqual(filterSatisfactionResponses(responses, range, 'all', 'all').map(({ id }) => id), ['late', 'delivery']);
  assert.deepEqual(filterSatisfactionResponses(responses, range, 'record', '2').map(({ id }) => id), ['late']);
  assert.deepEqual(filterSatisfactionResponses(responses, range, 'deliverable', '2'), []);
});

test('métricas de satisfação distinguem nota baixa, neutra, satisfeitos e comentário em branco', () => {
  const summary = summarizeSatisfaction([
    { score: 1, comment: '  ' }, { score: 3, comment: 'Pediu retorno' },
    { score: 4 }, { score: 5, comment: 'Resolvido' },
  ]);
  assert.deepEqual(summary, {
    total: 4, average: 3.25, comments: 2, attention: 2, satisfied: 2,
    distribution: [1, 2, 3, 4, 5].map((score) => ({ score, count: score === 2 ? 0 : 1 })),
  });
  assert.equal(summarizeSatisfaction([]).average, null);
});

test('coorte por empresa inclui cada encerramento e separa espera de solicitação substituída ou encerrada', () => {
  const base = {
    closed_at: '2026-11-05T15:00:00Z', answered_at: null, superseded_at: null,
    closed_unanswered_at: null, account_records: { company_id: 'a' },
  };
  const entries = [
    { ...base, id: 'first', answered_at: '2026-12-05T15:00:00Z' },
    { ...base, id: 'reopened' },
    { ...base, id: 'superseded', superseded_at: '2026-11-07T15:00:00Z' },
    { ...base, id: 'closed', closed_unanswered_at: '2026-11-10T15:00:00Z' },
    { ...base, id: 'b', account_records: { company_id: 'b' } },
    { ...base, id: 'earlier', closed_at: '2026-11-01T02:59:59Z' },
  ];
  const result = summarizeClosureCohort(entries, range, 'a');
  assert.deepEqual(result.cohort.map(({ id }) => id), ['first', 'reopened', 'superseded', 'closed']);
  assert.deepEqual(result.waiting.map(({ id }) => id), ['reopened']);
  assert.equal(result.answered, 1);
  assert.equal(result.closedUnanswered, 2);
  assert.equal(result.responseRate, 25);
  assert.equal(summarizeClosureCohort(entries, range, 'missing').responseRate, null);
});
