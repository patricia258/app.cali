import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useRef, useState } from 'react';
import { capacityOf, percentLabel } from '../../../lib/capacity';
import { CapacityBar } from '../../../components/hours/CapacityBar';
import { ClientHomeNotices } from '../../notices/NoticesBoard';
import { Link } from '../../../components/navigation/Link';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronRight, FileText,
  Loader2, MessageCircle, Star,
} from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { ClientHomeTeam } from './components/ClientHomeTeam';
import { ClientDocumentBrandCover } from './components/ClientDocumentBrandCover';
import { subscribeClientDeliveryReality } from '../../../api/projects/client-delivery';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { readClientHomeOverview, type DashboardData, type Deliverable } from '../../../api/client/home/overview';
import './client-home-responsibles.css';

// Cores aprovadas das etiquetas de prazo, por situação real da entrega (sem tom = creme, em andamento).
const milestoneTone: Record<string, string> = { approved: 'green', client_review: 'purple', internal_review: 'purple', not_started: 'red', adjustment_requested: 'red', rebriefing: 'red' };
const statusLabel: Record<string, string> = {
  not_started: 'Não iniciado', in_progress: 'Em andamento', standby: 'Em espera',
  internal_review: 'Revisão CALI', client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado', rebriefing: 'Em rebriefing',
  approved: 'Aprovado', cancelled: 'Cancelado',
};

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
function firstName(name?: string | null) {
  return (name || 'Olá').split(' ')[0] || 'Olá';
}
const planLabels: Record<string, string> = {
  partner: 'CALI Partner',
};
function planLabel(value?: string | null) {
  if (!value) return null;
  const key = value.trim().toLocaleLowerCase('pt-BR');
  if (planLabels[key]) return planLabels[key];
  const clean = value.trim();
  return clean.toLocaleLowerCase('pt-BR').startsWith('cali ') ? clean : `CALI ${clean.charAt(0).toUpperCase()}${clean.slice(1)}`;
}
function formatDate(value?: string | null) {
  if (!value) return 'A definir';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'A definir';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}
function deliveryDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function deliveryTimeline(items: Deliverable[]) {
  const dated = items.map((item) => deliveryDate(item.due_at)?.getTime()).filter((time): time is number => time != null);
  if (!dated.length) return null;
  const day = 24 * 60 * 60 * 1000;
  const first = Math.min(...dated);
  const last = Math.max(...dated);
  const span = Math.max(14 * day, last - first + 4 * day);
  const start = first - (span - (last - first)) / 2;
  return { start, span, ticks: [start, start + span / 2, start + span] };
}
function formatEventDate(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date),
  };
}
function currentMonthBounds() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return { start: `${prefix}-01`, end: `${prefix}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` };
}
export function ClientDashboard() {
  const { user } = useWorkspaceAuth();
  return <ClientDashboardContent key={user?.id} userId={user?.id} />;
}

