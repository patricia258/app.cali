import { readAdminCalendar, readMeetingOutcomes } from '../../api/calendar/admin';
import { calendarTypeMeta, type CalendarAttendee, type CalendarEventType, type WorkspaceCalendarEvent } from '../../domain/calendar';

export const CALENDAR_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CompanyOption = { id: string; name: string; logoUrl?: string | null; logoFallbackUrl?: string | null };
export type MeetingOutcome = { event_id: string; outcome: string; transcription_url?: string | null; transcription_attachment_name?: string | null };

type CalendarCompanyRow = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  logo_workspace_url?: string | null;
};
type CalendarAttendeeRow = Omit<CalendarAttendee, 'responseNote'> & {
  event_id: string;
  response_note?: string | null;
};
type CalendarEventRow = {
  id: string;
  protocol: string | null;
  title: string;
  company_id: string | null;
  project_id: string | null;
  event_type: CalendarEventType | null;
  color_hex: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  mode: WorkspaceCalendarEvent['mode'];
  location: string | null;
  meeting_url: string | null;
  description: string | null;
  visibility: WorkspaceCalendarEvent['visibility'];
  source_type: WorkspaceCalendarEvent['sourceType'] | null;
  source_entity_id: string | null;
  google_event_id: string | null;
  sync_status: WorkspaceCalendarEvent['syncStatus'] | null;
  cancelled_at: string | null;
  reminder_minutes: number | null;
  auto_transcription: boolean | null;
  staff_visible: boolean | null;
};
type CalendarDeadlineRow = {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  due_at: string;
  status: string;
  protocol: string | null;
};
type CalendarRequestRow = {
  id: string;
  company_id: string;
  title: string | null;
  status: string;
  request_mode: WorkspaceCalendarEvent['mode'];
  requested_slots: { startsAt?: string; endsAt?: string | null }[] | null;
  purpose: string | null;
  location: string | null;
};
export async function loadAdminCalendarData(staff: boolean) {
  const { companyRows, eventRows, attendeeRows, deadlineRows, connectionRows, requestRows, projectRows } = await readAdminCalendar(Boolean(staff));

  const options: CompanyOption[] = (companyRows || []).map((row: CalendarCompanyRow) => ({
    id: row.id,
    name: row.display_name,
    logoUrl: row.logo_url,
    logoFallbackUrl: row.logo_workspace_url,
  }));
  const companyMap = new Map(options.map((company) => [company.id, company]));
  const projectMap = new Map((projectRows || []).map((project: { id: string; name: string }) => [project.id, project.name] as const));
  const attendeeMap = new Map<string, CalendarAttendeeRow[]>();
  (attendeeRows || []).forEach((row: CalendarAttendeeRow) => {
    const list = attendeeMap.get(row.event_id) || [];
    list.push(row);
    attendeeMap.set(row.event_id, list);
  });

  const calendarRows: CalendarEventRow[] = eventRows || [];
  const hiddenFromStaff = new Set(calendarRows.filter((row) => row.staff_visible === false).map((row) => row.id));
  const manual = calendarRows.map((row): WorkspaceCalendarEvent => ({
    id: row.id,
    protocol: row.protocol,
    title: row.title,
    companyId: row.company_id,
    company: companyMap.get(row.company_id ?? '')?.name || null,
    companyLogo: companyMap.get(row.company_id ?? '')?.logoUrl,
    companyLogoFallback: companyMap.get(row.company_id ?? '')?.logoFallbackUrl,
    projectId: row.project_id,
    type: (row.event_type || 'other'),
    color: row.color_hex || calendarTypeMeta[(row.event_type || 'other')]?.color || calendarTypeMeta.other.color,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: Boolean(row.all_day),
    mode: row.mode,
    location: row.location,
    meetingUrl: row.meeting_url,
    description: row.description,
    visibility: row.visibility,
    attendees: (attendeeMap.get(row.id) || []).map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      status: attendee.status,
      responseNote: attendee.response_note,
    })),
    sourceType: row.source_type || 'manual',
    sourceEntityId: row.source_entity_id,
    googleEventId: row.google_event_id,
    syncStatus: row.sync_status || 'local',
    cancelledAt: row.cancelled_at,
    reminderMinutes: row.reminder_minutes ?? undefined,
    autoTranscription: row.auto_transcription ?? undefined,
    synthetic: false,
  }));
  const meetingIds = manual.filter(event => event.type === 'meeting' && CALENDAR_UUID_PATTERN.test(event.id)).map(event => event.id);
  let meetingOutcomes: Record<string, MeetingOutcome> = {};
  if (meetingIds.length) {
    const { data: outcomes, error: outcomeError } = await readMeetingOutcomes(meetingIds);
    if (outcomeError) throw outcomeError;
    meetingOutcomes = Object.fromEntries(((outcomes || []) as MeetingOutcome[]).map(row => [row.event_id, row]));
  }

  const deadlines: WorkspaceCalendarEvent[] = (deadlineRows || [])
    .filter((row: CalendarDeadlineRow) => !['approved', 'cancelled'].includes(String(row.status)))
    .map((row: CalendarDeadlineRow) => ({
      id: `deadline-${row.id}`,
      title: `${row.title} · prazo`,
      companyId: row.company_id,
      company: companyMap.get(row.company_id ?? '')?.name || null,
      companyLogo: companyMap.get(row.company_id ?? '')?.logoUrl,
      companyLogoFallback: companyMap.get(row.company_id ?? '')?.logoFallbackUrl,
      projectId: row.project_id,
      project: projectMap.get(row.project_id ?? ''),
      type: 'deadline',
      color: calendarTypeMeta.deadline.color,
      startsAt: row.due_at,
      allDay: false,
      description: 'Prazo gerado automaticamente a partir do entregável.',
      visibility: 'internal',
      attendees: [],
      sourceType: 'deliverable',
      sourceEntityId: row.id,
      sourceProtocol: row.protocol,
      synthetic: true,
    }));

  const previews: WorkspaceCalendarEvent[] = (requestRows || []).flatMap((row: CalendarRequestRow) => {
    const slots = row.requested_slots;
    return (Array.isArray(slots) ? slots : []).filter((slot): slot is { startsAt: string; endsAt?: string | null } => typeof slot?.startsAt === 'string' && slot.startsAt.length > 0).slice(0, 2).map((slot, index) => ({
      id: `request-preview-${row.id}-${index}`, title: row.title || (row.request_mode === 'in_person' ? 'Visita presencial' : 'Reunião online'),
      companyId: row.company_id, company: companyMap.get(row.company_id ?? '')?.name || null, companyLogo: companyMap.get(row.company_id ?? '')?.logoUrl,
      companyLogoFallback: companyMap.get(row.company_id ?? '')?.logoFallbackUrl,
      type: 'meeting' as const, color: '#A66A37', startsAt: slot.startsAt, endsAt: slot.endsAt || null, allDay: false,
      mode: row.request_mode, location: row.location, description: row.purpose,
      visibility: 'internal' as const, attendees: [], sourceType: 'request_preview' as const,
      sourceEntityId: row.id, previewStatus: row.status, previewOption: index + 1, synthetic: true,
    }));
  });
  const events = [...manual, ...deadlines, ...previews].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return { events, companies: options, hiddenFromStaff, meetingOutcomes, connected: Boolean(connectionRows?.length) };
}
