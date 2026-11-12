import { DialogForm } from '../../components/ds/DialogForm';
import { Button } from '../../components/ds/Button';
import { DialogFrame } from '../../components/ds/DialogFrame';
import { EmptyState } from '../../components/ds/EmptyState';
import { FieldLabel } from '../../components/ds/FieldLabel';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { ExtraVisitExpenses } from '../../components/calendar/ExtraVisitExpenses';
import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cloud,
  Download,
  ExternalLink,
  Filter,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import { AgendaChangeInbox } from './components/AgendaChangeInbox';
import {
  calendarDateKey as formDate,
  calendarTypeMeta,
  dateKey,
  downloadCalendarIcs,
  eventDateKey,
  formatCalendarDate,
  formatCalendarTime,
  googleCalendarTemplate,
  monthCells,
  previewCalendarEvents,
  startOfCalendarWeek,
  weekCells,
  type CalendarEventType,
  type CalendarView,
  type WorkspaceCalendarEvent,
} from '../../domain/calendar';
import { isSupabaseConfigured } from '../../api/access/session';
import { cancelCalendarEvent, readAdminCalendar, readMeetingOutcomes, saveCalendarEvent, submitStaffCalendarChange } from '../../api/calendar/admin';
import { observeSchedulingRequests, readCalendarNotices } from '../../api/calendar/agenda';
import { authorizeGoogleCalendar, readGoogleCalendarEvents } from '../../api/calendar/connections';
import { NoticeCalendarCard } from '../notices/NoticesBoard';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import './google-meeting-options.css';

type CompanyOption = { id: string; name: string; logoUrl?: string | null };
type MeetingOutcome = { event_id: string; outcome: string; transcription_url?: string | null; transcription_attachment_name?: string | null };

type CreateEventForm = {
  title: string;
  companyId: string;
  type: CalendarEventType;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  visibility: 'internal' | 'client';
  staffVisible: boolean;
  mode: 'remote' | 'in_person';
  location: string;
  meetingUrl: string;
  description: string;
  attendeeEmails: string;
  reminderMinutes: number;
  autoTranscription: boolean;
};

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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  return { '--event-color': hex, '--event-soft': `${hex}18`, '--event-foreground': foreground } as React.CSSProperties;
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

