import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDailySummary, summaryIdempotencyKey, summaryWindow } from '../../supabase/functions/workspace-admin-daily-summary/summary.ts';
import { summaryHtml } from '../../supabase/functions/workspace-admin-daily-summary/presentation.ts';

const origin = 'https://workspace.example.test';
const profiles = [
  { id: 'admin', role: 'admin', active: true, email: 'admin@example.test' },
  { id: 'second-admin', role: 'admin', active: true, email: 'second-admin@example.test' },
  { id: 'inactive', role: 'admin', active: false, email: 'inactive@example.test' },
  { id: 'no-email', role: 'admin', active: true, email: ' ' },
  { id: 'partner', role: 'partner', active: true, email: 'partner@example.test' },
  { id: 'client-a', role: 'client', active: true, company_id: 'a', email: 'a@example.test' },
  { id: 'client-b', role: 'client', active: true, company_id: 'b', email: 'b@example.test' },
];
const companies = [
  { id: 'a', display_name: 'Empresa A' },
  { id: 'b', display_name: 'Empresa B' },
];

function notice(overrides = {}) {
  return {
    user_id: 'admin',
    company_id: 'a',
    notification_type: 'record_opened',
    title: 'Solicitação',
    body: 'Detalhe da solicitação',
    entity_type: 'account_record',
    entity_id: 'record-a',
    created_at: '2026-11-08T21:00:00Z',
    action_url: '/cliente/registros',
    ...overrides,
  };
}

test('resumo diário mantém o corte das 19h de Brasília, inclusive no domingo', () => {
  assert.deepEqual(summaryWindow(new Date('2026-11-08T22:07:00Z'), true), {
    day: '2026-11-08',
    startsAt: '2026-11-08T00:00:00-03:00',
    endsAt: '2026-11-08T19:00:00-03:00',
    tooEarly: false,
  });
  assert.equal(summaryWindow(new Date('2026-11-08T21:59:59Z'), true).tooEarly, true);
  assert.equal(summaryWindow(new Date('2026-11-09T01:00:00Z'), true).day, '2026-11-08');
  const manual = summaryWindow(new Date('2026-11-08T15:17:00Z'), false);
  assert.equal(manual.tooEarly, false);
  assert.equal(manual.endsAt, '2026-11-08T15:17:00.000Z');
});

test('resumo conta eventos elegíveis, deduplica avisos da mesma ação e mantém ações repetidas', () => {
  const result = buildDailySummary([
    notice(),
    notice({ user_id: 'second-admin' }),
    notice({ created_at: '2026-11-08T21:05:00Z' }),
    notice({ notification_type: 'document', entity_type: 'file', entity_id: 'file-a' }),
    notice({ notification_type: 'record_message' }),
    notice({ notification_type: 'staff_material_review_requested' }),
    notice({ notification_type: 'record_opened', entity_type: 'deliverable' }),
    notice({ user_id: 'partner' }),
    notice({ user_id: 'client-b', notification_type: 'report_available', entity_type: 'report' }),
    notice({ user_id: 'client-a', notification_type: 'report_available', entity_type: 'report', entity_id: 'report-a' }),
    notice({ user_id: 'client-a', notification_type: 'report', entity_type: 'report', entity_id: 'report-a', body: 'Relatório do mês' }),
  ], profiles, companies, [{ company_id: 'a', minutes: 90 }, { company_id: 'b', minutes: 30 }], origin);
  assert.deepEqual(result.admins.map((profile) => profile.id), ['admin', 'second-admin']);
  assert.deepEqual(result.ordered.map((block) => [block.name, block.minutes]), [['Empresa A', 90], ['Empresa B', 30]]);
  assert.deepEqual(result.totals, { client: 3, cali: 1, minutes: 120 });
  assert.deepEqual(result.ordered[0].fromClient.map((item) => item.url), [
    origin + '/admin/registros?record=record-a',
    origin + '/admin/registros?record=record-a',
    origin + '/admin/documentos?documento=file-a',
  ]);
  assert.equal(result.ordered[0].fromCali[0].url, origin + '/admin/relatorios/impressao/report-a');
});

test('resumo não tem blocos em dia vazio e aceita dia com somente horas', () => {
  assert.deepEqual(buildDailySummary([], profiles, companies, [], origin).ordered, []);
  const hoursOnly = buildDailySummary([], profiles, companies, [{ company_id: 'b', minutes: 20 }], origin);
  assert.deepEqual(hoursOnly.totals, { client: 0, cali: 0, minutes: 20 });
  assert.equal(hoursOnly.ordered[0].name, 'Empresa B');
});

test('retry diário reutiliza a chave da data e destinatário e separa os testes manuais', () => {
  const day = '2026-11-08';
  const first = summaryIdempotencyKey('admin', day);
  assert.equal(summaryIdempotencyKey('admin', day), first);
  assert.notEqual(summaryIdempotencyKey('second-admin', day), first);
  assert.notEqual(summaryIdempotencyKey('admin', '2026-11-09'), first);
  assert.notEqual(summaryIdempotencyKey('admin', day, 'manual'), first);
});

test('HTML mostra 12 itens, conserva os totais e limita texto e links', () => {
  const actions = Array.from({ length: 13 }, (_, index) => notice({
    entity_id: String(index),
    title: `Item ${String(index + 1).padStart(2, '0')}`,
    body: '🟡'.repeat(180) + 'EXCEDENTE',
  }));
  const reminders = [notice({
    user_id: 'client-a', notification_type: 'team_month_update', entity_type: 'team_month',
    entity_id: null, action_url: '//external.example.test', title: '<script>alert(1)</script>',
  })];
  const { ordered, totals } = buildDailySummary([...actions, ...reminders], profiles, companies, [], origin);
  const html = summaryHtml(origin, 'Domingo', ordered, totals);
  assert.equal(totals.client, 13);
  assert.ok(html.indexOf('O cliente fez (13)') < html.indexOf('A CALI fez (1)'));
  assert.match(html, /Item 12/);
  assert.doesNotMatch(html, /Item 13|EXCEDENTE|<script>|external\.example/);
  assert.match(html, /e mais 1\./);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="https:\/\/workspace\.example\.test\/admin\/equipe"/);
});