function ClientDashboardContent({ userId }: { userId: string | undefined }) {
  const [data, setData] = useState<DashboardData>({ company: null, profile: null, responsibles: null, projects: [], deliverables: [], events: [], minutes: 0, hoursVisible: false, contractedHours: 0, hoursLoadError: false, nps: null, npsCount: 0, completionPct: 0, workMetrics: null, unlinkedHourEntries: 0, reportCount: null, latestDocument: null, documentCount: null, openOccurrenceCount: null, latestOccurrence: null, occurrenceLoadError: false });
  const [occurrenceLogoUrl, setOccurrenceLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshTimer = useRef<number | null>(null);
  const loadingRef = useRef(false);
  const refreshPendingRef = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void load(true);
    return () => {
      mounted.current = false;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const logo = data.company?.logo_url || data.company?.logo_workspace_url;
    if (!logo) { setOccurrenceLogoUrl(''); return; }
    void resolveWorkspaceMedia(logo, 86400).then(async (url) => url || resolveWorkspaceMedia(data.company?.logo_workspace_url, 86400)).then((url) => { if (active) setOccurrenceLogoUrl(url); });
    return () => { active = false; };
  }, [data.company?.logo_workspace_url, data.company?.logo_url]);

  useEffect(() => {
    const companyId = data.company?.id;
    if (!companyId) return;
    const queueRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void load(false), 260);
    };
    const unsubscribe = subscribeClientDeliveryReality(companyId, queueRefresh);
    const onFocus = () => queueRefresh();
    const onVisible = () => { if (!document.hidden) queueRefresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const fallback = window.setInterval(() => { if (!document.hidden) queueRefresh(); }, 30_000);
    return () => { unsubscribe(); window.clearInterval(fallback); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, [data.company?.id]);

  async function load(showLoading = false) {
    if (loadingRef.current) { refreshPendingRef.current = true; return; }
    loadingRef.current = true;
    if (showLoading) setLoading(true);
    setError('');
    try {
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const overview = await readClientHomeOverview(userId, new Date().toISOString(), currentMonthBounds());
      if (mounted.current) setData(overview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar sua área.');
    } finally {
      loadingRef.current = false;
      if (showLoading) setLoading(false);
      if (refreshPendingRef.current && mounted.current) {
        refreshPendingRef.current = false;
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => void load(false), 260);
      }
    }
  }

  const activeProject = data.projects.find((project) => !['completed', 'cancelled'].includes(project.status)) || data.projects[0] || null;
  const cycleDeliverables = activeProject ? data.deliverables.filter((item) => item.project_id === activeProject.id) : data.deliverables;
  const projectDeliverables = cycleDeliverables.filter((item) => item.status !== 'cancelled');
  const visibleDeliverables = [...projectDeliverables].sort((a, b) => {
    const aDate = deliveryDate(a.due_at)?.getTime() ?? Infinity;
    const bDate = deliveryDate(b.due_at)?.getTime() ?? Infinity;
    return aDate - bDate;
  }).slice(0, 4);
  const timeline = deliveryTimeline(visibleDeliverables);
  const approvedCount = projectDeliverables.filter((item) => item.status === 'approved').length;
  const pendingCount = projectDeliverables.length - approvedCount;
  const cancelledCount = cycleDeliverables.length - projectDeliverables.length;
  const cycleTotal = cycleDeliverables.length;
  const cycleBreakdown = [
    { label: 'Aprovadas', count: approvedCount, color: '#367B60' },
    { label: 'Pendentes', count: pendingCount, color: '#E3A536' },
    { label: 'Canceladas', count: cancelledCount, color: '#B84D51' },
  ];
  const work = data.workMetrics;
  const deliveryStages = [
    { label: 'Não iniciadas', count: work?.notStarted || 0 },
    { label: 'Em andamento', count: work?.inProgress || 0 },
    { label: 'Revisão CALI', count: work?.internalReview || 0 },
    { label: 'Com o cliente', count: work?.withClient || 0 },
    { label: 'Concluídas', count: work?.completed || 0 },
  ];
  const highestStageCount = Math.max(1, ...deliveryStages.map((stage) => stage.count));
  const waiting = data.deliverables.filter((item) => item.status === 'client_review');
  const showHours = data.hoursVisible;
  const contractedMinutes = showHours ? data.contractedHours * 60 : 0;
  const hoursProgress = contractedMinutes > 0 ? Math.min(100, Math.max(0, data.minutes / contractedMinutes * 100)) : 0;
  const hoursPercentage = contractedMinutes > 0 ? Math.round(data.minutes / contractedMinutes * 100) : 0;
  const packageName = planLabel(data.company?.service_plan) || planLabel(data.company?.service_type) || 'Contratação CALI';
  const latestOccurrence = data.latestOccurrence;
  const occurrenceStatus = latestOccurrence?.workflow_status || 'recorded';
  const occurrenceStatusText: Record<string, string> = { open: 'Aberta', in_progress: 'Em andamento', waiting_client: 'Aguardando você', standby: 'Em espera', completed: 'Encerrada', cancelled: 'Cancelada', recorded: 'Registrada' };
  const occurrenceDays = latestOccurrence ? Math.max(0, Math.floor((Date.now() - new Date(latestOccurrence.occurred_at).getTime()) / 86400000)) : 0;

  if (loading) return <Shell role="client"><section className="client-home"><LoadingState><Loader2 className="spin" size={20} />Preparando sua área CALI…</LoadingState></section></Shell>;

  const contact = data.responsibles?.executive;
  const supportPartner = data.responsibles?.supportPartner;
  const contactName = contact?.full_name || 'Patrícia Lima';
  const contactRole = contact?.job_title || 'People Advisory Executive';

  return <Shell role="client">
    <section className="client-home">
      {error && <InlineNotice>{error}</InlineNotice>}

      <div className="ch-content">
      <div className="ch-greeting">
        <div><span className="ch-overline">SUA PARCERIA COM A CALI</span><h1>Olá, {data.profile?.full_name ? firstName(data.profile.full_name) : 'seja bem-vinda'}.</h1><p>Veja o que aconteceu e o que vem a seguir na sua assessoria.</p></div>
        <div className="ch-executive">
          <div className="ch-executive-photo">{contact?.avatar_url ? <img src={contact.avatar_url} alt={contactName} style={{ objectPosition: `${Number(contact.avatar_position_x || 50)}% ${Number(contact.avatar_position_y || 50)}%`, transform: `scale(${Number(contact.avatar_zoom || 1)})` }} /> : contactName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}</div>
          <div>
            <small>RESPONSÁVEL EXECUTIVA DA CONTA</small><strong>{contactName}</strong><span>{contactRole}</span>
            {supportPartner && <><small className="ch-support-label">PARTNER DE APOIO</small><strong>{supportPartner.full_name}</strong></>}
          </div>
        </div>
      </div>

      <div className="ch-contract-wrap">
        <aside className="ch-contract" aria-label="Sua contratação">
          <div className="ch-contract-top"><div className="ch-contract-name">
            <div className="ch-company-logo">
              {occurrenceLogoUrl ? <img src={occurrenceLogoUrl} alt="" /> : <>{(data.company?.display_name || 'C').trim().charAt(0).toUpperCase()}<span>·</span></>}
            </div>
            <div className="ch-contract-main"><small>SUA CONTRATAÇÃO</small><h2>{packageName}</h2><span>{data.company?.display_name || 'Conta CALI'}</span></div>
          </div>
          <div className="ch-contract-figures">
            {showHours && data.contractedHours > 0 ? <>
              <div className="ch-contract-stat"><strong>{data.contractedHours}h</strong><span>contratadas no mês</span></div>
              <div className="ch-contract-stat"><strong>{formatHours(data.minutes)}</strong><span>consumidas no mês</span></div>
              <div className={`ch-contract-stat ${capacityOf(data.contractedHours, data.minutes).excessMinutes > 0 ? 'v2-stat-over' : ''}`}><strong>{percentLabel(capacityOf(data.contractedHours, data.minutes).usagePercent)}</strong><span>utilizados</span></div>
            </> : showHours ? <div className="ch-contract-stat wide"><strong>{formatHours(data.minutes)}</strong><span>consumidas no mês · franquia não definida</span></div> : <div className="ch-contract-stat wide"><strong>{data.hoursLoadError ? 'Indisponível' : activeProject ? 'Ativo' : 'Em preparação'}</strong><span>{data.hoursLoadError ? 'horas do mês' : 'ciclo atual'}</span></div>}
          </div>
          </div>
          {contractedMinutes > 0 && <div className="ch-contract-progress" role="progressbar" aria-label="Horas consumidas neste mês" aria-valuemin={0} aria-valuemax={contractedMinutes} aria-valuenow={Math.min(contractedMinutes, data.minutes)} aria-valuetext={`${formatHours(data.minutes)} de ${data.contractedHours} horas, ${hoursPercentage}%`}>
            <div className="v2-cap-home"><CapacityBar dark bare capacity={capacityOf(data.contractedHours, data.minutes)} /></div>
          </div>}
        </aside>

      </div>
      {waiting.length > 0 && <Link to="/cliente/entregaveis" className="ch-validation">{waiting.length} {waiting.length === 1 ? 'entrega aguarda' : 'entregas aguardam'} sua validação <ChevronRight size={15} /></Link>}

      <section className="ch-three">
        <article className="ch-surface ch-deliveries"><h3>Entregas do ciclo</h3>
          <div className="ch-delivery-inside">
            <div className="ch-cycle-copy"><strong className="ch-big">{data.company ? cycleTotal : '—'}</strong><p>{cycleTotal === 1 ? 'entrega no projeto atual' : 'entregas no projeto atual'}</p></div>
            <div className="ch-donut ch-real-donut" role="img" aria-label={cycleBreakdown.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(', ')}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="ch-cycle-track" cx="50" cy="50" r="40" fill="none" pathLength="100" />
                {cycleTotal > 0 && cycleBreakdown.map((item, index) => item.count > 0 && <circle key={item.label} cx="50" cy="50" r="40" fill="none" pathLength="100" stroke={item.color} strokeDasharray={`${item.count / cycleTotal * 100} 100`} strokeDashoffset={-cycleBreakdown.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / cycleTotal * 100} />)}
              </svg><span className="ch-donut-value">{data.company ? `${cycleTotal ? Math.round(approvedCount / cycleTotal * 100) : 0}%` : '—'}</span>
            </div>
          <div className="ch-legend">{cycleBreakdown.map((item, index) => <span key={item.label}><i className={['green', 'yellow', 'red'][index]} /> {item.label} <b>{data.company ? item.count : '—'}</b></span>)}</div></div>
        </article>

        <article className="ch-surface ch-feeling"><h3>Percepção do trabalho <span>· mês atual</span></h3>
          <div className="ch-feeling-inner">
            <div><p><Star size={17} color="#bb5372" /> <strong>{data.company ? data.npsCount : '—'} {data.npsCount === 1 ? 'avaliação recebida' : 'avaliações recebidas'}</strong></p><p><Check size={17} color="#1b927f" /> {data.nps == null ? 'Aguardando a primeira' : 'Média das avaliações'}</p></div>
            <div className="ch-no-rating" role="img" aria-label={data.nps == null ? 'Ainda sem avaliação das entregas' : `Nota média ${data.nps.toFixed(1)} de 5, em ${data.npsCount} avaliações`}>
              {data.nps != null && <svg viewBox="0 0 180 102" aria-hidden="true">
                <defs><linearGradient id="ch-perception-gradient"><stop offset="0%" stopColor="#D85C73" /><stop offset="50%" stopColor="#E3A536" /><stop offset="100%" stopColor="#2BAFA8" /></linearGradient></defs>
                <path className="ch-gauge-track" d="M 15 90 A 75 75 0 0 1 165 90" fill="none" pathLength="100" />
                <path className="ch-gauge-fill" d="M 15 90 A 75 75 0 0 1 165 90" fill="none" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, data.nps / 5 * 100))} 100`} />
              </svg>}
              <strong>{data.nps == null ? '—' : data.nps.toFixed(1)}</strong><small>{data.nps == null ? 'Sem nota' : 'de 5 pontos'}</small>
            </div>
          </div>
          <small className="ch-subnote">{data.nps == null ? 'De entregas ou ocorrências' : 'Entregas e ocorrências avaliadas'}</small>
        </article>

        <article className="ch-surface ch-completion"><h3>Conclusão do trabalho <span>· mês atual</span></h3>
          <div className="ch-complete-line"><strong className="ch-big">{work ? `${data.completionPct}%` : '—'}</strong>
            <div className="ch-color-bars" role="img" aria-label={deliveryStages.map((stage) => `${stage.label}: ${stage.count}`).join('; ')}>
              {deliveryStages.map((stage) => <i key={stage.label} title={`${stage.label}: ${stage.count}`} />)}
            </div>
          </div>
          <p>{work?.completed ?? '—'} de {work?.total ?? '—'} {work?.total === 1 ? 'atividade concluída' : 'atividades concluídas'} entre entregas e ocorrências.</p>
          {data.unlinkedHourEntries > 0 && <small className="ch-subnote">{data.unlinkedHourEntries} {data.unlinkedHourEntries === 1 ? 'lançamento de horas sem vínculo' : 'lançamentos de horas sem vínculo'} com uma atividade</small>}
        </article>
      </section>

      <div className="ch-home-spotlight">
        <section className="ch-bulletin ch-bulletin-v4" aria-labelledby="home-notices-title">
          <div className="ch-bulletin-heading"><div><small>QUADRO DE AVISOS · CALI</small><h3 id="home-notices-title">Avisos da sua parceria</h3><p>Informações importantes para acompanhar e dar ciência.</p></div><Link className="ch-link" to="/cliente/avisos">Ver mural completo <ArrowRight size={15} /></Link></div>
          <ClientHomeNotices />
        </section>
        <ClientHomeTeam key={data.company?.id || 'unavailable'} companyId={data.company?.id} />
      </div>

      <section className="ch-mid" aria-label="Atualizações da conta">
        <article className="ch-surface ch-recent-document">
          <div className="ch-doc-thumb">
            {data.latestDocument ? <ClientDocumentBrandCover companyId={data.company?.id || ''} companyName={data.company?.display_name || 'sua empresa'} logoUrl={data.company?.logo_url} compact /> : <div className="ch-doc-empty"><FileText size={26} /></div>}
          </div>
          <div className="ch-document-copy">
            <small className="ch-kicker">DOCUMENTO MAIS RECENTE</small>
            <h3>{data.latestDocument?.title || (data.documentCount == null ? 'Documentos indisponíveis agora' : 'Nenhum documento publicado')}</h3>
            {data.latestDocument && <p>Atualizado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(data.latestDocument.updated_at)).replace('.', '')}</p>}
            <Link className="ch-link" to="/cliente/documentos">{data.latestDocument ? 'Ver documento e acervo' : 'Ver documentos'} <ChevronRight size={15} /></Link>
          </div>
        </article>
        <article className="ch-surface ch-recent-case">
          <div className="ch-avatars" aria-label="Contatos da empresa e da CALI">
            <span className="ch-avatar">{data.profile?.avatar_url ? <img src={data.profile.avatar_url} alt={data.profile.full_name} style={{ objectPosition: `${Number(data.profile.avatar_position_x ?? 50)}% ${Number(data.profile.avatar_position_y ?? 50)}%`, transform: `scale(${Number(data.profile.avatar_zoom ?? 1)})` }} /> : firstName(data.profile?.full_name).charAt(0)}</span>
            <span className="ch-avatar">{contact?.avatar_url ? <img src={contact.avatar_url} alt={contactName} style={{ objectPosition: `${Number(contact.avatar_position_x ?? 50)}% ${Number(contact.avatar_position_y ?? 50)}%`, transform: `scale(${Number(contact.avatar_zoom ?? 1)})` }} /> : contactName.charAt(0)}</span>
            <span className="ch-avatar company">{occurrenceLogoUrl ? <img src={occurrenceLogoUrl} alt={data.company?.display_name || 'Empresa'} /> : 'C'}</span>
          </div>
          {latestOccurrence && <span className={`ch-tag amber status-${occurrenceStatus}`}>{occurrenceStatusText[occurrenceStatus] || 'Em acompanhamento'}</span>}
          <small className="ch-kicker">OCORRÊNCIA MAIS RECENTE</small>
          <h3>{latestOccurrence?.title || (data.occurrenceLoadError ? 'Ocorrências indisponíveis agora' : 'Nenhuma ocorrência registrada')}</h3>
          {latestOccurrence ? <p>{occurrenceDays === 0 ? 'Registrada hoje' : `Registrada há ${occurrenceDays} ${occurrenceDays === 1 ? 'dia' : 'dias'}`} · {data.openOccurrenceCount ?? '—'} em aberto</p> : <p>{data.occurrenceLoadError ? 'Acesse a página de registros para tentar novamente.' : 'Os registros compartilhados aparecerão aqui.'}</p>}
          <Link className="ch-link" to={latestOccurrence ? `/cliente/registros?record=${encodeURIComponent(latestOccurrence.id)}` : '/cliente/registros'}>{latestOccurrence ? 'Abrir ocorrência' : 'Ver ocorrências'} <ChevronRight size={15} /></Link>
        </article>
      </section>

      <div className="ch-bottom">
        <section className="ch-surface ch-project">
          <div className="ch-card-head"><div><small className="ch-kicker">EM MOVIMENTO</small><h3>{activeProject?.name || 'Projeto atual'}</h3></div><Link className="ch-link" to="/cliente/entregaveis">Ver projeto <ArrowRight size={14} /></Link></div>
          {visibleDeliverables.length ? <div className="ch-gantt" aria-label="Prazos e andamento das entregas"><div className="ch-gantt-header"><span>ENTREGA / STATUS</span><span>INÍCIO</span><span>MEIO</span><span>CONCLUSÃO</span></div>
            <div className="ch-gantt-lanes">{visibleDeliverables.map((deliverable) => {
              const due = deliveryDate(deliverable.due_at);
              const position = due && timeline ? Math.max(12, Math.min(88, (due.getTime() - timeline.start) / timeline.span * 100)) : 50;
              return <div className="ch-gantt-row" key={deliverable.id}>
                <div className="ch-delivery-name"><strong>{deliverable.title}</strong><small>{statusLabel[deliverable.status] || deliverable.status}</small></div>
                <div className="ch-gantt-track" aria-hidden="true">
                  {due && timeline ? <span className={`ch-milestone ${milestoneTone[deliverable.status] || ''} status-${deliverable.status}`} style={{ left: `${position}%` }}>{formatDate(deliverable.due_at)}</span> : <span className="ch-undated">Prazo a definir</span>}
                </div>
                <span className="ch-mobile-date">{formatDate(deliverable.due_at)}</span>
              </div>;
            })}</div>
            {timeline && <div className="ch-gantt-foot" aria-hidden="true"><span />{timeline.ticks.map((tick) => <time key={tick}>{formatDate(new Date(tick).toISOString())}</time>)}</div>}
          </div> : <div className="ch-empty">Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.</div>}
        </section>

        <div className="ch-side-stack"><section className="ch-surface ch-next">
          <div className="ch-card-head"><div><small className="ch-kicker">PRÓXIMOS PASSOS</small><h3>Agenda compartilhada</h3></div><Link className="ch-link" to="/cliente/cronograma">Abrir <ArrowRight size={13} /></Link></div>
          {data.events.length ? <div className="ch-events">{data.events.map((event) => { const date = formatEventDate(event.starts_at); const mode = event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' || event.mode === 'online' ? 'Online' : event.mode; return <div className="ch-event" key={event.id}><div className="ch-event-date"><strong>{date.day}</strong><small>{date.month}</small></div><span className="ch-event-dot" /><div><strong>{event.title}</strong><small><time dateTime={event.starts_at}>{date.time}</time>{mode ? ` · ${mode}` : ''}</small></div>{event.meeting_url && <a className="ch-event-link" href={event.meeting_url} target="_blank" rel="noreferrer" aria-label={`Abrir reunião: ${event.title}`}><ArrowUpRight size={17} /></a>}</div>; })}</div> : <div className="ch-empty"><CalendarDays size={18} />Nenhum compromisso futuro publicado para sua empresa.</div>}
        </section>
        <section className="ch-surface ch-cycle-next"><div className="ch-card-head"><h3>Próxima decisão</h3>{waiting.length > 0 && <span className="ch-tag lilac">Em validação</span>}</div><p>{waiting[0]?.title || 'Nenhuma entrega aguardando sua validação.'}</p>{waiting.length > 0 && <Link className="ch-link" to="/cliente/entregaveis">Consultar contexto <ArrowRight size={13} /></Link>}</section>
        </div>
      </div>
      </div>

      <Link className="ch-chat-trigger ch-contact-link" to="/cliente/registros">
        <MessageCircle size={16} /> Falar com a CALI
      </Link>
    </section>
  </Shell>;
}
