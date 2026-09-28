import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, FileText,
  Leaf, Loader2, MessageCircle, Minus, Send,
  Sparkles, Star, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { ClientDocumentBrandCover } from '../../components/ClientDocumentBrandCover';
import { loadClientDashboardReality, subscribeClientDeliveryReality } from '../../lib/clientDeliveryReality';
import { supabase } from '../../lib/supabase';
import { useWorkspaceAuth } from '../../auth/WorkspaceAuthProvider';
import { patiWavePoster, patiWaveVideo } from '../../assets/patiWaveMedia';

type Company = {
  id: string;
  display_name: string;
  logo_url?: string | null;
  service_type?: string | null;
  service_plan?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  monthly_hours_contracted?: number | null;
  show_hours_to_client?: boolean | null;
};
type Profile = { full_name: string; company_id: string; avatar_url?: string | null; avatar_position_x?: number | null; avatar_position_y?: number | null; avatar_zoom?: number | null };
type Project = { id: string; name: string; status: string; start_date?: string | null; target_end_date?: string | null };
type Deliverable = { id: string; title: string; status: string; due_at?: string | null; project_id?: string | null };
type EventItem = { id: string; title: string; starts_at: string; mode?: string | null; meeting_url?: string | null };
type ClientDocument = { id: string; title: string; updated_at: string; category?: string | null };
type ClientOccurrence = { id: string; title: string; workflow_status?: string | null; occurred_at: string; last_activity_at?: string | null };
type Contact = {
  full_name: string;
  job_title?: string | null;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};
type ChatKind = 'question' | 'context_change' | 'request' | 'occurrence';
type WorkMetrics = {
  total: number; completed: number; notStarted: number; inProgress: number;
  internalReview: number; withClient: number;
};

