import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, FileText, Loader2, X } from 'lucide-react';
import { ClientGoogleCalendarPanel } from '../../components/ClientGoogleCalendarPanel';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';

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
  const [newSlots, setNewSlots] = useState([{ date: '', time: '' }, { date: '', time: '' }]);
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeTarget, setChangeTarget] = useState<TimelineItem | null>(null);
  const [meetingRecords, setMeetingRecords] = useState<Record<string, MeetingRecord>>({});
  const [agendaChanges, setAgendaChanges] = useState<AgendaChange[]>([]);
  const [historyMonth, setHistoryMonth] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const selectionStart = useRef<{day:string;minutes:number;pointerId:number;startY:number}|null>(null);
  const lastHorizontalMove = useRef(0);
  const [selectionPreview, setSelectionPreview] = useState<{day:string;top:number;height:number}|null>(null);
  const [agendaView, setAgendaView] = useState<'week'|'list'>('week');
  const [weekCursor, setWeekCursor] = useState(() => new Date());
  const [visibleKinds, setVisibleKinds] = useState<Set<TimelineItem['kind']>>(() => new Set(['event','request','deadline']));
  const [personalGoogle, setPersonalGoogle] = useState<TimelineItem[]>([]);
  const [personalGoogleNotice, setPersonalGoogleNotice] = useState('');
  useEffect(() => { if (!selectedItem) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedItem(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [selectedItem]);

  useEffect(() => { void load(); }, []);
  useEffect(()=>{
    if(!supabase||!visibleKinds.has('google')){setPersonalGoogle([]);setPersonalGoogleNotice('');return;}
    let current=true;
    const first=new Date(weekCursor.getFullYear(),weekCursor.getMonth(),weekCursor.getDate()-weekCursor.getDay());
    const last=new Date(first.getFullYear(),first.getMonth(),first.getDate()+7);
    void supabase.functions.invoke('workspace-google-calendar-read',{body:{action:'client_events',start:first.toISOString(),end:last.toISOString()}}).then(({data,error})=>{
      if(!current)return;
      if(error||data?.state!=='checked'){setPersonalGoogle([]);setPersonalGoogleNotice(data?.state==='reconnect_required'?'Conecte sua conta em “Integração com Google Calendar” para ver seus compromissos pessoais.':'Não foi possível consultar seus eventos do Google agora.');return;}
      setPersonalGoogleNotice('');
      setPersonalGoogle((data.events||[]).map((row:any):TimelineItem=>{const start=row.allDay?`${row.start}T12:00:00-03:00`:String(row.start);return {id:`personal-${row.calendarId}-${row.id}`,sourceId:String(row.id),kind:'google',title:String(row.title||'Compromisso'),at:start,endsAt:row.allDay?null:row.end,googleHtmlLink:row.htmlLink,description:row.description,secondaryDetail:row.location,color:/^#[0-9a-f]{6}$/i.test(row.color)?row.color:null,textColor:/^#[0-9a-f]{6}$/i.test(row.textColor)?row.textColor:null,allDay:Boolean(row.allDay),dateLabel:formatDay(start),timeLabel:row.allDay?'Dia inteiro':formatTime(start),state:dateState(start),typeLabel:'Google Agenda',statusLabel:'Compromisso pessoal',tone:'pending'}}));
    });
    return()=>{current=false};
  },[weekCursor,visibleKinds]);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client.channel('client-agenda-current').on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'scheduling_requests' }, () => { void load(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [user?.id]);

  async function refreshGoogleStatuses(rows: ClientEvent[]) {
    if (!supabase) return;
    const candidates = rows
      .filter((event) => event.sync_status === 'synced' && new Date(event.starts_at).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
      .slice(0, 6);
    await Promise.allSettled(candidates.map((event) => supabase!.functions.invoke('google-calendar-refresh-event', { body: { eventId: event.id } })));
  }
  async function openMeetingFile(record: MeetingRecord) {
    if (!supabase || !record.attachment_path) return;
    const {data,error:failure}=await supabase.storage.from('cali-workspace-private').createSignedUrl(record.attachment_path,120);
    if (failure || !data?.signedUrl) { setError('Não foi possível abrir o anexo da reunião.'); return; }
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const profile = await supabase.from('profiles').select('company_id,email').eq('id', userId).maybeSingle();
      if (profile.error) throw profile.error;
      const companyId = profile.data?.company_id;
      const clientEmail = String(profile.data?.email || user?.email || '').trim().toLowerCase();
      if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

      const [eventResult, deliverableResult, requestResult, recordResult, changeResult, projectResult] = await Promise.all([
        supabase
          .from('events')
          .select('id,title,starts_at,ends_at,mode,location,meeting_url,description,event_type,sync_status,schedule_class,billing_applies,source_type,cancelled_at')
          .eq('company_id', companyId)
          .eq('visibility', 'client')
          .order('starts_at'),
        supabase
          .from('deliverables')
          .select('id,title,status,due_at,project_id')
          .eq('company_id', companyId)
          .eq('client_visible', true)
          .not('due_at', 'is', null)
          .neq('status', 'cancelled')
          .order('due_at'),
        supabase
          .from('scheduling_requests')
          .select('id,title,status,request_mode,requested_slots,admin_proposed_slots,selected_slot,billable_extra,urgency_level,created_at,extra_visit,online_extra_requested,purpose,location,admin_note,client_note,confirmed_event_id,extra_visit_change_reason,extra_visit_previous_slot,extra_visit_cancellation_fee_cents,extra_visit_cancellation_note')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }).limit(100),
        supabase.rpc('client_meeting_records_v1'),
        supabase.from('agenda_change_requests').select('id,event_id,action,reason,slots,status,decision_note,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100),
        supabase.from('projects').select('id,name').eq('company_id',companyId),
      ]);

      if (eventResult.error) throw eventResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (requestResult.error) throw requestResult.error;
      if (recordResult.error) throw recordResult.error;
      if (changeResult.error) throw changeResult.error;
      if (projectResult.error) throw projectResult.error;

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
          const attendeeResult = await supabase
            .from('event_attendees')
            .select('event_id,email,status')
            .in('event_id', nextEvents.map((event) => event.id))
            .eq('email', clientEmail);
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

  function openItem(item: TimelineItem) { setChangeTarget(null); setChangeAction(null); setChangeError(''); setSelectedItem(item); }
  function beginChange(action:'cancel'|'reschedule') { setChangeAction(action); setChangeTarget(selectedItem); setSelectedItem(null); setChangeError(''); setChangeReason(''); setNewSlots([{date:'',time:''},{date:'',time:''}]); }
  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !changeTarget || !changeAction || changeReason.trim().length < 5) { setChangeError('Conte brevemente o motivo da alteração.'); return; }
    if (changeAction === 'reschedule' && newSlots.some(slot => !slot.date || !slot.time)) { setChangeError('Informe duas novas opções de data e horário.'); return; }
    const originalDuration = changeTarget.kind === 'event' ? Math.max(30, (new Date(events.find(row=>row.id===changeTarget.sourceId)?.ends_at||'').getTime()-new Date(changeTarget.at).getTime())/60000 || 60) : 240;
    const slots = changeAction === 'reschedule' ? newSlots.map(slot => ({ startsAt: new Date(`${slot.date}T${slot.time}:00-03:00`).toISOString(), endsAt: new Date(new Date(`${slot.date}T${slot.time}:00-03:00`).getTime() + originalDuration * 60000).toISOString() })) : [];
    setChangeBusy(true); setChangeError('');
    const { error: changeFailure } = changeTarget.request?.extra_visit
      ? await supabase.rpc('client_change_extra_visit_v2', { p_request_id: changeTarget.request.id, p_action: changeAction, p_reason: changeReason.trim(), p_slots: slots })
      : await supabase.rpc('client_request_agenda_change_v1', { p_event_id: changeTarget.sourceId, p_action: changeAction, p_reason: changeReason.trim(), p_slots: slots });
    if (changeFailure) setChangeError(changeFailure.message);
    else { setChangeTarget(null); setChangeAction(null); setChangeReason(''); setNewSlots([{date:'',time:''},{date:'',time:''}]); await load(); }
    setChangeBusy(false);
  }

  const futureItems = items.filter((item) => (item.state !== 'past' || item.kind === 'request') && item.statusLabel !== 'Cancelado');
  const meetingHistory = items.filter(item => item.kind === 'event' && item.typeLabel === 'Reunião' && item.state === 'past').sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  const weekStart = new Date(weekCursor.getFullYear(),weekCursor.getMonth(),weekCursor.getDate()-weekCursor.getDay());
  const weekDays = Array.from({length:7},(_,index)=>new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+index));
  const weekKey = (value:string|Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(value instanceof Date?value:new Date(value));
  const inputDate = (value:Date) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  const filteredItems=[...items.filter(item=>visibleKinds.has(item.kind)),...(visibleKinds.has('google')?personalGoogle:[])].sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime());
  const moveWeek=(offset:number)=>setWeekCursor(current=>new Date(current.getFullYear(),current.getMonth(),current.getDate()+offset*7));
  function scrollWeeks(event:ReactWheelEvent<HTMLDivElement>){
    if(Math.abs(event.deltaX)<22||Math.abs(event.deltaX)<Math.abs(event.deltaY))return;
    const element=event.currentTarget,atEdge=event.deltaX<0?element.scrollLeft<2:element.scrollLeft+element.clientWidth>=element.scrollWidth-2;
    if(atEdge&&Date.now()-lastHorizontalMove.current>550){lastHorizontalMove.current=Date.now();moveWeek(event.deltaX>0?1:-1)}
  }
  function selectHourStart(day:Date,hour:number,event:ReactPointerEvent<HTMLDivElement>){
    if(day.getDay()===0||day.getDay()===6||hour<9||hour>=16)return;
    const minutes=hour*60+Math.min(45,Math.max(0,Math.floor((event.clientY-event.currentTarget.getBoundingClientRect().top)/16)*15));
    const key=inputDate(day);
    selectionStart.current={day:key,minutes,pointerId:event.pointerId,startY:event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionPreview({day:key,top:(minutes-7*60)/60*64,height:32});
  }
  function selectHourMove(event:ReactPointerEvent<HTMLDivElement>){
    const start=selectionStart.current;if(!start||start.pointerId!==event.pointerId)return;
    const elapsed=Math.max(30,Math.min(90,Math.ceil((event.clientY-start.startY)/16)*15));
    setSelectionPreview({day:start.day,top:(start.minutes-7*60)/60*64,height:elapsed/60*64});
  }
  function selectHourEnd(event:ReactPointerEvent<HTMLDivElement>){
    const start=selectionStart.current;if(!start||start.pointerId!==event.pointerId)return;
    const elapsed=Math.max(30,Math.min(90,Math.ceil((event.clientY-start.startY)/16)*15));
    selectionStart.current=null;setSelectionPreview(null);
    const hours=Math.floor(start.minutes/60),minutes=start.minutes%60;
    window.dispatchEvent(new CustomEvent('cali:open-papo-request',{detail:{date:start.day,time:`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`,duration:elapsed}}));
  }

  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando sua agenda…</section></Shell>;

  return (
    <Shell role="client">
      <section className="page client-timeline-v2 client-timeline-v3 client-timeline-v4">
        <details className="client-google-settings"><summary><CalendarDays size={19} aria-hidden="true"/><span><strong>Conecte sua agenda Google</strong><small>Acompanhe os compromissos da CALI na sua agenda e veja seus eventos pessoais aqui. O filtro “Minha agenda Google” controla a visualização nesta tela.</small></span><span className="client-google-settings-action">Ver integração</span></summary><ClientGoogleCalendarPanel /></details>

        {error && <div className="inline-notice">{error}</div>}
        {loading ? <div className="data-loading"><Loader2 className="spin" size={20} />Carregando sua agenda…</div> : <>
          <section className="panel client-real-timeline-panel client-agenda-panel">
            <div className="client-real-timeline-title">
              <div><span>O QUE VEM AGORA</span><h2>Agenda e Planejamento</h2></div>
              <div className="client-agenda-heading-actions"><small>{futureCountText(futureItems.filter(item=>item.kind!=='request'||['confirmed','completed'].includes(item.request?.status||'')).length)}</small><button type="button" onClick={()=>setHistoryOpen(true)}><FileText size={17}/> Histórico de reuniões</button></div>
            </div>

            <div className="client-agenda-view-controls"><div><button type="button" className={agendaView==='week'?'active':''} onClick={()=>setAgendaView('week')}>Semana</button><button type="button" className={agendaView==='list'?'active':''} onClick={()=>setAgendaView('list')}>Lista</button></div><fieldset><legend>Mostrar</legend>{([['event','Reuniões'],['request','Solicitações'],['deadline','Prazos'],['google','Minha agenda Google']] as const).map(([kind,label])=><label key={kind}><input type="checkbox" checked={visibleKinds.has(kind)} onChange={()=>setVisibleKinds(current=>{const next=new Set(current);if(next.has(kind))next.delete(kind);else next.add(kind);return next})}/>{label}</label>)}</fieldset></div>
            {personalGoogleNotice&&<p className="client-google-week-notice" role="status">{personalGoogleNotice}</p>}
            {agendaView==='week' && <>
              <div className="client-week-navigation calendar-navigation">
                <button type="button" className="calendar-icon-button" onClick={()=>moveWeek(-1)} aria-label="Semana anterior"><ChevronLeft size={18}/></button>
                <button type="button" className="secondary calendar-today-button" onClick={()=>setWeekCursor(new Date())}>Hoje</button>
                <button type="button" className="calendar-icon-button" onClick={()=>moveWeek(1)} aria-label="Próxima semana"><ChevronRight size={18}/></button>
                <strong>{new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short'}).format(weekDays[0])} — {new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'short',year:'numeric'}).format(weekDays[6])}</strong>
              </div>
              <div className="calendar-week-scroller client-week-scroller" onWheel={scrollWeeks}><div className="calendar-week-view client-week-grid">
                <div className="calendar-week-corner"/>
                {weekDays.map(day=><div className="calendar-week-day-head" key={`head-${day.toISOString()}`}><span>{new Intl.DateTimeFormat('pt-BR',{weekday:'short',timeZone:'America/Sao_Paulo'}).format(day).replace('.','')}</span><strong>{new Intl.DateTimeFormat('pt-BR',{day:'numeric',timeZone:'America/Sao_Paulo'}).format(day)}</strong></div>)}
                <div className="calendar-week-all-day-label">Dia inteiro</div>
                {weekDays.map(day=><div className="calendar-week-all-day" key={`all-${day.toISOString()}`}>
                  {filteredItems.filter(item=>item.allDay&&weekKey(item.at)===weekKey(day)).map(item=><button type="button" className="calendar-week-all-day-event is-workspace" key={item.id} onClick={()=>openItem(item)}>{item.title}</button>)}
                </div>)}
                <div className="calendar-week-axis" style={{height:13*64}}>{Array.from({length:13},(_,index)=><span key={index} style={{top:index*64}}>{String(index+7).padStart(2,'0')}:00</span>)}</div>
                {weekDays.map(day=><div className={`calendar-week-lane client-week-lane ${day.getDay()===0||day.getDay()===6?'is-closed':''}`} style={{height:13*64}} key={`lane-${day.toISOString()}`}>
                  {Array.from({length:13},(_,index)=><div key={index} className={`calendar-week-hour-hit ${day.getDay()===0||day.getDay()===6||index+7<9||index+7>=16?'is-closed':'is-selectable'}`} style={{top:index*64,height:64}} onPointerDown={event=>selectHourStart(day,index+7,event)} onPointerMove={selectHourMove} onPointerUp={selectHourEnd} onPointerCancel={()=>{selectionStart.current=null;setSelectionPreview(null)}} title={day.getDay()===0||day.getDay()===6||index+7<9||index+7>=16?'Fora do horário de solicitações':'Selecione um horário para solicitar um encontro'}/>)}
                  {selectionPreview?.day===inputDate(day)&&<div className="client-week-selection" style={{top:selectionPreview.top,height:selectionPreview.height}}>Horário selecionado</div>}
                  {filteredItems.filter(item=>!item.allDay&&weekKey(item.at)===weekKey(day)).map((item,index,dayItems)=>{
                    const start=new Date(item.at);
                    const hour=start.getHours()+start.getMinutes()/60;
                    const matchingEvent=events.find(event=>event.id===item.sourceId);
                    const end=item.endsAt?new Date(item.endsAt).getTime():matchingEvent?.ends_at?new Date(matchingEvent.ends_at).getTime():item.request?.selected_slot?.endsAt?new Date(item.request.selected_slot.endsAt).getTime():start.getTime()+30*60000;
                    const duration=Math.max(15,Math.min(13*60,(end-start.getTime())/60000));
                    const top=Math.max(0,(hour-7)*64);
                    const overlap=dayItems.slice(0,index).filter(other=>new Date(other.at).getTime()<end&&new Date(other.endsAt||events.find(event=>event.id===other.sourceId)?.ends_at||new Date(new Date(other.at).getTime()+30*60000)).getTime()>start.getTime()).length;
                    const offset=Math.min(overlap*11,33);
                    const rgb=item.color&&/^#[0-9a-f]{6}$/i.test(item.color)?[1,3,5].map(position=>parseInt(item.color!.slice(position,position+2),16)):null;
                    const foreground=rgb&&rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150?'#30232a':'#ffffff';
                    const isPreview=item.kind==='request'&&!['confirmed','completed'].includes(item.request?.status||'');
                    const detail=item.kind==='request'?`${item.requestOptionCount&&item.requestOptionCount>1?`Opção ${item.requestOption} · `:''}${item.request?.extra_visit||item.request?.online_extra_requested?'Extra · ':''}${item.statusLabel}`:item.kind==='deadline'?`Prazo · ${item.detailLabel||item.statusLabel}`:item.kind==='google'?'Google Agenda':'Workspace';
                    return <button type="button" key={item.id} className={`calendar-week-event client-week-event ${item.kind} tone-${item.tone||'pending'} ${item.kind==='google'?'is-google':'is-workspace'} ${isPreview?'is-preview':''} ${duration<36?'is-compact':''}`} style={{top,height:Math.max(3,duration/60*64-2),left:offset,width:`calc(100% - ${offset}px)`,zIndex:1+overlap,...(item.kind==='google'&&item.color?{'--event-color':item.color,'--event-foreground':foreground} as React.CSSProperties:{})}} onClick={()=>openItem(item)} title={`${item.title} · ${item.dateLabel} ${item.timeLabel}`}>
                      <strong>{item.title}</strong><time>{item.timeLabel}{item.endsAt?`–${formatTime(item.endsAt)}`:''}</time><small>{detail}</small>
                    </button>;
                  })}
                </div>)}
              </div></div>
            </>}

            {agendaView==='list' && (filteredItems.length ? <div className="client-agenda-table">
              <div className="client-agenda-body">
                {filteredItems.map((item) => {
                  const inviteStatus = item.kind === 'event' ? attendeeStatus[item.sourceId] : undefined;
                  const displayStatus = inviteStatus ? inviteText(inviteStatus) : item.statusLabel;
                  return <article key={item.id} className={`client-agenda-row ${item.kind} ${item.state} tone-${item.tone || 'pending'}`}>
                    <div className="client-agenda-date" data-label="Data / hora">
                      <strong>{item.dateLabel}</strong>
                      <span>{item.timeLabel}</span>
                    </div>
                    <div className="client-agenda-type" data-label="Tipo">{item.typeLabel}</div>
                    <div className="client-agenda-item" data-label="Item"><strong>{item.title}</strong></div>
                    <div className="client-agenda-status" data-label="Status"><span>{displayStatus}</span></div>
                    <div className="client-agenda-detail" data-label="Detalhes">
                      {item.detailLabel && <strong>{item.detailLabel}</strong>}
                      {item.secondaryDetail && <small>{item.secondaryDetail}</small>}
                    </div>
                    <button className="client-agenda-open" type="button" onClick={() => openItem(item)} aria-label={`Ver detalhes de ${item.title}`}>Ver detalhes <ArrowUpRight size={15}/></button>
                  </article>;
                })}
              </div>
            </div> : <div className="client-timeline-empty"><CalendarDays size={24} /><strong>Nada previsto por enquanto.</strong><p>Reuniões confirmadas, solicitações em análise e prazos publicados aparecerão aqui.</p></div>)}
          </section>
        </>}
      </section>
      {historyOpen && createPortal(<div className="client-agenda-detail-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setHistoryOpen(false)}}><section className="panel client-meeting-history client-meeting-history-modal" role="dialog" aria-modal="true" aria-label="Histórico de reuniões"><button type="button" className="client-meeting-history-close" onClick={()=>setHistoryOpen(false)} aria-label="Fechar histórico"><X size={20}/></button>
            <div className="client-real-timeline-title"><div><span>CONSULTAR ENCONTROS</span><h2>Histórico de reuniões</h2></div></div>
            <div className="client-meeting-history-controls"><label>Mês <input type="month" value={historyMonth} onChange={event=>setHistoryMonth(event.target.value)}/></label><button type="button" onClick={()=>setHistoryMonth('')}>Todos os períodos</button></div>
            <div className="client-meeting-history-list">{meetingHistory.filter(item=>!historyMonth || monthOf(item.at)===historyMonth).map(item=><button type="button" key={item.id} onClick={()=>{setHistoryOpen(false);openItem(item)}}><strong>{item.title}</strong><span>{item.dateLabel} · {item.timeLabel}</span><small>{meetingRecords[item.sourceId]?.outcome==='occurred' ? 'Realizada' : 'Registro pendente'}{meetingRecords[item.sourceId]?.transcription_url || meetingRecords[item.sourceId]?.attachment_path ? ' · Transcrição disponível' : ''}</small></button>)}{!meetingHistory.length&&<p>As reuniões realizadas aparecerão aqui.</p>}</div>
          </section></div>,document.body)}
      {selectedItem && createPortal(
        <div className="client-agenda-detail-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setSelectedItem(null); }}>
          <section className={`client-agenda-detail-modal tone-${selectedItem.tone || 'pending'}`} role="dialog" aria-modal="true" aria-labelledby="client-agenda-detail-title">
            <header><div><small>{selectedItem.typeLabel} · {selectedItem.statusLabel}</small><h2 id="client-agenda-detail-title">{selectedItem.title}</h2></div><button type="button" onClick={() => setSelectedItem(null)} aria-label="Fechar"><X size={19}/></button></header>
            <div className="client-agenda-detail-body">
              {selectedItem.kind==='google' ? <><div className="full"><span>Quando</span><strong>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(selectedItem.at))} · {selectedItem.timeLabel}{selectedItem.endsAt?`–${formatTime(selectedItem.endsAt)}`:''}</strong></div>{selectedItem.description&&<div className="full"><span>Anotações</span><strong>{selectedItem.description}</strong></div>}{selectedItem.secondaryDetail&&<div className="full"><span>Local</span><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedItem.secondaryDetail)}`} target="_blank" rel="noopener noreferrer">{selectedItem.secondaryDetail} <ArrowUpRight size={15}/></a></div>}{selectedItem.googleHtmlLink&&<a href={selectedItem.googleHtmlLink} target="_blank" rel="noopener noreferrer">Abrir no Google Agenda <ArrowUpRight size={16}/></a>}</> : selectedItem.request ? <>
                <div className="full client-request-dates"><span>{selectedItem.request.status === 'confirmed' ? 'Data confirmada' : `Data proposta${selectedItem.requestOptionCount && selectedItem.requestOptionCount > 1 ? ` · opção ${selectedItem.requestOption}` : ''}`}</span><strong>{new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date(selectedItem.at))} · {selectedItem.timeLabel}</strong></div>
                <div className="client-request-status"><span>Situação</span><strong>{selectedItem.statusLabel}</strong></div>
                <div><span>Formato</span><strong>{selectedItem.detailLabel}</strong></div>
                {!['confirmed','completed','declined','cancelled','not_occurred'].includes(selectedItem.request.status) && <p className="full client-request-preview-note" role="status"><AlertTriangle size={20} aria-hidden="true"/><span>Esta data é apenas uma proposta em análise. Ainda não está confirmada nem reserva o horário.</span></p>}
                {selectedItem.request.location && <div className="full"><span>Endereço</span><strong>{selectedItem.request.location}</strong></div>}
                {selectedItem.request.purpose && <div className="full"><span>Objetivo informado</span><strong>{selectedItem.request.purpose}</strong></div>}
                {selectedItem.request.admin_note && <div className="full"><span>Resposta da CALI</span><strong>{selectedItem.request.admin_note}</strong></div>}
                {selectedItem.request.extra_visit_change_reason && <div className="full"><span>Sua justificativa</span><strong>{selectedItem.request.extra_visit_change_reason}</strong></div>}
                {selectedItem.request.extra_visit_cancellation_fee_cents != null && <div className="full"><span>Condição da alteração</span><strong>{selectedItem.request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 após avaliação da CALI.' : 'Sem taxa de alteração.'} {selectedItem.request.extra_visit_cancellation_note}</strong></div>}
                {selectedItem.request.extra_visit && ['submitted','client_review','reschedule_review','confirmed'].includes(selectedItem.request.status) && <div className="full client-agenda-actions">
                  {selectedItem.request.status === 'client_review' && <a href="#scheduling-v65-client-host" onClick={() => setSelectedItem(null)}>Responder às datas da CALI <ArrowUpRight size={16}/></a>}
                  <button type="button" onClick={() => beginChange('reschedule')}>Reagendar visita</button>
                  <button type="button" onClick={() => beginChange('cancel')}>Cancelar visita</button>
                </div>}
              </> : <>
                <div><span>{selectedItem.kind==='deadline'?'Prazo de entrega':'Quando'}</span><strong>{selectedItem.dateLabel}{selectedItem.kind==='deadline'?'':` · ${selectedItem.timeLabel}`}</strong></div>
                <div><span>Situação</span><strong>{selectedItem.statusLabel}</strong></div>
                {selectedItem.detailLabel && <div className={selectedItem.kind==='deadline'?'full':undefined}><span>{selectedItem.kind==='deadline'?'Projeto':'Formato'}</span><strong>{selectedItem.kind==='deadline'?selectedItem.detailLabel.replace(/^Projeto: /,''):selectedItem.detailLabel}</strong></div>}
                {selectedItem.secondaryDetail && <div className="full"><span>Local</span><strong>{selectedItem.secondaryDetail}</strong></div>}
                {selectedItem.meetingUrl && <a href={selectedItem.meetingUrl} target="_blank" rel="noopener noreferrer">Abrir Google Meet <ArrowUpRight size={16}/></a>}
                {meetingRecords[selectedItem.sourceId]?.outcome==='occurred' && <div className="full"><span>Reunião realizada</span><strong>{meetingRecords[selectedItem.sourceId]?.transcription_note || 'O registro da reunião está disponível neste histórico.'}</strong></div>}
                {meetingRecords[selectedItem.sourceId]?.transcription_url && <a href={meetingRecords[selectedItem.sourceId].transcription_url!} target="_blank" rel="noopener noreferrer">Ver transcrição <ArrowUpRight size={16}/></a>}
                {meetingRecords[selectedItem.sourceId]?.attachment_path && <button className="client-meeting-file" type="button" onClick={()=>void openMeetingFile(meetingRecords[selectedItem.sourceId])}>Abrir anexo · {meetingRecords[selectedItem.sourceId].attachment_name}</button>}
                {selectedItem.kind==='event' && selectedItem.typeLabel==='Reunião' && selectedItem.statusLabel!=='Cancelado' && new Date(selectedItem.at)>new Date() && !agendaChanges.some(row=>row.event_id===selectedItem.sourceId&&row.status==='pending') && <div className="full client-agenda-actions"><button type="button" onClick={()=>beginChange('reschedule')}>Pedir reagendamento</button><button type="button" onClick={()=>beginChange('cancel')}>Pedir cancelamento</button></div>}
                {agendaChanges.filter(row=>row.event_id===selectedItem.sourceId).map(row=><div className="full" key={row.id}><span>{row.action==='reschedule'?'Reagendamento':'Cancelamento'} · {row.status==='pending'?'Em análise':row.status==='approved'?'Aprovado':'Não aprovado'}</span><strong>{row.reason}{row.decision_note ? ` · Resposta da CALI: ${row.decision_note}` : ''}</strong></div>)}
              </>}
            </div>
          </section>
        </div>, document.body)}
      {changeTarget && changeAction && createPortal(<div className="client-agenda-detail-backdrop client-agenda-change-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!changeBusy)setChangeTarget(null)}}><section className="client-agenda-change-modal" role="alertdialog" aria-modal="true" aria-labelledby="agenda-change-title"><header><div><small>{changeTarget.request?.extra_visit?'VISITA EXTRA':'REUNIÃO'}</small><h2 id="agenda-change-title">{changeAction==='cancel'?'Pedir cancelamento':'Sugerir novas datas'}</h2></div><button type="button" onClick={()=>setChangeTarget(null)} aria-label="Fechar"><X size={19}/></button></header><form className="client-visit-change-form" onSubmit={submitChange}><p><strong>{changeTarget.title}</strong> · {changeTarget.dateLabel} {changeTarget.timeLabel}</p><p>Conte o motivo para a CALI analisar. Uma taxa eventual depende da antecedência, da justificativa e das condições aceitas no seu contrato. Nada é cobrado automaticamente.</p>{changeAction==='reschedule'&&<><p>As novas opções precisam ter pelo menos 48 horas úteis de antecedência e ocorrer de segunda a sexta, entre 9h e 16h.</p><div className="client-visit-change-slots">{newSlots.map((slot,index)=><fieldset key={index}><legend>Opção {index+1}</legend><input aria-label={`Data da opção ${index+1}`} type="date" required value={slot.date} onChange={event=>setNewSlots(current=>current.map((row,i)=>i===index?{...row,date:event.target.value}:row))}/><input aria-label={`Horário da opção ${index+1}`} type="time" min="09:00" max={changeTarget.request?.extra_visit?'12:00':'16:00'} required value={slot.time} onChange={event=>setNewSlots(current=>current.map((row,i)=>i===index?{...row,time:event.target.value}:row))}/></fieldset>)}</div></>}<label>Justificativa<textarea required minLength={5} value={changeReason} onChange={event=>setChangeReason(event.target.value)} placeholder="O que mudou na sua agenda?"/></label>{changeError&&<p className="client-visit-change-error" role="alert">{changeError}</p>}<div className="client-visit-change-buttons"><button type="button" onClick={()=>setChangeTarget(null)}>Voltar</button><button type="submit" disabled={changeBusy}>{changeBusy?'Enviando…':'Confirmar pedido'}</button></div></form></section></div>,document.body)}
    </Shell>
  );
}
