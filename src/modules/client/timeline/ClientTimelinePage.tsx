import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { WorkflowControls, WorkflowSegments, WorkflowControlsAside } from '../../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { ClientSchedulingRequests } from '../../calendar/scheduling/ClientSchedulingRequests';
import { Button } from '../../../components/ds/Button';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, FileText, Loader2, Plus, SlidersHorizontal, X } from 'lucide-react';
import * as styles from './components/clientTimelineStyles';
import { ClientTimelineCalendar } from './components/ClientTimelineCalendar';
import { ClientGoogleCalendarSettings } from './components/ClientGoogleCalendarSettings';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { NoticeCalendarCard } from '../../notices/NoticesBoard';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readCalendarNotices, observeSchedulingRequests } from '../../../api/calendar/agenda';
import { readClientCalendar, readClientCalendarAttendees } from '../../../api/calendar/client';
import { requestAgendaChange } from '../../../api/calendar/changes';
import { readGoogleCalendarEvents, refreshGoogleEventStatus } from '../../../api/calendar/connections';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

const emptyChangeSlots = () => [
  { id: 'first-choice', date: '', time: '' },
  { id: 'second-choice', date: '', time: '' },
];

type Slot = { startsAt: string; endsAt?: string | null };

type ClientEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  mode?: string | null;
  location?: string | null;
  meeting_url?: string | null;
  description?: string | null;
  event_type?: string | null;
  sync_status?: string | null;
  google_event_id?: string | null;
  schedule_class?: string | null;
  billing_applies?: boolean | null;
  source_type?: string | null;
  cancelled_at?: string | null;
};
type MeetingRecord = { event_id: string; outcome: string; transcription_url?: string | null; transcription_note?: string | null; attachment_path?: string | null; attachment_name?: string | null };
type AgendaChange = { id: string; event_id: string; action: string; reason: string; slots: Slot[]; status: string; decision_note?: string | null; created_at: string };

type ClientDeliverable = {
  id: string;
  title: string;
  status: string;
  due_at?: string | null;
  project_id?: string | null;
  project_name?: string | null;
};

type ClientSchedulingRequest = {
  id: string;
  title: string;
  status: string;
  request_mode?: string | null;
  requested_slots?: Slot[] | null;
  admin_proposed_slots?: Slot[] | null;
  billable_extra?: boolean | null;
  urgency_level?: string | null;
  created_at?: string | null;
  selected_slot?: Slot | null;
  extra_visit?: boolean | null;
  online_extra_requested?: boolean | null;
  purpose?: string | null;
  location?: string | null;
  admin_note?: string | null;
  client_note?: string | null;
  confirmed_event_id?: string | null;
  extra_visit_change_reason?: string | null;
  extra_visit_previous_slot?: Slot | null;
  extra_visit_cancellation_fee_cents?: number | null;
  extra_visit_cancellation_note?: string | null;
};

type TimelineItem = {
  id: string;
  sourceId: string;
  kind: 'event' | 'deadline' | 'request' | 'google';
  title: string;
  at: string;
  state: 'past' | 'today' | 'future';
  dateLabel: string;
  timeLabel: string;
  typeLabel: string;
  statusLabel: string;
  detailLabel?: string;
  secondaryDetail?: string;
  meetingUrl?: string | null;
  tone?: 'positive' | 'pending' | 'negative';
  request?: ClientSchedulingRequest;
  requestOption?: number;
  requestOptionCount?: number;
  endsAt?: string | null;
  googleHtmlLink?: string | null;
  description?: string | null;
  color?: string | null;
  textColor?: string | null;
  allDay?: boolean;
};

type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

function dateState(value: string): TimelineItem['state'] {
  const at = new Date(value);
  const now = new Date();
  const a = new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
  const n = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return a < n ? 'past' : a === n ? 'today' : 'future';
}

function formatDay(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(date).replace('.', '');
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}
function monthOf(value:string){const parts=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',timeZone:'America/Sao_Paulo'}).formatToParts(new Date(value));return `${parts.find(part=>part.type==='year')?.value}-${parts.find(part=>part.type==='month')?.value}`;}

function statusText(status: string) {
  const map: Record<string, string> = {
    not_started: 'Não iniciado',
    in_progress: 'Em andamento',
    internal_review: 'Em revisão CALI',
    client_review: 'Aguardando validação',
    adjustment_requested: 'Em ajuste',
    approved: 'Aprovado',
  };
  return map[status] || status;
}

function requestStatusText(status: string) {
  if (status === 'client_review') return 'Sua confirmação';
  if (status === 'reschedule_review') return 'Reagendamento em análise';
  if (status === 'confirmed') return 'Confirmado';
  if (status === 'declined') return 'Recusado';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'completed') return 'Realizado';
  if (status === 'not_occurred') return 'Não realizado';
  return 'Em análise pela CALI';
}

function inviteText(status?: AttendeeStatus) {
  if (status === 'accepted') return 'Confirmado';
  if (status === 'declined') return 'Convite recusado';
  if (status === 'tentative') return 'Talvez';
  if (status === 'pending') return 'Aguardando resposta';
  return '';
}

