import { ClientHomeCard, ClientHomeLink } from './components/ClientHomeCard';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { useEffect, useRef, useState } from 'react';
import { capacityOf, percentLabel } from '../../../lib/capacity';
import { CapacityBar } from '../../../components/hours/CapacityBar';
import { ClientHomeNotices } from '../../notices/components/ClientHomeNotices';
import { Link } from '../../../components/navigation/Link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  Star,
} from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { WorkspaceProfileAvatar } from '../../../components/workspace/WorkspaceProfileAvatar';
import { ClientHomeTeam } from './components/ClientHomeTeam';
import { ClientHomeEmpty } from './components/ClientHomeEmpty';
import { ClientDocumentBrandCover } from './components/ClientDocumentBrandCover';
import { subscribeClientDeliveryReality } from '../../../api/projects/client-delivery';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { readClientHomeOverview, type DashboardData, type Deliverable } from '../../../api/client/home/overview';

// Cores aprovadas das etiquetas de prazo, por situação real da entrega (sem tom = creme, em andamento).
const approvedMilestone = 'tw:border-cali-green-soft tw:bg-cali-teal-surface tw:text-cali-teal-text';
const reviewMilestone = 'tw:border-cali-violet-line tw:bg-cali-violet-soft tw:text-cali-violet-text';
const attentionMilestone = 'tw:border-cali-red-accent tw:bg-cali-red-accent tw:text-cali-neutral-surface';
const milestoneTone: Record<string, string> = {
  approved: approvedMilestone,
  client_review: reviewMilestone,
  internal_review: reviewMilestone,
  not_started: attentionMilestone,
  adjustment_requested: attentionMilestone,
  rebriefing: attentionMilestone,
};
const statusLabel: Record<string, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  standby: 'Em espera',
  internal_review: 'Revisão CALI',
  client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado',
  rebriefing: 'Em rebriefing',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
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
  return clean.toLocaleLowerCase('pt-BR').startsWith('cali ')
    ? clean
    : `CALI ${clean.charAt(0).toUpperCase()}${clean.slice(1)}`;
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
  const dated = items
    .map((item) => deliveryDate(item.due_at)?.getTime())
    .filter((time): time is number => time != null);
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
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return {
    start: `${prefix}-01`,
    end: `${prefix}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`,
  };
}
export function ClientDashboard() {
  const { user } = useWorkspaceAuth();
  return <ClientDashboardContent key={user?.id} userId={user?.id} />;
}

