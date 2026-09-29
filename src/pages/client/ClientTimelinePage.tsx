import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CalendarDays, Clock3, FileCheck2, Loader2, X } from 'lucide-react';
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
};

type ClientDeliverable = {
  id: string;
  title: string;
  status: string;
  due_at?: string | null;
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
  kind: 'event' | 'deadline' | 'request';
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
  if (status === 'declined') return 'Não confirmado';
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

function nextRequestSlot(slots: Slot[]) {
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return sorted.find((slot) => new Date(slot.startsAt).getTime() >= Date.now()) || sorted[0] || null;
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
  useEffect(() => { if (!selectedItem) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedItem(null); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [selectedItem]);

  useEffect(() => { void load(); }, []);
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

      const [eventResult, deliverableResult, requestResult] = await Promise.all([
        supabase
          .from('events')
          .select('id,title,starts_at,ends_at,mode,location,meeting_url,description,event_type,sync_status,schedule_class,billing_applies')
          .eq('company_id', companyId)
          .eq('visibility', 'client')
          .is('cancelled_at', null)
          .order('starts_at'),
        supabase
          .from('deliverables')
          .select('id,title,status,due_at')
          .eq('company_id', companyId)
          .eq('client_visible', true)
          .not('due_at', 'is', null)
          .neq('status', 'cancelled')
          .order('due_at'),
        supabase
          .from('scheduling_requests')
          .select('id,title,status,request_mode,requested_slots,admin_proposed_slots,selected_slot,billable_extra,urgency_level,created_at,extra_visit,purpose,location,admin_note,client_note,confirmed_event_id,extra_visit_change_reason,extra_visit_previous_slot,extra_visit_cancellation_fee_cents,extra_visit_cancellation_note')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }).limit(100),
      ]);

      if (eventResult.error) throw eventResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (requestResult.error) throw requestResult.error;

      const nextEvents = (eventResult.data || []) as ClientEvent[];
      setEvents(nextEvents);
      setDeliverables((deliverableResult.data || []) as ClientDeliverable[]);
      setRequests(((requestResult.data || []) as ClientSchedulingRequest[]).filter(request => request.extra_visit || ['submitted','client_review','reschedule_review'].includes(request.status)));
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
      typeLabel: 'Reunião',
      statusLabel: 'Confirmado',
      detailLabel: event.mode === 'in_person' ? `Presencial${event.billing_applies ? ' · adicional' : ''}` : 'Online',
      secondaryDetail: event.mode === 'in_person' && event.location ? event.location : undefined,
      meetingUrl: event.meeting_url,
      tone: 'positive',
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
      tone: 'pending',
    }));

    const requestItems: TimelineItem[] = requests.map((request) => {
      const slots = requestSlots(request);
      const slot = nextRequestSlot(slots);
      const at = slot?.startsAt || request.extra_visit_previous_slot?.startsAt || request.created_at || new Date().toISOString();
      const confirmed = ['confirmed','completed'].includes(request.status);
      const negative = ['declined','cancelled','not_occurred'].includes(request.status);
      return {
        id: `request-${request.id}`,
        sourceId: request.id,
        kind: 'request',
        title: request.title,
        at,
        state: dateState(at),
        dateLabel: confirmed ? formatDay(at) : negative ? 'Histórico' : 'Em análise',
        timeLabel: confirmed ? formatTime(at) : slots.length ? `${slots.length} ${slots.length === 1 ? 'opção' : 'opções'}` : 'Horário pendente',
        typeLabel: request.extra_visit ? 'Visita extra' : 'Solicitação',
        statusLabel: requestStatusText(request.status),
        detailLabel: `${request.request_mode === 'in_person' ? 'Presencial' : 'Online'}${request.extra_visit ? ' · extra' : request.billable_extra ? ' · adicional' : ''}`,
        secondaryDetail: optionsText(slots) || request.admin_note || undefined,
        tone: confirmed ? 'positive' : negative ? 'negative' : 'pending',
        request,
      };
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

  function openItem(item: TimelineItem) { setChangeAction(null); setChangeError(''); setSelectedItem(item); }
  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedItem?.request || !changeAction || changeReason.trim().length < 5) { setChangeError('Conte brevemente o motivo da alteração.'); return; }
    if (changeAction === 'reschedule' && newSlots.some(slot => !slot.date || !slot.time)) { setChangeError('Informe duas novas opções de data e horário.'); return; }
    const slots = changeAction === 'reschedule' ? newSlots.map(slot => ({ startsAt: new Date(`${slot.date}T${slot.time}:00-03:00`).toISOString(), endsAt: new Date(new Date(`${slot.date}T${slot.time}:00-03:00`).getTime() + 4 * 3600000).toISOString() })) : [];
    setChangeBusy(true); setChangeError('');
    const { error: changeFailure } = await supabase.rpc('client_change_extra_visit_v2', { p_request_id: selectedItem.request.id, p_action: changeAction, p_reason: changeReason.trim(), p_slots: changeAction === 'reschedule' ? slots : [] });
    if (changeFailure) setChangeError(changeFailure.message);
    else { setSelectedItem(null); setChangeAction(null); setChangeReason(''); setNewSlots([{date:'',time:''},{date:'',time:''}]); await load(); }
    setChangeBusy(false);
  }

  const futureItems = items.filter((item) => item.state !== 'past' || item.kind === 'request');
  const nextMeeting = events.find((event) => new Date(event.starts_at).getTime() >= Date.now()) || null;
  const nextThirty = futureItems.filter((item) => new Date(item.at).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000).length;

  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando sua agenda…</section></Shell>;

  return (
    <Shell role="client">
      <section className="page client-timeline-v2 client-timeline-v3 client-timeline-v4">
        <ClientGoogleCalendarPanel />

        {error && <div className="inline-notice">{error}</div>}
        {loading ? <div className="data-loading"><Loader2 className="spin" size={20} />Carregando sua agenda…</div> : <>
          <section className="client-timeline-summary">
            <article>
              <CalendarDays size={18} />
              <div><span>PRÓXIMO COMPROMISSO</span><strong>{nextMeeting ? formatDay(nextMeeting.starts_at) : 'Sem agenda futura'}</strong><small>{nextMeeting ? `${nextMeeting.title} · ${formatTime(nextMeeting.starts_at)}` : 'Nenhuma reunião confirmada.'}</small></div>
            </article>
            <article>
              <FileCheck2 size={18} />
              <div><span>PRAZOS VISÍVEIS</span><strong>{deliverables.length}</strong><small>Entregas com data publicada.</small></div>
            </article>
            <article>
              <Clock3 size={18} />
              <div><span>PRÓXIMOS 30 DIAS</span><strong>{nextThirty}</strong><small>Reuniões, solicitações e prazos.</small></div>
            </article>
          </section>

          <section className="panel client-real-timeline-panel client-agenda-panel">
            <div className="client-real-timeline-title">
              <div><span>O QUE VEM AGORA</span><h2>Agenda compartilhada</h2></div>
              <small>{futureCountText(futureItems.length)}</small>
            </div>

            {items.length ? <div className="client-agenda-table">
              <div className="client-agenda-body">
                {items.map((item) => {
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
            </div> : <div className="client-timeline-empty"><CalendarDays size={24} /><strong>Nada previsto por enquanto.</strong><p>Reuniões confirmadas, solicitações em análise e prazos publicados aparecerão aqui.</p></div>}
          </section>
        </>}
      </section>
      {selectedItem && createPortal(
        <div className="client-agenda-detail-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setSelectedItem(null); }}>
          <section className={`client-agenda-detail-modal tone-${selectedItem.tone || 'pending'}`} role="dialog" aria-modal="true" aria-labelledby="client-agenda-detail-title">
            <header><div><small>{selectedItem.typeLabel} · {selectedItem.statusLabel}</small><h2 id="client-agenda-detail-title">{selectedItem.title}</h2></div><button type="button" onClick={() => setSelectedItem(null)} aria-label="Fechar"><X size={19}/></button></header>
            <div className="client-agenda-detail-body">
              {selectedItem.request ? <>
                <div className="full"><span>{selectedItem.request.status === 'confirmed' ? 'Data confirmada' : 'Datas informadas'}</span><strong>{optionsText(requestSlots(selectedItem.request)) || 'Sem nova data definida'}</strong></div>
                <div><span>Situação</span><strong>{selectedItem.statusLabel}</strong></div>
                <div><span>Formato</span><strong>{selectedItem.detailLabel}</strong></div>
                {selectedItem.request.location && <div className="full"><span>Endereço</span><strong>{selectedItem.request.location}</strong></div>}
                {selectedItem.request.purpose && <div className="full"><span>Objetivo informado</span><strong>{selectedItem.request.purpose}</strong></div>}
                {selectedItem.request.admin_note && <div className="full"><span>Resposta da CALI</span><strong>{selectedItem.request.admin_note}</strong></div>}
                {selectedItem.request.extra_visit_change_reason && <div className="full"><span>Sua justificativa</span><strong>{selectedItem.request.extra_visit_change_reason}</strong></div>}
                {selectedItem.request.extra_visit_cancellation_fee_cents != null && <div className="full"><span>Condição da alteração</span><strong>{selectedItem.request.extra_visit_cancellation_fee_cents ? 'Taxa de R$ 160,00 após avaliação da CALI.' : 'Sem taxa de alteração.'} {selectedItem.request.extra_visit_cancellation_note}</strong></div>}
                {selectedItem.request.extra_visit && ['submitted','client_review','reschedule_review','confirmed'].includes(selectedItem.request.status) && <div className="full client-agenda-actions">
                  {selectedItem.request.status === 'client_review' && <a href="#scheduling-v65-client-host" onClick={() => setSelectedItem(null)}>Responder às datas da CALI <ArrowUpRight size={16}/></a>}
                  <button type="button" onClick={() => { setChangeAction('reschedule'); setChangeError(''); }}>Reagendar visita</button>
                  <button type="button" onClick={() => { setChangeAction('cancel'); setChangeError(''); }}>Cancelar visita</button>
                </div>}
                {changeAction && selectedItem.request.extra_visit && <form className="client-visit-change-form full" onSubmit={submitChange}>
                  <strong>{changeAction === 'cancel' ? 'Cancelar esta visita' : 'Sugerir novas datas'}</strong>
                  <p>Conte o motivo. A CALI analisa a alteração e eventual taxa de R$ 160,00. Com antecedência, a taxa pode ser dispensada; pedidos no dia da visita podem gerar cobrança conforme a avaliação. Nada é cobrado automaticamente.</p>
                  {changeAction === 'reschedule' && <div className="client-visit-change-slots">{newSlots.map((slot, index) => <fieldset key={index}><legend>Opção {index + 1}</legend><input aria-label={`Data da opção ${index + 1}`} type="date" required value={slot.date} onChange={event => setNewSlots(current => current.map((row, i) => i === index ? {...row,date:event.target.value} : row))}/><input aria-label={`Horário da opção ${index + 1}`} type="time" min="09:00" max="12:00" required value={slot.time} onChange={event => setNewSlots(current => current.map((row, i) => i === index ? {...row,time:event.target.value} : row))}/></fieldset>)}</div>}
                  <label>Justificativa<textarea required minLength={5} value={changeReason} onChange={event => setChangeReason(event.target.value)} placeholder="O que mudou na sua agenda?"/></label>
                  {changeError && <p className="client-visit-change-error" role="alert">{changeError}</p>}
                  <div className="client-visit-change-buttons"><button type="button" onClick={() => setChangeAction(null)}>Voltar</button><button type="submit" disabled={changeBusy}>{changeBusy ? 'Enviando…' : 'Enviar à CALI'}</button></div>
                </form>}
              </> : <>
                <div><span>Quando</span><strong>{selectedItem.dateLabel} · {selectedItem.timeLabel}</strong></div>
                <div><span>Estado</span><strong>{selectedItem.statusLabel}</strong></div>
                {selectedItem.detailLabel && <div><span>Formato</span><strong>{selectedItem.detailLabel}</strong></div>}
                {selectedItem.secondaryDetail && <div className="full"><span>Local</span><strong>{selectedItem.secondaryDetail}</strong></div>}
                {selectedItem.meetingUrl && <a href={selectedItem.meetingUrl} target="_blank" rel="noopener noreferrer">Abrir Google Meet <ArrowUpRight size={16}/></a>}
              </>}
            </div>
          </section>
        </div>, document.body)}
    </Shell>
  );
}
