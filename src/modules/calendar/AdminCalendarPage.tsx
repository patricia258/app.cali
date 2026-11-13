import { WorkspacePageHeader } from '../../components/workspace/WorkspacePageHeader';
import { Button } from '../../components/ds/Button';
import { EmptyState } from '../../components/ds/EmptyState';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { ExtraVisitExpenses } from '../../components/calendar/ExtraVisitExpenses';
import { FormEvent, type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  Check,
  FileText,
  MapPin,
  Plus,
  Video,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import { AgendaChangeInbox } from './components/AgendaChangeInbox';
import { CalendarEventEditor } from './components/CalendarEventEditor';
import * as grid from './calendarGridStyles';
import type { CreateEventForm } from './calendarEventForm';
import { CalendarMeetingHistory } from './components/CalendarMeetingHistory';
import { CalendarEventDetails } from './components/CalendarEventDetails';
import { CalendarDeleteEventDialog } from './components/CalendarDeleteEventDialog';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarLegend } from './components/CalendarLegend';
import { CalendarGoogleConnection } from './components/CalendarGoogleConnection';
import { useInvalidateGoogleCalendarEvent } from './hooks/useInvalidateGoogleCalendarEvent';
import { useCalendarEventSync } from './hooks/useCalendarEventSync';
import { useCalendarEventSave } from './hooks/useCalendarEventSave';
import { useMeetingClassification } from './hooks/useMeetingClassification';
import { SchedulingNotice } from './scheduling/SchedulingNotice';
import { useSchedulingNotice } from './scheduling/useSchedulingNotice';
import { AdminSchedulingRequests } from './scheduling/AdminSchedulingRequests';
import {
  calendarDateKey as formDate,
  calendarTypeMeta,
  dateKey,
  eventDateKey,
  formatCalendarTime,
  monthCells,
  previewCalendarEvents,
  startOfCalendarWeek,
  weekCells,
  type CalendarEventType,
  type CalendarView,
  type WorkspaceCalendarEvent,
} from '../../domain/calendar';
import type { JsonObject } from '../../domain/json';
import { isSupabaseConfigured } from '../../api/access/session';
import { cancelCalendarEvent, submitStaffCalendarChange } from '../../api/calendar/admin';
import { NoticeCalendarCard } from '../notices/NoticesBoard';
import { CALENDAR_UUID_PATTERN, type CompanyOption } from './adminCalendarData';
import { useAdminGoogleCalendarEvents } from './hooks/useAdminGoogleCalendarEvents';
import { useCalendarNoticeEvents } from './hooks/useCalendarNoticeEvents';
import { useAdminCalendarData } from './hooks/useAdminCalendarData';

const fallbackCompanies: CompanyOption[] = [
  { id: 'aurora', name: 'Grupo Aurora' },
  { id: 'novatech', name: 'Novatech' },
  { id: 'studio-norte', name: 'Studio Norte' },
];

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const hours = Array.from({ length: 13 }, (_, index) => index + 7);
const HOUR_HEIGHT = 64;
const WEEK_START_HOUR = hours[0];
const WEEK_END_HOUR = hours[hours.length - 1] + 1;


function defaultForm(date = dateKey(new Date())): CreateEventForm {
  return {
    title: '',
    companyId: 'aurora',
    type: 'meeting',
    color: calendarTypeMeta.meeting.color,
    date,
    startTime: '09:00',
    endTime: '10:00',
    allDay: false,
    visibility: 'client',
    staffVisible: true,
    mode: 'remote',
    location: 'Google Meet',
    meetingUrl: '',
    description: '',
    attendeeEmails: '',
    reminderMinutes: 30,
    autoTranscription: true,
  };
}

function eventStyle(event: WorkspaceCalendarEvent) {
  const hex = /^#[0-9a-f]{6}$/i.test(event.color) ? event.color : '#8D7354';
  const [red, green, blue] = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16));
  const luminance = [red, green, blue].map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const foreground = luminance > .18 ? '#30232a' : '#ffffff';
  const style: CSSProperties & Record<`--${string}`, string> = { '--event-color': hex, '--event-soft': `${hex}18`, '--event-foreground': foreground };
  return style;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekMinute(value: string) {
  const [hour, minute] = formTime(value).split(':').map(Number);
  return hour * 60 + minute;
}

