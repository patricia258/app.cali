import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  groupHours, normalizeIntelligenceSnapshot, shouldShowNextCycle,
} from '../../src/lib/reportIntelligence.ts';
import { normalizeMonthlySeries, quarterlyEvolutionSummary } from '../../src/lib/reportComposition.ts';
import { buildReportAlertsV15, capacitySignalV15 } from '../../src/lib/reportV15.ts';
import { deliveryRowsForPdf, reportKpisV14 } from '../../src/lib/reportV14.ts';
import { augmentReportData, normalizeReportManualComplements } from '../../src/lib/reportManualComplements.ts';
import { calculateProposal, initialPackageFor } from '../../src/lib/portalProposalLogic.ts';

const snapshotFor = (overrides = {}) => normalizeIntelligenceSnapshot({
  generatedAt: '2026-11-30T22:00:00Z',
  companyId: 'company-qa', companyName: 'Empresa QA',
  period: { start: '2026-11-01', end: '2026-11-30', months: 1 },
  contract: { monthlyHours: 10, contractedHoursPeriod: 10 },
  deliverables: {},
  hours: { contractedHours: 10, consumedMinutes: 120, entriesCount: 2 },
  ...overrides,
});

test('snapshot legado agrupa horas por lançamento e usa categorias quando o detalhamento não existe', () => {
  assert.equal(normalizeIntelligenceSnapshot({ period: {} }), null);
  const legacy = snapshotFor({
    hours: { contractedHours: '10', consumedMinutes: '120', categories: [{ label: 'Reunião', minutes: 90 }, { label: 'Relatório', minutes: 30 }] },
  });
  assert.equal(legacy.hours.consumedMinutes, 120);
  assert.equal(legacy.feedback.average, null);
  assert.deepEqual(groupHours(legacy), [
    { label: 'Reuniões e alinhamentos', minutes: 90, percent: 75 },
    { label: 'Documentação', minutes: 30, percent: 25 },
  ]);
  const detailed = {
    ...legacy,
    hours: {
      ...legacy.hours,
      entries: [
        { category: '', description: 'Preparar entrega', deliverableId: 'd1', minutes: 90 },
        { category: 'Reunião', description: 'Acompanhamento', minutes: 30 },
      ],
    },
  };
  assert.deepEqual(groupHours(detailed), [
    { label: 'Entregáveis', minutes: 90, percent: 75 },
    { label: 'Reuniões e alinhamentos', minutes: 30, percent: 25 },
  ]);
});

test('relatório de capacidade recomenda revisão só após dois fechamentos acima da tolerância', () => {
  const month = snapshotFor();
  const withUse = (consumedMinutes, previousReports = []) => ({
    ...month, hours: { ...month.hours, consumedMinutes }, previousReports,
  });
  assert.equal(capacitySignalV15(withUse(630)).state, 'normal');
  assert.equal(capacitySignalV15(withUse(631)).state, 'first_over');
  const previous = [
    { periodStart: '2026-10-01', contractedHours: 10, consumedMinutes: 660 },
    { periodStart: '2026-09-01', contractedHours: 10, consumedMinutes: 580 },
  ];
  const repeated = capacitySignalV15(withUse(720, previous));
  assert.equal(repeated.state, 'second_over');
  assert.equal(repeated.extraMinutes, 120);
  assert.match(repeated.message, /12h\/mês/);
  assert.equal(capacitySignalV15(withUse(720, [...previous, { periodStart: '2026-10-15', contractedHours: 10, consumedMinutes: 630 }])).state, 'first_over');
});