function ClientDashboardContent({ userId }: { userId: string | undefined }) {
  const [data, setData] = useState<DashboardData>({
    company: null,
    profile: null,
    responsibles: null,
    projects: [],
    deliverables: [],
    events: [],
    minutes: 0,
    hoursVisible: false,
    contractedHours: 0,
    hoursLoadError: false,
    nps: null,
    npsCount: 0,
    completionPct: 0,
    workMetrics: null,
    unlinkedHourEntries: 0,
    reportCount: null,
    latestDocument: null,
    documentCount: null,
    openOccurrenceCount: null,
    latestOccurrence: null,
    occurrenceLoadError: false,
  });
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
    if (!logo) {
      setOccurrenceLogoUrl('');
      return;
    }
    void resolveWorkspaceMedia(logo, 86400)
      .then(async (url) => url || resolveWorkspaceMedia(data.company?.logo_workspace_url, 86400))
      .then((url) => {
        if (active) setOccurrenceLogoUrl(url);
      });
    return () => {
      active = false;
    };
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
    const onVisible = () => {
      if (!document.hidden) queueRefresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const fallback = window.setInterval(() => {
      if (!document.hidden) queueRefresh();
    }, 30_000);
    return () => {
      unsubscribe();
      window.clearInterval(fallback);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [data.company?.id]);

  async function load(showLoading = false) {
    if (loadingRef.current) {
      refreshPendingRef.current = true;
      return;
    }
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

  const activeProject =
    data.projects.find((project) => !['completed', 'cancelled'].includes(project.status)) ||
    data.projects[0] ||
    null;
  const cycleDeliverables = activeProject
    ? data.deliverables.filter((item) => item.project_id === activeProject.id)
    : data.deliverables;
  const projectDeliverables = cycleDeliverables.filter((item) => item.status !== 'cancelled');
  const visibleDeliverables = [...projectDeliverables]
    .sort((a, b) => {
      const aDate = deliveryDate(a.due_at)?.getTime() ?? Infinity;
      const bDate = deliveryDate(b.due_at)?.getTime() ?? Infinity;
      return aDate - bDate;
    })
    .slice(0, 4);
  const timeline = deliveryTimeline(visibleDeliverables);
  const approvedCount = projectDeliverables.filter((item) => item.status === 'approved').length;
  const pendingCount = projectDeliverables.length - approvedCount;
  const cancelledCount = cycleDeliverables.length - projectDeliverables.length;
  const cycleTotal = cycleDeliverables.length;
  const cycleBreakdown = [
    { label: 'Aprovadas', count: approvedCount, color: 'var(--cali-color-green-accent)' },
    { label: 'Pendentes', count: pendingCount, color: 'var(--cali-color-orange-accent)' },
    { label: 'Canceladas', count: cancelledCount, color: 'var(--cali-color-red-accent)' },
  ];
  const work = data.workMetrics;
  const deliveryStages = [
    { label: 'Não iniciadas', count: work?.notStarted || 0 },
    { label: 'Em andamento', count: work?.inProgress || 0 },
    { label: 'Revisão CALI', count: work?.internalReview || 0 },
    { label: 'Com o cliente', count: work?.withClient || 0 },
    { label: 'Concluídas', count: work?.completed || 0 },
  ];
  const waiting = data.deliverables.filter((item) => item.status === 'client_review');
  const showHours = data.hoursVisible;
  const contractedMinutes = showHours ? data.contractedHours * 60 : 0;
  const hoursPercentage = contractedMinutes > 0 ? Math.round((data.minutes / contractedMinutes) * 100) : 0;
  const packageName =
    planLabel(data.company?.service_plan) || planLabel(data.company?.service_type) || 'Contratação CALI';
  const latestOccurrence = data.latestOccurrence;
  const occurrenceStatus = latestOccurrence?.workflow_status || 'recorded';
  const occurrenceStatusText: Record<string, string> = {
    open: 'Aberta',
    in_progress: 'Em andamento',
    waiting_client: 'Aguardando você',
    standby: 'Em espera',
    completed: 'Encerrada',
    cancelled: 'Cancelada',
    recorded: 'Registrada',
  };
  const occurrenceDays = latestOccurrence
    ? Math.max(0, Math.floor((Date.now() - new Date(latestOccurrence.occurred_at).getTime()) / 86400000))
    : 0;

  if (loading)
    return (
      <Shell role="client">
        <section
          aria-label="Visão geral do cliente"
          className="tw:relative tw:min-h-screen tw:bg-cali-surface-soft tw:bg-[linear-gradient(rgb(var(--cali-rgb-sand-strong)/0.05098)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-sand-strong)/0.05098)_1px,transparent_1px)] tw:[background-size:1.923rem_1.923rem] tw:font-cali-body tw:text-cali-body tw:text-cali-neutral-strong"
        >
          <LoadingState>
            <Loader2 className="spin" size={20} />
            Preparando sua área CALI…
          </LoadingState>
        </section>
      </Shell>
    );

  const contact = data.responsibles?.executive;
  const supportPartner = data.responsibles?.supportPartner;
  const contactName = contact?.full_name || 'Patrícia Lima';
  const contactRole = contact?.job_title || 'People Advisory Executive';

  return (
    <Shell role="client">
      <section
        aria-label="Visão geral do cliente"
        className="tw:relative tw:min-h-screen tw:bg-cali-surface-soft tw:bg-[linear-gradient(rgb(var(--cali-rgb-sand-strong)/0.05098)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-sand-strong)/0.05098)_1px,transparent_1px)] tw:[background-size:1.923rem_1.923rem] tw:font-cali-body tw:text-cali-body tw:text-cali-neutral-strong"
      >
        {error && <InlineNotice className="tw:mx-2 tw:mt-0! tw:mb-3.5">{error}</InlineNotice>}

        <div className="tw:mx-auto tw:max-w-[116.154rem] tw:px-2 tw:pt-2.5 tw:pb-26 tw:max-[50rem]:px-0">
          <div className="tw:mx-0.5 tw:mb-5.5 tw:flex tw:items-center tw:justify-between tw:gap-7.5 tw:max-[50rem]:flex-col tw:max-[50rem]:items-start tw:[&_h1]:mt-2 tw:[&_h1]:mb-1 tw:[&_h1]:text-5xl/[1.15] tw:[&_h1]:font-[750] tw:[&_h1]:tracking-[-0.138rem] tw:max-[50rem]:[&_h1]:text-4xl tw:[&_p]:m-0 tw:[&_p]:text-cali-body tw:[&_p]:text-cali-sand-text">
            <div>
              <span className="tw:text-cali-label tw:font-bold tw:tracking-[0.123rem] tw:text-cali-gold-accent">
                SUA PARCERIA COM A CALI
              </span>
              <h1>Olá, {data.profile?.full_name ? firstName(data.profile.full_name) : 'seja bem-vinda'}.</h1>
              <p>Veja o que aconteceu e o que vem a seguir na sua assessoria.</p>
            </div>
            <div className="tw:flex tw:min-w-[23.231rem] tw:items-center tw:gap-3.5 tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-cali-gold-line tw:bg-cali-neutral-surface/87 tw:px-5 tw:py-3 tw:max-[50rem]:w-full tw:max-[50rem]:min-w-0 tw:[&>div:last-child]:flex tw:[&>div:last-child]:flex-col tw:[&>div:last-child]:gap-1 tw:[&_small]:text-cali-label tw:[&_small]:font-bold tw:[&_small]:tracking-[0.077rem] tw:[&_small]:text-cali-gold-accent tw:[&_strong]:text-cali-body tw:[&>div:last-child>span]:text-xs tw:[&>div:last-child>span]:font-bold tw:[&>div:last-child>span]:text-cali-burgundy-accent">
              <div
                className="tw:grid tw:size-14 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-lg tw:border-2 tw:border-solid tw:border-cali-sand-accent tw:bg-[linear-gradient(125deg,var(--cali-color-red-inverse),var(--cali-color-sand-text))] tw:font-bold tw:text-cali-neutral-surface tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:object-cover"
                data-workspace-identity
              >
                <WorkspaceProfileAvatar
                  identity={contact}
                  alt={contactName}
                  fallback={contactName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join('')}
                />
              </div>
              <div>
                <small>RESPONSÁVEL EXECUTIVA DA CONTA</small>
                <strong>{contactName}</strong>
                <span>{contactRole}</span>
                {supportPartner && (
                  <>
                    <small className="tw:mt-[8px]">PARTNER DE APOIO</small>
                    <strong>{supportPartner.full_name}</strong>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <aside
              className="tw:mb-4 tw:min-h-[11.154rem] tw:rounded-[1.154rem] tw:bg-[linear-gradient(115deg,var(--cali-color-burgundy-accent),var(--cali-color-red-strong)_68%,var(--cali-color-red-text))] tw:px-8.5 tw:py-6.5 tw:text-cali-neutral-surface tw:shadow-[0_0.769rem_2.077rem_rgb(var(--cali-rgb-burgundy-accent)/0.06667)]"
              aria-label="Sua contratação"
            >
              <div className="tw:flex tw:justify-between tw:gap-5.5 tw:max-[50rem]:flex-col tw:max-[50rem]:items-start">
                <div className="tw:flex tw:items-center tw:gap-4.5 tw:[&_small]:text-cali-label tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.115rem] tw:[&_small]:text-cali-burgundy-soft tw:[&_h2]:mt-2 tw:[&_h2]:mb-1 tw:[&_h2]:text-2xl tw:[&_h2]:tracking-[-0.038rem] tw:[&>div:last-child>span]:text-sm tw:[&>div:last-child>span]:text-cali-burgundy-surface">
                  <div className="tw:flex tw:size-18 tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-lg tw:bg-cali-sand-surface tw:text-4xl tw:font-extrabold tw:text-cali-burgundy-text tw:[&_span]:text-cali-gold-accent tw:[&_img]:max-h-full tw:[&_img]:max-w-full tw:[&_img]:object-contain">
                    {occurrenceLogoUrl ? (
                      <img src={occurrenceLogoUrl} alt="" />
                    ) : (
                      <>
                        {(data.company?.display_name || 'C').trim().charAt(0).toUpperCase()}
                        <span>·</span>
                      </>
                    )}
                  </div>
                  <div>
                    <small>SUA CONTRATAÇÃO</small>
                    <h2>{packageName}</h2>
                    <span>{data.company?.display_name || 'Conta CALI'}</span>
                  </div>
                </div>
                <div className="tw:flex tw:min-w-[39%] tw:gap-4.5 tw:max-[50rem]:w-full tw:[&>div]:flex tw:[&>div]:flex-1 tw:[&>div]:flex-col tw:[&>div]:gap-1.5 tw:[&>div]:border-0 tw:[&>div]:border-l tw:[&>div]:border-solid tw:[&>div]:border-cali-neutral-surface/21 tw:[&>div]:py-2 tw:[&>div]:pl-6 tw:[&_strong]:text-3xl/none tw:[&_strong]:text-cali-gold-soft tw:[&_span]:text-xs tw:[&_span]:font-semibold tw:[&_span]:text-cali-sand-line">
                  {showHours && data.contractedHours > 0 ? (
                    <>
                      <div>
                        <strong>{data.contractedHours}h</strong>
                        <span>contratadas no mês</span>
                      </div>
                      <div>
                        <strong>{formatHours(data.minutes)}</strong>
                        <span>consumidas no mês</span>
                      </div>
                      <div
                        className={
                          capacityOf(data.contractedHours, data.minutes).excessMinutes > 0
                            ? 'tw:[&_strong]:text-cali-red-soft!'
                            : undefined
                        }
                      >
                        <strong>
                          {percentLabel(capacityOf(data.contractedHours, data.minutes).usagePercent)}
                        </strong>
                        <span>utilizados</span>
                      </div>
                    </>
                  ) : showHours ? (
                    <div>
                      <strong>{formatHours(data.minutes)}</strong>
                      <span>consumidas no mês · franquia não definida</span>
                    </div>
                  ) : (
                    <div>
                      <strong>
                        {data.hoursLoadError ? 'Indisponível' : activeProject ? 'Ativo' : 'Em preparação'}
                      </strong>
                      <span>{data.hoursLoadError ? 'horas do mês' : 'ciclo atual'}</span>
                    </div>
                  )}
                </div>
              </div>
              {contractedMinutes > 0 && (
                <div
                  className="tw:mt-6 tw:[&>div:last-child]:mt-2 tw:[&>div:last-child]:flex tw:[&>div:last-child]:justify-between tw:[&>div:last-child]:text-cali-label tw:[&>div:last-child]:text-cali-neutral-soft"
                  role="progressbar"
                  aria-label="Horas consumidas neste mês"
                  aria-valuemin={0}
                  aria-valuemax={contractedMinutes}
                  aria-valuenow={Math.min(contractedMinutes, data.minutes)}
                  aria-valuetext={`${formatHours(data.minutes)} de ${data.contractedHours} horas, ${hoursPercentage}%`}
                >
                  <div className="tw:mt-2">
                    <CapacityBar dark bare capacity={capacityOf(data.contractedHours, data.minutes)} />
                  </div>
                </div>
              )}
            </aside>
          </div>
          {waiting.length > 0 && (
            <Link
              to="/cliente/entregaveis"
              className="tw:mb-4 tw:flex tw:items-center tw:gap-2 tw:rounded-cali-panel tw:bg-cali-orange-surface tw:px-4 tw:py-3 tw:text-sm/[inherit] tw:text-cali-gold-text"
            >
              {waiting.length} {waiting.length === 1 ? 'entrega aguarda' : 'entregas aguardam'} sua validação{' '}
              <ChevronRight size={15} />
            </Link>
          )}

          <section className="tw:mb-4 tw:grid tw:grid-cols-3 tw:gap-4 tw:max-[71.875rem]:grid-cols-2 tw:max-[50rem]:grid-cols-1">
            <ClientHomeCard>
              <h3>Entregas do ciclo</h3>
              <div className="tw:flex tw:items-center tw:justify-between tw:gap-2.5">
                <div>
                  <strong className="tw:text-cali-display-lg/none tw:font-bold tw:tracking-[-0.077rem]">
                    {data.company ? cycleTotal : '—'}
                  </strong>
                  <p>{cycleTotal === 1 ? 'entrega no projeto atual' : 'entregas no projeto atual'}</p>
                </div>
                <div
                  className="tw:relative tw:grid tw:size-21 tw:shrink-0 tw:place-items-center tw:rounded-full"
                  role="img"
                  aria-label={cycleBreakdown.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(', ')}
                >
                  <svg className="tw:size-full tw:-rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    <circle
                      className="tw:stroke-cali-line tw:stroke-15"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      pathLength="100"
                    />
                    {cycleTotal > 0 &&
                      cycleBreakdown.map(
                        (item, index) =>
                          item.count > 0 && (
                            <circle
                              className="tw:stroke-15"
                              key={item.label}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              pathLength="100"
                              stroke={item.color}
                              strokeDasharray={`${(item.count / cycleTotal) * 100} 100`}
                              strokeDashoffset={
                                (-cycleBreakdown
                                  .slice(0, index)
                                  .reduce((sum, previous) => sum + previous.count, 0) /
                                  cycleTotal) *
                                100
                              }
                            />
                          ),
                      )}
                  </svg>
                  <span className="tw:absolute tw:inset-3.5 tw:grid tw:size-14 tw:place-items-center tw:rounded-full tw:bg-cali-neutral-surface tw:text-base tw:font-bold">
                    {data.company ? `${cycleTotal ? Math.round((approvedCount / cycleTotal) * 100) : 0}%` : '—'}
                  </span>
                </div>
                <div className="tw:flex tw:flex-col tw:gap-2.5 tw:text-xs tw:[&_span]:flex tw:[&_span]:items-center tw:[&_span]:gap-1.5 tw:[&_span]:whitespace-nowrap tw:[&_b]:ml-auto tw:[&_i]:inline-block tw:[&_i]:size-2 tw:[&_i]:shrink-0 tw:[&_i]:rounded-full">
                  {cycleBreakdown.map((item, index) => (
                    <span key={item.label}>
                      <i className={['tw:bg-cali-teal-accent', 'tw:bg-cali-orange-line', 'tw:bg-cali-red-accent'][index]} />{' '}
                      {item.label} <b>{data.company ? item.count : '—'}</b>
                    </span>
                  ))}
                </div>
              </div>
            </ClientHomeCard>

            <ClientHomeCard>
              <h3>
                Percepção do trabalho <span>· mês atual</span>
              </h3>
              <div className="tw:mt-5 tw:flex tw:items-center tw:justify-between tw:[&_p]:my-3! tw:[&_p]:flex tw:[&_p]:items-center tw:[&_p]:gap-2.5 tw:[&_p]:text-cali-neutral-text!">
                <div>
                  <p>
                    <Star size={17} color="var(--cali-color-red-accent)" />{' '}
                    <strong>
                      {data.company ? data.npsCount : '—'}{' '}
                      {data.npsCount === 1 ? 'avaliação recebida' : 'avaliações recebidas'}
                    </strong>
                  </p>
                  <p>
                    <Check size={17} color="var(--cali-color-teal-text)" />{' '}
                    {data.nps == null ? 'Aguardando a primeira' : 'Média das avaliações'}
                  </p>
                </div>
                <div
                  className="tw:flex tw:min-w-[5.385rem] tw:flex-col tw:gap-1.5 tw:border-0 tw:border-l tw:border-solid tw:border-cali-sand-line tw:text-center tw:[&_svg]:block tw:[&_svg]:w-16 tw:[&_strong]:text-cali-title-lg tw:[&_small]:text-xs tw:[&_small]:text-cali-sand-text"
                  role="img"
                  aria-label={
                    data.nps == null
                      ? 'Ainda sem avaliação das entregas'
                      : `Nota média ${data.nps.toFixed(1)} de 5, em ${data.npsCount} avaliações`
                  }
                >
                  {data.nps != null && (
                    <svg viewBox="0 0 180 102" aria-hidden="true">
                      <defs>
                        <linearGradient id="ch-perception-gradient">
                          <stop offset="0%" stopColor="var(--cali-color-red-accent)" />
                          <stop offset="50%" stopColor="var(--cali-color-orange-accent)" />
                          <stop offset="100%" stopColor="var(--cali-color-teal-accent)" />
                        </linearGradient>
                      </defs>
                      <path
                        className="tw:stroke-cali-line tw:stroke-9"
                        d="M 15 90 A 75 75 0 0 1 165 90"
                        fill="none"
                        pathLength="100"
                      />
                      <path
                        className="tw:stroke-9"
                        stroke="url(#ch-perception-gradient)"
                        d="M 15 90 A 75 75 0 0 1 165 90"
                        fill="none"
                        pathLength="100"
                        strokeDasharray={`${Math.max(0, Math.min(100, (data.nps / 5) * 100))} 100`}
                      />
                    </svg>
                  )}
                  <strong>{data.nps == null ? '—' : data.nps.toFixed(1)}</strong>
                  <small>{data.nps == null ? 'Sem nota' : 'de 5 pontos'}</small>
                </div>
              </div>
              <small className="tw:text-xs tw:text-cali-sand-text">
                {data.nps == null ? 'De entregas ou ocorrências' : 'Entregas e ocorrências avaliadas'}
              </small>
            </ClientHomeCard>

            <ClientHomeCard className="tw:max-[71.875rem]:col-span-full tw:max-[50rem]:col-auto tw:[&>p]:mt-4!">
              <h3>
                Conclusão do trabalho <span>· mês atual</span>
              </h3>
              <div className="tw:mt-5 tw:flex tw:items-center tw:justify-between">
                <strong className="tw:text-cali-display-lg/none tw:font-bold tw:tracking-[-0.077rem]">
                  {work ? `${data.completionPct}%` : '—'}
                </strong>
                <div
                  className="tw:flex tw:gap-1.5 tw:[&_i]:h-1.5 tw:[&_i]:w-7 tw:[&_i]:rounded-lg tw:[&_i]:bg-cali-neutral-line tw:[&_i:nth-child(2)]:bg-cali-burgundy-line tw:[&_i:nth-child(3)]:bg-cali-blue-line tw:[&_i:nth-child(4)]:bg-cali-orange-line tw:[&_i:nth-child(5)]:bg-cali-green-line"
                  role="img"
                  aria-label={deliveryStages.map((stage) => `${stage.label}: ${stage.count}`).join('; ')}
                >
                  {deliveryStages.map((stage) => (
                    <i key={stage.label} title={`${stage.label}: ${stage.count}`} />
                  ))}
                </div>
              </div>
              <p>
                {work?.completed ?? '—'} de {work?.total ?? '—'}{' '}
                {work?.total === 1 ? 'atividade concluída' : 'atividades concluídas'} entre entregas e ocorrências.
              </p>
              {data.unlinkedHourEntries > 0 && (
                <small className="tw:text-xs tw:text-cali-sand-text">
                  {data.unlinkedHourEntries}{' '}
                  {data.unlinkedHourEntries === 1
                    ? 'lançamento de horas sem vínculo'
                    : 'lançamentos de horas sem vínculo'}{' '}
                  com uma atividade
                </small>
              )}
            </ClientHomeCard>
          </section>

          <div className="tw:my-5 tw:grid tw:grid-cols-[minmax(0,1.65fr)_minmax(23.846rem,1fr)] tw:items-stretch tw:gap-4.5 tw:max-[68.75rem]:grid-cols-1">
            <ClientHomeNotices linkClassName="tw:inline-flex tw:items-center tw:gap-1 tw:text-left tw:text-xs tw:font-bold tw:text-cali-red-strong" />
            <ClientHomeTeam key={data.company?.id || 'unavailable'} companyId={data.company?.id} />
          </div>

          <section
            className="tw:mb-4 tw:grid tw:grid-cols-1 tw:gap-4 tw:min-[42rem]:grid-cols-2"
            aria-label="Atualizações da conta"
          >
            <ClientHomeCard className="tw:flex tw:min-h-[12.308rem] tw:gap-4.5 tw:[&_h3]:mt-3! tw:[&_h3]:mb-1! tw:[&_h3]:text-xl! tw:[&_h3]:normal-case">
              <div className="tw:flex tw:w-[8.077rem] tw:min-w-[8.077rem] tw:flex-none tw:flex-col tw:items-center tw:justify-center tw:gap-2 tw:overflow-hidden tw:bg-cali-neutral-soft tw:text-cali-burgundy-accent">
                {data.latestDocument ? (
                  <ClientDocumentBrandCover
                    companyId={data.company?.id || ''}
                    companyName={data.company?.display_name || 'sua empresa'}
                    logoUrl={data.company?.logo_url}
                    compact
                  />
                ) : (
                  <div className="tw:grid tw:size-full tw:place-items-center">
                    <FileText size={26} />
                  </div>
                )}
              </div>
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:items-start tw:wrap-anywhere">
                <small className="tw:text-cali-label tw:font-extrabold tw:tracking-[0.108rem] tw:text-cali-gold-accent">
                  DOCUMENTO MAIS RECENTE
                </small>
                <h3>
                  {data.latestDocument?.title ||
                    (data.documentCount == null ? 'Documentos indisponíveis agora' : 'Nenhum documento publicado')}
                </h3>
                {data.latestDocument && (
                  <p>
                    Atualizado em{' '}
                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                      .format(new Date(data.latestDocument.updated_at))
                      .replace('.', '')}
                  </p>
                )}
                <ClientHomeLink className="tw:mt-auto" to="/cliente/documentos">
                  {data.latestDocument ? 'Ver documento e acervo' : 'Ver documentos'} <ChevronRight size={15} />
                </ClientHomeLink>
              </div>
            </ClientHomeCard>
            <ClientHomeCard className="tw:relative tw:flex tw:flex-col tw:[&_h3]:mt-3! tw:[&_h3]:mb-1! tw:[&_h3]:text-xl! tw:[&_h3]:normal-case">
              <div
                className="tw:mb-3 tw:flex tw:[&>span]:-ml-1.5 tw:[&>span]:grid tw:[&>span]:size-8.5 tw:[&>span]:place-items-center tw:[&>span]:overflow-hidden tw:[&>span]:rounded-lg tw:[&>span]:border-2 tw:[&>span]:border-solid tw:[&>span]:border-cali-neutral-surface tw:[&>span]:bg-cali-burgundy-surface tw:[&>span]:text-cali-label tw:[&>span]:font-bold tw:[&>span]:text-cali-brand tw:[&>span:first-child]:ml-0 tw:[&>span:nth-child(2)]:bg-cali-violet-surface tw:[&>span:nth-child(3)]:bg-cali-gold-line tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:rounded-lg tw:[&_img]:object-cover"
                aria-label="Contatos da empresa e da CALI"
              >
                <span data-workspace-identity>
                  <WorkspaceProfileAvatar
                    identity={data.profile}
                    alt={data.profile?.full_name || ''}
                    fallback={firstName(data.profile?.full_name).charAt(0)}
                  />
                </span>
                <span data-workspace-identity>
                  <WorkspaceProfileAvatar identity={contact} alt={contactName} fallback={contactName.charAt(0)} />
                </span>
                <span>
                  {occurrenceLogoUrl ? (
                    <img
                      className="tw:size-full tw:object-cover"
                      src={occurrenceLogoUrl}
                      alt={data.company?.display_name || 'Empresa'}
                    />
                  ) : (
                    'C'
                  )}
                </span>
              </div>
              {latestOccurrence && (
                <span className="tw:absolute tw:top-5 tw:right-4 tw:rounded-lg tw:bg-cali-orange-surface tw:px-2.5 tw:py-1.5 tw:text-cali-label tw:font-bold tw:text-cali-gold-text">
                  {occurrenceStatusText[occurrenceStatus] || 'Em acompanhamento'}
                </span>
              )}
              <small className="tw:text-cali-label tw:font-extrabold tw:tracking-[0.108rem] tw:text-cali-gold-accent">
                OCORRÊNCIA MAIS RECENTE
              </small>
              <h3>
                {latestOccurrence?.title ||
                  (data.occurrenceLoadError ? 'Ocorrências indisponíveis agora' : 'Nenhuma ocorrência registrada')}
              </h3>
              {latestOccurrence ? (
                <p>
                  {occurrenceDays === 0
                    ? 'Registrada hoje'
                    : `Registrada há ${occurrenceDays} ${occurrenceDays === 1 ? 'dia' : 'dias'}`}{' '}
                  · {data.openOccurrenceCount ?? '—'} em aberto
                </p>
              ) : (
                <p>
                  {data.occurrenceLoadError
                    ? 'Acesse a página de registros para tentar novamente.'
                    : 'Os registros compartilhados aparecerão aqui.'}
                </p>
              )}
              <ClientHomeLink
                className="tw:mt-auto"
                to={
                  latestOccurrence
                    ? `/cliente/registros?record=${encodeURIComponent(latestOccurrence.id)}`
                    : '/cliente/registros'
                }
              >
                {latestOccurrence ? 'Abrir ocorrência' : 'Ver ocorrências'} <ChevronRight size={15} />
              </ClientHomeLink>
            </ClientHomeCard>
          </section>

          <div className="tw:grid tw:grid-cols-[2.06fr_1fr] tw:gap-4 tw:max-[50rem]:grid-cols-1">
            <ClientHomeCard
              as="section"
              className="tw:min-h-[23.846rem] tw:max-[47.5rem]:overflow-hidden tw:[&_h3]:mt-2! tw:[&_h3]:mb-0! tw:[&_h3]:text-xl! tw:[&_small:first-child]:text-cali-red-strong"
            >
              <div className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:[&_h3]:m-0">
                <div>
                  <small className="tw:text-cali-label tw:font-extrabold tw:tracking-[0.108rem] tw:text-cali-gold-accent">
                    EM MOVIMENTO
                  </small>
                  <h3>{activeProject?.name || 'Projeto atual'}</h3>
                </div>
                <ClientHomeLink to="/cliente/entregaveis">
                  Ver projeto <ArrowRight size={14} />
                </ClientHomeLink>
              </div>
              {visibleDeliverables.length ? (
                <div className="tw:mt-6" role="group" aria-label="Prazos e andamento das entregas">
                  <div className="tw:grid tw:grid-cols-[33%_repeat(3,1fr)] tw:bg-cali-surface-soft tw:p-3.5 tw:text-cali-label tw:font-bold tw:tracking-[0.054rem] tw:text-cali-sand-text">
                    <span>ENTREGA / STATUS</span>
                    <span>INÍCIO</span>
                    <span>MEIO</span>
                    <span>CONCLUSÃO</span>
                  </div>
                  <div>
                    {visibleDeliverables.map((deliverable) => {
                      const due = deliveryDate(deliverable.due_at);
                      const position =
                        due && timeline
                          ? Math.max(12, Math.min(88, ((due.getTime() - timeline.start) / timeline.span) * 100))
                          : 50;
                      return (
                        <div
                          className="tw:grid tw:min-h-[3.692rem] tw:w-full tw:grid-cols-[33%_1fr] tw:items-center tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-transparent tw:text-left tw:text-cali-neutral-strong"
                          key={deliverable.id}
                        >
                          <div className="tw:flex tw:flex-col tw:gap-1 tw:[&_strong]:text-sm tw:[&_small]:text-xs tw:[&_small]:text-cali-sand-text">
                            <strong>{deliverable.title}</strong>
                            <small>{statusLabel[deliverable.status] || deliverable.status}</small>
                          </div>
                          <div className="tw:relative tw:h-full tw:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(25%_-_1px),var(--cali-color-sand-line)_calc(25%_-_1px),var(--cali-color-sand-line)_25%)]">
                            {due && timeline ? (
                              <time
                                dateTime={deliverable.due_at || undefined}
                                className={`tw:absolute tw:top-1/2 tw:-translate-1/2 tw:rounded-full tw:border tw:border-solid tw:p-2.5 tw:text-cali-label tw:font-bold tw:whitespace-nowrap ${milestoneTone[deliverable.status] ?? 'tw:border-cali-gold-line tw:bg-cali-orange-surface tw:text-cali-gold-text'}`}
                                style={{ left: `clamp(2.75rem, ${position}%, calc(100% - 2.75rem))` }}
                              >
                                {formatDate(deliverable.due_at)}
                              </time>
                            ) : (
                              <span className="tw:absolute tw:top-1/2 tw:-translate-y-1/2 tw:text-cali-label/[inherit] tw:text-cali-sand-text">
                                Prazo a definir
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {timeline && (
                    <div
                      className="tw:mt-3 tw:ml-[33%] tw:flex tw:justify-between tw:text-cali-label tw:text-cali-sand-text"
                      aria-hidden="true"
                    >
                      <span />
                      {timeline.ticks.map((tick) => (
                        <time key={tick}>{formatDate(new Date(tick).toISOString())}</time>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <ClientHomeEmpty>
                  Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.
                </ClientHomeEmpty>
              )}
            </ClientHomeCard>

            <div className="tw:flex tw:h-full tw:flex-col tw:gap-4">
              <ClientHomeCard as="section" className="tw:flex-1">
                <div className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:[&_h3]:m-0">
                  <div>
                    <small className="tw:text-cali-label tw:font-extrabold tw:tracking-[0.108rem] tw:text-cali-gold-accent">
                      PRÓXIMOS PASSOS
                    </small>
                    <h3>Agenda compartilhada</h3>
                  </div>
                  <ClientHomeLink to="/cliente/cronograma">
                    Abrir <ArrowRight size={13} />
                  </ClientHomeLink>
                </div>
                {data.events.length ? (
                  <div>
                    {data.events.map((event) => {
                      const date = formatEventDate(event.starts_at);
                      const mode =
                        event.mode === 'in_person'
                          ? 'Presencial'
                          : event.mode === 'remote' || event.mode === 'online'
                            ? 'Online'
                            : event.mode;
                      return (
                        <div
                          className="tw:mt-5 tw:flex tw:items-center tw:gap-3 tw:[&>div:nth-of-type(2)]:flex tw:[&>div:nth-of-type(2)]:flex-col tw:[&>div:nth-of-type(2)]:gap-2 tw:[&>div:nth-of-type(2)_strong]:text-sm tw:[&>div:nth-of-type(2)_small]:text-xs tw:[&>div:nth-of-type(2)_small]:text-cali-neutral-accent"
                          key={event.id}
                        >
                          <div className="tw:flex tw:w-13 tw:shrink-0 tw:flex-col tw:items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:p-1.5 tw:[&_strong]:text-cali-title tw:[&_small]:text-cali-label tw:[&_small]:text-cali-gold-accent">
                            <strong>{date.day}</strong>
                            <small>{date.month}</small>
                          </div>
                          <span className="tw:size-3 tw:rounded-full tw:bg-cali-blue-accent" />
                          <div>
                            <strong>{event.title}</strong>
                            <small>
                              <time dateTime={event.starts_at}>{date.time}</time>
                              {mode ? ` · ${mode}` : ''}
                            </small>
                          </div>
                          {event.meeting_url && (
                            <a
                              className="tw:ml-auto tw:grid tw:place-items-center tw:text-cali-brand"
                              href={event.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir reunião: ${event.title}`}
                            >
                              <ArrowUpRight size={17} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <ClientHomeEmpty>
                    <CalendarDays size={18} />
                    Nenhum compromisso futuro publicado para sua empresa.
                  </ClientHomeEmpty>
                )}
              </ClientHomeCard>
              <ClientHomeCard
                as="section"
                className="tw:min-h-[8.615rem] tw:[&_p]:my-3! tw:[&_p]:text-sm!"
              >
                <div className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:[&_h3]:m-0">
                  <h3>Próxima decisão</h3>
                  {waiting.length > 0 && (
                    <span className="tw:rounded-lg tw:bg-cali-violet-surface tw:px-2.5 tw:py-1.5 tw:text-cali-label tw:font-bold tw:text-cali-violet-text">
                      Em validação
                    </span>
                  )}
                </div>
                <p>{waiting[0]?.title || 'Nenhuma entrega aguardando sua validação.'}</p>
                {waiting.length > 0 && (
                  <ClientHomeLink to="/cliente/entregaveis">
                    Consultar contexto <ArrowRight size={13} />
                  </ClientHomeLink>
                )}
              </ClientHomeCard>
            </div>
          </div>
        </div>

        <Link
          className="ch-chat-trigger tw:fixed tw:right-8 tw:bottom-7 tw:z-30 tw:flex tw:items-center tw:gap-2.5 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-gold tw:bg-cali-brand tw:px-4.5 tw:py-3 tw:font-bold tw:text-cali-neutral-surface tw:no-underline tw:shadow-[0_0.692rem_2.154rem_rgb(var(--cali-rgb-burgundy-accent)/0.2)] tw:max-[50rem]:right-3 tw:max-[50rem]:bottom-3"
          to="/cliente/registros"
        >
          <MessageCircle size={16} /> Falar com a CALI
        </Link>
      </section>
    </Shell>
  );
}
