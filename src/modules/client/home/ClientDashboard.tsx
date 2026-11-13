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
const approvedMilestone = 'tw:border-[#bfe4d4] tw:bg-[#d8f0e7] tw:text-[#32836a]';
const reviewMilestone = 'tw:border-[#d6c1ec] tw:bg-[#e5d7f7] tw:text-[#754da1]';
const attentionMilestone = 'tw:border-[#ad4c70] tw:bg-[#ad4c70] tw:text-white';
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
          className="tw:relative tw:min-h-screen tw:bg-[#faf7f3] tw:bg-[linear-gradient(#96775d0d_1px,transparent_1px),linear-gradient(90deg,#96775d0d_1px,transparent_1px)] tw:[background-size:1.923rem_1.923rem] tw:font-cali-body tw:text-[0.923rem] tw:text-[#302b2b]"
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
        className="tw:relative tw:min-h-screen tw:bg-[#faf7f3] tw:bg-[linear-gradient(#96775d0d_1px,transparent_1px),linear-gradient(90deg,#96775d0d_1px,transparent_1px)] tw:[background-size:1.923rem_1.923rem] tw:font-cali-body tw:text-[0.923rem] tw:text-[#302b2b]"
      >
        {error && <InlineNotice className="tw:mx-[0.538rem] tw:mt-0! tw:mb-[0.923rem]">{error}</InlineNotice>}

        <div className="tw:mx-auto tw:max-w-[116.154rem] tw:px-[0.538rem] tw:pt-[0.615rem] tw:pb-[6.538rem] tw:max-[50rem]:px-0">
          <div className="tw:mx-[0.154rem] tw:mb-[1.385rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.923rem] tw:max-[50rem]:flex-col tw:max-[50rem]:items-start tw:[&_h1]:mt-[0.462rem] tw:[&_h1]:mb-[0.308rem] tw:[&_h1]:text-[3rem]/[1.15] tw:[&_h1]:font-[750] tw:[&_h1]:tracking-[-0.138rem] tw:max-[50rem]:[&_h1]:text-[2.231rem] tw:[&_p]:m-0 tw:[&_p]:text-[0.923rem] tw:[&_p]:text-[#857d77]">
            <div>
              <span className="tw:text-[0.692rem] tw:font-bold tw:tracking-[0.123rem] tw:text-[#a68666]">
                SUA PARCERIA COM A CALI
              </span>
              <h1>Olá, {data.profile?.full_name ? firstName(data.profile.full_name) : 'seja bem-vinda'}.</h1>
              <p>Veja o que aconteceu e o que vem a seguir na sua assessoria.</p>
            </div>
            <div className="tw:flex tw:min-w-[23.231rem] tw:items-center tw:gap-[0.923rem] tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-[#e2c6a5] tw:bg-[#ffffffdd] tw:px-[1.231rem] tw:py-[0.692rem] tw:max-[50rem]:w-full tw:max-[50rem]:min-w-0 tw:[&>div:last-child]:flex tw:[&>div:last-child]:flex-col tw:[&>div:last-child]:gap-[0.308rem] tw:[&_small]:text-[0.692rem] tw:[&_small]:font-bold tw:[&_small]:tracking-[0.077rem] tw:[&_small]:text-[#ab7944] tw:[&_strong]:text-[0.923rem] tw:[&>div:last-child>span]:text-[0.769rem] tw:[&>div:last-child>span]:font-bold tw:[&>div:last-child>span]:text-[#652338]">
              <div
                className="tw:grid tw:size-[3.538rem] tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[0.538rem] tw:border-2 tw:border-solid tw:border-[#c4a985] tw:bg-[linear-gradient(125deg,#382329,#a7a3a2)] tw:font-bold tw:text-white tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:object-cover"
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
              className="tw:mb-4 tw:min-h-[11.154rem] tw:rounded-[1.154rem] tw:bg-[linear-gradient(115deg,#5a1e2d,#713c3e_68%,#87584b)] tw:px-[2.154rem] tw:py-[1.615rem] tw:text-white tw:shadow-[0_0.769rem_2.077rem_#5a1e2d11]"
              aria-label="Sua contratação"
            >
              <div className="tw:flex tw:justify-between tw:gap-[1.385rem] tw:max-[50rem]:flex-col tw:max-[50rem]:items-start">
                <div className="tw:flex tw:items-center tw:gap-[1.154rem] tw:[&_small]:text-[0.692rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.115rem] tw:[&_small]:text-[#f0b9ba] tw:[&_h2]:mt-[0.462rem] tw:[&_h2]:mb-[0.231rem] tw:[&_h2]:text-[1.462rem] tw:[&_h2]:tracking-[-0.038rem] tw:[&>div:last-child>span]:text-[0.846rem] tw:[&>div:last-child>span]:text-[#eedcdb]">
                  <div className="tw:flex tw:size-[4.462rem] tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-[0.538rem] tw:bg-[#fffbf6] tw:text-[2.231rem] tw:font-extrabold tw:text-[#49232f] tw:[&_span]:text-[#be8d57] tw:[&_img]:max-h-full tw:[&_img]:max-w-full tw:[&_img]:object-contain">
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
                <div className="tw:flex tw:min-w-[39%] tw:gap-[1.077rem] tw:max-[50rem]:w-full tw:[&>div]:flex tw:[&>div]:flex-1 tw:[&>div]:flex-col tw:[&>div]:gap-[0.385rem] tw:[&>div]:border-0 tw:[&>div]:border-l tw:[&>div]:border-solid tw:[&>div]:border-[#ffffff35] tw:[&>div]:py-[0.462rem] tw:[&>div]:pl-[1.538rem] tw:[&_strong]:text-[1.846rem]/none tw:[&_strong]:text-[#fff0cb] tw:[&_span]:text-[0.769rem] tw:[&_span]:font-semibold tw:[&_span]:text-[#f4dfda]">
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
                            ? 'tw:[&_strong]:text-[#ffd0c7]!'
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
                  className="tw:mt-[1.538rem] tw:[&>div:last-child]:mt-[0.462rem] tw:[&>div:last-child]:flex tw:[&>div:last-child]:justify-between tw:[&>div:last-child]:text-[0.692rem] tw:[&>div:last-child]:text-[#f5e9e6]"
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
              className="tw:mb-4 tw:flex tw:items-center tw:gap-[0.462rem] tw:rounded-[0.692rem] tw:bg-[#fff0d7] tw:px-4 tw:py-[0.769rem] tw:text-[0.846rem]/[inherit] tw:text-[#82552c]"
            >
              {waiting.length} {waiting.length === 1 ? 'entrega aguarda' : 'entregas aguardam'} sua validação{' '}
              <ChevronRight size={15} />
            </Link>
          )}

          <section className="tw:mb-4 tw:grid tw:grid-cols-3 tw:gap-4 tw:max-[71.875rem]:grid-cols-2 tw:max-[50rem]:grid-cols-1">
            <ClientHomeCard>
              <h3>Entregas do ciclo</h3>
              <div className="tw:flex tw:items-center tw:justify-between tw:gap-[0.615rem]">
                <div>
                  <strong className="tw:text-[2.615rem]/none tw:font-bold tw:tracking-[-0.077rem]">
                    {data.company ? cycleTotal : '—'}
                  </strong>
                  <p>{cycleTotal === 1 ? 'entrega no projeto atual' : 'entregas no projeto atual'}</p>
                </div>
                <div
                  className="tw:relative tw:grid tw:size-[5.231rem] tw:shrink-0 tw:place-items-center tw:rounded-full"
                  role="img"
                  aria-label={cycleBreakdown.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(', ')}
                >
                  <svg className="tw:size-full tw:-rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    <circle
                      className="tw:stroke-[#e8e3df] tw:stroke-15"
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
                  <span className="tw:absolute tw:inset-[0.846rem] tw:grid tw:size-[3.538rem] tw:place-items-center tw:rounded-full tw:bg-white tw:text-[1rem] tw:font-bold">
                    {data.company ? `${cycleTotal ? Math.round((approvedCount / cycleTotal) * 100) : 0}%` : '—'}
                  </span>
                </div>
                <div className="tw:flex tw:flex-col tw:gap-[0.615rem] tw:text-[0.769rem] tw:[&_span]:flex tw:[&_span]:items-center tw:[&_span]:gap-[0.385rem] tw:[&_span]:whitespace-nowrap tw:[&_b]:ml-auto tw:[&_i]:inline-block tw:[&_i]:size-[0.538rem] tw:[&_i]:shrink-0 tw:[&_i]:rounded-full">
                  {cycleBreakdown.map((item, index) => (
                    <span key={item.label}>
                      <i className={['tw:bg-[#35aa7c]', 'tw:bg-[#f1bd49]', 'tw:bg-[#d55d73]'][index]} />{' '}
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
              <div className="tw:mt-[1.231rem] tw:flex tw:items-center tw:justify-between tw:[&_p]:my-[0.692rem]! tw:[&_p]:flex tw:[&_p]:items-center tw:[&_p]:gap-[0.615rem] tw:[&_p]:text-[#4a4441]!">
                <div>
                  <p>
                    <Star size={17} color="#bb5372" />{' '}
                    <strong>
                      {data.company ? data.npsCount : '—'}{' '}
                      {data.npsCount === 1 ? 'avaliação recebida' : 'avaliações recebidas'}
                    </strong>
                  </p>
                  <p>
                    <Check size={17} color="#1b927f" />{' '}
                    {data.nps == null ? 'Aguardando a primeira' : 'Média das avaliações'}
                  </p>
                </div>
                <div
                  className="tw:flex tw:min-w-[5.385rem] tw:flex-col tw:gap-[0.385rem] tw:border-0 tw:border-l tw:border-solid tw:border-[#ebddd2] tw:text-center tw:[&_svg]:block tw:[&_svg]:w-16 tw:[&_strong]:text-[1.769rem] tw:[&_small]:text-[0.769rem] tw:[&_small]:text-[#988b81]"
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
                          <stop offset="0%" stopColor="#D85C73" />
                          <stop offset="50%" stopColor="#E3A536" />
                          <stop offset="100%" stopColor="#2BAFA8" />
                        </linearGradient>
                      </defs>
                      <path
                        className="tw:stroke-[#e8e3df] tw:stroke-9"
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
              <small className="tw:text-[0.769rem] tw:text-[#988b81]">
                {data.nps == null ? 'De entregas ou ocorrências' : 'Entregas e ocorrências avaliadas'}
              </small>
            </ClientHomeCard>

            <ClientHomeCard className="tw:max-[71.875rem]:col-span-full tw:max-[50rem]:col-auto tw:[&>p]:mt-4!">
              <h3>
                Conclusão do trabalho <span>· mês atual</span>
              </h3>
              <div className="tw:mt-[1.308rem] tw:flex tw:items-center tw:justify-between">
                <strong className="tw:text-[2.615rem]/none tw:font-bold tw:tracking-[-0.077rem]">
                  {work ? `${data.completionPct}%` : '—'}
                </strong>
                <div
                  className="tw:flex tw:gap-[0.385rem] tw:[&_i]:h-[0.385rem] tw:[&_i]:w-[1.692rem] tw:[&_i]:rounded-[0.462rem] tw:[&_i]:bg-[#c8c2bd] tw:[&_i:nth-child(2)]:bg-[#c87e94] tw:[&_i:nth-child(3)]:bg-[#7ca9bb] tw:[&_i:nth-child(4)]:bg-[#e1b95f] tw:[&_i:nth-child(5)]:bg-[#83bba0]"
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
                <small className="tw:text-[0.769rem] tw:text-[#988b81]">
                  {data.unlinkedHourEntries}{' '}
                  {data.unlinkedHourEntries === 1
                    ? 'lançamento de horas sem vínculo'
                    : 'lançamentos de horas sem vínculo'}{' '}
                  com uma atividade
                </small>
              )}
            </ClientHomeCard>
          </section>

          <div className="tw:my-[1.308rem] tw:grid tw:grid-cols-[minmax(0,1.65fr)_minmax(23.846rem,1fr)] tw:items-stretch tw:gap-[1.077rem] tw:max-[68.75rem]:grid-cols-1">
            <ClientHomeNotices linkClassName="tw:inline-flex tw:items-center tw:gap-[0.308rem] tw:text-left tw:text-[0.769rem] tw:font-bold tw:text-[#64283a]" />
            <ClientHomeTeam key={data.company?.id || 'unavailable'} companyId={data.company?.id} />
          </div>

          <section
            className="tw:mb-4 tw:grid tw:grid-cols-1 tw:gap-4 tw:min-[42rem]:grid-cols-2"
            aria-label="Atualizações da conta"
          >
            <ClientHomeCard className="tw:flex tw:min-h-[12.308rem] tw:gap-[1.154rem] tw:[&_h3]:mt-[0.769rem]! tw:[&_h3]:mb-[0.231rem]! tw:[&_h3]:text-[1.231rem]! tw:[&_h3]:normal-case">
              <div className="tw:flex tw:w-[8.077rem] tw:min-w-[8.077rem] tw:flex-none tw:flex-col tw:items-center tw:justify-center tw:gap-[0.538rem] tw:overflow-hidden tw:bg-[#f1ece9] tw:text-[#582736]">
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
                <small className="tw:text-[0.692rem] tw:font-extrabold tw:tracking-[0.108rem] tw:text-[#a37d50]">
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
            <ClientHomeCard className="tw:relative tw:flex tw:flex-col tw:[&_h3]:mt-[0.769rem]! tw:[&_h3]:mb-[0.231rem]! tw:[&_h3]:text-[1.231rem]! tw:[&_h3]:normal-case">
              <div
                className="tw:mb-[0.692rem] tw:flex tw:[&>span]:-ml-[0.385rem] tw:[&>span]:grid tw:[&>span]:size-[2.154rem] tw:[&>span]:place-items-center tw:[&>span]:overflow-hidden tw:[&>span]:rounded-[0.538rem] tw:[&>span]:border-2 tw:[&>span]:border-solid tw:[&>span]:border-white tw:[&>span]:bg-[#e7d3d2] tw:[&>span]:text-[0.692rem] tw:[&>span]:font-bold tw:[&>span]:text-cali-brand tw:[&>span:first-child]:ml-0 tw:[&>span:nth-child(2)]:bg-[#dedbe9] tw:[&>span:nth-child(3)]:bg-[#f1deaa] tw:[&_img]:block tw:[&_img]:size-full tw:[&_img]:rounded-[0.538rem] tw:[&_img]:object-cover"
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
                <span className="tw:absolute tw:top-[1.231rem] tw:right-4 tw:rounded-[0.538rem] tw:bg-[#fcf3e6] tw:px-[0.615rem] tw:py-[0.385rem] tw:text-[0.692rem] tw:font-bold tw:text-[#9d702c]">
                  {occurrenceStatusText[occurrenceStatus] || 'Em acompanhamento'}
                </span>
              )}
              <small className="tw:text-[0.692rem] tw:font-extrabold tw:tracking-[0.108rem] tw:text-[#a37d50]">
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
              className="tw:min-h-[23.846rem] tw:max-[47.5rem]:overflow-hidden tw:[&_h3]:mt-[0.538rem]! tw:[&_h3]:mb-0! tw:[&_h3]:text-[1.308rem]! tw:[&_small:first-child]:text-[#6f293e]"
            >
              <div className="tw:flex tw:items-start tw:justify-between tw:gap-[0.769rem] tw:[&_h3]:m-0">
                <div>
                  <small className="tw:text-[0.692rem] tw:font-extrabold tw:tracking-[0.108rem] tw:text-[#a37d50]">
                    EM MOVIMENTO
                  </small>
                  <h3>{activeProject?.name || 'Projeto atual'}</h3>
                </div>
                <ClientHomeLink to="/cliente/entregaveis">
                  Ver projeto <ArrowRight size={14} />
                </ClientHomeLink>
              </div>
              {visibleDeliverables.length ? (
                <div className="tw:mt-[1.538rem]" role="group" aria-label="Prazos e andamento das entregas">
                  <div className="tw:grid tw:grid-cols-[33%_repeat(3,1fr)] tw:bg-[#faf7f3] tw:p-[0.846rem] tw:text-[0.692rem] tw:font-bold tw:tracking-[0.054rem] tw:text-[#ac9d91]">
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
                          className="tw:grid tw:min-h-[3.692rem] tw:w-full tw:grid-cols-[33%_1fr] tw:items-center tw:border-0 tw:border-b tw:border-solid tw:border-[#efe7df] tw:bg-transparent tw:text-left tw:text-[#302b2b]"
                          key={deliverable.id}
                        >
                          <div className="tw:flex tw:flex-col tw:gap-[0.231rem] tw:[&_strong]:text-[0.846rem] tw:[&_small]:text-[0.769rem] tw:[&_small]:text-[#8e837b]">
                            <strong>{deliverable.title}</strong>
                            <small>{statusLabel[deliverable.status] || deliverable.status}</small>
                          </div>
                          <div className="tw:relative tw:h-full tw:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(25%_-_1px),#e6d8c9_calc(25%_-_1px),#e6d8c9_25%)]">
                            {due && timeline ? (
                              <time
                                dateTime={deliverable.due_at || undefined}
                                className={`tw:absolute tw:top-1/2 tw:-translate-1/2 tw:rounded-full tw:border tw:border-solid tw:p-[0.615rem] tw:text-[0.692rem] tw:font-bold tw:whitespace-nowrap ${milestoneTone[deliverable.status] ?? 'tw:border-[#e5d1b0] tw:bg-[#f7e9d7] tw:text-[#896127]'}`}
                                style={{ left: `clamp(2.75rem, ${position}%, calc(100% - 2.75rem))` }}
                              >
                                {formatDate(deliverable.due_at)}
                              </time>
                            ) : (
                              <span className="tw:absolute tw:top-1/2 tw:-translate-y-1/2 tw:text-[0.692rem]/[inherit] tw:text-[#8c8076]">
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
                      className="tw:mt-[0.769rem] tw:ml-[33%] tw:flex tw:justify-between tw:text-[0.692rem] tw:text-[#aa998d]"
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
                <div className="tw:flex tw:items-start tw:justify-between tw:gap-[0.769rem] tw:[&_h3]:m-0">
                  <div>
                    <small className="tw:text-[0.692rem] tw:font-extrabold tw:tracking-[0.108rem] tw:text-[#a37d50]">
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
                          className="tw:mt-[1.308rem] tw:flex tw:items-center tw:gap-[0.769rem] tw:[&>div:nth-of-type(2)]:flex tw:[&>div:nth-of-type(2)]:flex-col tw:[&>div:nth-of-type(2)]:gap-[0.462rem] tw:[&>div:nth-of-type(2)_strong]:text-[0.846rem] tw:[&>div:nth-of-type(2)_small]:text-[0.769rem] tw:[&>div:nth-of-type(2)_small]:text-[#82776f]"
                          key={event.id}
                        >
                          <div className="tw:flex tw:w-[3.231rem] tw:shrink-0 tw:flex-col tw:items-center tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#e7dcd0] tw:p-[0.385rem] tw:[&_strong]:text-[1.615rem] tw:[&_small]:text-[0.692rem] tw:[&_small]:text-[#a97c49]">
                            <strong>{date.day}</strong>
                            <small>{date.month}</small>
                          </div>
                          <span className="tw:size-[0.692rem] tw:rounded-full tw:bg-[#3684a3]" />
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
                className="tw:min-h-[8.615rem] tw:[&_p]:my-[0.692rem]! tw:[&_p]:text-[0.846rem]!"
              >
                <div className="tw:flex tw:items-start tw:justify-between tw:gap-[0.769rem] tw:[&_h3]:m-0">
                  <h3>Próxima decisão</h3>
                  {waiting.length > 0 && (
                    <span className="tw:rounded-[0.538rem] tw:bg-[#ede8f8] tw:px-[0.615rem] tw:py-[0.385rem] tw:text-[0.692rem] tw:font-bold tw:text-[#785c9e]">
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
          className="ch-chat-trigger tw:fixed tw:right-8 tw:bottom-[1.769rem] tw:z-30 tw:flex tw:items-center tw:gap-[0.615rem] tw:rounded-[1rem] tw:border tw:border-solid tw:border-cali-gold tw:bg-cali-brand tw:px-[1.077rem] tw:py-[0.769rem] tw:font-bold tw:text-white tw:no-underline tw:shadow-[0_0.692rem_2.154rem_#5a1e2d33] tw:max-[50rem]:right-[0.769rem] tw:max-[50rem]:bottom-[0.769rem]"
          to="/cliente/registros"
        >
          <MessageCircle size={16} /> Falar com a CALI
        </Link>
      </section>
    </Shell>
  );
}
