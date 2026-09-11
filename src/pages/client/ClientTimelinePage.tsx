import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Clock3, FileCheck2, Loader2 } from 'lucide-react';
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
  const proposed = slotsOf(request.admin_proposed_slots);
  const requested = slotsOf(request.requested_slots);
  return request.status === 'client_review' && proposed.length ? proposed : requested;
}

function nextRequestSlot(slots: Slot[]) {
  const sorted = [...slots].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return sorted.find((slot) => new Date(slot.startsAt).getTime() >= Date.now()) || sorted[0] || null;
}

function optionsText(slots: Slot[]) {
  return slots.slice(0, 2).map((slot) => `${formatDay(slot.startsAt)} · ${formatTime(slot.startsAt)}`).join(' / ');
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

  useEffect(() => { void load(); }, []);

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
          .select('id,title,status,request_mode,requested_slots,admin_proposed_slots,billable_extra,urgency_level,created_at')
          .eq('company_id', companyId)
          .in('status', ['submitted', 'client_review', 'reschedule_review'])
          .order('created_at', { ascending: false }),
      ]);

      if (eventResult.error) throw eventResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (requestResult.error) throw requestResult.error;

      const nextEvents = (eventResult.data || []) as ClientEvent[];
      setEvents(nextEvents);
      setDeliverables((deliverableResult.data || []) as ClientDeliverable[]);
      setRequests((requestResult.data || []) as ClientSchedulingRequest[]);
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
    const meetingItems: TimelineItem[] = events.map((event) => ({
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
    }));

    const requestItems: TimelineItem[] = requests.map((request) => {
      const slots = requestSlots(request);
      const slot = nextRequestSlot(slots);
      const at = slot?.startsAt || request.created_at || new Date().toISOString();
      return {
        id: `request-${request.id}`,
        sourceId: request.id,
        kind: 'request',
        title: request.title,
        at,
        state: dateState(at),
        dateLabel: 'Em análise',
        timeLabel: slots.length ? `${slots.length} ${slots.length === 1 ? 'opção' : 'opções'}` : 'Horário pendente',
        typeLabel: 'Solicitação',
        statusLabel: requestStatusText(request.status),
        detailLabel: `${request.request_mode === 'in_person' ? 'Presencial' : 'Online'}${request.billable_extra ? ' · adicional' : ''}`,
        secondaryDetail: optionsText(slots) || undefined,
      };
    });

    return [...meetingItems, ...deadlineItems, ...requestItems]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [events, deliverables, requests]);

  const futureItems = items.filter((item) => item.state !== 'past' || item.kind === 'request');
  const nextMeeting = events.find((event) => new Date(event.starts_at).getTime() >= Date.now()) || null;
  const nextThirty = futureItems.filter((item) => new Date(item.at).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000).length;

  if(loading)return <Shell role="client"><section className="page data-loading" aria-live="polite" aria-busy="true">Carregando sua agenda…</section></Shell>;

  return (
    <Shell role="client">
      <section className="page client-timeline-v2 client-timeline-v3">
        <div className="eyebrow">PLANEJAMENTO COMPARTILHADO</div>
        <div className="page-heading client-timeline-heading">
          <div>
            <h1>Agenda e próximos passos</h1>
            <p>Reuniões, validações e prazos publicados pela CALI para a sua empresa, em uma única leitura.</p>
          </div>
        </div>

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
              <div className="client-agenda-columns" aria-hidden="true">
                <span>Data / hora</span>
                <span>Tipo</span>
                <span>Item</span>
                <span>Status</span>
                <span>Detalhes</span>
              </div>
              <div className="client-agenda-body">
                {items.map((item) => {
                  const inviteStatus = item.kind === 'event' ? attendeeStatus[item.sourceId] : undefined;
                  const displayStatus = inviteStatus ? inviteText(inviteStatus) : item.statusLabel;
                  return <article key={item.id} className={`client-agenda-row ${item.kind} ${item.state}`}>
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
                      {item.meetingUrl && <a href={item.meetingUrl} target="_blank" rel="noreferrer">Abrir Meet <ArrowUpRight size={14} /></a>}
                    </div>
                  </article>;
                })}
              </div>
            </div> : <div className="client-timeline-empty"><CalendarDays size={24} /><strong>Nada previsto por enquanto.</strong><p>Reuniões confirmadas, solicitações em análise e prazos publicados aparecerão aqui.</p></div>}
          </section>
        </>}
      </section>
    </Shell>
  );
}
