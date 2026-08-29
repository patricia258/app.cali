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
  title: string;
  companyId?: string | null;
  company?: string | null;
  companyLogo?: string | null;
  projectId?: string | null;
  project?: string | null;
  type: CalendarEventType;
  color: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  mode?: CalendarMode | null;
  location?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  visibility: CalendarVisibility;
  attendees: CalendarAttendee[];
  sourceType: 'manual' | 'deliverable' | 'project' | 'google';
  sourceEntityId?: string | null;
  googleEventId?: string | null;
  syncStatus?: 'local' | 'pending' | 'synced' | 'error';
  cancelledAt?: string | null;
  synthetic?: boolean;
};

export const calendarTypeMeta: Record<CalendarEventType, { label: string; color: string; soft: string }> = {
  meeting: { label: 'Reunião', color: '#6D2338', soft: 'rgba(109,35,56,.12)' },
  validation: { label: 'Validação', color: '#B58C52', soft: 'rgba(181,140,82,.14)' },
  deadline: { label: 'Prazo', color: '#A85B3A', soft: 'rgba(168,91,58,.13)' },
  milestone: { label: 'Marco', color: '#70545C', soft: 'rgba(112,84,92,.12)' },
  training: { label: 'Treinamento', color: '#7B6A43', soft: 'rgba(123,106,67,.12)' },
  internal: { label: 'Interno CALI', color: '#59616B', soft: 'rgba(89,97,107,.12)' },
  other: { label: 'Outro', color: '#8A7E78', soft: 'rgba(138,126,120,.12)' },
};

export const previewCalendarEvents: WorkspaceCalendarEvent[] = [
  {
    id: 'cal-1', title: 'Reunião mensal · Grupo Aurora', companyId: 'aurora', company: 'Grupo Aurora', type: 'meeting', color: '#6D2338',
    startsAt: '2026-08-31T09:30:00-03:00', endsAt: '2026-08-31T10:30:00-03:00', allDay: false, mode: 'remote', location: 'Google Meet',
    meetingUrl: 'https://meet.google.com/', description: 'Fechamento do ciclo, indicadores e prioridades para setembro.', visibility: 'client',
    attendees: [{ name: 'Marina Costa', email: 'marina@grupoaurora.com.br', status: 'accepted' }], sourceType: 'manual', syncStatus: 'local',
  },
  {
    id: 'cal-2', title: 'Validação de indicadores', companyId: 'aurora', company: 'Grupo Aurora', type: 'validation', color: '#B58C52',
    startsAt: '2026-09-03T14:00:00-03:00', endsAt: '2026-09-03T15:00:00-03:00', allDay: false, mode: 'remote', location: 'Google Meet',
    description: 'Decisão do cliente sobre a estrutura de indicadores.', visibility: 'client', attendees: [{ name: 'Marina Costa', email: 'marina@grupoaurora.com.br', status: 'pending' }], sourceType: 'manual', syncStatus: 'local',
  },
  {
    id: 'cal-3', title: 'Ritual de gestão · prazo', companyId: 'studio-norte', company: 'Studio Norte', type: 'deadline', color: '#A85B3A',
    startsAt: '2026-09-05T18:00:00-03:00', allDay: false, description: 'Prazo do entregável Ritual de gestão com lideranças.', visibility: 'internal', attendees: [], sourceType: 'deliverable', sourceEntityId: 'deliverable-preview-1', synthetic: true,
  },
  {
    id: 'cal-4', title: 'Checkpoint executivo', companyId: 'novatech', company: 'Novatech', type: 'meeting', color: '#6D2338',
    startsAt: '2026-09-08T10:00:00-03:00', endsAt: '2026-09-08T10:45:00-03:00', allDay: false, mode: 'remote', location: 'Google Meet',
    description: 'Checkpoint do advisory com liderança.', visibility: 'client', attendees: [{ name: 'Ricardo Martins', email: 'ricardo@novatech.com.br', status: 'pending' }], sourceType: 'manual', syncStatus: 'local',
  },
  {
    id: 'cal-5', title: 'Estrutura de governança · prazo', companyId: 'aurora', company: 'Grupo Aurora', type: 'deadline', color: '#A85B3A',
    startsAt: '2026-09-08T18:00:00-03:00', allDay: false, description: 'Prazo do entregável Estrutura de governança.', visibility: 'internal', attendees: [], sourceType: 'deliverable', sourceEntityId: 'deliverable-preview-2', synthetic: true,
  },
  {
    id: 'cal-6', title: 'Workshop de liderança', companyId: 'studio-norte', company: 'Studio Norte', type: 'training', color: '#7B6A43',
    startsAt: '2026-09-11T13:30:00-03:00', endsAt: '2026-09-11T16:30:00-03:00', allDay: false, mode: 'in_person', location: 'Sede do cliente',
    description: 'Encontro presencial com lideranças.', visibility: 'client', attendees: [], sourceType: 'manual', syncStatus: 'local',
  },
];

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function eventDateKey(event: WorkspaceCalendarEvent) {
  return event.startsAt.slice(0, 10);
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
  return Array.from({ length: needed }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function weekCells(cursor: Date) {
  const start = startOfCalendarWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function formatCalendarTime(value: string | null | undefined) {
  if (!value) return 'Dia inteiro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatCalendarDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
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