function weekEventLayout(events: WorkspaceCalendarEvent[]) {
  type Placed = { event: WorkspaceCalendarEvent; start: number; end: number; column: number; columns: number };
  const dayStart = WEEK_START_HOUR * 60, dayEnd = WEEK_END_HOUR * 60;
  const sorted = events.filter(event => !event.allDay).map(event => {
    const start = Math.max(dayStart, weekMinute(event.startsAt));
    // The following day's endpoint is not an early-morning event on this day.
    const rawEnd = !event.endsAt ? start + 30 : formDate(event.endsAt) === formDate(event.startsAt) ? weekMinute(event.endsAt) : dayEnd;
    return { event, start, end: Math.min(dayEnd, Math.max(start + 1, rawEnd)) };
  }).filter(item => weekMinute(item.event.startsAt) < dayEnd && item.end > dayStart).sort((a,b) => a.start - b.start || b.end - a.end);
  const groups: Placed[][] = [];
  let group: Placed[] = [], groupEnd = -1, active: Placed[] = [];
  const flush = () => { if (group.length) { const columns = Math.max(...group.map(item => item.column)) + 1; group.forEach(item => item.columns = columns); groups.push(group); } group = []; active = []; };
  sorted.forEach(item => {
    if (group.length && item.start >= groupEnd) { flush(); groupEnd = -1; }
    active = active.filter(placed => placed.end > item.start);
    let column = 0;
    while (active.some(placed => placed.column === column)) column++;
    const placed = { ...item, column, columns: 1 };
    group.push(placed); active.push(placed); groupEnd = Math.max(groupEnd, item.end);
  });
  flush();
  return groups.flat().map(item => ({ ...item, top: (item.start - dayStart) / 60 * HOUR_HEIGHT, height: Math.max(3, (item.end - item.start) / 60 * HOUR_HEIGHT) }));
}

function formTime(value: string | null | undefined) {
  return value ? formatCalendarTime(value) : '09:00';
}

function formFromEvent(event: WorkspaceCalendarEvent): CreateEventForm {
  return {
    title: event.title.replace(/ · prazo$/i, ''),
    companyId: event.companyId || '',
    type: event.type,
    color: event.color,
    date: formDate(event.startsAt),
    startTime: formTime(event.startsAt),
    endTime: formTime(event.endsAt || event.startsAt),
    allDay: event.allDay,
    visibility: event.visibility,
    staffVisible: true,
    mode: event.mode || 'remote',
    location: event.location || '',
    meetingUrl: event.meetingUrl || '',
    description: event.description || '',
    attendeeEmails: event.attendees.map((attendee) => attendee.email).join(', '),
    reminderMinutes: event.reminderMinutes ?? 30,
    autoTranscription: event.autoTranscription ?? true,
  };
}

function eventProtocol(event: WorkspaceCalendarEvent) {
  return event.protocol || event.sourceProtocol || null;
}

