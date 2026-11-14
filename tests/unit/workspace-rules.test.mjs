import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LEGAL_VERSION, privacyPolicy, termsOfUse } from '../../src/domain/legalTexts.ts';
import { addBusinessDays, businessDaysLate, projectProgress } from '../../src/domain/projects.ts';
import { monthCells, weekCells, dateKey } from '../../src/domain/calendar.ts';
import { nextThemeBoundary, scheduledWorkspaceTheme } from '../../src/lib/workspaceTheme.ts';

test('terms and privacy have a matching server publication and show the approved retention period', () => {
  const migrations = new URL('../../supabase/migrations/', import.meta.url);
  const version = `new_version constant text := '${LEGAL_VERSION}'`;
  const hash = createHash('sha256').update(`${termsOfUse()}\n\n${privacyPolicy()}`).digest('hex');
  const publications = readdirSync(migrations)
    .filter(file => file.endsWith('.sql'))
    .map(file => readFileSync(new URL(file, migrations), 'utf8'))
    .filter(sql => sql.includes(version));
  assert.equal(publications.length, 1);
  assert.ok(publications[0].includes(`new_hash constant text := '${hash}'`));
  assert.match(privacyPolicy(), /30 dias/);
  assert.doesNotMatch(privacyPolicy(), /45 dias/);
});

test('project deadlines skip weekends and project progress ignores canceled deliveries', () => {
  const friday = new Date(2026, 10, 13, 12);
  const monday = new Date(2026, 10, 16, 12);
  assert.deepEqual(addBusinessDays(friday, 1), monday);
  assert.equal(businessDaysLate(friday.toISOString(), monday), 1);
  assert.equal(businessDaysLate('registro legado sem data', monday), 0);
  assert.equal(projectProgress([{ status: 'approved' }, { status: 'cancelled' }]), 100);
  assert.equal(projectProgress([{ status: 'cancelled' }]), 0);
  assert.equal(projectProgress([{ status: 'approved' }, { status: 'client_review' }, { status: 'in_progress' }]), 73);
});

test('calendar day keys stay in the local day at month and year boundaries', () => {
  const january = new Date(2027, 0, 1, 12);
  const week = weekCells(january).map(dateKey);
  assert.equal(week.length, 7);
  assert.ok(week.includes('2026-12-31'));
  assert.ok(week.includes('2027-01-01'));
  const month = monthCells(january);
  assert.equal(month.length % 7, 0);
  assert.equal(month.filter(day => day.getMonth() === 0).length, 31);
});

test('workspace theme changes at 06:00 and 18:00 and rolls the next morning over midnight', () => {
  assert.equal(scheduledWorkspaceTheme(new Date(2026, 10, 12, 5, 59)), 'night');
  assert.equal(scheduledWorkspaceTheme(new Date(2026, 10, 12, 6)), 'day');
  assert.equal(scheduledWorkspaceTheme(new Date(2026, 10, 12, 17, 59)), 'day');
  assert.equal(scheduledWorkspaceTheme(new Date(2026, 10, 12, 18)), 'night');
  assert.deepEqual(nextThemeBoundary(new Date(2026, 10, 12, 18)), new Date(2026, 10, 13, 6));
});