type DashboardData = {
  company: Company | null;
  profile: Profile | null;
  contact: Contact | null;
  projects: Project[];
  deliverables: Deliverable[];
  events: EventItem[];
  minutes: number;
  hoursVisible: boolean;
  contractedHours: number;
  hoursLoadError: boolean;
  nps: number | null;
  npsCount: number;
  completionPct: number;
  workMetrics: WorkMetrics | null;
  unlinkedHourEntries: number;
  reportCount: number | null;
  latestDocument: ClientDocument | null;
  documentCount: number | null;
  openOccurrenceCount: number | null;
  latestOccurrence: ClientOccurrence | null;
  occurrenceLoadError: boolean;
};

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
  const [data, setData] = useState<DashboardData>({ company: null, profile: null, contact: null, projects: [], deliverables: [], events: [], minutes: 0, hoursVisible: false, contractedHours: 0, hoursLoadError: false, nps: null, npsCount: 0, completionPct: 0, workMetrics: null, unlinkedHourEntries: 0, reportCount: null, latestDocument: null, documentCount: null, openOccurrenceCount: null, latestOccurrence: null, occurrenceLoadError: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatKind, setChatKind] = useState<ChatKind>('question');
  const [chatSent, setChatSent] = useState(false);
  const [assistantReply, setAssistantReply] = useState('');
  const [sending, setSending] = useState(false);
  const refreshTimer = useRef<number | null>(null);
  const loadingRef = useRef(false);
  const refreshPendingRef = useRef(false);

  useEffect(() => {
    void load(true);
    return () => { if (refreshTimer.current) window.clearTimeout(refreshTimer.current); };
  }, []);

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
    if (!supabase) return;
    if (loadingRef.current) { refreshPendingRef.current = true; return; }
    loadingRef.current = true;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const profileResult = await supabase.from('profiles').select('full_name,company_id,avatar_url,avatar_position_x,avatar_position_y,avatar_zoom').eq('id', userId).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      const companyId = profileResult.data?.company_id;
      if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

      const nowIso = new Date().toISOString();
      const { start, end } = currentMonthBounds();
      const [companyResult, deliveryReality, hoursResult, workResult, eventResult, reportResult, contactResult, documentsResult, occurrencesResult, latestOccurrenceResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,service_type,service_plan,start_date,end_date,monthly_hours_contracted,show_hours_to_client').eq('id', companyId).single(),
        loadClientDashboardReality(companyId),
        supabase.rpc('get_client_hours_summary', { p_period_start: start, p_period_end: end }),
        supabase.rpc('get_client_home_work_metrics', { p_period_start: start, p_period_end: end }),
        supabase.from('events').select('id,title,starts_at,mode,meeting_url').eq('company_id', companyId).eq('visibility', 'client').is('cancelled_at', null).gte('starts_at', nowIso).order('starts_at').limit(3),
        supabase.from('reports').select('id').eq('company_id', companyId).in('status', ['sent', 'published']),
        supabase.rpc('get_client_account_contact'),
        supabase.from('files').select('id,title,updated_at,category', { count: 'exact' }).eq('company_id', companyId).eq('client_visible', true).eq('status', 'published').order('updated_at', { ascending: false }).limit(1),
        supabase.from('account_records').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('visibility', 'client').in('record_type', ['occurrence', 'request', 'context_change', 'other']).in('workflow_status', ['open', 'in_progress', 'waiting_client', 'standby']),
        supabase.from('account_records').select('id,title,workflow_status,occurred_at,last_activity_at').eq('company_id', companyId).eq('visibility', 'client').in('record_type', ['occurrence', 'request', 'context_change', 'other']).order('last_activity_at', { ascending: false, nullsFirst: false }).order('occurred_at', { ascending: false }).limit(1),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (eventResult.error) throw eventResult.error;
      if (workResult.error) throw workResult.error;
      const contactRows = contactResult.error ? [] : ((contactResult.data || []) as Contact[]);
      const hoursSummary = (hoursResult.error ? null : hoursResult.data) as { visible?: boolean; contractedHours?: number; consumedMinutes?: number } | null;
      const workSummary = workResult.data as { ratings?: { average?: number | null; count?: number }; work?: WorkMetrics; unlinkedHourEntries?: number } | null;

      setData({
        company: companyResult.data as Company,
        profile: profileResult.data as Profile,
        contact: contactRows[0] || null,
        projects: deliveryReality.projects.map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          start_date: project.startDate,
          target_end_date: project.targetEndDate,
        })),
        deliverables: deliveryReality.deliverables.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          due_at: item.dueAt,
          project_id: item.projectId,
        })),
        events: (eventResult.data || []) as EventItem[],
        minutes: Number(hoursSummary?.consumedMinutes || 0),
        hoursVisible: hoursSummary?.visible === true,
        contractedHours: Number(hoursSummary?.contractedHours || 0),
        hoursLoadError: Boolean(hoursResult.error),
        nps: workSummary?.ratings?.average == null ? null : Number(workSummary.ratings.average),
        npsCount: Number(workSummary?.ratings?.count || 0),
        completionPct: workSummary?.work?.total ? Math.round(workSummary.work.completed / workSummary.work.total * 100) : 0,
        workMetrics: workSummary?.work || null,
        unlinkedHourEntries: Number(workSummary?.unlinkedHourEntries || 0),
        reportCount: reportResult.error ? null : (reportResult.data || []).length,
        latestDocument: documentsResult.error ? null : (documentsResult.data?.[0] as ClientDocument || null),
        documentCount: documentsResult.error ? null : documentsResult.count,
        openOccurrenceCount: occurrencesResult.error ? null : occurrencesResult.count,
        latestOccurrence: latestOccurrenceResult.error ? null : (latestOccurrenceResult.data?.[0] as ClientOccurrence || null),
        occurrenceLoadError: Boolean(latestOccurrenceResult.error),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar sua área.');
    } finally {
      loadingRef.current = false;
      if (showLoading) setLoading(false);
      if (refreshPendingRef.current) {
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

  function quickAnswer(kind: 'next_event' | 'hours' | 'validation' | 'reports') {
    if (kind === 'next_event') {
      const next = data.events[0];
      if (!next) setAssistantReply('Não há compromisso futuro publicado para sua empresa neste momento.');
      else {
        const date = new Date(next.starts_at);
        setAssistantReply(`Seu próximo compromisso é “${next.title}”, em ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)}.`);
      }
    }
    if (kind === 'hours') {
      if (data.hoursLoadError) setAssistantReply('Não consegui consultar as horas agora. Tente novamente na página de Horas.');
      else if (!showHours) setAssistantReply('A visualização de horas não está habilitada para esta conta. Quando a CALI disponibilizar esse indicador, ele aparecerá aqui automaticamente.');
      else setAssistantReply(contractedMinutes > 0 ? `Há ${formatHours(data.minutes)} registradas neste mês, de ${data.contractedHours}h contratadas.` : `Há ${formatHours(data.minutes)} registradas neste mês. A franquia mensal ainda não está definida no cadastro da sua conta.`);
    }
    if (kind === 'validation') setAssistantReply(waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'entrega está' : 'entregas estão'} aguardando sua validação.` : 'Você não tem validação pendente neste momento.');
    if (kind === 'reports') setAssistantReply(data.reportCount == null ? 'Não consegui consultar os relatórios agora. Acesse a página de Relatórios para tentar novamente.' : data.reportCount ? `${data.reportCount} ${data.reportCount === 1 ? 'relatório publicado está' : 'relatórios publicados estão'} disponível na sua área.` : 'Ainda não há relatório publicado para sua conta.');
  }

  async function sendMessage() {
    if (!supabase || !chatText.trim()) return;
    setSending(true);
    setError('');
    try {
      const result = await supabase.rpc('client_submit_account_message', { p_kind: chatKind, p_message: chatText.trim() });
      if (result.error) throw result.error;
      setChatSent(true);
      setAssistantReply('Recebi e registrei sua mensagem na conta CALI. Ela também foi sinalizada no administrativo para acompanhamento da Patrícia.');
      setChatText('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar sua mensagem.');
    } finally { setSending(false); }
  }

  if (loading) return <Shell role="client"><section className="page client-home-v2"><div className="data-loading"><Loader2 className="spin" size={20} />Preparando sua área CALI…</div></section></Shell>;

  const contactName = data.contact?.full_name || 'Patrícia Lima';
  const contactRole = data.contact?.job_title || 'People Advisory Executive';

  return <Shell role="client">
    <section className="page client-home-v2 client-home-v3">
      {error && <div className="inline-notice">{error}</div>}

      <div className="client-home-greeting client-home-intro">
        <h1>Olá, {firstName(data.profile?.full_name)}.</h1>
        <div className="patricia-identity-card client-home-contact">
          <div className="patricia-photo-wrap">{data.contact?.avatar_url ? <img src={data.contact.avatar_url} alt={contactName} style={{ objectPosition: `${Number(data.contact.avatar_position_x || 50)}% ${Number(data.contact.avatar_position_y || 50)}%`, transform: `scale(${Number(data.contact.avatar_zoom || 1)})` }} /> : <span>PL</span>}</div>
          <div><span>RESPONSÁVEL EXECUTIVA DA CONTA</span><strong>{contactName}</strong><em>{contactRole}</em></div>
        </div>
      </div>

      <div className="client-home-top-grid">
        <aside className="contract-card" aria-label="Sua contratação">
          <div className="contract-card-head">
            <div className="contract-logo-frame">
              {data.company?.logo_url ? <img src={data.company.logo_url} alt="" /> : <Sparkles size={18} />}
            </div>
            <div className="contract-main"><span>SUA CONTRATAÇÃO</span><strong>{packageName}</strong><small>{data.company?.display_name || 'Conta CALI'}</small></div>
          </div>
          <div className="contract-card-hours">
            {showHours && data.contractedHours > 0 ? <>
              <div className="contract-hours-stat"><strong>{formatHours(data.minutes)}</strong><span>consumidas no mês · {hoursPercentage}%</span></div>
              <div className="contract-hours-stat"><strong>{data.contractedHours}h</strong><span>contratadas no mês</span></div>
            </> : showHours ? <div className="contract-hours-stat wide"><strong>{formatHours(data.minutes)}</strong><span>consumidas no mês · franquia não definida</span></div> : <div className="contract-hours-stat wide"><strong>{data.hoursLoadError ? 'Indisponível' : activeProject ? 'Ativo' : 'Em preparação'}</strong><span>{data.hoursLoadError ? 'horas do mês' : 'ciclo atual'}</span></div>}
          </div>
          {contractedMinutes > 0 && <div className="contract-hours-progress" role="progressbar" aria-label="Horas consumidas neste mês" aria-valuemin={0} aria-valuemax={contractedMinutes} aria-valuenow={Math.min(contractedMinutes, data.minutes)} aria-valuetext={`${formatHours(data.minutes)} de ${data.contractedHours} horas, ${hoursPercentage}%`}>
            <div className="contract-hours-scale"><span>0h</span><span>50%</span><span>{data.contractedHours}h</span></div>
            <div className="contract-hours-track"><div className="contract-hours-fill" style={{ clipPath: `inset(0 ${100 - hoursProgress}% 0 0)` }} /><i aria-hidden="true" /></div>
          </div>}
        </aside>

      </div>
      {waiting.length > 0 && <Link to="/cliente/entregaveis" className="client-home-validation">{waiting.length} {waiting.length === 1 ? 'entrega aguarda' : 'entregas aguardam'} sua validação <ChevronRight size={15} /></Link>}

      <section className="client-executive-grid">
        <article className="executive-card project-card">
          <div className="client-cycle-summary">
            <div className="client-cycle-copy"><span>Entregas do ciclo</span><strong>{cycleTotal}</strong><small>{cycleTotal === 1 ? 'entrega no projeto atual' : 'entregas no projeto atual'}</small></div>
            <div className="client-cycle-donut" role="img" aria-label={cycleBreakdown.map((item) => `${item.count} ${item.label.toLowerCase()}`).join(', ')}>
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="client-cycle-track" cx="50" cy="50" r="40" fill="none" pathLength="100" />
                {cycleTotal > 0 && cycleBreakdown.map((item, index) => item.count > 0 && <circle key={item.label} cx="50" cy="50" r="40" fill="none" pathLength="100" stroke={item.color} strokeDasharray={`${item.count / cycleTotal * 100} 100`} strokeDashoffset={-cycleBreakdown.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / cycleTotal * 100} />)}
              </svg>
            </div>
          </div>
          <div className="client-cycle-legend">{cycleBreakdown.map((item) => <div key={item.label}><i style={{ backgroundColor: item.color }} /><span>{item.label}</span><strong>{item.count}</strong></div>)}</div>
        </article>

        <article className="executive-card nps-card client-perception-card">
          <div className="client-perception-copy">
            <span>Percepção do trabalho · mês atual</span>
            <div className="client-perception-detail"><i><Star size={18} /></i><div><strong>{data.npsCount} {data.npsCount === 1 ? 'avaliação recebida' : 'avaliações recebidas'}</strong><small>da sua empresa</small></div></div>
            <div className="client-perception-detail"><i><CheckCircle2 size={18} /></i><div><strong>{data.nps == null ? 'Aguardando a primeira' : 'Média das avaliações'}</strong><small>{data.nps == null ? 'De entregas ou ocorrências' : 'Entregas e ocorrências avaliadas'}</small></div></div>
          </div>
          <div className="client-perception-gauge" role="img" aria-label={data.nps == null ? 'Ainda sem avaliação das entregas' : `Nota média ${data.nps.toFixed(1)} de 5, em ${data.npsCount} avaliações`}>
            <svg viewBox="0 0 180 102" aria-hidden="true">
              <defs><linearGradient id="client-perception-gradient"><stop offset="0%" stopColor="#D85C73" /><stop offset="50%" stopColor="#E3A536" /><stop offset="100%" stopColor="#2BAFA8" /></linearGradient></defs>
              <path className="client-perception-gauge-track" d="M 15 90 A 75 75 0 0 1 165 90" fill="none" pathLength="100" />
              {data.nps != null && <path className="client-perception-gauge-fill" d="M 15 90 A 75 75 0 0 1 165 90" fill="none" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, data.nps / 5 * 100))} 100`} />}
            </svg>
            <div><strong>{data.nps == null ? '—' : data.nps.toFixed(1)}</strong><small>{data.nps == null ? 'Sem nota' : 'de 5 pontos'}</small></div>
          </div>
        </article>

        <article className="executive-card quality-card">
          <div className="client-completion-copy">
            <span>Conclusão do trabalho · mês atual</span>
            <strong>{data.completionPct}%</strong>
            <p>{work?.completed || 0} de {work?.total || 0} {work?.total === 1 ? 'atividade concluída' : 'atividades concluídas'} entre entregas e ocorrências</p>
            {data.unlinkedHourEntries > 0 && <small>{data.unlinkedHourEntries} {data.unlinkedHourEntries === 1 ? 'lançamento de horas sem vínculo' : 'lançamentos de horas sem vínculo'} com uma atividade</small>}
          </div>
          <div className="client-completion-bars" role="img" aria-label={deliveryStages.map((stage) => `${stage.label}: ${stage.count}`).join('; ')}>
            {deliveryStages.map((stage, index) => <span key={stage.label} className={`client-completion-bar stage-${index + 1}${stage.count ? '' : ' is-empty'}`} style={{ height: stage.count ? `${Math.max(25, stage.count / highestStageCount * 100)}%` : '4px' }} title={`${stage.label}: ${stage.count}`} />)}
          </div>
        </article>
      </section>

      <section className="client-home-service-grid" aria-label="Atualizações da conta">
        <article className="client-service-card documents">
          <div className="client-service-cover">
            {data.latestDocument ? <ClientDocumentBrandCover companyId={data.company?.id || ''} companyName={data.company?.display_name || 'sua empresa'} logoUrl={data.company?.logo_url} compact /> : <div className="client-service-empty-cover"><FileText size={26} /></div>}
          </div>
          <div className="client-service-content">
            <span className="client-service-kicker">DOCUMENTO MAIS RECENTE</span>
            <strong>{data.latestDocument?.title || (data.documentCount == null ? 'Documentos indisponíveis agora' : 'Nenhum documento publicado')}</strong>
            {data.latestDocument && <p>Atualizado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(data.latestDocument.updated_at)).replace('.', '')}</p>}
            <Link to="/cliente/documentos">{data.latestDocument ? 'Ver documento e acervo' : 'Ver documentos'} <ChevronRight size={15} /></Link>
          </div>
        </article>
        <article className="client-service-card occurrences">
          {latestOccurrence && <span className={`client-occurrence-badge status-${occurrenceStatus}`}>{occurrenceStatusText[occurrenceStatus] || 'Em acompanhamento'}</span>}
          <div className="client-occurrence-people" aria-label="Contatos da empresa e da CALI">
            <span className="client-occurrence-avatar">{data.profile?.avatar_url ? <img src={data.profile.avatar_url} alt={data.profile.full_name} style={{ objectPosition: `${Number(data.profile.avatar_position_x ?? 50)}% ${Number(data.profile.avatar_position_y ?? 50)}%`, transform: `scale(${Number(data.profile.avatar_zoom ?? 1)})` }} /> : firstName(data.profile?.full_name).charAt(0)}</span>
            <span className="client-occurrence-avatar">{data.contact?.avatar_url ? <img src={data.contact.avatar_url} alt={contactName} style={{ objectPosition: `${Number(data.contact.avatar_position_x ?? 50)}% ${Number(data.contact.avatar_position_y ?? 50)}%`, transform: `scale(${Number(data.contact.avatar_zoom ?? 1)})` }} /> : contactName.charAt(0)}</span>
            <span className="client-occurrence-avatar company">{data.company?.logo_url ? <img src={data.company.logo_url} alt={data.company.display_name} /> : 'C'}</span>
          </div>
          <span className="client-service-kicker">OCORRÊNCIA MAIS RECENTE</span>
          <strong>{latestOccurrence?.title || (data.occurrenceLoadError ? 'Ocorrências indisponíveis agora' : 'Nenhuma ocorrência registrada')}</strong>
          {latestOccurrence ? <p>{occurrenceDays === 0 ? 'Registrada hoje' : `Registrada há ${occurrenceDays} ${occurrenceDays === 1 ? 'dia' : 'dias'}`} · {data.openOccurrenceCount ?? '—'} em aberto</p> : <p>{data.occurrenceLoadError ? 'Acesse a página de registros para tentar novamente.' : 'Os registros compartilhados aparecerão aqui.'}</p>}
          <Link to={latestOccurrence ? `/cliente/registros?record=${encodeURIComponent(latestOccurrence.id)}` : '/cliente/registros'}>{latestOccurrence ? 'Abrir ocorrência' : 'Ver ocorrências'} <ChevronRight size={15} /></Link>
        </article>
      </section>

      <div className="client-home-lower-grid">
        <section className="panel client-project-panel">
          <div className="panel-title"><div><span className="section-kicker">EM MOVIMENTO</span><h2>{activeProject?.name || 'Projeto atual'}</h2></div><Link to="/cliente/entregaveis">Ver projeto</Link></div>
          {visibleDeliverables.length ? <div className="client-delivery-schedule" aria-label="Prazos e andamento das entregas">
            <div className="client-delivery-lanes">{visibleDeliverables.map((deliverable) => {
              const due = deliveryDate(deliverable.due_at);
              const position = due && timeline ? Math.max(12, Math.min(88, (due.getTime() - timeline.start) / timeline.span * 100)) : 50;
              return <div className="client-delivery-lane" key={deliverable.id}>
                <div className="client-delivery-name"><strong>{deliverable.title}</strong><small>{statusLabel[deliverable.status] || deliverable.status}</small></div>
                <div className="client-delivery-track" aria-hidden="true">
                  {due && timeline ? <span className={`client-delivery-marker status-${deliverable.status}`} style={{ left: `${position}%` }}>{formatDate(deliverable.due_at)}</span> : <span className="client-delivery-undated">Prazo a definir</span>}
                </div>
                <span className="client-delivery-mobile-date">{formatDate(deliverable.due_at)}</span>
              </div>;
            })}</div>
            {timeline && <div className="client-delivery-axis" aria-hidden="true"><span />{timeline.ticks.map((tick) => <time key={tick}>{formatDate(new Date(tick).toISOString())}</time>)}</div>}
          </div> : <div className="client-empty-inline">Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.</div>}
        </section>

        <section className="panel client-agenda-panel">
          <div className="panel-title"><div><span className="section-kicker">PRÓXIMOS PASSOS</span><h2>Agenda compartilhada</h2></div><Link to="/cliente/cronograma">Abrir</Link></div>
          {data.events.length ? <div className="client-agenda-timeline">{data.events.map((event) => { const date = formatEventDate(event.starts_at); return <div className="client-agenda-step" key={event.id}><time dateTime={event.starts_at}><strong>{date.day}</strong><span>{date.month}</span><small>{date.time}</small></time><i aria-hidden="true" /><div><strong>{event.title}</strong>{event.mode && <p>{event.mode === 'in_person' ? 'Presencial' : event.mode === 'remote' || event.mode === 'online' ? 'Online' : event.mode}</p>}</div>{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noreferrer" aria-label={`Abrir reunião: ${event.title}`}><ArrowUpRight size={17} /></a>}</div>; })}</div> : <div className="client-empty-inline"><CalendarDays size={18} />Nenhum compromisso futuro publicado para sua empresa.</div>}
        </section>
      </div>

      {!chatOpen && <button className="patricia-float" type="button" onClick={() => { setChatSent(false); setAssistantReply(''); setChatOpen(true); }} aria-label="Fale com a Pati" title="Fale com a Pati">
        <span className="patricia-float-art patricia-portrait-slot"><video src={patiWaveVideo} poster={patiWavePoster} muted loop autoPlay playsInline preload="metadata" aria-hidden="true" /></span><span>Fale com a Pati</span>
      </button>}
    </section>

    {chatOpen && <aside className="client-chat-panel client-chat-floating" role="dialog" aria-label="Fale com a Pati">
      <div className="client-chat-window-actions">
        <button onClick={() => setChatOpen(false)} aria-label="Minimizar"><Minus size={17} /></button>
        <button onClick={() => { setChatOpen(false); setAssistantReply(''); setChatSent(false); }} aria-label="Fechar"><X size={17} /></button>
      </div>
      <div className="client-chat-brand"><div className="chat-lime patricia-portrait-slot"><video src={patiWaveVideo} poster={patiWavePoster} muted loop autoPlay playsInline preload="metadata" aria-hidden="true" /></div><div><span>CANAL DIRETO CALI</span><strong>Fale com a Pati</strong><small>{contactRole}</small></div></div>
      <p className="chat-intro">Use este canal para consultar informações da sua conta ou enviar algo que precise de acompanhamento da CALI.</p>

      <div className="chat-auto-block">
        <span>POSSO RESPONDER AGORA</span>
        <div className="chat-auto-actions"><button onClick={() => quickAnswer('next_event')}>Próxima reunião</button>{showHours && <button onClick={() => quickAnswer('hours')}>Horas do ciclo</button>}<button onClick={() => quickAnswer('validation')}>Validações</button><button onClick={() => quickAnswer('reports')}>Relatórios</button></div>
        {assistantReply && <div className="chat-auto-reply"><Leaf size={15} /><p>{assistantReply}</p></div>}
      </div>

      {chatSent ? <div className="chat-success compact"><CheckCircle2 size={22} /><strong>Mensagem registrada.</strong><p>Ela entrou em Registros/Ocorrências da conta e gerou uma notificação no administrativo.</p><button onClick={() => { setChatSent(false); setAssistantReply(''); }}>Enviar outra mensagem</button></div> : <>
        <div className="chat-kind-tabs" role="group" aria-label="Tipo da mensagem">
          <button className={chatKind === 'question' ? 'active' : ''} onClick={() => setChatKind('question')}>Dúvida</button>
          <button className={chatKind === 'context_change' ? 'active' : ''} onClick={() => setChatKind('context_change')}>Mudança de contexto</button>
          <button className={chatKind === 'request' ? 'active' : ''} onClick={() => setChatKind('request')}>Solicitação</button>
          <button className={chatKind === 'occurrence' ? 'active' : ''} onClick={() => setChatKind('occurrence')}>Ocorrência</button>
        </div>
        <label>Sua mensagem<textarea rows={4} value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Escreva aqui. Isso ficará registrado na sua conta CALI." /></label>
        <button className="chat-send" disabled={!chatText.trim() || sending} onClick={() => void sendMessage()}>{sending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}Enviar para a Pati</button>
        <div className="chat-note"><MessageCircle size={15} />Respostas automáticas usam apenas dados reais. Questões estratégicas ficam registradas para a Pati.</div>
      </>}
    </aside>}
  </Shell>;
}