test('complementos manuais entram uma vez nas horas e ficam fora das pendências técnicas', () => {
  const snapshot = snapshotFor({
    hours: { contractedHours: 10, consumedMinutes: 120, entriesCount: 2, categories: [{ label: 'Reunião', minutes: 120 }] },
  });
  const complements = normalizeReportManualComplements({
    deliveries: [{ title: ' Entrega  manual ', status: 'completed', completedAt: '2026-11-10', minutes: 35.5 }],
    timeEntries: [{ description: 'Apoio', category: 'desconhecida', minutes: 24 }, { minutes: -10 }],
  });
  const automatic = { deliverable_id: 'd1', title: 'Sem prazo', actual_started_at: '2026-11-01', status: 'in_progress' };
  const result = augmentReportData(snapshot, [automatic], complements);
  assert.equal(snapshot.hours.consumedMinutes, 120);
  assert.equal(result.snapshot.hours.consumedMinutes, 180);
  assert.equal(groupHours(result.snapshot).reduce((sum, group) => sum + group.minutes, 0), 180);
  assert.equal(result.deliveries[1].title, 'Entrega manual');
  assert.equal(result.deliveries[1].manual_source, true);
  assert.deepEqual(buildReportAlertsV15(result.snapshot, result.deliveries)
    .filter(({ source }) => source === 'deadline').map(({ id, blocking }) => [id, blocking]), [['deadline-missing:d1', true]]);
});

test('KPIs e PDF usam recortes distintos de prazo, conclusão e início sem puxar meses alheios', () => {
  const snapshot = snapshotFor();
  const rows = [
    { deliverable_id: 'nov', effective_due_at: '2026-11-07', completion_at: '2026-11-07', delivery_timing: 'on_time' },
    { deliverable_id: 'oct', effective_due_at: '2026-10-29', completion_at: '2026-11-03', delivery_timing: 'after_deadline' },
    { deliverable_id: 'open', effective_due_at: '2026-11-29', completion_at: null, delivery_timing: 'open' },
    { deliverable_id: 'start', actual_started_at: '2026-11-27', effective_due_at: '2026-12-03', delivery_timing: 'open' },
    { deliverable_id: 'out', effective_due_at: '2026-12-11', delivery_timing: 'open' },
  ];
  const { plannedDeliveries, completedDeliveries, deliveryAdherence } = reportKpisV14(snapshot, rows);
  assert.deepEqual({ plannedDeliveries, completedDeliveries, deliveryAdherence }, {
    plannedDeliveries: 2, completedDeliveries: 1, deliveryAdherence: 50,
  });
  assert.deepEqual(deliveryRowsForPdf(snapshot, rows).map(({ deliverable_id }) => deliverable_id), ['oct', 'nov', 'open', 'start']);
  assert.equal(reportKpisV14(snapshot, []).deliveryAdherence, null);
});

test('trimestral inclui meses sem nota e o próximo ciclo aparece no horizonte contratual', () => {
  const series = normalizeMonthlySeries([
    { monthRef: '2026-09-01', consumedMinutes: 60, approvedCount: 1, feedbackCount: 0 },
    { monthRef: '2026-10-01', consumedMinutes: 90, approvedCount: 2, feedbackCount: 1, feedbackAverage: 4.5 },
  ]);
  const summary = quarterlyEvolutionSummary(series);
  assert.match(summary[0], /1h.*1h30/);
  assert.match(summary[2], /out.*4,5/i);
  assert.doesNotMatch(summary[2], /set/i);
  assert.equal(shouldShowNextCycle(snapshotFor(), 'monthly'), false);
  assert.equal(shouldShowNextCycle(snapshotFor(), 'quarterly'), true);
  assert.equal(shouldShowNextCycle(snapshotFor({
    contract: { monthlyHours: 10, endDate: '2026-12-15' },
  }), 'monthly'), true);
});

test('proposta recorrente respeita prazo mínimo, teto e faixa de desconto', () => {
  const base = {
    serviceSlug: 'assessoria-estrategica', answers: { colaboradores: 100, frequencia: 'semanal' },
    packageCode: 'FULL', basePrice: 9000, discount: 90, months: 1,
  };
  const proposal = calculateProposal(base);
  assert.equal(proposal.months, 12);
  assert.equal(proposal.monthly, true);
  assert.equal(proposal.ceilingApplied, true);
  assert.equal(proposal.subtotal, 8000);
  assert.equal(proposal.finalUnit, 6500);
  assert.equal(proposal.discountValue, 1500);
  const limited = calculateProposal({ ...base, basePrice: 7000, extras: 300, scopeMode: 'prioritized', finalOverride: 6800 });
  assert.equal(limited.factor, 1);
  assert.equal(limited.extras, 0);
  assert.equal(limited.finalUnit, 6800);
  assert.equal(initialPackageFor('cali-build', { colaboradores: 300, pessoas_rh: 1 }), 'COMPLETO');
});
