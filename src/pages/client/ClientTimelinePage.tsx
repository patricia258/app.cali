import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, Clock3, FileCheck2, Loader2, MapPin, Video } from 'lucide-react';
import { ClientGoogleCalendarPanel } from '../../components/ClientGoogleCalendarPanel';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

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
};

type ClientDeliverable = {
  id: string;
  title: string;
  status: string;
  due_at?: string | null;
};

type TimelineItem = {
  id: string;
  sourceId: string;
  kind: 'event' | 'deadline';
  title: string;
  at: string;
  subtitle: string;
  state: 'past' | 'today' | 'future';
  meetingUrl?: string | null;
  mode?: string | null;
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

function inviteText(status?: AttendeeStatus) {
  if (status === 'accepted') return 'Convite aceito';
  if (status === 'declined') return 'Convite recusado';
  if (status === 'tentative') return 'Talvez';
  if (status === 'pending') return 'Aguardando resposta';
  return '';
}

export function ClientTimelinePage() {
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([]);
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const profile = await supabase.from('profiles').select('company_id,email').eq('id', userId).maybeSingle();
      if (profile.error) throw profile.error;
      const companyId = profile.data?.company_id;
      const clientEmail = String(profile.data?.email || userData.user?.email || '').trim().toLowerCase();
      if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

      const [eventResult, deliverableResult] = await Promise.all([
        supabase
          .from('events')
          .select('id,title,starts_at,ends_at,mode,location,meeting_url,description,event_type,sync_status')
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
      ]);

      if (eventResult.error) throw eventResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      const nextEvents = (eventResult.data || []) as ClientEvent[];
      setEvents(nextEvents);
      setDeliverables((deliverableResult.data || []) as ClientDeliverable[]);

      // Atualiza no Google antes de mostrar aceite/recusa na plataforma.
      await refreshGoogleStatuses(nextEvents);
      if (nextEvents.length && clientEmail) {
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
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a agenda compartilhada.');
    } finally {
      setLoading(false);
    }
  }

  const items = useMemo<TimelineItem[]>(() => {
    const meetingItems = events.map((event) => ({
      id: `event-${event.id}`,
      sourceId: event.id,
      kind: 'event' as const,
      title: event.title,
      at: event.starts_at,
      subtitle: `${event.mode === 'in_person' ? 'Presencial' : 'Reunião compartilhada'} · ${formatTime(event.starts_at)}${event.location && event.mode === 'in_person' ? ` · ${event.location}` : ''}`,
      state: dateState(event.starts_at),
      meetingUrl: event.meeting_url,
      mode: event.mode,
    }));
    const deadlineItems = deliverables.map((deliverable) => ({
      id: `deadline-${deliverable.id}`,
      sourceId: deliverable.id,
      kind: 'deadline' as const,
      title: deliverable.title,
      at: String(deliverable.due_at),
      subtitle: `Prazo da entrega · ${statusText(deliverable.status)}`,
      state: dateState(String(deliverable.due_at)),
      meetingUrl: null,
      mode: null,
    }));
    return [...meetingItems, ...deadlineItems].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [events, deliverables]);

  const futureItems = items.filter((item) => item.state !== 'past');
  const nextMeeting = events.find((event) => new Date(event.starts_at).getTime() >= Date.now()) || null;
  const nextThirty = futureItems.filter((item) => new Date(item.at).getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000).length;

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
              <div><span>PRÓXIMO COMPROMISSO</span><strong>{nextMeeting ? formatDay(nextMeeting.starts_at) : 'Sem agenda futura'}</strong><small>{nextMeeting ? `${nextMeeting.title} · ${formatTime(nextMeeting.starts_at)}` : 'Nada publicado pela CALI neste momento.'}</small></div>
            </article>
            <article>
              <FileCheck2 size={18} />
              <div><span>PRAZOS VISÍVEIS</span><strong>{deliverables.length}</strong><small>Entregas com data publicada para sua empresa.</small></div>
            </article>
            <article>
              <Clock3 size={18} />
              <div><span>PRÓXIMOS 30 DIAS</span><strong>{nextThirty}</strong><small>Reuniões e prazos previstos no período.</small></div>
            </article>
          </section>

          <section className="panel client-real-timeline-panel">
            <div className="client-real-timeline-title">
              <div><span>O QUE VEM AGORA</span><h2>Agenda compartilhada</h2></div>
              <small>{futureItems.length ? `${futureItems.length} item(ns) futuro(s)` : 'Sem pendências futuras'}</small>
            </div>

            {items.length ? <div className="client-real-timeline-list">
              {items.map((item) => {
                const inviteStatus = item.kind === 'event' ? attendeeStatus[item.sourceId] : undefined;
                return <article key={item.id} className={`client-real-timeline-row ${item.state}`}>
                  <div className={`client-real-timeline-marker ${item.kind}`}>
                    {item.kind === 'event' ? (item.mode === 'in_person' ? <MapPin size={18} /> : <Video size={18} />) : <FileCheck2 size={18} />}
                  </div>
                  <time>{formatDay(item.at)}<span>{item.kind === 'event' ? formatTime(item.at) : 'prazo'}</span></time>
                  <div className="client-real-timeline-copy">
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                    {inviteStatus && <span className={`client-invite-status ${inviteStatus}`}>{inviteText(inviteStatus)}</span>}
                  </div>
                  {item.meetingUrl ? <a href={item.meetingUrl} target="_blank" rel="noreferrer">Abrir Meet <ArrowUpRight size={15} /></a> : <span className="client-real-timeline-kind">{item.kind === 'event' ? 'Compromisso' : 'Entrega'}</span>}
                </article>;
              })}
            </div> : <div className="client-timeline-empty"><CalendarDays size={24} /><strong>Nenhum compromisso ou prazo publicado ainda.</strong><p>Quando a CALI compartilhar uma reunião ou definir um prazo visível, ele aparecerá aqui automaticamente.</p></div>}
          </section>
        </>}
      </section>
    </Shell>
  );
}