function slotsOf(value: Slot[] | null | undefined) {
  return Array.isArray(value) ? value.filter((slot) => Boolean(slot?.startsAt)) : [];
}

function requestSlots(request: ClientSchedulingRequest) {
  if (request.status === 'confirmed' && request.selected_slot) return [request.selected_slot];
  const proposed = slotsOf(request.admin_proposed_slots);
  const requested = slotsOf(request.requested_slots);
  return request.status === 'client_review' && proposed.length ? proposed : requested;
}

function optionsText(slots: Slot[]) {
  return slots.slice(0, 2).map((slot) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(slot.startsAt))).join(' / ');
}

function futureCountText(count: number) {
  if (!count) return 'Sem itens futuros';
  return `${count} ${count === 1 ? 'item futuro' : 'itens futuros'}`;
}

export function ClientTimelinePage() {
  const { user } = useWorkspaceAuth();
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([]);
  const [requests, setRequests] = useState<ClientSchedulingRequest[]>([]);
  const [attendeeStatus, setAttendeeStatus] = useState<Record<string, AttendeeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [changeAction, setChangeAction] = useState<'cancel' | 'reschedule' | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [newSlots, setNewSlots] = useState(emptyChangeSlots);
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeTarget, setChangeTarget] = useState<TimelineItem | null>(null);
  const [meetingRecords, setMeetingRecords] = useState<Record<string, MeetingRecord>>({});
  const [agendaChanges, setAgendaChanges] = useState<AgendaChange[]>([]);
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [agendaView, setAgendaView] = useState<'week'|'list'|'month'>('week');
  const [weekCursor, setWeekCursor] = useState(() => new Date());
  const [visibleKinds, setVisibleKinds] = useState<Set<TimelineItem['kind']>>(() => new Set(['event','request','deadline']));
  const [personalGoogle, setPersonalGoogle] = useState<TimelineItem[]>([]);
  // Avisos da CALI com data (feriado, atendimento) entram na agenda como informação de dia inteiro.
  const [noticeItems, setNoticeItems] = useState<TimelineItem[]>([]);
  useEffect(() => { let active = true; void (async () => {
    if (!isSupabaseConfigured) return;
    const result = await readCalendarNotices(false);
    if (!active || result.error) return;
    const tone: Record<string, string> = { feriado: '#C79A4B', atendimento: '#5E93BF', comunicado: '#8A6FB0' };
    setNoticeItems((result.data || []).map((row): TimelineItem => { const start = `${row.notice_date}T12:00:00-03:00`; return { id: `notice-${row.id}`, sourceId: String(row.id), kind: 'google', title: `Aviso · ${row.title}`, at: start, endsAt: null, description: row.body, secondaryDetail: [row.time_label, row.coverage].filter(Boolean).join(' · ') || undefined, color: tone[row.category] || '#8A6FB0', textColor: '#ffffff', allDay: true, dateLabel: formatDay(start), timeLabel: row.time_label || 'Dia inteiro', state: dateState(start), typeLabel: 'Aviso da CALI', statusLabel: 'Aviso da CALI', tone: 'pending' } satisfies TimelineItem; }));
  })(); return () => { active = false; }; }, []);
  const [personalGoogleNotice, setPersonalGoogleNotice] = useState('');
  useEffect(() => { if (!selectedItem) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedItem(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [selectedItem]);

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const refresh = () => void load(false);
    window.addEventListener('cali-calendar-record-updated', refresh);
    return () => window.removeEventListener('cali-calendar-record-updated', refresh);
  }, [user?.id]);
  useEffect(()=>{
    if(!isSupabaseConfigured||!visibleKinds.has('google')){setPersonalGoogle([]);setPersonalGoogleNotice('');return;}
    let current=true;
    const first=new Date(weekCursor.getFullYear(),weekCursor.getMonth(),weekCursor.getDate()-weekCursor.getDay());
    const last=new Date(first.getFullYear(),first.getMonth(),first.getDate()+7);
    void readGoogleCalendarEvents('client_events', { start: first.toISOString(), end: last.toISOString() }).then(({data,error})=>{
      if(!current)return;
      if(error||data?.state!=='checked'){setPersonalGoogle([]);setPersonalGoogleNotice(data?.state==='reconnect_required'?'Conecte sua conta em “Integração com Google Calendar” para ver seus compromissos pessoais.':'Não foi possível consultar seus eventos do Google agora.');return;}
      setPersonalGoogleNotice('');
      setPersonalGoogle((data.events||[]).map((row):TimelineItem=>{const start=row.allDay?`${row.start}T12:00:00-03:00`:String(row.start);return {id:`personal-${row.calendarId}-${row.id}`,sourceId:String(row.id),kind:'google',title:String(row.title||'Compromisso'),at:start,endsAt:row.allDay?null:row.end,googleHtmlLink:row.htmlLink,description:row.description,secondaryDetail:row.location ?? undefined,color:/^#[0-9a-f]{6}$/i.test(row.color)?row.color:null,textColor:/^#[0-9a-f]{6}$/i.test(row.textColor ?? '')?row.textColor:null,allDay:Boolean(row.allDay),dateLabel:formatDay(start),timeLabel:row.allDay?'Dia inteiro':formatTime(start),state:dateState(start),typeLabel:'Google Agenda',statusLabel:'Compromisso pessoal',tone:'pending'}}));
    });
    return()=>{current=false};
  },[weekCursor,visibleKinds]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    return observeSchedulingRequests('client-agenda-current', () => void load());
  }, [user?.id]);

  async function refreshGoogleStatuses(rows: ClientEvent[]) {
    if (!isSupabaseConfigured) return;
    const candidates = rows
      .filter((event) => event.sync_status === 'synced' && new Date(event.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
      .slice(0, 6);
    await refreshGoogleEventStatus(candidates.map((event) => event.id));
  }
  async function openMeetingFile(record: MeetingRecord) {
    if (!isSupabaseConfigured || !record.attachment_path) return;
    try {
      await openPrivateWorkspaceFile(record.attachment_path);
    } catch {
      setError('Não foi possível abrir o anexo da reunião.');
    }
  }

  async function load(showLoading = true) {
    if (!isSupabaseConfigured) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const { eventResult, deliverableResult, requestResult, recordResult, changeResult, projectResult, clientEmail } =
        await readClientCalendar(userId, user?.email);

      const nextEvents = (eventResult.data || []) as ClientEvent[];
      setEvents(nextEvents);
      const projectNames = new Map((projectResult.data || []).map(project => [project.id, project.name]));
      setDeliverables((deliverableResult.data || []).map(row => ({ ...row, project_name: row.project_id ? projectNames.get(row.project_id) || null : null })) as ClientDeliverable[]);
      setRequests(((requestResult.data || []) as ClientSchedulingRequest[]).filter(request => request.extra_visit || (request.online_extra_requested && !['confirmed','completed'].includes(request.status)) || ['submitted','client_review','reschedule_review'].includes(request.status)));
      setMeetingRecords(Object.fromEntries(((recordResult.data || []) as MeetingRecord[]).map(row => [row.event_id,row])));
      setAgendaChanges((changeResult.data || []) as AgendaChange[]);
      setLoading(false);

      void refreshGoogleStatuses(nextEvents);
      if (nextEvents.length && clientEmail) {
        void (async () => {
          const attendeeResult = await readClientCalendarAttendees(nextEvents.map((event) => event.id), clientEmail);
          if (!attendeeResult.error) {
            const nextStatuses: Record<string, AttendeeStatus> = {};
            for (const attendee of attendeeResult.data || []) {
              nextStatuses[String(attendee.event_id)] = String(attendee.status || 'pending') as AttendeeStatus;
            }
            setAttendeeStatus(nextStatuses);
          }
        })();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a agenda compartilhada.');
    } finally {
      setLoading(false);
    }
  }

  const items = useMemo<TimelineItem[]>(() => {
    const extraEventIds = new Set(requests.filter(request => request.extra_visit).map(request => request.confirmed_event_id).filter(Boolean));
    const meetingItems: TimelineItem[] = events.filter(event => !extraEventIds.has(event.id)).map((event) => ({
      id: `event-${event.id}`,
      sourceId: event.id,
      kind: 'event',
      title: event.title,
      at: event.starts_at,
      state: dateState(event.starts_at),
      dateLabel: formatDay(event.starts_at),
      timeLabel: formatTime(event.starts_at),
      typeLabel: event.event_type==='meeting'?'Reunião':'Compromisso',
      statusLabel: event.cancelled_at ? 'Cancelado' : 'Confirmado',
      detailLabel: event.mode === 'in_person' ? `Presencial${event.billing_applies ? ' · adicional' : ''}` : 'Online',
      secondaryDetail: event.mode === 'in_person' && event.location ? event.location : undefined,
      meetingUrl: event.meeting_url,
      tone: event.cancelled_at ? 'negative' : 'positive',
    }));

    const deadlineItems: TimelineItem[] = deliverables.map((deliverable) => ({
      id: `deadline-${deliverable.id}`,
      sourceId: deliverable.id,
      kind: 'deadline',
      title: deliverable.title,
      at: String(deliverable.due_at),
      state: dateState(String(deliverable.due_at)),
      dateLabel: formatDay(String(deliverable.due_at)),
      timeLabel: 'Prazo',
      typeLabel: 'Entrega',
      statusLabel: statusText(deliverable.status),
      detailLabel: deliverable.project_name ? `Projeto: ${deliverable.project_name}` : 'Entregável da CALI',
      tone: 'pending',
    }));

    const requestItems: TimelineItem[] = requests.flatMap((request) => {
      const slots = requestSlots(request);
      const datedSlots = slots.length ? slots.slice(0, 2) : [null];
      const confirmed = ['confirmed','completed'].includes(request.status);
      const negative = ['declined','cancelled','not_occurred'].includes(request.status);
      return datedSlots.map((slot, index) => {
      const at = slot?.startsAt || request.extra_visit_previous_slot?.startsAt || request.created_at || new Date().toISOString();
      return {
        id: `request-${request.id}-${index}`,
        sourceId: request.id,
        kind: 'request',
        title: request.title || (request.request_mode === 'in_person' ? 'Visita presencial' : 'Reunião online'),
        at,
        state: dateState(at),
        dateLabel: formatDay(at),
        timeLabel: slot ? `${formatTime(at)}${slot.endsAt ? `–${formatTime(slot.endsAt)}` : ''}` : 'Horário pendente',
        typeLabel: request.extra_visit ? 'Visita extra' : request.online_extra_requested ? 'Papo online extra' : 'Solicitação',
        statusLabel: requestStatusText(request.status),
        detailLabel: `${request.request_mode === 'in_person' ? 'Presencial' : 'Online'}${request.extra_visit ? ' · extra' : request.billable_extra ? ' · adicional' : ''}`,
        secondaryDetail: optionsText(slots) || request.admin_note || undefined,
        tone: confirmed ? 'positive' : negative ? 'negative' : 'pending',
        request,
        requestOption: slot ? index + 1 : undefined,
        requestOptionCount: slots.length,
        endsAt: slot?.endsAt || null,
      };
      });
    });

    return [...meetingItems, ...deadlineItems, ...requestItems]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [events, deliverables, requests]);

  useEffect(() => {
    const open = (event: Event) => {
      const eventId = (event as CustomEvent<{ eventId: string }>).detail?.eventId;
      const item = items.find(candidate => candidate.kind === 'event' && candidate.sourceId === eventId) ||
        items.find(candidate => candidate.request?.confirmed_event_id === eventId);
      if (item) setSelectedItem(item);
    };
    window.addEventListener('cali:open-agenda-event', open);
    return () => window.removeEventListener('cali:open-agenda-event', open);
  }, [items]);

  const [noticeOpen, setNoticeOpen] = useState<string | null>(null);
  function openItem(item: TimelineItem) { if (item.id.startsWith('notice-')) { setNoticeOpen(String(item.sourceId)); return; } setChangeTarget(null); setChangeAction(null); setChangeError(''); setSelectedItem(item); }
  function beginChange(action:'cancel'|'reschedule') { setChangeAction(action); setChangeTarget(selectedItem); setSelectedItem(null); setChangeError(''); setChangeReason(''); setNewSlots(emptyChangeSlots()); }
  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured || !changeTarget || !changeAction || changeReason.trim().length < 5) { setChangeError('Conte brevemente o motivo da alteração.'); return; }
    if (changeAction === 'reschedule' && newSlots.some(slot => !slot.date || !slot.time)) { setChangeError('Informe duas novas opções de data e horário.'); return; }
    const originalDuration = changeTarget.kind === 'event' ? Math.max(30, (new Date(events.find(row=>row.id===changeTarget.sourceId)?.ends_at||'').getTime()-new Date(changeTarget.at).getTime())/60000 || 60) : 240;
    const slots = changeAction === 'reschedule' ? newSlots.map(slot => ({ startsAt: new Date(`${slot.date}T${slot.time}:00-03:00`).toISOString(), endsAt: new Date(new Date(`${slot.date}T${slot.time}:00-03:00`).getTime() + originalDuration * 60000).toISOString() })) : [];
    setChangeBusy(true); setChangeError('');
    const target = changeTarget.request?.extra_visit
      ? { kind: 'extra' as const, id: changeTarget.request.id }
      : { kind: 'event' as const, id: changeTarget.sourceId };
    const { error: changeFailure } = await requestAgendaChange(target, changeAction, changeReason, slots);
    if (changeFailure) setChangeError(changeFailure.message);
    else { setChangeTarget(null); setChangeAction(null); setChangeReason(''); setNewSlots(emptyChangeSlots()); await load(); }
    setChangeBusy(false);
  }

  const futureItems = items.filter((item) => (item.state !== 'past' || item.kind === 'request') && item.statusLabel !== 'Cancelado');
  const meetingHistory = items.filter(item => item.kind === 'event' && item.typeLabel === 'Reunião' && item.state === 'past').sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  const weekStart = new Date(weekCursor.getFullYear(),weekCursor.getMonth(),weekCursor.getDate()-weekCursor.getDay());
  const weekDays = Array.from({length:7},(_,index)=>new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+index));
  const filteredItems=[...items.filter(item=>visibleKinds.has(item.kind)),...noticeItems,...(visibleKinds.has('google')?personalGoogle.filter(personal=>!events.some(appointment=>!appointment.cancelled_at && (appointment.google_event_id===personal.sourceId || (appointment.title.trim().toLowerCase()===personal.title.trim().toLowerCase() && Math.abs(new Date(appointment.starts_at).getTime()-new Date(personal.at).getTime())<60000)))):[])].sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime());
  const moveWeek=(offset:number)=>setWeekCursor(current=>new Date(current.getFullYear(),current.getMonth(),current.getDate()+offset*7));
  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando sua agenda…</section></Shell>;

  return (
    <Shell role="client">
      <section className="v2-client-module"><WorkflowPage>
        <WorkflowHeading><div><small>ÁREA DA EMPRESA / ACOMPANHAMENTO</small><h1>Agenda compartilhada</h1><p>Reuniões, validações e marcos da assessoria em uma visão única.</p></div><Button type="button" variant="workflowPrimary" onClick={()=>window.dispatchEvent(new CustomEvent('cali:open-papo-request'))}><Plus size={15}/> Solicitar agendamento</Button></WorkflowHeading>
        <ClientGoogleCalendarSettings />
        <ClientSchedulingRequests />

        {error && <InlineNotice>{error}</InlineNotice>}
        {loading ? <LoadingState><Loader2 className="spin" size={20} />Carregando sua agenda…</LoadingState> : <>
          <section aria-label="Agenda da empresa">
            <WorkflowControls>
              <WorkflowSegments><button type="button" className={agendaView==='week'?'on':''} onClick={()=>setAgendaView('week')}>Semana</button><button type="button" className={agendaView==='month'?'on':''} onClick={()=>setAgendaView('month')}>Mês</button><button type="button" className={agendaView==='list'?'on':''} onClick={()=>setAgendaView('list')}>Lista</button></WorkflowSegments>
              {agendaView!=='list' && <>
                <Button variant="workflowIcon" type="button" aria-label={agendaView==='month'?'Mês anterior':'Semana anterior'} onClick={()=>agendaView==='month'?setWeekCursor(current=>new Date(current.getFullYear(),current.getMonth()-1,1,12)):moveWeek(-1)}><ChevronLeft size={15}/></Button>
                <strong>{agendaView==='month'?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(weekCursor):`${new Intl.DateTimeFormat('pt-BR',{day:'2-digit'}).format(weekDays[0])} a ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric'}).format(weekDays[6])}`}</strong>
                <Button variant="workflowIcon" type="button" aria-label={agendaView==='month'?'Próximo mês':'Próxima semana'} onClick={()=>agendaView==='month'?setWeekCursor(current=>new Date(current.getFullYear(),current.getMonth()+1,1,12)):moveWeek(1)}><ChevronRight size={15}/></Button>
                <Button variant="workflowIcon" type="button" onClick={()=>setWeekCursor(new Date())}>Hoje</Button>
              </>}
              <WorkflowControlsAside><small className="tw:mr-[0.462rem] tw:text-[0.769rem]/[inherit] tw:text-[#998c83]">{futureCountText(futureItems.filter(item=>item.kind!=='request'||['confirmed','completed'].includes(item.request?.status||'')).length)}</small><SlidersHorizontal size={15}/><fieldset className="tw:m-0 tw:flex tw:items-center tw:gap-3 tw:border-0 tw:p-0 tw:text-[0.846rem] tw:text-[#655b57] tw:max-[56.25rem]:flex-wrap"><legend className="tw:sr-only">Mostrar</legend>{([['event','Reuniões'],['request','Solicitações'],['deadline','Prazos'],['google','Minha agenda Google']] as const).map(([kind,label])=><label className="tw:inline-flex tw:items-center tw:gap-1.5" key={kind}><input className="tw:m-0 tw:accent-cali-brand" type="checkbox" checked={visibleKinds.has(kind)} onChange={()=>setVisibleKinds(current=>{const next=new Set(current);if(next.has(kind))next.delete(kind);else next.add(kind);return next})}/>{label}</label>)}</fieldset><Button variant="workflowIcon" type="button" className="tw:ml-[0.462rem] tw:gap-[0.462rem]!" onClick={()=>setHistoryOpen(true)}><FileText size={15}/> Histórico de reuniões</Button></WorkflowControlsAside>
            </WorkflowControls>
            {personalGoogleNotice&&<p className="tw:mx-[1.125rem]! tw:my-2! tw:text-xs tw:text-cali-muted" role="status">{personalGoogleNotice}</p>}
            {agendaView !== 'list' && <ClientTimelineCalendar view={agendaView} cursor={weekCursor} weekDays={weekDays}
              items={filteredItems} onOpenItem={openItem} onShowList={() => setAgendaView('list')} />}
            {agendaView==='list' && (filteredItems.length ? <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-[#e5d6ca] tw:bg-cali-surface">
              <div>
                {filteredItems.map((item) => {
                  const inviteStatus = item.kind === 'event' ? attendeeStatus[item.sourceId] : undefined;
                  const displayStatus = inviteStatus ? inviteText(inviteStatus) : item.statusLabel;
                  return <article key={item.id} className="tw:grid tw:grid-cols-[5.3125rem_minmax(9.375rem,1fr)_6.25rem_8.125rem_minmax(8.75rem,1fr)_auto] tw:items-center tw:gap-3 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:p-[1.125rem] tw:text-[0.6875rem] tw:text-[#867263] tw:max-[62.5rem]:grid-cols-[5.3125rem_1fr_auto] tw:max-[34.375rem]:grid-cols-[4.375rem_1fr]">
                    <div className="tw:flex tw:flex-col tw:gap-1 tw:text-[0.625rem] tw:text-[#a68b72]" data-label="Data / hora">
                      <strong className="tw:text-xs tw:text-cali-brand">{item.dateLabel}</strong>
                      <span>{item.timeLabel}</span>
                    </div>
                    <div className="tw:max-[62.5rem]:col-start-2 tw:max-[62.5rem]:row-start-2" data-label="Tipo">{item.typeLabel}</div>
                    <div data-label="Item"><strong className="tw:text-xs tw:text-[#52433a]">{item.title}</strong></div>
                    <div className="tw:max-[62.5rem]:col-start-3 tw:max-[62.5rem]:row-start-2 tw:max-[34.375rem]:col-start-2 tw:max-[34.375rem]:row-start-3" data-label="Status"><span>{displayStatus}</span></div>
                    <div className="tw:flex tw:flex-col tw:gap-1 tw:text-[0.625rem] tw:text-[#a38a75] tw:max-[62.5rem]:col-start-2 tw:max-[62.5rem]:row-start-3 tw:max-[34.375rem]:row-start-4" data-label="Detalhes">
                      {item.detailLabel && <strong>{item.detailLabel}</strong>}
                      {item.secondaryDetail && <small>{item.secondaryDetail}</small>}
                    </div>
                    <button className="tw:flex tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:border-solid tw:border-[#e4d6c9] tw:bg-cali-surface tw:p-2 tw:text-[0.625rem]! tw:text-cali-brand tw:max-[62.5rem]:col-start-3 tw:max-[62.5rem]:row-start-3 tw:max-[34.375rem]:col-start-2 tw:max-[34.375rem]:row-start-5" type="button" onClick={() => openItem(item)} aria-label={`Ver detalhes de ${item.title}`}>Ver detalhes <ArrowUpRight size={15}/></button>
                  </article>;
                })}
              </div>
            </div> : <EmptyState variant="workflow"><CalendarDays size={24} /><strong>Nada previsto por enquanto.</strong><p>Reuniões confirmadas, solicitações em análise e prazos publicados aparecerão aqui.</p></EmptyState>)}
          </section>
        </>}
      </WorkflowPage></section>
      {historyOpen && createPortal(<div className={styles.overlay} onMouseDown={event=>{if(event.target===event.currentTarget)setHistoryOpen(false)}}><DialogFrame className={styles.dialog} aria-label="Histórico de reuniões"><button type="button" className={`${styles.dialogClose} tw:absolute tw:top-5 tw:right-5`} onClick={()=>setHistoryOpen(false)} aria-label="Fechar histórico"><X size={20}/></button>
            <div className={styles.dialogHeader}><div><span className={styles.dialogKicker}>CONSULTAR ENCONTROS</span><h2 className={styles.dialogTitle}>Histórico de reuniões</h2></div></div>
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3"><label className="tw:inline-flex tw:items-center tw:gap-2 tw:text-[0.6875rem] tw:text-[#655b57]">Mês <input className="tw:rounded-md tw:border tw:border-solid tw:border-[#e7ddd5] tw:bg-white tw:px-2 tw:py-2 tw:text-[#322f2c]" type="month" value={historyMonth} onChange={event=>setHistoryMonth(event.target.value)}/></label><button type="button" className={`${styles.dialogClose} tw:text-[0.6875rem]! tw:font-semibold!`} onClick={()=>setHistoryMonth('')}>Todos os períodos</button></div>
            <div className="tw:mt-4 tw:flex tw:flex-col tw:gap-2">{meetingHistory.filter(item=>!historyMonth || monthOf(item.at)===historyMonth).map(item=><button type="button" className="tw:flex tw:w-full tw:cursor-pointer tw:flex-col tw:items-start tw:gap-1 tw:rounded-md tw:border tw:border-solid tw:border-[#eee5dd] tw:bg-cali-surface tw:px-3 tw:py-3 tw:text-left tw:text-[0.6875rem]! tw:text-[#655b57] tw:[&>small]:text-[0.625rem] tw:[&>span]:text-[0.625rem] tw:[&>small]:text-[#a18873] tw:[&>span]:text-[#a18873]" key={item.id} onClick={()=>{setHistoryOpen(false);openItem(item)}}><strong className="tw:text-xs tw:text-[#3e3533]">{item.title}</strong><span>{item.dateLabel} · {item.timeLabel}</span><small>{meetingRecords[item.sourceId]?.outcome==='occurred' ? 'Realizada' : 'Registro pendente'}{meetingRecords[item.sourceId]?.transcription_url || meetingRecords[item.sourceId]?.attachment_path ? ' · Transcrição disponível' : ''}</small></button>)}{!meetingHistory.length&&<p>As reuniões realizadas aparecerão aqui.</p>}</div>
          </DialogFrame></div>,document.body)}
      {selectedItem && createPortal(
        <div className={styles.overlay} onMouseDown={event => { if (event.currentTarget === event.target) setSelectedItem(null); }}>
          <DialogFrame className={styles.dialog} aria-labelledby="client-agenda-detail-title">
            <header className={styles.dialogHeader}><div><small className={styles.dialogKicker}>{selectedItem.typeLabel} · {selectedItem.statusLabel}</small><h2 className={styles.dialogTitle} id="client-agenda-detail-title">{selectedItem.title}</h2></div><button type="button" className={styles.dialogClose} onClick={() => setSelectedItem(null)} aria-label="Fechar"><X size={19}/></button></header>
            <div className={styles.detailBody}>
              {selectedItem.kind==='google' ? <><div className="tw:col-span-full"><span>Quando</span><strong>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(selectedItem.at))} · {selectedItem.timeLabel}{selectedItem.endsAt?`–${formatTime(selectedItem.endsAt)}`:''}</strong></div>{selectedItem.description&&<div className="tw:col-span-full"><span>Anotações</span><strong>{selectedItem.description}</strong></div>}{selectedItem.secondaryDetail&&<div className="tw:col-span-full"><span>Local</span><a className={styles.detailLink} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedItem.secondaryDetail)}`} target="_blank" rel="noopener noreferrer">{selectedItem.secondaryDetail} <ArrowUpRight size={15}/></a></div>}{selectedItem.googleHtmlLink&&<a className={styles.detailLink} href={selectedItem.googleHtmlLink} target="_blank" rel="noopener noreferrer">Abrir no Google Agenda <ArrowUpRight size={16}/></a>}</> : selectedItem.request ? <>
                <div className="tw:col-span-full"><span>{selectedItem.request.status === 'confirmed' ? 'Data confirmada' : `Data proposta${selectedItem.requestOptionCount && selectedItem.requestOptionCount > 1 ? ` · opção ${selectedItem.requestOption}` : ''}`}</span><strong>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(selectedItem.at))} · {selectedItem.timeLabel}</strong></div>
                <div><span>Situação</span><strong>{selectedItem.statusLabel}</strong></div>
                <div><span>Formato</span><strong>{selectedItem.detailLabel}</strong></div>
                {!['confirmed','completed','declined','cancelled','not_occurred'].includes(selectedItem.request.status) && <p className="tw:col-span-full tw:flex tw:items-start tw:gap-2" role="status"><AlertTriangle className="tw:shrink-0 tw:text-[#9a6627] tw:workspace-night:text-[#e8bd73]" size={20} aria-hidden="true"/><span>Esta data é apenas uma proposta em análise. Ainda não está confirmada nem reserva o horário.</span></p>}
                {selectedItem.request.location && <div className="tw:col-span-full"><span>Endereço</span><strong>{selectedItem.request.location}</strong></div>}
                {selectedItem.request.purpose && <div className="tw:col-span-full"><span>Objetivo informado</span><strong>{selectedItem.request.purpose}</strong></div>}
                {selectedItem.request.admin_note && <div className="tw:col-span-full"><span>Resposta da CALI</span><strong>{selectedItem.request.admin_note}</strong></div>}
                {selectedItem.request.extra_visit_change_reason && <div className="tw:col-span-full"><span>Sua justificativa</span><strong>{selectedItem.request.extra_visit_change_reason}</strong></div>}
                {selectedItem.request.extra_visit_cancellation_fee_cents != null && <div className="tw:col-span-full"><span>Condição da alteração</span><strong>{selectedItem.request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 após avaliação da CALI.' : 'Sem taxa de alteração.'} {selectedItem.request.extra_visit_cancellation_note}</strong></div>}
                {selectedItem.request.extra_visit && ['submitted','client_review','reschedule_review','confirmed'].includes(selectedItem.request.status) && <div className="tw:col-span-full tw:flex! tw:flex-row! tw:flex-wrap tw:gap-2">
                  {selectedItem.request.status === 'client_review' && <a className={styles.changeAction} href="#scheduling-v65-client-host" onClick={() => setSelectedItem(null)}>Responder às datas da CALI <ArrowUpRight size={16}/></a>}
                  <button type="button" className={styles.changeAction} onClick={() => beginChange('reschedule')}>Reagendar visita</button>
                  <button type="button" className={styles.changeAction} onClick={() => beginChange('cancel')}>Cancelar visita</button>
                </div>}
              </> : <>
                <div><span>{selectedItem.kind==='deadline'?'Prazo de entrega':'Quando'}</span><strong>{selectedItem.dateLabel}{selectedItem.kind==='deadline'?'':` · ${selectedItem.timeLabel}`}</strong></div>
                <div><span>Situação</span><strong>{selectedItem.statusLabel}</strong></div>
                {selectedItem.detailLabel && <div className={selectedItem.kind==='deadline'?'tw:col-span-full':undefined}><span>{selectedItem.kind==='deadline'?'Projeto':'Formato'}</span><strong>{selectedItem.kind==='deadline'?selectedItem.detailLabel.replace(/^Projeto: /,''):selectedItem.detailLabel}</strong></div>}
                {selectedItem.secondaryDetail && <div className="tw:col-span-full"><span>Local</span><strong>{selectedItem.secondaryDetail}</strong></div>}
                {selectedItem.meetingUrl && <a className={styles.detailLink} href={selectedItem.meetingUrl} target="_blank" rel="noopener noreferrer">Abrir Google Meet <ArrowUpRight size={16}/></a>}
                {meetingRecords[selectedItem.sourceId]?.outcome==='occurred' && <div className="tw:col-span-full"><span>Reunião realizada</span><strong>{meetingRecords[selectedItem.sourceId]?.transcription_note || 'O registro da reunião está disponível neste histórico.'}</strong></div>}
                {meetingRecords[selectedItem.sourceId]?.transcription_url && <a className={styles.detailLink} href={meetingRecords[selectedItem.sourceId].transcription_url!} target="_blank" rel="noopener noreferrer">Ver transcrição <ArrowUpRight size={16}/></a>}
                {meetingRecords[selectedItem.sourceId]?.attachment_path && <button className="tw:rounded-md tw:border tw:border-solid tw:border-[#e4d5c8] tw:bg-cali-surface tw:px-3 tw:py-2.5 tw:text-[0.6875rem]! tw:text-cali-brand" type="button" onClick={()=>void openMeetingFile(meetingRecords[selectedItem.sourceId])}>Abrir anexo · {meetingRecords[selectedItem.sourceId].attachment_name}</button>}
                {selectedItem.kind==='event' && selectedItem.typeLabel==='Reunião' && selectedItem.statusLabel!=='Cancelado' && new Date(selectedItem.at)>new Date() && !agendaChanges.some(row=>row.event_id===selectedItem.sourceId&&row.status==='pending') && <div className="tw:col-span-full tw:flex! tw:flex-row! tw:flex-wrap tw:gap-2"><button type="button" className={styles.changeAction} onClick={()=>beginChange('reschedule')}>Pedir reagendamento</button><button type="button" className={styles.changeAction} onClick={()=>beginChange('cancel')}>Pedir cancelamento</button></div>}
                {agendaChanges.filter(row=>row.event_id===selectedItem.sourceId).map(row=><div className="tw:col-span-full" key={row.id}><span>{row.action==='reschedule'?'Reagendamento':'Cancelamento'} · {row.status==='pending'?'Em análise':row.status==='approved'?'Aprovado':'Não aprovado'}</span><strong>{row.reason}{row.decision_note ? ` · Resposta da CALI: ${row.decision_note}` : ''}</strong></div>)}
              </>}
            </div>
          </DialogFrame>
        </div>, document.body)}
      {changeTarget && changeAction && createPortal(<div className={styles.overlay} onMouseDown={event=>{if(event.target===event.currentTarget&&!changeBusy)setChangeTarget(null)}}><DialogFrame className={styles.dialog} role="alertdialog" aria-labelledby="agenda-change-title"><header className={styles.dialogHeader}><div><small className={styles.dialogKicker}>{changeTarget.request?.extra_visit?'VISITA EXTRA':'REUNIÃO'}</small><h2 className={styles.dialogTitle} id="agenda-change-title">{changeAction==='cancel'?'Pedir cancelamento':'Sugerir novas datas'}</h2></div><button type="button" className={styles.dialogClose} onClick={()=>setChangeTarget(null)} aria-label="Fechar"><X size={19}/></button></header><form className="tw:grid tw:gap-4 tw:py-2.5 tw:[&_input]:rounded-md tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-cali-line tw:[&_input]:p-2 tw:[&_textarea]:w-full tw:[&_textarea]:rounded-md tw:[&_textarea]:border tw:[&_textarea]:border-solid tw:[&_textarea]:border-cali-line tw:[&_textarea]:p-2" onSubmit={submitChange}><p><strong>{changeTarget.title}</strong> · {changeTarget.dateLabel} {changeTarget.timeLabel}</p><p>Conte o motivo para a CALI analisar. Uma taxa eventual depende da antecedência, da justificativa e das condições aceitas no seu contrato. Nada é cobrado automaticamente.</p>{changeAction==='reschedule'&&<><p>As novas opções precisam ter pelo menos 48 horas úteis de antecedência e ocorrer de segunda a sexta, entre 9h e 16h.</p><div className="tw:my-4 tw:grid tw:gap-3">{newSlots.map((slot,index)=><fieldset className="tw:flex tw:flex-wrap tw:gap-2.5 tw:rounded-md tw:border tw:border-solid tw:border-[#e4d5c8] tw:p-3" key={slot.id}><legend className="tw:text-[0.6875rem] tw:text-[#9c7e65]">Opção {index+1}</legend><input aria-label={`Data da opção ${index+1}`} type="date" required value={slot.date} onChange={event=>setNewSlots(current=>current.map((row,i)=>i===index?{...row,date:event.target.value}:row))}/><input aria-label={`Horário da opção ${index+1}`} type="time" min="09:00" max={changeTarget.request?.extra_visit?'12:00':'16:00'} required value={slot.time} onChange={event=>setNewSlots(current=>current.map((row,i)=>i===index?{...row,time:event.target.value}:row))}/></fieldset>)}</div></>}<label>Justificativa<textarea required minLength={5} value={changeReason} onChange={event=>setChangeReason(event.target.value)} placeholder="O que mudou na sua agenda?"/></label>{changeError&&<p className="tw:text-[0.6875rem] tw:text-cali-danger" role="alert">{changeError}</p>}<div className="tw:mt-4 tw:flex tw:justify-end tw:gap-2.5"><button type="button" className={styles.dialogClose} onClick={()=>setChangeTarget(null)}>Voltar</button><button type="submit" className={styles.changeAction} disabled={changeBusy}>{changeBusy?'Enviando…':'Confirmar pedido'}</button></div></form></DialogFrame></div>,document.body)}
      {noticeOpen && <NoticeCalendarCard noticeId={noticeOpen} href={`/cliente/avisos?aviso=${noticeOpen}`} onClose={() => setNoticeOpen(null)} />}
    </Shell>
  );
}
