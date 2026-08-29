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
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
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
  return { '--event-color': event.color, '--event-soft': `${event.color}18` } as React.CSSProperties;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventHour(event: WorkspaceCalendarEvent) {
  return Number(new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date(event.startsAt)));
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
  const [companies, setCompanies] = useState<CompanyOption[]>(fallbackCompanies);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const [view, setView] = useState<CalendarView>('month');
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

  useEffect(() => { void loadCalendar(); }, []);

  useEffect(() => {
    const active = editorOpen || Boolean(selectedEvent);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, selectedEvent]);

  async function loadCalendar() {
    if (!supabase) return;
    try {
      const [{ data: companyRows }, { data: eventRows }, { data: attendeeRows }, { data: deadlineRows }, { data: connectionRows }] = await Promise.all([
        supabase.from('companies').select('id, display_name, logo_url').neq('status', 'archived').order('display_name'),
        supabase.from('events').select('*').is('cancelled_at', null).order('starts_at'),
        supabase.from('event_attendees').select('*').order('created_at'),
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

      if (manual.length || deadlines.length) {
        setEvents([...manual, ...deadlines].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
      }
      setCalendarConnection(connectionRows?.length ? 'connected' : 'not_connected');
    } catch (error) {
      console.error('Falha ao carregar calendário', error);
    }
  }

  const visibleEvents = useMemo(() => events.filter((event) => {
    if (event.cancelledAt) return false;
    if (companyFilter !== 'all' && event.companyId !== companyFilter) return false;
    if (!activeTypes.has(event.type)) return false;
    if (query && !`${event.title} ${event.company || ''} ${calendarTypeMeta[event.type]?.label || ''} ${eventProtocol(event) || ''}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [events, companyFilter, activeTypes, query]);

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

  return (
    <Shell role="admin">
      <section className="page calendar-page-v2">
        <div className="eyebrow">AGENDA DE EXECUÇÃO</div>
        <div className="page-heading calendar-page-heading">
          <div>
            <h1>Calendário</h1>
            <p>Reuniões, validações, compromissos e prazos conectados ao trabalho. Prazos de entregáveis entram automaticamente na agenda.</p>
          </div>
          <button className="primary compact-action" onClick={() => openCreateForDate()}><Plus size={17} />Novo evento</button>
        </div>

        <section className="calendar-workspace-strip">
          <div className="calendar-workspace-icon"><Cloud size={21} /></div>
          <div>
            <strong>Google Workspace</strong>
            <p>{calendarConnection === 'connected'
              ? 'Calendário conectado. Os eventos podem seguir para sincronização e usar Google Meet.'
              : 'A agenda CALI já funciona. A conexão OAuth com o Google Workspace será ativada sem criar uma agenda paralela à sua.'}</p>
          </div>
          <span className={`calendar-connection-status ${calendarConnection === 'connected' ? 'connected' : ''}`}>
            {calendarConnection === 'connected' ? <><Check size={14} />Conectado</> : 'Não conectado'}
          </span>
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
                          <button key={event.id} className={`calendar-event-chip type-${event.type}`} style={eventStyle(event)} onClick={(click) => { click.stopPropagation(); setSelectedEvent(event); }}>
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
              {hours.map((hour) => <div className="calendar-week-row" key={hour} style={{ gridRow: hour - 5 }}>
                <span className="calendar-hour-label">{String(hour).padStart(2, '0')}:00</span>
                {weekDates.map((date) => {
                  const dayEvents = (eventsByDate.get(dateKey(date)) || []).filter((event) => eventHour(event) === hour);
                  return (
                    <div key={dateKey(date)} className="calendar-week-slot" onDoubleClick={() => openCreateForDate(date, hour)}>
                      {dayEvents.map((event) => <button key={event.id} className="calendar-week-event" style={eventStyle(event)} onClick={() => setSelectedEvent(event)}><time>{formatCalendarTime(event.startsAt)}</time><strong>{event.title}</strong><small>{event.company || 'CALI'}</small></button>)}
                    </div>
                  );
                })}
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
        <section className="modal-card calendar-detail-modal" role="dialog" aria-modal="true">
          <button className="modal-close" onClick={() => { setSelectedEvent(null); setShowCancel(false); setCancelReason(''); }} aria-label="Fechar"><X size={20} /></button>
          <div className="calendar-detail-accent" style={{ background: selectedEvent.color }} />
          <div className="calendar-detail-heading">
            <div className="calendar-detail-company-mark">{selectedEvent.companyLogo ? <img src={selectedEvent.companyLogo} alt="" /> : getCompanyMark(selectedEvent.company)}</div>
            <div>
              <span className="section-kicker">{calendarTypeMeta[selectedEvent.type].label}</span>
              <h2>{selectedEvent.title}</h2>
              <p>{selectedEvent.company || 'CALI'} · {selectedEvent.visibility === 'client' ? 'visível para o cliente' : 'interno'}</p>
              {eventProtocol(selectedEvent) && <span className="calendar-protocol-badge">{selectedEvent.synthetic ? 'Protocolo de origem' : 'Protocolo'} · {eventProtocol(selectedEvent)}</span>}
            </div>
          </div>
          <div className="calendar-detail-body">
            <div className="calendar-detail-facts">
              <article><Clock3 size={17} /><span>Quando</span><strong>{formatCalendarDate(selectedEvent.startsAt)} · {selectedEvent.allDay ? 'Dia inteiro' : formatCalendarTime(selectedEvent.startsAt)}</strong></article>
              <article>{selectedEvent.mode === 'in_person' ? <MapPin size={17} /> : <Video size={17} />}<span>Formato</span><strong>{selectedEvent.mode === 'in_person' ? 'Presencial' : selectedEvent.mode === 'remote' ? 'Remoto' : 'Prazo automático'}</strong></article>
              <article><Users size={17} /><span>Convidados</span><strong>{selectedEvent.attendees.length ? `${selectedEvent.attendees.length} convidado(s)` : selectedEvent.visibility === 'client' ? 'Cliente relacionado' : 'Somente CALI'}</strong></article>
            </div>
            {selectedEvent.description && <section className="calendar-detail-description"><strong>Contexto</strong><p>{selectedEvent.description}</p></section>}
            {selectedEvent.synthetic && <div className="calendar-auto-source"><CalendarDays size={18} /><div><strong>Prazo automático</strong><p>Este item vem do deadline de um entregável. Para alterar a data, edite o entregável de origem — o calendário será atualizado sem duplicar cadastro.</p></div></div>}
            {!!selectedEvent.attendees.length && <section className="calendar-attendee-list"><strong>Convidados</strong>{selectedEvent.attendees.map((attendee, index) => <div key={`${attendee.email}-${index}`}><span className={`attendee-status ${attendee.status}`} /><span>{attendee.name}</span><small>{attendee.email}</small><b>{attendee.status === 'accepted' ? 'Aceito' : attendee.status === 'declined' ? 'Recusado' : attendee.status === 'tentative' ? 'Talvez' : 'Pendente'}</b></div>)}</section>}
            {showCancel && !selectedEvent.synthetic && <section className="calendar-cancel-box"><strong>Cancelar compromisso</strong><p>O motivo fica registrado. Quando a régua de notificações estiver ativada, ele também poderá compor a comunicação aos participantes.</p><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} placeholder="Motivo do cancelamento" /><div><button className="secondary" onClick={() => setShowCancel(false)}>Voltar</button><button className="primary danger-action" disabled={!cancelReason.trim()} onClick={() => void cancelEvent()}>Confirmar cancelamento</button></div></section>}
          </div>
          <div className="calendar-detail-footer">
            {!selectedEvent.synthetic && <button className="secondary edit-event-action" onClick={() => openEditEvent(selectedEvent)}><Pencil size={16} />Editar / remarcar</button>}
            <button className="secondary" onClick={() => window.open(googleCalendarTemplate(selectedEvent), '_blank', 'noopener,noreferrer')}><ExternalLink size={16} />Google Calendar</button>
            <button className="secondary" onClick={() => downloadCalendarIcs(selectedEvent)}><Download size={16} />Baixar .ics</button>
            {selectedEvent.meetingUrl && <button className="primary" onClick={() => window.open(selectedEvent.meetingUrl!, '_blank', 'noopener,noreferrer')}><Video size={16} />Abrir Meet</button>}
            {!selectedEvent.synthetic && !showCancel && <button className="secondary danger-soft" onClick={() => setShowCancel(true)}>Cancelar evento</button>}
          </div>
        </section>
      </div>}
    </Shell>
  );
}