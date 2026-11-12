import assert from 'node:assert/strict';
import { test } from 'node:test';
import { complexityRange, projectProgress, validDeliverableFeedback } from '../../src/domain/projects.ts';
import { capacityOf, minutesLabel, percentLabel } from '../../src/lib/capacity.ts';

test('capacity preserves the balance, marks thresholds and shows consumption above 100%', () => {
  const cases = [
    { used: 89, level: 'ok', percent: 74.2, balance: 31, excess: 0 },
    { used: 90, level: 'attention', percent: 75, balance: 30, excess: 0 },
    { used: 120, level: 'full', percent: 100, balance: 0, excess: 0 },
    { used: 150, level: 'excess', percent: 125, balance: 0, excess: 30 },
  ];
  for (const { used, level, percent, balance, excess } of cases) {
    assert.deepEqual(capacityOf(2, used), {
      contractedMinutes: 120, usedMinutes: used, balanceMinutes: balance, excessMinutes: excess,
      usagePercent: percent, excessPercent: excess ? 25 : null, level,
    });
  }
  assert.equal(percentLabel(capacityOf(2, 89).usagePercent), '74,2%');
  assert.equal(minutesLabel(150), '2h 30min');
});

test('hours can record time without a contracted capacity and keep fractional hours in minutes', () => {
  assert.deepEqual(capacityOf(null, 25), {
    contractedMinutes: 0, usedMinutes: 25, balanceMinutes: 0, excessMinutes: 0,
    usagePercent: null, excessPercent: null, level: 'none',
  });
  assert.equal(percentLabel(capacityOf(null, 25).usagePercent), '—');
  assert.equal(capacityOf(1.25, 25).contractedMinutes, 75);
  assert.equal(capacityOf(1.25, 25).balanceMinutes, 50);
});

test('project progress weighs the review, correction and standby stages', () => {
  assert.equal(projectProgress([
    { status: 'internal_review' }, { status: 'adjustment_requested' }, { status: 'rebriefing' },
    { status: 'standby' }, { status: 'not_started' }, { status: 'cancelled' },
  ]), 38);
  assert.equal(complexityRange('MC3'), '90 a 120 dias corridos');
  assert.equal(complexityRange('M3'), '');
});

test('deliverable approval requires a score and a reason for scores from 1 to 3', () => {
  for (const invalid of [0, 6, 2.5, Number.NaN]) {
    assert.equal(validDeliverableFeedback(invalid, 'Comentário válido'), false);
  }
  for (const score of [1, 2, 3]) {
    assert.equal(validDeliverableFeedback(score, '   '), false);
    assert.equal(validDeliverableFeedback(score, '  ok  '), false);
    assert.equal(validDeliverableFeedback(score, '  Sim  '), true);
  }
  assert.equal(validDeliverableFeedback(4, ''), true);
  assert.equal(validDeliverableFeedback(5, 'x'.repeat(2000)), true);
  assert.equal(validDeliverableFeedback(5, 'x'.repeat(2001)), false);
});
