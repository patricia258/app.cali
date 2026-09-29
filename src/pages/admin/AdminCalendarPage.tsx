import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { AgendaChangeInbox } from '../../components/AgendaChangeInbox';
import {
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
import { supabase } from '../../lib/supabase';

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
  mode: 'remote' | 'in_person';
  location: string;
  meetingUrl: string;
  description: string;
  attendeeEmails: string;
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
    mode: 'remote',
    location: 'Google Meet',
    meetingUrl: '',
    description: '',
    attendeeEmails: '',
  };
}

function eventStyle(event: WorkspaceCalendarEvent) {
  const hex = /^#[0-9a-f]{6}$/i.test(event.color) ? event.color : '#8D7354';
  const [red, green, blue] = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16));
  const foreground = /^#[0-9a-f]{6}$/i.test(event.textColor || '') ? event.textColor : (red * .299 + green * .587 + blue * .114 > 160 ? '#30232a' : '#ffffff');
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

function formDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function formTime(value: string | null | undefined) {
  if (!value) return '09:00';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date(value));
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
    mode: event.mode || 'remote',
    location: event.location || '',
    meetingUrl: event.meetingUrl || '',
    description: event.description || '',
    attendeeEmails: event.attendees.map((attendee) => attendee.email).join(', '),
  };
}

function eventProtocol(event: WorkspaceCalendarEvent) {
  return event.protocol || event.sourceProtocol || null;
}

