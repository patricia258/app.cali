import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventDateKey, formatCalendarDate, formatCalendarTime, googleCalendarTemplate } from '../../src/domain/calendar.ts';

test('calendar groups and displays the same Brasília day for a UTC event after midnight', () => {
  const event = { startsAt: '2027-01-01T02:30:00Z' };
  assert.equal(eventDateKey(event), '2026-12-31');
  assert.equal(eventDateKey({ startsAt: '2026-12-31T23:30:00-03:00' }), '2026-12-31');
  assert.equal(eventDateKey({ startsAt: '2027-01-01T03:00:00Z' }), '2027-01-01');
  assert.match(formatCalendarDate(event.startsAt), /31.*2026/);
  assert.equal(formatCalendarTime(event.startsAt), '23:30');
  assert.equal(eventDateKey({ startsAt: '2027-01-01', allDay: true }), '2027-01-01');
});

test('Google Calendar link keeps the time instant, one-hour default and event details', () => {
  const url = new URL(googleCalendarTemplate({
    startsAt: '2026-12-31T23:30:00-03:00',
    title: 'Reunião de revisão',
    location: 'Sala 1 & 2',
    description: 'Decisões\nPróximos passos',
  }));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    action: 'TEMPLATE',
    text: 'Reunião de revisão',
    dates: '20270101T023000Z/20270101T033000Z',
    location: 'Sala 1 & 2',
    details: 'Decisões\nPróximos passos',
  });
});