// Mesma página para a Equipe CALI (Partner): só as empresas dele, sem a agenda Google da administradora;
// criar, alterar ou cancelar vira pedido para a Patricia aprovar.
const CalendarFrame = ({ staff, children }: { staff?: boolean; children: ReactNode }) => staff ? <>{children}</> : <Shell role="admin">{children}</Shell>;
export const StaffCalendarPage = () => <AdminCalendarPage staff />;
export function AdminCalendarPage({ staff }: { staff?: boolean } = {}) {
  const [staffNotice, setStaffNotice] = useState('');
  useEffect(() => { if (!staffNotice) return; const timer = window.setTimeout(() => setStaffNotice(''), 4200); return () => window.clearTimeout(timer); }, [staffNotice]);
  async function staffSubmitChange(action: string, title: string, payload: JsonObject, companyId: string) {
    const sent = await submitStaffCalendarChange(companyId, action, title, payload);
    setStaffNotice(sent ? 'Pedido enviado. Vale depois da aprovação.' : 'Não foi possível enviar o pedido. Tente de novo.');
    return sent;
  }
  const today = useMemo(() => new Date(), []);
  const { data: calendar, isPending, enabled, refetch: loadCalendar } = useAdminCalendarData(Boolean(staff));
  const [localEvents, setEvents] = useState<WorkspaceCalendarEvent[] | null>(null);
  const events = localEvents ?? calendar?.events ?? previewCalendarEvents;
  const companies = calendar?.companies.length ? calendar.companies : fallbackCompanies;
  const meetingOutcomes = calendar?.meetingOutcomes ?? {};
  const calendarConnection = calendar?.connected ? 'connected' : 'not_connected';
  const loading = enabled && isPending;
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const { data: noticeEvents = [] } = useCalendarNoticeEvents();
  const { data: googleCalendar, status: googleReadStatus, refetch: reloadGoogleCalendar } = useAdminGoogleCalendarEvents(cursor, Boolean(staff));
  const googleEvents = googleCalendar?.events ?? [];
  const [view, setView] = useState<CalendarView>('week');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(() => new Set(Object.keys(calendarTypeMeta) as CalendarEventType[]));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [form, setForm] = useState<CreateEventForm>(() => defaultForm());
  const editingProtocol = editingEvent ? eventProtocol(editingEvent) ?? undefined : undefined;
  const { classification, setClassification } = useMeetingClassification(editingProtocol, editorOpen && !staff);
  const saveCalendar = useCalendarEventSave();
  const [calendarNotice, setCalendarNotice] = useSchedulingNotice();
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const invalidateGoogleEvent = useInvalidateGoogleCalendarEvent();
  const syncEvent = useCalendarEventSync(setCalendarNotice, invalidateGoogleEvent);
  const [saving, setSaving] = useState(false);
  const [eventError, setEventError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [historyOpenedAt, setHistoryOpenedAt] = useState<number | null>(null);
  const selectionStart = useRef<{date:Date;minutes:number;pointerId:number;startY:number}|null>(null);
  const lastHorizontalMove = useRef(0);
  const [selectionPreview, setSelectionPreview] = useState<{date:string;top:number;height:number}|null>(null);

  useEffect(() => {
    const active = editorOpen || Boolean(selectedEvent);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, selectedEvent]);

  const visibleEvents = useMemo(() => [...events,...noticeEvents,...googleEvents.filter(google=>!events.some(local=>local.googleEventId===google.googleEventId))].filter((event) => {
    if (event.cancelledAt) return false;
    if (companyFilter !== 'all' && event.companyId !== companyFilter && !event.id.startsWith('notice:')) return false;
    if (!activeTypes.has(event.type)) return false;
    if (query && !`${event.title} ${event.company || ''} ${calendarTypeMeta[event.type]?.label || ''} ${eventProtocol(event) || ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [events, noticeEvents, googleEvents, companyFilter, activeTypes, query]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, WorkspaceCalendarEvent[]>();
    visibleEvents.forEach((event) => {
      const key = eventDateKey(event);
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
    });
    return map;
  }, [visibleEvents]);

  const monthDates = useMemo(() => monthCells(cursor), [cursor]);
  const weekDates = useMemo(() => weekCells(cursor), [cursor]);

  function navigatePeriod(delta: number) {
    const next = new Date(cursor);
    if (view === 'month' || view === 'agenda') next.setMonth(next.getMonth() + delta);
    else next.setDate(next.getDate() + delta * 7);
    setCursor(next);
  }

  function openCreateForDate(date?: Date, minutes?: number, duration = 60) {
    const target = date || cursor;
    const next = defaultForm(dateKey(target));
    next.companyId = companies[0]?.id || 'aurora';
    if (typeof minutes === 'number') {
      next.startTime = `${String(Math.floor(minutes/60)).padStart(2, '0')}:${String(minutes%60).padStart(2, '0')}`;
      const end=Math.min(minutes+duration,20*60);
      next.endTime = `${String(Math.floor(end/60)).padStart(2, '0')}:${String(end%60).padStart(2, '0')}`;
    }
    setEventError('');
    setEditingEvent(null);
    setForm(next);
    setEditorOpen(true);
  }

  function startWeekSelection(date:Date,hour:number,event:ReactPointerEvent<HTMLDivElement>){
    const minutes=hour*60+Math.min(45,Math.max(0,Math.floor((event.clientY-event.currentTarget.getBoundingClientRect().top)/16)*15));
    selectionStart.current={date,minutes,pointerId:event.pointerId,startY:event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionPreview({date:dateKey(date),top:(minutes-7*60)/60*HOUR_HEIGHT,height:HOUR_HEIGHT/2});
  }
  function moveWeekSelection(event:ReactPointerEvent<HTMLDivElement>){
    const start=selectionStart.current;if(!start||start.pointerId!==event.pointerId)return;
    const duration=Math.max(30,Math.min(180,Math.ceil((event.clientY-start.startY)/16)*15));
    setSelectionPreview({date:dateKey(start.date),top:(start.minutes-7*60)/60*HOUR_HEIGHT,height:duration/60*HOUR_HEIGHT});
  }
  function finishWeekSelection(event:ReactPointerEvent<HTMLDivElement>){
    const start=selectionStart.current;if(!start||start.pointerId!==event.pointerId)return;
    const duration=Math.max(30,Math.min(180,Math.ceil((event.clientY-start.startY)/16)*15));
    selectionStart.current=null;setSelectionPreview(null);openCreateForDate(start.date,start.minutes,duration);
  }
  function scrollWeeks(event:ReactWheelEvent<HTMLDivElement>){
    if(Math.abs(event.deltaX)<22||Math.abs(event.deltaX)<Math.abs(event.deltaY))return;
    const element=event.currentTarget,atEdge=event.deltaX<0?element.scrollLeft<2:element.scrollLeft+element.clientWidth>=element.scrollWidth-2;
    if(atEdge&&Date.now()-lastHorizontalMove.current>550){lastHorizontalMove.current=Date.now();navigatePeriod(event.deltaX>0?1:-1)}
  }

  function openEditEvent(event: WorkspaceCalendarEvent) {
    if (event.synthetic) return;
    setSelectedEvent(null);
    setShowCancel(false);
    setCancelReason('');
    setEventError('');
    setEditingEvent(event);
    setForm({ ...formFromEvent(event), staffVisible: !calendar?.hiddenFromStaff.has(event.id) });
    setEditorOpen(true);
  }

  function closeEditor() {
    setEventError('');
    setEditorOpen(false);
    setEditingEvent(null);
  }

  function setEventType(type: CalendarEventType) {
    setForm((current) => ({ ...current, type, color: calendarTypeMeta[type].color }));
  }

  function toggleType(type: CalendarEventType) {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault();
    if (saving || !form.title.trim() || !form.date) return;
    if (!staff && !form.allDay && form.startTime && form.endTime && form.endTime <= form.startTime) {
      setEventError('O horário de término precisa ser posterior ao horário de início.');
      return;
    }
    if (!staff && form.visibility === 'client' && !form.companyId) {
      setEventError('Para compartilhar um compromisso com o cliente, selecione primeiro qual cliente receberá esse evento. Se for um compromisso somente seu/CALI, altere a visibilidade para “Somente CALI”.');
      return;
    }
    setEventError('');
    setSaving(true);
    const company = companies.find((item) => item.id === form.companyId);
    const startsAt = form.allDay ? `${form.date}T09:00:00-03:00` : `${form.date}T${form.startTime || '09:00'}:00-03:00`;
    const endsAt = form.allDay ? `${form.date}T18:00:00-03:00` : `${form.date}T${form.endTime || form.startTime || '10:00'}:00-03:00`;
    const attendeeEmails = form.attendeeEmails.split(',').map((email) => email.trim()).filter(Boolean);
    const isRealCompany = !form.companyId || CALENDAR_UUID_PATTERN.test(form.companyId);
    const isRealEvent = editingEvent && CALENDAR_UUID_PATTERN.test(editingEvent.id);

    const eventPayload = {
      company_id: form.companyId || null,
      title: form.title.trim(),
      event_type: form.type,
      color_hex: form.color,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: form.allDay,
      mode: form.mode,
      location: form.location || null,
      meeting_url: form.meetingUrl || null,
      description: form.description || null,
      visibility: form.visibility,
      staff_visible: form.staffVisible,
      timezone: 'America/Sao_Paulo',
      source_type: 'manual',
      sync_status: calendarConnection === 'connected' ? 'pending' : 'local',
      ...(!staff && { reminder_minutes: form.reminderMinutes, auto_transcription: form.autoTranscription }),
    };

    try {
      if (staff) {
        if (!form.companyId) { setStaffNotice('Escolha a empresa do evento.'); return; }
        const when = `${form.date.split('-').reverse().join('/')}${form.allDay ? '' : ` às ${form.startTime}`}`;
        const { sync_status: _sync, ...row } = eventPayload;
        const ok = await staffSubmitChange(editingEvent ? 'event_update' : 'event_create', `${editingEvent ? 'Alterar evento' : 'Novo evento'}: ${form.title.trim()} · ${when}`, { id: editingEvent?.id || null, event: row, attendees: attendeeEmails }, form.companyId);
        if (ok) closeEditor();
        return;
      }
      if (isSupabaseConfigured && isRealCompany && (!editingEvent || isRealEvent)) {
        const result = await saveCalendar.mutateAsync({
          event: eventPayload,
          attendees: attendeeEmails,
          eventId: editingEvent?.id,
          classification: form.companyId && form.type === 'meeting' ? classification : undefined,
        });
        await syncEvent({ eventId: result.savedId });
        if (result.classificationPending) {
          setCalendarNotice({ tone: 'error', message: 'Evento salvo. A classificação contratual ficou pendente. Edite o evento para tentar novamente.' });
        }
        await loadCalendar();
      } else {
        const localEvent: WorkspaceCalendarEvent = {
          id: editingEvent?.id || `local-${Date.now()}`,
          protocol: editingEvent?.protocol || `CALI-EVT-${new Date().getFullYear()}-PREVIEW`,
          title: form.title.trim(),
          companyId: form.companyId || null,
          company: company?.name || null,
          companyLogo: company?.logoUrl,
          companyLogoFallback: company?.logoFallbackUrl,
          type: form.type,
          color: form.color,
          startsAt,
          endsAt,
          allDay: form.allDay,
          mode: form.mode,
          location: form.location || null,
          meetingUrl: form.meetingUrl || null,
          description: form.description || null,
          visibility: form.visibility,
          attendees: attendeeEmails.map((email) => ({ name: email.split('@')[0], email, status: 'pending' })),
          sourceType: 'manual',
          syncStatus: calendarConnection === 'connected' ? 'pending' : 'local',
          synthetic: false,
        };
        setEvents((current) => editingEvent
          ? (current ?? events).map((item) => item.id === editingEvent.id ? localEvent : item).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          : [...(current ?? events), localEvent].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      }
      closeEditor();
    } catch {
      setEventError('Não foi possível salvar o evento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent() {
    if (saving || !selectedEvent || selectedEvent.synthetic || !cancelReason.trim()) return;
    setEventError('');
    setSaving(true);
    try {
      if (staff) {
        if (!selectedEvent.companyId) return;
        const submitted = await staffSubmitChange('event_cancel', `Cancelar evento: ${selectedEvent.title}`, { id: selectedEvent.id, reason: cancelReason.trim() }, selectedEvent.companyId);
        if (!submitted) return;
      } else if (isSupabaseConfigured && CALENDAR_UUID_PATTERN.test(selectedEvent.id)) {
        await cancelCalendarEvent(selectedEvent.id, cancelReason);
        await syncEvent({ eventId: selectedEvent.id, action: 'cancel_event', silent: true });
        await loadCalendar();
      } else {
        setEvents((current) => (current ?? events).map((item) => item.id === selectedEvent.id ? { ...item, cancelledAt: new Date().toISOString() } : item));
      }
      setSelectedEvent(null);
      setCancelReason('');
      setShowCancel(false);
    } catch {
      setEventError('Não foi possível cancelar o evento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const cursorLabel = view === 'week'
    ? (() => {
        const start = startOfCalendarWeek(cursor);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.getDate()} ${months[start.getMonth()].slice(0, 3).toLowerCase()} — ${end.getDate()} ${months[end.getMonth()].slice(0, 3).toLowerCase()} ${end.getFullYear()}`;
      })()
    : `${months[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const cursorMonth = dateKey(cursor).slice(0, 7);
  const monthAgenda = visibleEvents
    .filter((event) => eventDateKey(event).slice(0, 7) === cursorMonth)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  if (loading) return <CalendarFrame staff={staff}><div className="ap-app v2-admin-page"><div className="ap-content"><EmptyState as="p" variant="admin" className="data-loading" aria-live="polite" aria-busy="true">Carregando agenda…</EmptyState></div></div></CalendarFrame>;

  return (
    <CalendarFrame staff={staff}>
      <SchedulingNotice notice={calendarNotice} />
      <div className={`ap-app v2-admin-page v2-admin-calendar${staff ? ' v2-staff-calendar' : ''}`}><div className="ap-content">
      {staffNotice && <InlineNotice tone="success" className="v2-toast" role="status"><Check size={18} /><span>{staffNotice}</span></InlineNotice>}
      <section className="tw:relative">
        <WorkspacePageHeader eyebrow={staff ? 'EQUIPE CALI / CALENDÁRIO' : 'BACKOFFICE / CALI RH'} title={staff ? 'Calendário' : 'Agenda da CALI'} description={staff ? 'Reuniões, validações e prazos das empresas que você atende.' : 'Reuniões, validações, prazos e a sua agenda Google em uma visão única.'} actionClassName="tw:my-3! tw:flex! tw:flex-wrap tw:items-center tw:gap-2 tw:[&_button]:whitespace-nowrap">
          {!staff && <AgendaChangeInbox onDecision={()=>void loadCalendar()}/>}
          {!staff && <ExtraVisitExpenses placement="calendar" />}
          {!staff && <Button variant="adminOutline" className="tw:inline-flex tw:min-h-[2.4375rem] tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-[0.625rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-3 tw:text-xs! tw:font-bold! tw:text-cali-text" type="button" onClick={()=>setHistoryOpenedAt(Date.now())}><FileText size={15}/> Histórico de reuniões</Button>}
          <Button variant="adminPrimary" onClick={() => openCreateForDate()}><Plus size={15} /> Novo evento</Button>
        </WorkspacePageHeader>
        {!staff && <CalendarGoogleConnection readStatus={googleReadStatus} connected={calendarConnection === 'connected'}
          onDisconnected={() => { void loadCalendar(); void reloadGoogleCalendar(); }} />}
        {!staff && <AdminSchedulingRequests />}

        <CalendarToolbar view={view} label={cursorLabel} onViewChange={setView}
          onNavigate={navigatePeriod} onToday={() => setCursor(new Date())} query={query} onQueryChange={setQuery}
          companyId={companyFilter} onCompanyChange={setCompanyFilter} companies={companies}
          types={activeTypes} onToggleType={toggleType} events={events}
          onReset={() => { setCompanyFilter('all'); setActiveTypes(new Set(Object.keys(calendarTypeMeta) as CalendarEventType[])); }}
        />

        <div className="tw:flex tw:flex-col tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-[#e9dbd0] tw:bg-white">
          <CalendarLegend types={activeTypes} showGoogle={!staff}
            eventCount={view === 'week' ? weekDates.reduce((sum, date) => sum + (eventsByDate.get(dateKey(date)) ?? []).length, 0) : monthAgenda.length} />
          <section className="tw:order-1 tw:m-0 tw:w-full tw:min-w-0 tw:overflow-hidden tw:border-0 tw:bg-white tw:p-0 tw:max-[56.25rem]:overflow-x-auto tw:workspace-night:bg-(--theme-surface-soft)">
            {view === 'month' && <>
              <div className={grid.monthHead}>{weekdays.map((day) => <span key={day} className={grid.monthWeekday}>{day}</span>)}</div>
              <div className={grid.monthGrid}>
                {monthDates.map((date) => {
                  const key = dateKey(date);
                  const dayEvents = eventsByDate.get(key) || [];
                  const inMonth = date.getMonth() === cursor.getMonth();
                  const isToday = isSameDate(date, today);
                  return (
                    <article key={key} className={`${grid.monthCell} ${!inMonth ? grid.monthOutside : ''} ${isToday ? grid.monthToday : ''}`} onDoubleClick={() => openCreateForDate(date)}>
                      <button className={`${grid.monthDayNumber} ${isToday ? grid.todayNumber : ''}`} onClick={() => { setCursor(date); if (dayEvents.length === 0) openCreateForDate(date); }}>{date.getDate()}</button>
                      <div className={grid.monthEvents}>
                        {dayEvents.slice(0, 3).map((event) => (
                          <button key={event.id} className={`${grid.monthChip} ${event.sourceType === 'google' ? grid.personalEventColors : 'tw:workspace-night:text-[#f3eeeb]!'} ${event.sourceType === 'request_preview' ? grid.previewEventColors : ''}`} style={eventStyle(event)} title={`${event.sourceType === 'request_preview' ? 'Prévia em análise' : event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${event.title}`} onClick={(click) => { click.stopPropagation(); setSelectedEvent(event); }}>
                            <span className={`${grid.monthChipDot} ${event.sourceType === 'google' ? 'tw:bg-white!' : ''}`} />
                            {!event.allDay && <time className={`${grid.monthChipTime} ${event.sourceType === 'google' || event.sourceType === 'request_preview' ? 'tw:text-inherit' : 'tw:text-cali-muted'}`}>{formatCalendarTime(event.startsAt)}</time>}
                            <strong className={grid.monthChipText}>{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · ${event.title}` : event.title}</strong>
                          </button>
                        ))}
                        {dayEvents.length > 3 && <button className={grid.monthMore} onClick={() => { setCursor(date); setView('agenda'); }}>+{dayEvents.length - 3} eventos</button>}
                      </div>
                      <button className={grid.monthAdd} onClick={() => openCreateForDate(date)} aria-label={`Adicionar evento em ${date.getDate()}`}><Plus size={13} /></button>
                    </article>
                  );
                })}
              </div>
            </>}

            {view === 'week' && <div className="tw:overflow-x-auto" onWheel={scrollWeeks}><div className="tw:grid tw:min-w-[62.5rem] tw:grid-cols-[3.625rem_repeat(7,minmax(7.8125rem,1fr))] tw:grid-rows-[3.875rem_auto_auto]">
              <div className={grid.weekCorner} />
              {weekDates.map((date) => <div key={dateKey(date)} className={grid.weekDayHead}><span className={grid.weekDayLabel}>{weekdays[date.getDay()]}</span><strong className={`${grid.weekDayNumber} ${isSameDate(date, today) ? grid.todayNumber : ''}`}>{date.getDate()}</strong></div>)}
              <div className={`${grid.weekAllDay} tw:flex tw:min-h-11! tw:items-center tw:justify-center tw:px-0.5 tw:text-center tw:text-[0.625rem]/[1.2] tw:font-bold tw:text-cali-muted`}>Dia inteiro</div>
              {weekDates.map(date => <div key={`all-${dateKey(date)}`} className={grid.weekAllDay}>
                {(eventsByDate.get(dateKey(date)) || []).filter(event => event.allDay).map(event => <button key={event.id} className={`${grid.weekAllDayEvent} ${event.sourceType === 'google' ? grid.personalEventColors : grid.weekWorkspaceEvent}`} style={eventStyle(event)} title={`${event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${event.title}`} onClick={() => setSelectedEvent(event)}>{event.title}</button>)}
              </div>)}
              <div className={grid.weekAxis} style={{ height: hours.length * HOUR_HEIGHT }}>
                {hours.map(hour => <span key={hour} className="tw:absolute tw:right-2 tw:translate-y-2 tw:text-[0.6875rem] tw:font-bold tw:text-cali-muted" style={{ top: (hour - WEEK_START_HOUR) * HOUR_HEIGHT }}>{String(hour).padStart(2, '0')}:00</span>)}
              </div>
              {weekDates.map(date => <div key={`lane-${dateKey(date)}`} className={`calendar-week-lane ${grid.weekLane}`} style={{ height: hours.length * HOUR_HEIGHT }}>
                {hours.map(hour => <div key={hour} className={`${grid.weekHour} tw:cursor-crosshair tw:touch-pan-y tw:hover:bg-(--theme-accent-soft) tw:workspace-night:hover:bg-[#281e22]`} style={{ top: (hour - WEEK_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }} onPointerDown={event=>startWeekSelection(date,hour,event)} onPointerMove={moveWeekSelection} onPointerUp={finishWeekSelection} onPointerCancel={()=>{selectionStart.current=null;setSelectionPreview(null)}} title="Selecione um horário para criar um evento" />)}
                {selectionPreview?.date===dateKey(date)&&<div className="tw:pointer-events-none tw:absolute tw:inset-x-[0.1875rem] tw:z-5 tw:grid tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-[#ad803d] tw:bg-[#f4d88bbd] tw:text-[0.6875rem] tw:font-bold tw:text-[#4a2430] tw:workspace-night:bg-[#755724d6] tw:workspace-night:text-[#fff3dc]" style={{top:selectionPreview.top,height:selectionPreview.height}}>Novo evento</div>}
                {weekEventLayout(eventsByDate.get(dateKey(date)) || []).map(({ event, top, height, column, columns }) =>
                  <button key={event.id} className={`${grid.weekEvent} ${event.sourceType === 'google' ? grid.personalEventColors : grid.weekWorkspaceEvent} ${event.sourceType === 'request_preview' ? grid.previewEventColors : ''} ${height < 36 ? grid.weekEventCompact : ''}`} style={{ ...eventStyle(event), top, height: Math.max(3,height - 2), left: 3 + Math.min(column*11,33), width: `calc(100% - ${7 + Math.min(column*11,33)}px)`, zIndex: columns+column }} title={`${event.sourceType === 'request_preview' ? 'Prévia em análise' : event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${formatCalendarTime(event.startsAt)}–${formatCalendarTime(event.endsAt)} · ${event.title}`} onClick={() => setSelectedEvent(event)}>
                    <strong className={grid.weekEventTitle}>{event.title}</strong><time className={grid.weekEventCopy}>{formatCalendarTime(event.startsAt)}{event.endsAt ? `–${formatCalendarTime(event.endsAt)}` : ''}</time><small className={grid.weekEventCopy}>{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · não confirmado` : event.sourceType === 'google' ? 'Google' : 'Workspace'}</small>
                  </button>
                )}
              </div>)}
            </div></div>}

            {view === 'agenda' && <div className="calendar-agenda-view tw:px-4 tw:py-2.5">
              {monthAgenda.map((event) => {
                const [, month, day] = eventDateKey(event).split('-');
                return <button key={event.id} className={`tw:grid tw:min-h-[5.125rem] tw:w-full tw:cursor-pointer tw:grid-cols-[3.25rem_0.25rem_minmax(0,1fr)_auto] tw:items-center tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-transparent tw:px-1 tw:py-2.5 tw:text-left tw:text-cali-text tw:last:border-b-0 tw:hover:bg-(--theme-accent-soft) ${event.sourceType === 'request_preview' ? 'tw:rounded-[0.625rem] tw:border! tw:border-dashed tw:border-[#ba8a51] tw:bg-[#fff8ea] tw:px-3 tw:workspace-night:border-[#c4a16a] tw:workspace-night:bg-[#3b3023] tw:workspace-night:text-[#fff2d8] tw:workspace-night:[&_*]:text-inherit' : ''}`} onClick={() => setSelectedEvent(event)}>
                  <div className="tw:grid tw:h-13 tw:w-12 tw:content-center tw:place-items-center tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface"><strong className="tw:text-base/none">{Number(day)}</strong><span className="tw:text-[0.5rem] tw:font-extrabold tw:text-cali-muted">{months[Number(month) - 1].slice(0, 3).toUpperCase()}</span></div>
                  <span className="tw:h-[2.625rem] tw:w-1 tw:rounded-full" style={{ background: event.color }} />
                  <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.1875rem]">
                    <span className="tw:text-[0.59375rem] tw:font-extrabold tw:tracking-widest tw:uppercase tw:text-cali-accent">{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · solicitação em análise` : calendarTypeMeta[event.type].label} · {formatCalendarTime(event.startsAt)}</span>
                    <strong className="tw:text-[0.8125rem]/[1.3]">{event.title}</strong>
                    <small className="tw:text-[0.6875rem]/[1.35] tw:text-cali-muted">{event.company || 'CALI'}{event.sourceType === 'request_preview' ? ' · ainda não confirmado' : event.visibility === 'client' ? ' · cliente vê' : ' · interno'}{eventProtocol(event) ? ` · ${eventProtocol(event)}` : ''}</small>
                  </div>
                  <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-[0.6875rem] tw:font-bold tw:whitespace-nowrap tw:text-cali-muted">{event.mode === 'in_person' ? <MapPin size={15} /> : <Video size={15} />}{event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' ? 'Remoto' : 'Prazo'}</span>
                </button>;
              })}
              {!monthAgenda.length && <div className="tw:px-4 tw:py-9 tw:text-center tw:text-[0.71875rem] tw:text-cali-muted">Nenhum evento neste mês com os filtros atuais.</div>}
            </div>}
          </section>


        </div>
      </section>

      <CalendarMeetingHistory openedAt={historyOpenedAt} companyId={companyFilter} events={events} outcomes={meetingOutcomes}
        onClose={() => setHistoryOpenedAt(null)}
        onOpenEvent={event => { setShowCancel(false); setSelectedEvent(event); setHistoryOpenedAt(null); }} />

      {editorOpen && <CalendarEventEditor editingEvent={editingEvent} form={form} setForm={setForm} companies={companies}
        staff={staff} calendarConnection={calendarConnection} classification={classification} setClassification={setClassification}
        setEventType={setEventType} eventError={eventError} saving={saving} closeEditor={closeEditor} saveEvent={saveEvent} />}

      {selectedEvent && selectedEvent.id.startsWith('notice:') && <NoticeCalendarCard noticeId={selectedEvent.id.slice(7)} href={`/admin/avisos?aviso=${selectedEvent.id.slice(7)}`} onClose={() => setSelectedEvent(null)} />}
      {selectedEvent && !selectedEvent.id.startsWith('notice:') && <CalendarEventDetails event={selectedEvent}
        staff={staff} outcome={meetingOutcomes[selectedEvent.id]?.outcome} cancelling={showCancel}
        cancelReason={cancelReason} onCancelReasonChange={setCancelReason} onStartCancel={() => setShowCancel(true)}
        onStopCancel={() => { setShowCancel(false); setEventError(''); }} onConfirmCancel={() => void cancelEvent()}
        onClose={() => { setSelectedEvent(null); setShowCancel(false); setCancelReason(''); setEventError(''); }}
        onEdit={() => openEditEvent(selectedEvent)} onDelete={() => setDeletingEventId(selectedEvent.id)}
        saving={saving} error={eventError} />}
      {deletingEventId && <CalendarDeleteEventDialog eventId={deletingEventId} onClose={() => setDeletingEventId(null)}
        onDeleted={() => { setSelectedEvent(null); invalidateGoogleEvent(deletingEventId); }} />}
      </div></div>
    </CalendarFrame>
  );
}