export function AdminCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<WorkspaceCalendarEvent[]>(previewCalendarEvents);
  const [googleEvents, setGoogleEvents] = useState<WorkspaceCalendarEvent[]>([]);
  const [googleReadStatus, setGoogleReadStatus] = useState<'loading'|'ready'|'reconnect'|'unavailable'>('loading');
  const [companies, setCompanies] = useState<CompanyOption[]>(fallbackCompanies);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const [view, setView] = useState<CalendarView>('week');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(() => new Set(Object.keys(calendarTypeMeta) as CalendarEventType[]));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [form, setForm] = useState<CreateEventForm>(() => defaultForm());
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceCalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [calendarConnection, setCalendarConnection] = useState<'connected' | 'not_connected'>('not_connected');
  const [loading, setLoading] = useState(true);
  const [meetingOutcomes, setMeetingOutcomes] = useState<Record<string, MeetingOutcome>>({});
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyMode, setHistoryMode] = useState('all');
  const [historyOutcome, setHistoryOutcome] = useState('all');

  useEffect(() => { void loadCalendar(); }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const refresh = async () => {
      const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      // Query each month separately: the Google endpoint limits each request to 62 days.
      const ranges = [0,1,2].map(offset => {
        const first=new Date(start.getFullYear(),start.getMonth()+offset,1),last=new Date(start.getFullYear(),start.getMonth()+offset+1,1);
        const local=(day:Date)=>`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-01T00:00:00-03:00`;
        return {start:new Date(local(first)).toISOString(),end:new Date(local(last)).toISOString()};
      });
      const results = await Promise.all(ranges.map(range => supabase!.functions.invoke('workspace-google-calendar-read',{body:{action:'events',...range}})));
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
        return [{id,title:row.title,startsAt:allDay?`${row.start}T12:00:00-03:00`:row.start,endsAt:allDay?`${row.end}T12:00:00-03:00`:row.end,allDay,type:'other',color:/^#[0-9a-f]{6}$/i.test(row.color)?row.color:'#8D7354',textColor:row.textColor,location:row.location,description:row.description,googleEventId:row.id,googleHtmlLink:row.htmlLink,visibility:'internal',attendees:[],sourceType:'google',synthetic:true} as WorkspaceCalendarEvent];
      }));
      setGoogleEvents(external);setGoogleReadStatus('ready');
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),5*60*1000);
    return ()=>{active=false;window.clearInterval(timer)};
  },[cursor.getFullYear(),cursor.getMonth()]);
  useEffect(() => { const refresh = () => void loadCalendar(); window.addEventListener('cali-calendar-record-updated', refresh); return () => window.removeEventListener('cali-calendar-record-updated', refresh); }, []);

  useEffect(() => {
    const active = editorOpen || Boolean(selectedEvent);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, selectedEvent]);

  async function loadCalendar() {
    if (!supabase) { setLoading(false); return; }
    try {
      const [{ data: companyRows }, { data: eventRows }, { data: attendeeRows }, { data: deadlineRows }, { data: connectionRows }] = await Promise.all([
        supabase.from('companies').select('id, display_name, logo_url').neq('status', 'archived').order('display_name'),
        supabase.from('events').select('id,protocol,title,company_id,project_id,event_type,color_hex,starts_at,ends_at,all_day,mode,location,meeting_url,description,visibility,source_type,source_entity_id,google_event_id,sync_status,cancelled_at').order('starts_at'),
        supabase.from('event_attendees').select('id,event_id,name,email,status,response_note').order('created_at'),
        supabase.from('deliverables').select('id, company_id, project_id, title, due_at, status, protocol').not('due_at', 'is', null).order('due_at'),
        supabase.from('calendar_connections').select('id, status').eq('provider', 'google').eq('status', 'connected').limit(1),
      ]);

      const options: CompanyOption[] = (companyRows || []).map((row: any) => ({ id: row.id, name: row.display_name, logoUrl: row.logo_url }));
      if (options.length) setCompanies(options);
      const companyMap = new Map(options.map((company) => [company.id, company]));
      const attendeeMap = new Map<string, any[]>();
      (attendeeRows || []).forEach((row: any) => {
        const list = attendeeMap.get(row.event_id) || [];
        list.push(row);
        attendeeMap.set(row.event_id, list);
      });

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
        synthetic: false,
      }));
      const meetingIds = manual.filter(event => event.type === 'meeting' && UUID_PATTERN.test(event.id)).map(event => event.id);
      if (meetingIds.length) {
        const { data: outcomes, error: outcomeError } = await supabase.from('event_outcomes').select('event_id,outcome,transcription_url,transcription_attachment_name').in('event_id', meetingIds);
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

      setEvents([...manual, ...deadlines].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      setCalendarConnection(connectionRows?.length ? 'connected' : 'not_connected');
    } catch (error) {
      console.error('Falha ao carregar calendário', error);
    } finally {
      setLoading(false);
    }
  }

  const visibleEvents = useMemo(() => [...events,...googleEvents.filter(google=>!events.some(local=>local.googleEventId===google.googleEventId))].filter((event) => {
    if (event.cancelledAt) return false;
    if (companyFilter !== 'all' && event.companyId !== companyFilter) return false;
    if (!activeTypes.has(event.type)) return false;
    if (query && !`${event.title} ${event.company || ''} ${calendarTypeMeta[event.type]?.label || ''} ${eventProtocol(event) || ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [events, googleEvents, companyFilter, activeTypes, query]);

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
    .filter((event) => new Date(event.startsAt).getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5), [visibleEvents, today]);

  const meetingHistory = useMemo(() => events.filter(event => event.type === 'meeting' && (event.cancelledAt || new Date(event.startsAt).getTime() < Date.now()))
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

  function openCreateForDate(date?: Date, hour?: number) {
    const target = date || cursor;
    const next = defaultForm(dateKey(target));
    next.companyId = companies[0]?.id || 'aurora';
    if (typeof hour === 'number') {
      next.startTime = `${String(hour).padStart(2, '0')}:00`;
      next.endTime = `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`;
    }
    setEditingEvent(null);
    setForm(next);
    setEditorOpen(true);
  }

  function openEditEvent(event: WorkspaceCalendarEvent) {
    if (event.synthetic) return;
    setSelectedEvent(null);
    setShowCancel(false);
    setCancelReason('');
    setEditingEvent(event);
    setForm(formFromEvent(event));
    setEditorOpen(true);
  }

  function closeEditor() {
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
    if (!form.title.trim() || !form.date) return;
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
      timezone: 'America/Sao_Paulo',
      source_type: 'manual',
      sync_status: calendarConnection === 'connected' ? 'pending' : 'local',
    };

    try {
      if (supabase && isRealCompany && isRealEvent && editingEvent) {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', editingEvent.id);
        if (error) throw error;
        await supabase.from('event_attendees').delete().eq('event_id', editingEvent.id);
        if (attendeeEmails.length) {
          await supabase.from('event_attendees').insert(attendeeEmails.map((email) => ({
            event_id: editingEvent.id,
            company_id: form.companyId || null,
            name: email.split('@')[0],
            email,
            attendee_type: form.visibility === 'client' ? 'client' : 'external',
            status: 'pending',
          })));
        }
        await loadCalendar();
      } else if (supabase && isRealCompany && !editingEvent) {
        const { data: userData } = await supabase.auth.getUser();
        const { data: inserted, error } = await supabase.from('events').insert({
          ...eventPayload,
          created_by: userData.user?.id || null,
        }).select('id, protocol').single();
        if (error) throw error;
        if (inserted?.id && attendeeEmails.length) {
          await supabase.from('event_attendees').insert(attendeeEmails.map((email) => ({
            event_id: inserted.id,
            company_id: form.companyId || null,
            name: email.split('@')[0],
            email,
            attendee_type: form.visibility === 'client' ? 'client' : 'external',
            status: 'pending',
          })));
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
    } catch (error) {
      console.error('Falha ao salvar evento', error);
    } finally {
      setSaving(false);
    }
  }

  async function cancelEvent() {
    if (!selectedEvent || selectedEvent.synthetic || !cancelReason.trim()) return;
    try {
      if (supabase && UUID_PATTERN.test(selectedEvent.id)) {
        await supabase.from('events').update({ cancelled_at: new Date().toISOString(), cancellation_reason: cancelReason.trim() }).eq('id', selectedEvent.id);
        await loadCalendar();
      } else {
        setEvents((current) => current.map((item) => item.id === selectedEvent.id ? { ...item, cancelledAt: new Date().toISOString() } : item));
      }
    } finally {
      setSelectedEvent(null);
      setCancelReason('');
      setShowCancel(false);
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

  const monthAgenda = visibleEvents
    .filter((event) => {
      const date = new Date(event.startsAt);
      return date.getMonth() === cursor.getMonth() && date.getFullYear() === cursor.getFullYear();
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  if (loading) return <Shell role="admin"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando agenda…</section></Shell>;

  return (
    <Shell role="admin">
      <section className="page calendar-page-v2">
        <AgendaChangeInbox onDecision={()=>void loadCalendar()}/>
        <details className="calendar-meeting-history" aria-label="Histórico de reuniões"><summary className="calendar-meeting-history-heading"><span><span className="section-kicker">AGENDA REALIZADA</span><strong>Histórico de reuniões</strong></span><span>Ver encontros e transcrições</span></summary><div className="calendar-meeting-history-filters"><label>Período<input type="month" value={historyMonth} onChange={event=>setHistoryMonth(event.target.value)}/></label><label>Formato<select value={historyMode} onChange={event=>setHistoryMode(event.target.value)}><option value="all">Todos</option><option value="remote">Online</option><option value="in_person">Presencial</option></select></label><label>Situação<select value={historyOutcome} onChange={event=>setHistoryOutcome(event.target.value)}><option value="all">Todas</option><option value="occurred">Realizada</option><option value="not_occurred">Não realizada</option><option value="cancelled">Cancelada</option><option value="pending">Sem registro</option></select></label></div><div className="calendar-meeting-history-list">{meetingHistory.length ? meetingHistory.slice(0,30).map(event=><button type="button" key={event.id} onClick={()=>{setShowCancel(false);setSelectedEvent(event)}}><span><strong>{event.title}</strong><small>{event.company || 'CALI'} · {formatCalendarDate(event.startsAt)} · {event.mode==='in_person'?'Presencial':'Online'}</small></span><b className={event.cancelledAt||meetingOutcomes[event.id]?.outcome==='not_occurred'?'negative':meetingOutcomes[event.id]?.outcome==='occurred'?'positive':'pending'}>{event.cancelledAt?'Cancelada':meetingOutcomes[event.id]?.outcome==='occurred'?'Realizada':meetingOutcomes[event.id]?.outcome==='not_occurred'?'Não realizada':'Sem registro'}</b>{meetingOutcomes[event.id]?.transcription_url && <FileText size={16} aria-label="Transcrição disponível"/>}</button>) : <p>Nenhuma reunião encontrada com esses filtros.</p>}</div></details>
        <div className="calendar-v2-actions">
          <button className="primary compact-action" onClick={() => openCreateForDate()}><Plus size={17} />Novo evento</button>
        </div>

        <section className="calendar-workspace-strip">
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
          {googleReadStatus==='reconnect' && <button type="button" className="google-calendar-runtime-button primary" onClick={async()=>{if(!supabase)return;const {data,error}=await supabase.functions.invoke('google-calendar-oauth',{body:{action:'authorize',companyId:null}});if(error||!data?.url)return;window.location.assign(data.url)}}>Autorizar leitura da agenda</button>}
        </section>

        <section className="calendar-main-toolbar">
          <div className="calendar-navigation">
            <button className="calendar-icon-button" onClick={() => navigatePeriod(-1)} aria-label="Período anterior"><ChevronLeft size={18} /></button>
            <button className="secondary calendar-today-button" onClick={() => setCursor(new Date())}>Hoje</button>
            <button className="calendar-icon-button" onClick={() => navigatePeriod(1)} aria-label="Próximo período"><ChevronRight size={18} /></button>
            <strong>{cursorLabel}</strong>
          </div>
          <div className="calendar-toolbar-filters">
            <label className="calendar-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evento ou protocolo" /></label>
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Filtrar cliente">
              <option value="all">Todos os clientes</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <div className="calendar-view-switch">
              {(['month', 'week', 'agenda'] as CalendarView[]).map((item) => (
                <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>
                  {item === 'month' ? 'Mês' : item === 'week' ? 'Semana' : 'Agenda'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="calendar-page-layout">
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
                          <button key={event.id} className={`calendar-event-chip type-${event.type} ${event.sourceType === 'google' ? 'is-google' : 'is-workspace'}`} style={eventStyle(event)} title={`${event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${event.title}`} onClick={(click) => { click.stopPropagation(); setSelectedEvent(event); }}>
                            <span className="calendar-event-dot" />
                            {!event.allDay && <time>{formatCalendarTime(event.startsAt)}</time>}
                            <strong>{event.title}</strong>
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

            {view === 'week' && <div className="calendar-week-scroller"><div className="calendar-week-view">
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
                {hours.map(hour => <div key={hour} className="calendar-week-hour-hit" style={{ top: (hour - WEEK_START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }} onDoubleClick={() => openCreateForDate(date,hour)} />)}
                {weekEventLayout(eventsByDate.get(dateKey(date)) || []).map(({ event, top, height, column, columns }) =>
                  <button key={event.id} className={`calendar-week-event ${event.sourceType === 'google' ? 'is-google' : 'is-workspace'} ${height < 36 ? 'is-compact' : ''}`} style={{ ...eventStyle(event), top, height: Math.max(3,height - 2), left: `${column / columns * 100}%`, width: `${100 / columns}%` }} title={`${event.sourceType === 'google' ? 'Google Agenda' : 'Workspace'} · ${formatCalendarTime(event.startsAt)}–${formatCalendarTime(event.endsAt)} · ${event.title}`} onClick={() => setSelectedEvent(event)}>
                    <strong>{event.title}</strong><time>{formatCalendarTime(event.startsAt)}{event.endsAt ? `–${formatCalendarTime(event.endsAt)}` : ''}</time><small>{event.sourceType === 'google' ? 'Google' : 'Workspace'}</small>
                  </button>
                )}
              </div>)}
            </div></div>}

            {view === 'agenda' && <div className="calendar-agenda-view">
              {monthAgenda.map((event) => (
                <button key={event.id} className="calendar-agenda-row" onClick={() => setSelectedEvent(event)}>
                  <div className="calendar-agenda-date"><strong>{new Date(event.startsAt).getDate()}</strong><span>{months[new Date(event.startsAt).getMonth()].slice(0, 3).toUpperCase()}</span></div>
                  <span className="calendar-event-bar" style={{ background: event.color }} />
                  <div className="calendar-agenda-copy">
                    <span>{calendarTypeMeta[event.type].label} · {formatCalendarTime(event.startsAt)}</span>
                    <strong>{event.title}</strong>
                    <small>{event.company || 'CALI'}{event.visibility === 'client' ? ' · cliente vê' : ' · interno'}{eventProtocol(event) ? ` · ${eventProtocol(event)}` : ''}</small>
                  </div>
                  <span className="calendar-agenda-mode">{event.mode === 'in_person' ? <MapPin size={15} /> : <Video size={15} />}{event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' ? 'Remoto' : 'Prazo'}</span>
                </button>
              ))}
              {!monthAgenda.length && <div className="calendar-empty">Nenhum evento neste mês com os filtros atuais.</div>}
            </div>}
          </section>

          <aside className="calendar-side-column">
            <section className="calendar-mini-card panel">
              <div className="calendar-mini-title"><strong>{months[cursor.getMonth()]}</strong><span>{cursor.getFullYear()}</span></div>
              <div className="calendar-mini-weekdays">{weekdays.map((day) => <span key={day}>{day.slice(0, 1)}</span>)}</div>
              <div className="calendar-mini-grid">
                {miniDates.map((date) => {
                  const dayEvents = eventsByDate.get(dateKey(date)) || [];
                  return <button key={dateKey(date)} className={`${date.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${isSameDate(date, today) ? 'today' : ''} ${isSameDate(date, cursor) ? 'selected' : ''}`} onClick={() => setCursor(date)}><span>{date.getDate()}</span>{dayEvents.length > 0 && <i style={{ background: dayEvents[0].color }} />}</button>;
                })}
              </div>
            </section>

            <section className="calendar-filter-card panel">
              <div className="calendar-side-title"><Filter size={17} /><strong>Tipos de evento</strong></div>
              <div className="calendar-type-filter-list">
                {(Object.keys(calendarTypeMeta) as CalendarEventType[]).map((type) => (
                  <button key={type} className={activeTypes.has(type) ? 'active' : ''} onClick={() => toggleType(type)}>
                    <span style={{ background: calendarTypeMeta[type].color }} />
                    <strong>{calendarTypeMeta[type].label}</strong>
                    <small>{events.filter((event) => event.type === type && !event.cancelledAt).length}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="calendar-upcoming-card panel">
              <div className="calendar-side-title"><CalendarDays size={17} /><strong>Próximos compromissos</strong></div>
              <div className="calendar-upcoming-list">
                {upcoming.map((event) => <button key={event.id} onClick={() => setSelectedEvent(event)}><span className="calendar-upcoming-color" style={{ background: event.color }} /><div><strong>{event.title}</strong><small>{formatCalendarDate(event.startsAt)} · {formatCalendarTime(event.startsAt)}</small><span>{event.company || 'CALI'}</span></div></button>)}
                {!upcoming.length && <p>Nenhum compromisso neste recorte.</p>}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {editorOpen && <div className="modal-backdrop full-screen-modal calendar-modal-backdrop">
        <form className="modal-card calendar-event-modal" onSubmit={saveEvent} role="dialog" aria-modal="true">
          <button type="button" className="modal-close" onClick={closeEditor} aria-label="Fechar"><X size={20} /></button>
          <div className="calendar-modal-heading">
            <span className="section-kicker">{editingEvent ? 'EDITAR / REMARCAR' : 'NOVO EVENTO'}</span>
            <h2>{editingEvent ? 'Atualizar compromisso' : 'Adicionar ao calendário'}</h2>
            <p>Crie o compromisso uma vez e defina quem deve enxergá-lo. A agenda CALI continua funcionando mesmo sem a conexão Google.</p>
            <span className="calendar-modal-protocol">{editingEvent?.protocol ? `Protocolo ${editingEvent.protocol}` : 'O protocolo será gerado automaticamente ao salvar.'}</span>
          </div>
          <div className="calendar-modal-body">
            <label className="stacked-label calendar-title-field">Título<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: reunião mensal de indicadores" /></label>
            <div className="calendar-event-form-grid">
              <label className="stacked-label">Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Somente CALI</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
              <label className="stacked-label">Tipo<select value={form.type} onChange={(event) => setEventType(event.target.value as CalendarEventType)}>{(Object.keys(calendarTypeMeta) as CalendarEventType[]).map((type) => <option key={type} value={type}>{calendarTypeMeta[type].label}</option>)}</select></label>
              <label className="stacked-label">Data<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} /></label>
              <label className="stacked-label">Cor<input className="calendar-color-input" type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} /></label>
            </div>
            <label className="calendar-all-day"><input type="checkbox" checked={form.allDay} onChange={(event) => setForm((current) => ({ ...current, allDay: event.target.checked }))} /><span>Evento de dia inteiro</span></label>
            {!form.allDay && <div className="calendar-event-form-grid">
              <label className="stacked-label">Início<input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></label>
              <label className="stacked-label">Término<input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></label>
              <label className="stacked-label">Formato<select value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value as 'remote' | 'in_person' }))}><option value="remote">Remoto</option><option value="in_person">Presencial</option></select></label>
              <label className="stacked-label">Visibilidade<select value={form.visibility} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as 'internal' | 'client' }))}><option value="client">Compartilhar com cliente</option><option value="internal">Somente CALI</option></select></label>
            </div>}
            <div className="calendar-event-form-grid">
              <label className="stacked-label">Local / sala<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={form.mode === 'remote' ? 'Google Meet' : 'Endereço ou sala'} /></label>
              <label className="stacked-label">Link da reunião<input value={form.meetingUrl} onChange={(event) => setForm((current) => ({ ...current, meetingUrl: event.target.value }))} placeholder="https://meet.google.com/..." /></label>
            </div>
            {form.mode === 'remote' && calendarConnection !== 'connected' && <div className="calendar-meet-helper">Você pode informar um Meet existente agora. Quando o Google Workspace estiver conectado por OAuth, a criação/sincronização de Meet poderá acontecer pela própria agenda.</div>}
            <label className="stacked-label">Convidados por e-mail<input value={form.attendeeEmails} onChange={(event) => setForm((current) => ({ ...current, attendeeEmails: event.target.value }))} placeholder="decisor@empresa.com.br, outra@empresa.com.br" /><small>Separe mais de um e-mail por vírgula.</small></label>
            <label className="stacked-label">Descrição<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Contexto, objetivo ou preparação necessária" /></label>
          </div>
          <div className="calendar-modal-footer"><button type="button" className="secondary" onClick={closeEditor}>Cancelar</button><button className="primary" disabled={saving || !form.title.trim()} type="submit">{saving ? 'Salvando…' : editingEvent ? 'Salvar alterações' : 'Adicionar evento'}</button></div>
        </form>
      </div>}

      {selectedEvent && <div className="modal-backdrop full-screen-modal calendar-modal-backdrop">
        <section className={`modal-card calendar-detail-modal calendar-detail-refined ${selectedEvent.cancelledAt || meetingOutcomes[selectedEvent.id]?.outcome==='not_occurred' || selectedEvent.attendees.some(attendee=>attendee.status==='declined')?'is-negative':meetingOutcomes[selectedEvent.id]?.outcome==='occurred' || selectedEvent.attendees.some(attendee=>attendee.status==='accepted')?'is-positive':'is-pending'}`} role="dialog" aria-modal="true">
          <button className="modal-close" onClick={() => { setSelectedEvent(null); setShowCancel(false); setCancelReason(''); }} aria-label="Fechar"><X size={20} /></button>
          <div className="calendar-detail-accent" style={{ background: selectedEvent.color }} />
          <div className="calendar-detail-heading">
            <div className="calendar-detail-company-mark">{selectedEvent.companyLogo ? <img src={selectedEvent.companyLogo} alt="" /> : getCompanyMark(selectedEvent.company)}</div>
            <div>
              <span className="section-kicker">{selectedEvent.sourceType==='google'?'AGENDA GOOGLE':calendarTypeMeta[selectedEvent.type].label} · {selectedEvent.sourceType==='google'?'Compromisso pessoal':selectedEvent.cancelledAt?'Cancelado':meetingOutcomes[selectedEvent.id]?.outcome==='occurred'?'Realizado':meetingOutcomes[selectedEvent.id]?.outcome==='not_occurred'?'Não realizado':selectedEvent.attendees.some(attendee=>attendee.status==='declined')?'Não confirmado':selectedEvent.attendees.some(attendee=>attendee.status==='accepted')?'Confirmado':'Aguardando confirmação'}</span>
              <h2>{selectedEvent.title}</h2>
              <p>{selectedEvent.company || 'CALI'} · {selectedEvent.visibility === 'client' ? 'visível para o cliente' : 'interno'}</p>
              {eventProtocol(selectedEvent) && <span className="calendar-protocol-badge">{selectedEvent.synthetic ? 'Protocolo de origem' : 'Protocolo'} · {eventProtocol(selectedEvent)}</span>}
            </div>
          </div>
          <div className="calendar-detail-body">
            <div className="calendar-detail-facts">
              <article><Clock3 size={17} /><span>Quando</span><strong>{formatCalendarDate(selectedEvent.startsAt)} · {selectedEvent.allDay ? 'Dia inteiro' : formatCalendarTime(selectedEvent.startsAt)}</strong></article>
              <article>{selectedEvent.mode === 'in_person' ? <MapPin size={17} /> : <Video size={17} />}<span>Formato</span><strong>{selectedEvent.sourceType==='google'?'Agenda Google':selectedEvent.mode === 'in_person' ? 'Presencial' : selectedEvent.mode === 'remote' ? 'Remoto' : 'Prazo automático'}</strong></article>
              <article><Users size={17} /><span>Convidados</span><strong>{selectedEvent.attendees.length ? `${selectedEvent.attendees.length} convidado(s)` : selectedEvent.visibility === 'client' ? 'Cliente relacionado' : 'Somente CALI'}</strong></article>
            </div>
            {selectedEvent.description && <section className="calendar-detail-description"><strong>Contexto</strong><p>{selectedEvent.description}</p></section>}
            {selectedEvent.synthetic && <div className="calendar-auto-source"><CalendarDays size={18} /><div><strong>{selectedEvent.sourceType==='google'?'Compromisso do Google':'Prazo automático'}</strong><p>{selectedEvent.sourceType==='google'?'Para alterar este compromisso, abra a agenda Google. Ele aparece aqui apenas para consulta.':'Este item vem do deadline de um entregável. Para alterar a data, edite o entregável de origem — o calendário será atualizado sem duplicar cadastro.'}</p></div></div>}
            {!!selectedEvent.attendees.length && <section className="calendar-attendee-list"><strong>Convidados</strong>{selectedEvent.attendees.map((attendee, index) => <div key={`${attendee.email}-${index}`}><span className={`attendee-status ${attendee.status}`} /><span>{attendee.name}</span><small>{attendee.email}</small><b>{attendee.status === 'accepted' ? 'Aceito' : attendee.status === 'declined' ? 'Recusado' : attendee.status === 'tentative' ? 'Talvez' : 'Pendente'}</b></div>)}</section>}
            {showCancel && !selectedEvent.synthetic && <section className="calendar-cancel-box"><strong>Cancelar compromisso</strong><p>O motivo fica registrado. Quando a régua de notificações estiver ativada, ele também poderá compor a comunicação aos participantes.</p><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} placeholder="Motivo do cancelamento" /><div><button className="secondary" onClick={() => setShowCancel(false)}>Voltar</button><button className="primary danger-action" disabled={!cancelReason.trim()} onClick={() => void cancelEvent()}>Confirmar cancelamento</button></div></section>}
          </div>
          <div className="calendar-detail-footer calendar-detail-actions"><div className="calendar-detail-primary-actions">{!selectedEvent.synthetic && !selectedEvent.cancelledAt && <button className="secondary edit-event-action" onClick={() => openEditEvent(selectedEvent)}><Pencil size={16} />Editar ou remarcar</button>}{selectedEvent.meetingUrl && !selectedEvent.cancelledAt && <button className="primary" onClick={() => window.open(selectedEvent.meetingUrl!, '_blank', 'noopener,noreferrer')}><Video size={16} />Abrir Meet</button>}</div><div className="calendar-detail-secondary-actions"><button className="secondary" onClick={() => window.open(selectedEvent.sourceType==='google'&&selectedEvent.googleHtmlLink?selectedEvent.googleHtmlLink:googleCalendarTemplate(selectedEvent), '_blank', 'noopener,noreferrer')}><ExternalLink size={16} />Google Agenda</button><button className="secondary" onClick={() => downloadCalendarIcs(selectedEvent)}><Download size={16} />ICS</button>{!selectedEvent.synthetic && !selectedEvent.cancelledAt && !showCancel && <button className="secondary danger-soft" onClick={() => setShowCancel(true)}>Cancelar</button>}</div></div>
        </section>
      </div>}
    </Shell>
  );
}