function getCompanyMark(company?: string | null) {
  return (company || 'C').slice(0, 1).toUpperCase();
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
  const staffHiddenRef = useRef<Set<string>>(new Set());
  useEffect(() => { if (!staffNotice) return; const timer = window.setTimeout(() => setStaffNotice(''), 4200); return () => window.clearTimeout(timer); }, [staffNotice]);
  async function staffSubmitChange(action: string, title: string, payload: Record<string, unknown>, companyId: string) {
    const sent = await submitStaffCalendarChange(companyId, action, title, payload);
    setStaffNotice(sent ? 'Pedido enviado. Vale depois da aprovação.' : 'Não foi possível enviar o pedido. Tente de novo.');
    return sent;
  }
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<WorkspaceCalendarEvent[]>(previewCalendarEvents);
  const [googleEvents, setGoogleEvents] = useState<WorkspaceCalendarEvent[]>([]);
  // Avisos publicados com data aparecem na agenda como informação de dia inteiro (não bloqueiam horário).
  const [noticeEvents, setNoticeEvents] = useState<WorkspaceCalendarEvent[]>([]);
  useEffect(() => { let active = true; void (async () => {
    if (!isSupabaseConfigured) return;
    const result = await readCalendarNotices(true);
    if (!active || result.error) return;
    const tone: Record<string, string> = { feriado: '#C79A4B', atendimento: '#5E93BF', comunicado: '#8A6FB0' };
    setNoticeEvents((result.data || []).map((row: any): WorkspaceCalendarEvent => ({ id: `notice:${row.id}`, title: `Aviso · ${row.title}`, company: 'Quadro de Avisos', type: 'other', color: tone[row.category] || '#8A6FB0', textColor: '#ffffff', startsAt: `${row.notice_date}T12:00:00-03:00`, endsAt: `${row.notice_date}T12:00:00-03:00`, allDay: true, description: [row.time_label, row.coverage, row.body].filter(Boolean).join(' · '), visibility: 'client', attendees: [], sourceType: 'manual', sourceProtocol: row.protocol, synthetic: true } as WorkspaceCalendarEvent)));
  })(); return () => { active = false; }; }, []);
  const [googleReadStatus, setGoogleReadStatus] = useState<'loading'|'ready'|'reconnect'|'unavailable'>('loading');
  const [companies, setCompanies] = useState<CompanyOption[]>(fallbackCompanies);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const [view, setView] = useState<CalendarView>('week');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(() => new Set(Object.keys(calendarTypeMeta) as CalendarEventType[]));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [form, setForm] = useState<CreateEventForm>(() => defaultForm());
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [eventError, setEventError] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [calendarConnection, setCalendarConnection] = useState<'connected' | 'not_connected'>('not_connected');
  const [loading, setLoading] = useState(true);
  const [meetingOutcomes, setMeetingOutcomes] = useState<Record<string, MeetingOutcome>>({});
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyMode, setHistoryMode] = useState('all');
  const [historyOutcome, setHistoryOutcome] = useState('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const upcomingRef = useRef<HTMLDivElement>(null);
  const selectionStart = useRef<{date:Date;minutes:number;pointerId:number;startY:number}|null>(null);
  const lastHorizontalMove = useRef(0);
  const [selectionPreview, setSelectionPreview] = useState<{date:string;top:number;height:number}|null>(null);

  useEffect(() => { void loadCalendar(); }, []);
  useEffect(() => {
    if (!isSupabaseConfigured || staff) return;
    let active = true;
    const refresh = async () => {
      const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      // Query each month separately: the Google endpoint limits each request to 62 days.
      const ranges = [0,1,2].map(offset => {
        const first=new Date(start.getFullYear(),start.getMonth()+offset,1),last=new Date(start.getFullYear(),start.getMonth()+offset+1,1);
        const local=(day:Date)=>`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-01T00:00:00-03:00`;
        return {start:new Date(local(first)).toISOString(),end:new Date(local(last)).toISOString()};
      });
      const results = await Promise.all(ranges.map(range => readGoogleCalendarEvents('events', range)));
      if (!active) return;
      if (results.some(result=>result.error || result.data?.state!=='checked')) {
        setGoogleEvents([]);
        setGoogleReadStatus(results.some(result=>result.data?.state==='reconnect_required')?'reconnect':'unavailable');
        return;
      }
      const seen = new Set<string>();
      const external:WorkspaceCalendarEvent[] = results.flatMap(result=>(result.data.events||[]).flatMap((row:any)=>{
        const id=`google:${row.calendarId}:${row.id}`;
        if(seen.has(id)) return [];
        seen.add(id);
        const allDay=Boolean(row.allDay);
        return [{id,title:row.title,startsAt:allDay?`${row.start}T12:00:00-03:00`:row.start,endsAt:allDay?`${row.end}T12:00:00-03:00`:row.end,allDay,type:'other',color:/^#[0-9a-f]{6}$/i.test(row.color)?row.color:'#8D7354',textColor:row.textColor,location:row.location,description:row.description,organizer:row.organizer,reminderMinutes:row.reminderMinutes,meetingUrl:row.meetingUrl,attendees:(row.attendees||[]).map((guest:any)=>({name:String(guest.name||guest.email||'Convidado'),email:String(guest.email||''),status:guest.status==='accepted'?'accepted':guest.status==='declined'?'declined':guest.status==='tentative'?'tentative':'pending'})),googleEventId:row.id,googleHtmlLink:row.htmlLink,visibility:'internal',sourceType:'google',synthetic:true} as WorkspaceCalendarEvent];
      }));
      setGoogleEvents(external);setGoogleReadStatus('ready');
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),5*60*1000);
    return ()=>{active=false;window.clearInterval(timer)};
  },[cursor.getFullYear(),cursor.getMonth()]);
  useEffect(() => { const refresh = () => void loadCalendar(); window.addEventListener('cali-calendar-record-updated', refresh); return () => window.removeEventListener('cali-calendar-record-updated', refresh); }, []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return observeSchedulingRequests('admin-calendar-scheduling-preview', () => void loadCalendar());
  }, []);

  useEffect(() => {
    const active = editorOpen || Boolean(selectedEvent);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, selectedEvent]);

  async function loadCalendar() {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { companyRows, eventRows, attendeeRows, deadlineRows, connectionRows, requestRows, projectRows } = await readAdminCalendar(Boolean(staff));

      const options: CompanyOption[] = await Promise.all((companyRows || []).map(async (row: any) => ({
        id: row.id,
        name: row.display_name,
        logoUrl: await resolveWorkspaceMedia(row.logo_url || row.logo_workspace_url) || await resolveWorkspaceMedia(row.logo_workspace_url),
      })));
      if (options.length) setCompanies(options);
      const companyMap = new Map(options.map((company) => [company.id, company]));
      const projectMap = new Map((projectRows || []).map((project: any) => [project.id, project.name]));
      const attendeeMap = new Map<string, any[]>();
      (attendeeRows || []).forEach((row: any) => {
        const list = attendeeMap.get(row.event_id) || [];
        list.push(row);
        attendeeMap.set(row.event_id, list);
      });

      staffHiddenRef.current = new Set((eventRows || []).filter((row: any) => row.staff_visible === false).map((row: any) => row.id));
      const manual: WorkspaceCalendarEvent[] = (eventRows || []).map((row: any) => ({
        id: row.id,
        protocol: row.protocol,
        title: row.title,
        companyId: row.company_id,
        company: companyMap.get(row.company_id)?.name || null,
        companyLogo: companyMap.get(row.company_id)?.logoUrl,
        projectId: row.project_id,
        type: (row.event_type || 'other') as CalendarEventType,
        color: row.color_hex || calendarTypeMeta[(row.event_type || 'other') as CalendarEventType]?.color || calendarTypeMeta.other.color,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        allDay: Boolean(row.all_day),
        mode: row.mode,
        location: row.location,
        meetingUrl: row.meeting_url,
        description: row.description,
        visibility: row.visibility,
        attendees: (attendeeMap.get(row.id) || []).map((attendee: any) => ({
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
      const meetingIds = manual.filter(event => event.type === 'meeting' && UUID_PATTERN.test(event.id)).map(event => event.id);
      if (meetingIds.length) {
        const { data: outcomes, error: outcomeError } = await readMeetingOutcomes(meetingIds);
        if (outcomeError) throw outcomeError;
        setMeetingOutcomes(Object.fromEntries(((outcomes || []) as MeetingOutcome[]).map(row => [row.event_id, row])));
      } else setMeetingOutcomes({});

      const deadlines: WorkspaceCalendarEvent[] = (deadlineRows || [])
        .filter((row: any) => !['approved', 'cancelled'].includes(String(row.status)))
        .map((row: any) => ({
          id: `deadline-${row.id}`,
          title: `${row.title} · prazo`,
          companyId: row.company_id,
          company: companyMap.get(row.company_id)?.name || null,
          companyLogo: companyMap.get(row.company_id)?.logoUrl,
          projectId: row.project_id,
          project: projectMap.get(row.project_id),
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

      const previews: WorkspaceCalendarEvent[] = (requestRows || []).flatMap((row: any) => {
        const slots = row.requested_slots;
        return (Array.isArray(slots) ? slots : []).filter((slot: any) => slot?.startsAt).slice(0, 2).map((slot: any, index: number) => ({
          id: `request-preview-${row.id}-${index}`, title: row.title || (row.request_mode === 'in_person' ? 'Visita presencial' : 'Reunião online'),
          companyId: row.company_id, company: companyMap.get(row.company_id)?.name || null, companyLogo: companyMap.get(row.company_id)?.logoUrl,
          type: 'meeting' as const, color: '#A66A37', startsAt: slot.startsAt, endsAt: slot.endsAt || null, allDay: false,
          mode: row.request_mode, location: row.location, description: row.purpose,
          visibility: 'internal' as const, attendees: [], sourceType: 'request_preview' as const,
          sourceEntityId: row.id, previewStatus: row.status, previewOption: index + 1, synthetic: true,
        }));
      });
      setEvents([...manual, ...deadlines, ...previews].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      setCalendarConnection(connectionRows?.length ? 'connected' : 'not_connected');
    } catch (error) {
      console.error('Falha ao carregar calendário', error);
    } finally {
      setLoading(false);
    }
  }

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

  const upcoming = useMemo(() => visibleEvents
    .filter((event) => event.sourceType !== 'request_preview' && new Date(event.startsAt).getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5), [visibleEvents, today]);

  const meetingHistory = useMemo(() => events.filter(event => event.sourceType !== 'request_preview' && event.type === 'meeting' && (event.cancelledAt || new Date(event.startsAt).getTime() < Date.now()))
    .filter(event => companyFilter === 'all' || event.companyId === companyFilter)
    .filter(event => !historyMonth || formDate(event.startsAt).slice(0,7) === historyMonth)
    .filter(event => historyMode === 'all' || event.mode === historyMode)
    .filter(event => historyOutcome === 'all' || (historyOutcome === 'cancelled' ? Boolean(event.cancelledAt) : historyOutcome === 'pending' ? !event.cancelledAt && !meetingOutcomes[event.id]?.outcome : meetingOutcomes[event.id]?.outcome === historyOutcome))
    .sort((a,b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()), [events,companyFilter,historyMonth,historyMode,historyOutcome,meetingOutcomes]);

  const monthDates = useMemo(() => monthCells(cursor), [cursor]);
  const weekDates = useMemo(() => weekCells(cursor), [cursor]);
  const miniDates = useMemo(() => monthCells(cursor), [cursor]);

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
    setForm({ ...formFromEvent(event), staffVisible: !staffHiddenRef.current.has(event.id) });
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
    setEventError('');
    setSaving(true);
    const company = companies.find((item) => item.id === form.companyId);
    const startsAt = form.allDay ? `${form.date}T09:00:00-03:00` : `${form.date}T${form.startTime || '09:00'}:00-03:00`;
    const endsAt = form.allDay ? `${form.date}T18:00:00-03:00` : `${form.date}T${form.endTime || form.startTime || '10:00'}:00-03:00`;
    const attendeeEmails = form.attendeeEmails.split(',').map((email) => email.trim()).filter(Boolean);
    const isRealCompany = !form.companyId || UUID_PATTERN.test(form.companyId);
    const isRealEvent = editingEvent && UUID_PATTERN.test(editingEvent.id);

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
      if (isSupabaseConfigured && isRealCompany && isRealEvent && editingEvent) {
        await saveCalendarEvent(eventPayload, attendeeEmails, editingEvent.id);
        await loadCalendar();
      } else if (isSupabaseConfigured && isRealCompany && !editingEvent) {
        await saveCalendarEvent(eventPayload, attendeeEmails);
        await loadCalendar();
      } else {
        const localEvent: WorkspaceCalendarEvent = {
          id: editingEvent?.id || `local-${Date.now()}`,
          protocol: editingEvent?.protocol || `CALI-EVT-${new Date().getFullYear()}-PREVIEW`,
          title: form.title.trim(),
          companyId: form.companyId || null,
          company: company?.name || null,
          companyLogo: company?.logoUrl,
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
          ? current.map((item) => item.id === editingEvent.id ? localEvent : item).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          : [...current, localEvent].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
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
      } else if (isSupabaseConfigured && UUID_PATTERN.test(selectedEvent.id)) {
        await cancelCalendarEvent(selectedEvent.id, cancelReason);
        await loadCalendar();
      } else {
        setEvents((current) => current.map((item) => item.id === selectedEvent.id ? { ...item, cancelledAt: new Date().toISOString() } : item));
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
      <div className={`ap-app v2-admin-page v2-admin-calendar${staff ? ' v2-staff-calendar' : ''}`}><div className="ap-content">
      {staffNotice && <InlineNotice tone="success" className="v2-toast" role="status"><Check size={18} /><span>{staffNotice}</span></InlineNotice>}
      <section className="calendar-page-v2">
        <div className="ap-title"><div><small>{staff ? 'EQUIPE CALI / CALENDÁRIO' : 'BACKOFFICE / CALI RH'}</small><h1>{staff ? 'Calendário' : 'Agenda da CALI'}<span>.</span></h1><p>{staff ? 'Reuniões, validações e prazos das empresas que você atende.' : 'Reuniões, validações, prazos e a sua agenda Google em uma visão única.'}</p></div><div className="ap-title-actions calendar-v2-actions">
          {!staff && <AgendaChangeInbox onDecision={()=>void loadCalendar()}/>}
          {!staff && <ExtraVisitExpenses />}
          {!staff && <Button variant="adminOutline" className="calendar-history-trigger" type="button" onClick={()=>setHistoryOpen(true)}><FileText size={15}/> Histórico de reuniões</Button>}
          <Button variant="adminPrimary" onClick={() => openCreateForDate()}><Plus size={15} /> Novo evento</Button>
        </div></div>
        <section className="calendar-workspace-strip" hidden={Boolean(staff)}>
          <div className="calendar-workspace-icon"><Cloud size={21} /></div>
          <div>
            <strong>Google Workspace</strong>
            <p>{googleReadStatus==='ready' ? 'Suas agendas Google aparecem aqui. Atualização automática a cada 5 minutos.' : googleReadStatus==='reconnect' ? 'Reconecte sua conta Google para autorizar a leitura das suas agendas.' : googleReadStatus==='unavailable' ? 'Não consegui ler suas agendas Google agora. Seus eventos CALI continuam visíveis.' : calendarConnection === 'connected'
              ? 'Conferindo os compromissos da sua agenda Google…'
              : 'A agenda CALI já funciona. A conexão OAuth com o Google Workspace será ativada sem criar uma agenda paralela à sua.'}</p>
          </div>
          <span className={`calendar-connection-status ${calendarConnection === 'connected' ? 'connected' : ''}`}>
            {googleReadStatus==='ready'?<><Check size={14}/>Sincronizado</>:googleReadStatus==='reconnect'?'Autorizar leitura':calendarConnection === 'connected' ? <><Check size={14} />Conectado</> : 'Não conectado'}
          </span>
          {googleReadStatus==='reconnect' && <button type="button" className="google-calendar-runtime-button primary" onClick={async()=>{if(!isSupabaseConfigured)return;try{window.location.assign(await authorizeGoogleCalendar(null));}catch{/* a agenda local continua disponível */}}}>Autorizar leitura da agenda</button>}
        </section>

        <section className="calendar-main-toolbar">
          <div className="calendar-view-switch">
              {(['week', 'month', 'agenda'] as CalendarView[]).map((item) => (
                <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>
                  {item === 'month' ? 'Mês' : item === 'week' ? 'Semana' : 'Lista'}
                </button>
              ))}
            </div>
          <div className="calendar-navigation">
            <button className="calendar-icon-button" onClick={() => navigatePeriod(-1)} aria-label="Período anterior"><ChevronLeft size={16} /></button>
            <strong>{cursorLabel}</strong>
            <button className="calendar-icon-button" onClick={() => navigatePeriod(1)} aria-label="Próximo período"><ChevronRight size={16} /></button>
            <Button variant="secondary" className="calendar-today-button" onClick={() => setCursor(new Date())}>Hoje</Button>
          </div>
          <div className="calendar-toolbar-filters">
            <label className="calendar-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evento ou protocolo" /></label>
            <div className="calendar-filter-control">
              <button type="button" className={`calendar-filter-trigger ${filtersOpen || companyFilter !== 'all' || activeTypes.size !== Object.keys(calendarTypeMeta).length ? 'active' : ''}`} aria-expanded={filtersOpen} aria-controls="calendar-filter-popover" onClick={() => setFiltersOpen(value => !value)}><Filter size={18} /> Filtros{companyFilter !== 'all' || activeTypes.size !== Object.keys(calendarTypeMeta).length ? <span className="calendar-filter-indicator" /> : null}</button>
              {filtersOpen && <div id="calendar-filter-popover" className="calendar-filter-popover">
                <div className="calendar-filter-popover-head"><strong>Filtrar agenda</strong><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros"><X size={17}/></button></div>
                <label>Cliente<select value={companyFilter} onChange={event => setCompanyFilter(event.target.value)}><option value="all">Todos os clientes</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
                <strong className="calendar-filter-caption">Tipos de evento</strong>
                <div className="calendar-type-filter-list">{(Object.keys(calendarTypeMeta) as CalendarEventType[]).map(type => <button type="button" key={type} aria-pressed={activeTypes.has(type)} className={activeTypes.has(type) ? 'active' : ''} onClick={() => toggleType(type)}><span style={{ background: calendarTypeMeta[type].color }} /><strong>{calendarTypeMeta[type].label}</strong><small>{events.filter(event => event.type === type && !event.cancelledAt).length}</small></button>)}</div>
                <button type="button" className="calendar-filter-reset" onClick={() => { setCompanyFilter('all'); setActiveTypes(new Set(Object.keys(calendarTypeMeta) as CalendarEventType[])); }}>Limpar filtros</button>
              </div>}
            </div>
            
          </div>
        </section>

        <div className="calendar-page-layout">
          <div className="v2-admin-cal-foot"><div className="v2-admin-cal-legend">{(Object.keys(calendarTypeMeta) as CalendarEventType[]).filter(type=>activeTypes.has(type)).map(type=><span key={type}><i style={{background:calendarTypeMeta[type].color}}/>{calendarTypeMeta[type].label}</span>)}<span hidden={Boolean(staff)}><i className="google"/>Google Agenda</span></div><span className="v2-admin-cal-total"><b>{view==='week'?weekDates.reduce((sum,date)=>sum+(eventsByDate.get(dateKey(date))||[]).length,0):monthAgenda.length}</b> compromissos no período</span></div>
          <section className="calendar-primary-panel panel">
            {view === 'month' && <>
              <div className="calendar-weekday-head">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-month-grid">
                {monthDates.map((date) => {
                  const key = dateKey(date);
                  const dayEvents = eventsByDate.get(key) || [];
                  const inMonth = date.getMonth() === cursor.getMonth();
                  const isToday = isSameDate(date, today);
                  return (
                    <article key={key} className={`calendar-month-cell ${!inMonth ? 'outside' : ''} ${isToday ? 'today' : ''}`} onDoubleClick={() => openCreateForDate(date)}>
                      <button className="calendar-day-number" onClick={() => { setCursor(date); if (dayEvents.length === 0) openCreateForDate(date); }}>{date.getDate()}</button>
                      <div className="calendar-cell-events">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button key={event.id} className={`calendar-event-chip type-${event.type} ${event.sourceType === 'google' ? 'is-google' : 'is-workspace'} ${event.sourceType === 'request_preview' ? 'is-preview' : ''}`} style={eventStyle(event)} title={`${event.sourceType === 'request_preview' ? 'Prévia em análise' : event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${event.title}`} onClick={(click) => { click.stopPropagation(); setSelectedEvent(event); }}>
                            <span className="calendar-event-dot" />
                            {!event.allDay && <time>{formatCalendarTime(event.startsAt)}</time>}
                            <strong>{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · ${event.title}` : event.title}</strong>
                          </button>
                        ))}
                        {dayEvents.length > 3 && <button className="calendar-more-events" onClick={() => { setCursor(date); setView('agenda'); }}>+{dayEvents.length - 3} eventos</button>}
                      </div>
                      <button className="calendar-cell-add" onClick={() => openCreateForDate(date)} aria-label={`Adicionar evento em ${date.getDate()}`}><Plus size={13} /></button>
                    </article>
                  );
                })}
              </div>
            </>}

            {view === 'week' && <div className="calendar-week-scroller" onWheel={scrollWeeks}><div className="calendar-week-view">
              <div className="calendar-week-corner" />
              {weekDates.map((date) => <div key={dateKey(date)} className={`calendar-week-day-head ${isSameDate(date, today) ? 'today' : ''}`}><span>{weekdays[date.getDay()]}</span><strong>{date.getDate()}</strong></div>)}
              <div className="calendar-week-all-day-label">Dia inteiro</div>
              {weekDates.map(date => <div key={`all-${dateKey(date)}`} className="calendar-week-all-day">
                {(eventsByDate.get(dateKey(date)) || []).filter(event => event.allDay).map(event => <button key={event.id} className={`calendar-week-all-day-event ${event.sourceType === 'google' ? 'is-google' : 'is-workspace'}`} style={eventStyle(event)} title={`${event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${event.title}`} onClick={() => setSelectedEvent(event)}>{event.title}</button>)}
              </div>)}
              <div className="calendar-week-axis" style={{ height: hours.length * HOUR_HEIGHT }}>
                {hours.map(hour => <span key={hour} style={{ top: (hour - WEEK_START_HOUR) * HOUR_HEIGHT }}>{String(hour).padStart(2, '0')}:00</span>)}
              </div>
              {weekDates.map(date => <div key={`lane-${dateKey(date)}`} className="calendar-week-lane" style={{ height: hours.length * HOUR_HEIGHT }}>
                {hours.map(hour => <div key={hour} className="calendar-week-hour-hit is-selectable" style={{ top: (hour - WEEK_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }} onPointerDown={event=>startWeekSelection(date,hour,event)} onPointerMove={moveWeekSelection} onPointerUp={finishWeekSelection} onPointerCancel={()=>{selectionStart.current=null;setSelectionPreview(null)}} title="Selecione um horário para criar um evento" />)}
                {selectionPreview?.date===dateKey(date)&&<div className="calendar-week-selection" style={{top:selectionPreview.top,height:selectionPreview.height}}>Novo evento</div>}
                {weekEventLayout(eventsByDate.get(dateKey(date)) || []).map(({ event, top, height, column, columns }) =>
                  <button key={event.id} className={`calendar-week-event ${event.sourceType === 'google' ? 'is-google' : 'is-workspace'} ${event.sourceType === 'request_preview' ? 'is-preview' : ''} ${height < 36 ? 'is-compact' : ''}`} style={{ ...eventStyle(event), top, height: Math.max(3,height - 2), left: 3 + Math.min(column*11,33), width: `calc(100% - ${7 + Math.min(column*11,33)}px)`, zIndex: columns+column }} title={`${event.sourceType === 'request_preview' ? 'Prévia em análise' : event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${formatCalendarTime(event.startsAt)}–${formatCalendarTime(event.endsAt)} · ${event.title}`} onClick={() => setSelectedEvent(event)}>
                    <strong>{event.title}</strong><time>{formatCalendarTime(event.startsAt)}{event.endsAt ? `–${formatCalendarTime(event.endsAt)}` : ''}</time><small>{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · não confirmado` : event.sourceType === 'google' ? 'Google' : 'Workspace'}</small>
                  </button>
                )}
              </div>)}
            </div></div>}

            {view === 'agenda' && <div className="calendar-agenda-view">
              {monthAgenda.map((event) => {
                const [, month, day] = eventDateKey(event).split('-');
                return <button key={event.id} className={`calendar-agenda-row ${event.sourceType === 'request_preview' ? 'is-preview' : ''}`} onClick={() => setSelectedEvent(event)}>
                  <div className="calendar-agenda-date"><strong>{Number(day)}</strong><span>{months[Number(month) - 1].slice(0, 3).toUpperCase()}</span></div>
                  <span className="calendar-event-bar" style={{ background: event.color }} />
                  <div className="calendar-agenda-copy">
                    <span>{event.sourceType === 'request_preview' ? `Prévia ${event.previewOption} · solicitação em análise` : calendarTypeMeta[event.type].label} · {formatCalendarTime(event.startsAt)}</span>
                    <strong>{event.title}</strong>
                    <small>{event.company || 'CALI'}{event.sourceType === 'request_preview' ? ' · ainda não confirmado' : event.visibility === 'client' ? ' · cliente vê' : ' · interno'}{eventProtocol(event) ? ` · ${eventProtocol(event)}` : ''}</small>
                  </div>
                  <span className="calendar-agenda-mode">{event.mode === 'in_person' ? <MapPin size={15} /> : <Video size={15} />}{event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' ? 'Remoto' : 'Prazo'}</span>
                </button>;
              })}
              {!monthAgenda.length && <div className="calendar-empty">Nenhum evento neste mês com os filtros atuais.</div>}
            </div>}
          </section>


        </div>
      </section>

      {historyOpen && <div className="modal-backdrop full-screen-modal calendar-modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)setHistoryOpen(false)}}><DialogFrame className="calendar-history-dialog" as="div" aria-label="Histórico de reuniões"><button type="button" className="calendar-history-close" onClick={()=>setHistoryOpen(false)} aria-label="Fechar histórico"><X size={20}/></button>
        <section className="calendar-meeting-history" aria-label="Histórico de reuniões"><div className="calendar-meeting-history-heading"><span><span className="section-kicker">AGENDA REALIZADA</span><strong>Histórico de reuniões</strong></span><span>Ver encontros e transcrições</span></div><div className="calendar-meeting-history-filters"><label>Período<input type="month" value={historyMonth} onChange={event=>setHistoryMonth(event.target.value)}/></label><label>Formato<select value={historyMode} onChange={event=>setHistoryMode(event.target.value)}><option value="all">Todos</option><option value="remote">Online</option><option value="in_person">Presencial</option></select></label><label>Situação<select value={historyOutcome} onChange={event=>setHistoryOutcome(event.target.value)}><option value="all">Todas</option><option value="occurred">Realizada</option><option value="not_occurred">Não realizada</option><option value="cancelled">Cancelada</option><option value="pending">Sem registro</option></select></label></div><div className="calendar-meeting-history-list">{meetingHistory.length ? meetingHistory.slice(0,30).map(event=><button type="button" key={event.id} onClick={()=>{setShowCancel(false);setSelectedEvent(event);setHistoryOpen(false)}}><span><strong>{event.title}</strong><small>{event.company || 'CALI'} · {formatCalendarDate(event.startsAt)} · {event.mode==='in_person'?'Presencial':'Online'}</small></span><b className={event.cancelledAt||meetingOutcomes[event.id]?.outcome==='not_occurred'?'negative':meetingOutcomes[event.id]?.outcome==='occurred'?'positive':'pending'}>{event.cancelledAt?'Cancelada':meetingOutcomes[event.id]?.outcome==='occurred'?'Realizada':meetingOutcomes[event.id]?.outcome==='not_occurred'?'Não realizada':'Sem registro'}</b>{meetingOutcomes[event.id]?.transcription_url && <FileText size={16} aria-label="Transcrição disponível"/>}</button>) : <p>Nenhuma reunião encontrada com esses filtros.</p>}</div></section>
</DialogFrame></div>}

      {editorOpen && <div className="modal-backdrop full-screen-modal calendar-modal-backdrop">
        <DialogForm aria-label={editingEvent ? 'Atualizar compromisso' : 'Adicionar ao calendário'} className="modal-card calendar-event-modal" onSubmit={saveEvent}>
          <Button type="button" variant="close" onClick={closeEditor} aria-label="Fechar"><X size={20} /></Button>
          <div className="calendar-modal-heading">
            <span className="section-kicker">{editingEvent ? 'EDITAR / REMARCAR' : 'NOVO EVENTO'}</span>
            <h2>{editingEvent ? 'Atualizar compromisso' : 'Adicionar ao calendário'}</h2>
            {editingEvent?.protocol && <span className="calendar-modal-protocol">Protocolo {editingEvent.protocol}</span>}
          </div>
          <div className="calendar-modal-body">
            {eventError && <InlineNotice tone="danger">{eventError}</InlineNotice>}
            <FieldLabel className="calendar-title-field">Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: reunião mensal de indicadores" /></FieldLabel>
            <div className="calendar-event-form-grid">
              <FieldLabel>Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Somente CALI</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></FieldLabel>
              <FieldLabel>Tipo<select value={form.type} onChange={(event) => setEventType(event.target.value as CalendarEventType)}>{(Object.keys(calendarTypeMeta) as CalendarEventType[]).map((type) => <option key={type} value={type}>{calendarTypeMeta[type].label}</option>)}</select></FieldLabel>
              <FieldLabel>Data<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></FieldLabel>
              <FieldLabel>Cor<input className="calendar-color-input" type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></FieldLabel>
            </div>
            <label className="calendar-all-day"><input type="checkbox" checked={form.allDay} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} /><span>Evento de dia inteiro</span></label>
            {!form.allDay && <div className="calendar-event-form-grid">
              <FieldLabel>Início<input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></FieldLabel>
              <FieldLabel>Término<input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></FieldLabel>
              <FieldLabel>Formato<select value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as 'remote' | 'in_person' }))}><option value="remote">Remoto</option><option value="in_person">Presencial</option></select></FieldLabel>
              <FieldLabel>Visibilidade<select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as 'internal' | 'client' }))}><option value="client">Compartilhar com cliente</option><option value="internal">Somente CALI</option></select></FieldLabel>
              {!staff && <FieldLabel>Equipe CALI<select value={form.staffVisible ? 'yes' : 'no'} onChange={(event) => setForm((current) => ({ ...current, staffVisible: event.target.value === 'yes' }))}><option value="yes">Pode ver este evento</option><option value="no">Não mostrar para a equipe</option></select></FieldLabel>}
            </div>}
            <details className="calendar-extra-fields" key={editingEvent?.id||'new'} open={editingEvent?true:undefined}>
              <summary>Local, link, convidados e descrição</summary>
              <div className="calendar-extra-fields-content"><div className="calendar-event-form-grid">
              <FieldLabel>Local / sala<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={form.mode === 'remote' ? 'Google Meet' : 'Endereço ou sala'} /></FieldLabel>
              <FieldLabel>Link da reunião<input value={form.meetingUrl} onChange={(event) => setForm((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="https://meet.google.com/..." /></FieldLabel>
            </div>
            {form.mode === 'remote' && calendarConnection !== 'connected' && <div className="calendar-meet-helper">Você pode informar um Meet existente agora. Quando o Google Workspace estiver conectado por OAuth, a criação/sincronização de Meet poderá acontecer pela própria agenda.</div>}
            <FieldLabel>Convidados por e-mail<input value={form.attendeeEmails} onChange={(event) => setForm((current) => ({ ...current, attendeeEmails: event.target.value }))} placeholder="decisor@empresa.com.br, outra@empresa.com.br" /><small>Separe mais de um e-mail por vírgula.</small></FieldLabel>
            <FieldLabel>Descrição<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Contexto, objetivo ou preparação necessária" /></FieldLabel>
              </div>
            </details>
            {!staff && isSupabaseConfigured && <div className="google-calendar-runtime-form-settings">
              <label className="stacked-label">Lembrete
                <select value={form.reminderMinutes} onChange={(event) => setForm((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}>
                  <option value={0}>Sem lembrete</option><option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option><option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option><option value={1440}>1 dia antes</option>
                  {![0, 10, 15, 30, 60, 1440].includes(form.reminderMinutes) && <option value={form.reminderMinutes}>{form.reminderMinutes} minutos antes</option>}
                </select>
              </label>
              <label className="google-calendar-runtime-transcription">
                <input type="checkbox" checked={form.autoTranscription}
                  onChange={(event) => setForm((current) => ({ ...current, autoTranscription: event.target.checked }))} />
                <span><strong>Transcrição automática no Google Meet</strong><br />
                  <small>Quando o evento remoto tiver Meet, o Google inicia a transcrição se a conta permitir.</small></span>
              </label>
            </div>}
          </div>
          <div className="calendar-modal-footer"><Button type="button" variant="secondary" onClick={closeEditor}>Cancelar</Button><Button variant="primary" disabled={saving || !form.title.trim()} type="submit">{saving ? 'Salvando…' : staff ? 'Enviar para aprovação da Patricia' : editingEvent ? 'Salvar alterações' : 'Adicionar evento'}</Button></div>
        </DialogForm>
      </div>}

      {selectedEvent && selectedEvent.id.startsWith('notice:') && <NoticeCalendarCard noticeId={selectedEvent.id.slice(7)} href={`/admin/avisos?aviso=${selectedEvent.id.slice(7)}`} onClose={() => setSelectedEvent(null)} />}
      {selectedEvent && !selectedEvent.id.startsWith('notice:') && <div className="modal-backdrop full-screen-modal calendar-modal-backdrop">
        <DialogFrame aria-label={selectedEvent.title} className={`modal-card calendar-detail-modal calendar-detail-refined ${selectedEvent.cancelledAt || meetingOutcomes[selectedEvent.id]?.outcome==='not_occurred' || selectedEvent.attendees.some(attendee=>attendee.status==='declined')?'is-negative':meetingOutcomes[selectedEvent.id]?.outcome==='occurred' || selectedEvent.attendees.some(attendee=>attendee.status==='accepted')?'is-positive':'is-pending'}`}>
          <Button variant="close" onClick={() => { setSelectedEvent(null); setShowCancel(false); setCancelReason(''); setEventError(''); }} aria-label="Fechar"><X size={20} /></Button>
          <div className="calendar-detail-accent" style={{ background: selectedEvent.color }} />
          <div className="calendar-detail-heading">
            <div className="calendar-detail-company-mark">{selectedEvent.sourceType === 'google' ? <CalendarDays size={22} aria-hidden="true" /> : selectedEvent.companyLogo ? <img src={selectedEvent.companyLogo} alt="" /> : getCompanyMark(selectedEvent.company)}</div>
            <div>
              <span className="section-kicker">{selectedEvent.sourceType==='request_preview'?'SOLICITAÇÃO EXTRA':selectedEvent.sourceType==='google'?'AGENDA GOOGLE':calendarTypeMeta[selectedEvent.type].label} · {selectedEvent.sourceType==='request_preview'?'Prévia em análise':selectedEvent.sourceType==='google'?'Compromisso pessoal':selectedEvent.cancelledAt?'Cancelado':meetingOutcomes[selectedEvent.id]?.outcome==='occurred'?'Realizado':meetingOutcomes[selectedEvent.id]?.outcome==='not_occurred'?'Não realizado':selectedEvent.attendees.some(attendee=>attendee.status==='declined')?'Recusado':selectedEvent.attendees.some(attendee=>attendee.status==='accepted')?'Confirmado':'Aguardando confirmação'}</span>
              <h2>{selectedEvent.title}</h2>
              <p>{selectedEvent.company || 'CALI'} · {selectedEvent.visibility === 'client' ? 'visível para o cliente' : 'interno'}</p>
              {eventProtocol(selectedEvent) && <span className="calendar-protocol-badge">{selectedEvent.synthetic ? 'Protocolo de origem' : 'Protocolo'} · {eventProtocol(selectedEvent)}</span>}
            </div>
          </div>
          {selectedEvent.sourceType==='google' && <div className="calendar-google-actions"><button type="button" title="Editar no Google Agenda" aria-label="Editar no Google Agenda" onClick={()=>window.open(selectedEvent.googleHtmlLink||googleCalendarTemplate(selectedEvent),'_blank','noopener,noreferrer')}><Pencil size={15}/> Editar no Google</button><button type="button" title="Compartilhar por e-mail" aria-label="Compartilhar por e-mail" onClick={()=>window.location.assign(`mailto:?subject=${encodeURIComponent(selectedEvent.title)}&body=${encodeURIComponent(`${selectedEvent.title}\n${formatCalendarDate(selectedEvent.startsAt)} · ${formatCalendarTime(selectedEvent.startsAt)}${selectedEvent.endsAt?`–${formatCalendarTime(selectedEvent.endsAt)}`:''}\n${selectedEvent.googleHtmlLink||''}`)}`)}><Mail size={15}/> Enviar por e-mail</button><button type="button" title="Abrir mais opções no Google Agenda" aria-label="Abrir mais opções no Google Agenda" onClick={()=>window.open(selectedEvent.googleHtmlLink||googleCalendarTemplate(selectedEvent),'_blank','noopener,noreferrer')}><ExternalLink size={15}/> Abrir no Google Agenda</button></div>}
          <div className="calendar-detail-body">
            {selectedEvent.sourceType==='request_preview' ? <div className="calendar-preview-detail"><strong>Opção {selectedEvent.previewOption} · {formatCalendarDate(selectedEvent.startsAt)} · {formatCalendarTime(selectedEvent.startsAt)}–{formatCalendarTime(selectedEvent.endsAt)}</strong><p>Prévia de horário solicitado. Ainda não foi confirmada, não reserva a agenda e não entra na contagem dos compromissos.</p>{selectedEvent.company && <p>Cliente: {selectedEvent.company}</p>}{selectedEvent.description && <p>Objetivo: {selectedEvent.description}</p>}</div> : selectedEvent.sourceType==='google' ? <div className="calendar-google-detail">
              <div><Clock3 size={18}/><span><strong>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(selectedEvent.startsAt))}</strong><small>{selectedEvent.allDay?'Dia inteiro':`${formatCalendarTime(selectedEvent.startsAt)} – ${formatCalendarTime(selectedEvent.endsAt)}`}</small></span></div>
              {selectedEvent.meetingUrl && <div><Video size={18}/><span><strong>Google Meet</strong><a href={selectedEvent.meetingUrl} target="_blank" rel="noopener noreferrer">Entrar na reunião <ExternalLink size={13}/></a></span></div>}
              {selectedEvent.description && <div><FileText size={18}/><span><strong>Anotações</strong><small>{selectedEvent.description}</small></span></div>}
              {selectedEvent.location && <div><MapPin size={18}/><span><strong>Local</strong><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`} target="_blank" rel="noopener noreferrer">{selectedEvent.location} <ExternalLink size={13}/></a></span></div>}
              {selectedEvent.attendees.length > 0 && <div><Users size={18}/><span><strong>Convidados</strong><small>{selectedEvent.attendees.map(guest=>`${guest.name}${guest.status==='accepted'?' · aceitou':guest.status==='declined'?' · recusou':guest.status==='tentative'?' · talvez':' · aguardando'}`).join(' · ')}</small></span></div>}
              <div><CalendarDays size={18}/><span><strong>Agenda Google</strong><small>{selectedEvent.organizer || 'Patrícia Lima'}</small></span></div>
              {!UUID_PATTERN.test(selectedEvent.id) && selectedEvent.reminderMinutes != null && <div><Clock3 size={18}/><span><strong>Lembrete</strong><small>{selectedEvent.reminderMinutes} minutos antes</small></span></div>}
            </div> : <>
            <div className="calendar-detail-facts">
              <article><Clock3 size={17} /><span>Quando</span><strong>{formatCalendarDate(selectedEvent.startsAt)} · {selectedEvent.allDay ? 'Dia inteiro' : formatCalendarTime(selectedEvent.startsAt)}</strong></article>
              <article>{selectedEvent.mode === 'in_person' ? <MapPin size={17} /> : <Video size={17} />}<span>Formato</span><strong>{selectedEvent.mode === 'in_person' ? 'Presencial' : selectedEvent.mode === 'remote' ? 'Remoto' : 'Prazo automático'}</strong></article>
              <article><Users size={17} /><span>Convidados</span><strong>{selectedEvent.attendees.length ? `${selectedEvent.attendees.length} convidado(s)` : selectedEvent.visibility === 'client' ? 'Cliente relacionado' : 'Somente CALI'}</strong></article>
            </div>
            {selectedEvent.description && <section className="calendar-detail-description"><strong>Contexto</strong><p>{selectedEvent.description}</p></section>}
            {selectedEvent.synthetic && <div className="calendar-auto-source"><CalendarDays size={18} /><div><strong>Prazo do entregável</strong><p>{selectedEvent.company ? `${selectedEvent.company} · ` : ''}{selectedEvent.project ? `${selectedEvent.project} · ` : ''}{selectedEvent.title.replace(/ · prazo$/,'')}. A data vem do entregável de origem.</p></div></div>}
            {!!selectedEvent.attendees.length && <section className="calendar-attendee-list"><strong>Convidados</strong>{selectedEvent.attendees.map((attendee, index) => <div key={`${attendee.email}-${index}`}><span className={`attendee-status ${attendee.status}`} /><span>{attendee.name}</span><small>{attendee.email}</small><b>{attendee.status === 'accepted' ? 'Aceito' : attendee.status === 'declined' ? 'Recusado' : attendee.status === 'tentative' ? 'Talvez' : 'Pendente'}</b></div>)}</section>}
            {showCancel && !selectedEvent.synthetic && <section className="calendar-cancel-box"><strong>Cancelar compromisso</strong><p>O motivo fica registrado. Quando a régua de notificações estiver ativada, ele também poderá compor a comunicação aos participantes.</p><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} placeholder="Motivo do cancelamento" />{eventError && <InlineNotice tone="danger">{eventError}</InlineNotice>}<div><Button variant="secondary" disabled={saving} onClick={() => { setShowCancel(false); setEventError(''); }}>Voltar</Button><Button variant="primary" className="danger-action" disabled={saving || !cancelReason.trim()} onClick={() => void cancelEvent()}>Confirmar cancelamento</Button></div></section>}
            </>}
          </div>
          {selectedEvent.sourceType !== 'request_preview' && <div className="calendar-detail-footer calendar-detail-actions"><div className="calendar-detail-primary-actions">{!selectedEvent.synthetic && !selectedEvent.cancelledAt && <Button variant="secondary" className="edit-event-action" onClick={() => openEditEvent(selectedEvent)}><Pencil size={16} />Editar ou remarcar</Button>}{selectedEvent.meetingUrl && !selectedEvent.cancelledAt && <Button variant="primary" onClick={() => window.open(selectedEvent.meetingUrl!, '_blank', 'noopener,noreferrer')}><Video size={16} />Abrir Meet</Button>}</div><div className="calendar-detail-secondary-actions">{selectedEvent.sourceType!=='google'&&<Button variant="secondary" onClick={() => window.open(googleCalendarTemplate(selectedEvent), '_blank', 'noopener,noreferrer')}><ExternalLink size={16} />Google Agenda</Button>}<Button variant="secondary" onClick={() => downloadCalendarIcs(selectedEvent)}><Download size={16} />ICS</Button>{!selectedEvent.synthetic && !selectedEvent.cancelledAt && !showCancel && <Button variant="secondary" className="danger-soft" onClick={() => setShowCancel(true)}>Cancelar</Button>}</div></div>}
        </DialogFrame>
      </div>}
      </div></div>
    </CalendarFrame>
  );
}
