import { paletteColorWithAlpha } from '../lib/paletteColorWithAlpha';
import { caliPalette } from '../../supabase/functions/_shared/cali-palette';
export type CalendarView = 'month' | 'week' | 'agenda';
export type CalendarEventType = 'meeting' | 'validation' | 'deadline' | 'milestone' | 'training' | 'internal' | 'other';
export type CalendarVisibility = 'internal' | 'client';
export type CalendarMode = 'remote' | 'in_person';
export type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export type CalendarAttendee = {
  id?: string;
  name: string;
  email: string;
  status: AttendeeStatus;
  responseNote?: string | null;
};

export type WorkspaceCalendarEvent = {
  id: string;
  protocol?: string | null;
  title: string;
  companyId?: string | null;
  company?: string | null;
  companyLogo?: string | null;
  companyLogoFallback?: string | null;
  projectId?: string | null;
  project?: string | null;
  type: CalendarEventType;
  color: string;
  textColor?: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  mode?: CalendarMode | null;
  location?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  visibility: CalendarVisibility;
  attendees: CalendarAttendee[];
  sourceType: 'manual' | 'deliverable' | 'project' | 'google' | 'request_preview';
  previewStatus?: string | null;
  previewOption?: number;
  sourceEntityId?: string | null;
  sourceProtocol?: string | null;
  googleEventId?: string | null;
  googleHtmlLink?: string | null;
  organizer?: string | null;
  meetSpaceName?: string | null;
  reminderMinutes?: number;
  autoTranscription?: boolean;
  syncStatus?: 'local' | 'pending' | 'synced' | 'error' | 'cancelled_google';
  cancelledAt?: string | null;
  synthetic?: boolean;
};

export const calendarTypeMeta: Record<CalendarEventType, { label: string; color: string; soft: string }> = {
  meeting: { label: 'Reunião', color: caliPalette.red.darker, soft: paletteColorWithAlpha(caliPalette.red.darker, 0.12) },
  validation: { label: 'Validação', color: caliPalette.gold.base, soft: paletteColorWithAlpha(caliPalette.gold.base, 0.14) },
  deadline: { label: 'Prazo', color: caliPalette.orange.dark, soft: paletteColorWithAlpha(caliPalette.orange.dark, 0.13) },
  milestone: { label: 'Marco', color: caliPalette.neutral.dark, soft: paletteColorWithAlpha(caliPalette.neutral.dark, 0.12) },
  training: { label: 'Treinamento', color: caliPalette.sand.darker, soft: paletteColorWithAlpha(caliPalette.sand.darker, 0.12) },
  internal: { label: 'Interno CALI', color: caliPalette.neutral.base, soft: paletteColorWithAlpha(caliPalette.neutral.base, 0.12) },
  other: { label: 'Outro', color: caliPalette.sand.dark, soft: paletteColorWithAlpha(caliPalette.sand.dark, 0.12) },
};

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const calendarTimeZone = 'America/Sao_Paulo';
const calendarDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: calendarTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const calendarTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: calendarTimeZone, hour: '2-digit', minute: '2-digit', hour12: false,
});
const calendarDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: calendarTimeZone, day: '2-digit', month: 'short', year: 'numeric',
});
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function calendarDateKey(value: string) {
  if (dateOnlyPattern.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : calendarDayFormatter.format(date);
}

export function eventDateKey(event: WorkspaceCalendarEvent) {
  return calendarDateKey(event.startsAt);
}

export function startOfCalendarWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function monthCells(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
  const start = startOfCalendarWeek(first);
  const needed = Math.ceil((last.getDate() + first.getDay()) / 7) * 7;
  return Array.from({ length: needed }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
}

export function weekCells(cursor: Date) {
  const start = startOfCalendarWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
}

export function formatCalendarTime(value: string | null | undefined) {
  if (!value) return 'Dia inteiro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return calendarTimeFormatter.format(date);
}

export function formatCalendarDate(value: string) {
  const date = new Date(dateOnlyPattern.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? '' : calendarDateFormatter.format(date).replace('.', '');
}

export function googleCalendarTemplate(event: WorkspaceCalendarEvent) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(start)}/${stamp(end)}` });
  if (event.location) params.set('location', event.location);
  if (event.description) params.set('details', event.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadCalendarIcs(event: WorkspaceCalendarEvent) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const clean = (value: string) => value.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CALI RH//CALI Workspace//PT-BR', 'BEGIN:VEVENT',
    `UID:${event.id}@calirh.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${clean(event.title)}`,
    event.location ? `LOCATION:${clean(event.location)}` : '',
    event.description ? `DESCRIPTION:${clean(event.description)}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${event.title.replace(/[^a-zA-Z0-9À-ÿ _-]+/g, '').trim() || 'evento-cali'}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ReportAgendaCompliance = {
  label?: string | null;
  requiredTotal?: number | null;
  occurredCount?: number | null;
  notOccurredCount?: number | null;
  pendingOutcomeCount?: number | null;
  extraCount?: number | null;
  extraOccurredCount?: number | null;
  remoteOccurredCount?: number | null;
  inPersonOccurredCount?: number | null;
  remoteContractualCount?: number | null;
  inPersonContractualCount?: number | null;
  items?: Array<{
    startsAt?: string | null;
    outcome?: string | null;
    reasonCategory?: string | null;
    note?: string | null;
    scheduleClass?: string | null;
    billingApplies?: boolean | null;
    mode?: string | null;
  } | null> | null;
};
