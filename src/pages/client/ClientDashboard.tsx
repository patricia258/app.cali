import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight,
  Leaf, ListChecks, Loader2, MessageCircle, Minus, Send,
  Sparkles, Star, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
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
type Profile = { full_name: string; company_id: string };
type Project = { id: string; name: string; status: string; start_date?: string | null; target_end_date?: string | null };
type Deliverable = { id: string; title: string; status: string; due_at?: string | null; project_id?: string | null };
type EventItem = { id: string; title: string; starts_at: string; mode?: string | null; meeting_url?: string | null };
type Contact = {
  full_name: string;
  job_title?: string | null;
  avatar_url?: string | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
};
type ChatKind = 'question' | 'context_change' | 'request' | 'occurrence';

type DashboardData = {
  company: Company | null;
  profile: Profile | null;
  contact: Contact | null;
  projects: Project[];
  deliverables: Deliverable[];
  events: EventItem[];
  minutes: number;
  nps: number | null;
  npsCount: number;
  completionPct: number;
  reportCount: number;
};

const statusLabel: Record<string, string> = {
  not_started: 'Não iniciado', in_progress: 'Em andamento', standby: 'Em espera',
  internal_review: 'Revisão CALI', client_review: 'Aguardando sua validação',
  adjustment_requested: 'Ajuste solicitado', rebriefing: 'Em rebriefing',
  approved: 'Aprovado', cancelled: 'Cancelado',
};
const closedStatuses = new Set(['approved', 'cancelled']);

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
function formatEventDate(value: string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date),
  };
}
function CompletionDonut({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (bounded / 100) * circumference;
  return <div className="client-quality-donut" aria-label={`Entregas aprovadas ${bounded}%`}>
    <svg viewBox="0 0 100 100" role="img">
      <circle className="donut-track" cx="50" cy="50" r="42" />
      <circle className="donut-value" cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={offset} />
    </svg>
    <div><strong>{bounded}%</strong><span>aprovado</span></div>
  </div>;
}

export function ClientDashboard() {
  const { user } = useWorkspaceAuth();
  const [data, setData] = useState<DashboardData>({ company: null, profile: null, contact: null, projects: [], deliverables: [], events: [], minutes: 0, nps: null, npsCount: 0, completionPct: 0, reportCount: 0 });
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

  useEffect(() => {
    void load(true);
    return () => { if (refreshTimer.current) window.clearTimeout(refreshTimer.current); };
  }, []);

  useEffect(() => {
    const companyId = data.company?.id;
    if (!companyId) return;
    return subscribeClientDeliveryReality(companyId, () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void load(false), 260);
    });
  }, [data.company?.id]);

  async function load(showLoading = false) {
    if (!supabase || loadingRef.current) return;
    loadingRef.current = true;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Sessão do cliente não encontrada.');

      const profileResult = await supabase.from('profiles').select('full_name,company_id').eq('id', userId).maybeSingle();
      if (profileResult.error) throw profileResult.error;
      const companyId = profileResult.data?.company_id;
      if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

      const nowIso = new Date().toISOString();
      const [companyResult, deliveryReality, eventResult, reportResult, contactResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url,service_type,service_plan,start_date,end_date,monthly_hours_contracted,show_hours_to_client').eq('id', companyId).single(),
        loadClientDashboardReality(companyId),
        supabase.from('events').select('id,title,starts_at,mode,meeting_url').eq('company_id', companyId).eq('visibility', 'client').is('cancelled_at', null).gte('starts_at', nowIso).order('starts_at').limit(3),
        supabase.from('reports').select('id').eq('company_id', companyId).not('published_at', 'is', null),
        supabase.rpc('get_client_account_contact'),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (eventResult.error) throw eventResult.error;
      const contactRows = contactResult.error ? [] : ((contactResult.data || []) as Contact[]);

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
        deliverables: deliveryReality.deliverables.filter((item) => item.status !== 'cancelled').map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          due_at: item.dueAt,
          project_id: item.projectId,
        })),
        events: (eventResult.data || []) as EventItem[],
        minutes: deliveryReality.metrics.visibleMinutes || 0,
        nps: deliveryReality.metrics.averageDeliveryScore,
        npsCount: deliveryReality.metrics.feedbackCount,
        completionPct: deliveryReality.metrics.completionPct,
        reportCount: reportResult.error ? 0 : (reportResult.data || []).length,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar sua área.');
    } finally {
      loadingRef.current = false;
      if (showLoading) setLoading(false);
    }
  }

  const activeProject = data.projects.find((project) => !['completed', 'cancelled'].includes(project.status)) || data.projects[0] || null;
  const projectDeliverables = activeProject ? data.deliverables.filter((item) => item.project_id === activeProject.id) : data.deliverables;
  const approvedCount = projectDeliverables.filter((item) => item.status === 'approved').length;
  const waiting = data.deliverables.filter((item) => item.status === 'client_review');
  const activeDeliverables = data.deliverables.filter((item) => !closedStatuses.has(item.status));
  const movingCount = projectDeliverables.filter((item) => ['in_progress', 'internal_review', 'client_review', 'adjustment_requested', 'rebriefing'].includes(item.status)).length;
  const showHours = Boolean(data.company?.show_hours_to_client);
  const contractedMinutes = showHours ? Number(data.company?.monthly_hours_contracted || 0) * 60 : 0;
  const packageName = planLabel(data.company?.service_plan) || planLabel(data.company?.service_type) || 'Contratação CALI';

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
      if (!showHours) setAssistantReply('A visualização de horas não está habilitada para esta conta. Quando a CALI disponibilizar esse indicador, ele aparecerá aqui automaticamente.');
      else setAssistantReply(contractedMinutes > 0 ? `Há ${formatHours(data.minutes)} registradas neste ciclo, de ${Number(data.company?.monthly_hours_contracted || 0)}h contratadas.` : `Há ${formatHours(data.minutes)} registradas. A franquia mensal ainda não está definida no cadastro da sua conta.`);
    }
    if (kind === 'validation') setAssistantReply(waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'entrega está' : 'entregas estão'} aguardando sua validação.` : 'Você não tem validação pendente neste momento.');
    if (kind === 'reports') setAssistantReply(data.reportCount ? `${data.reportCount} ${data.reportCount === 1 ? 'relatório publicado está' : 'relatórios publicados estão'} disponível na sua área.` : 'Ainda não há relatório publicado para sua conta.');
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

      <div className="client-home-greeting">
        <h1>Olá, {firstName(data.profile?.full_name)}.</h1>
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
            {showHours && data.company?.monthly_hours_contracted ? <>
              <div className="contract-hours-stat"><strong>{formatHours(data.minutes)}</strong><span>consumidas no mês</span></div>
              <div className="contract-hours-stat"><strong>{Number(data.company.monthly_hours_contracted)}h</strong><span>contratadas no mês</span></div>
            </> : <div className="contract-hours-stat wide"><strong>{activeProject ? 'Ativo' : 'Em preparação'}</strong><span>ciclo atual</span></div>}
          </div>
        </aside>

        {waiting.length > 0 ? <section className="client-action-hero">
          <span>AGUARDANDO VOCÊ</span>
          <h2>{waiting.length === 1 ? '1 entrega está pronta para sua validação.' : `${waiting.length} entregas estão prontas para sua validação.`}</h2>
          <p>{waiting[0].title}{waiting.length > 1 ? ` e mais ${waiting.length - 1}.` : ' já pode ser revisada.'}</p>
          <Link to="/cliente/entregaveis" className="client-action-hero-cta">Revisar agora <ChevronRight size={15} /></Link>
        </section> : <section className="client-action-hero quiet">
          <span>STATUS DO CICLO</span>
          <h2>{activeDeliverables.length ? `${activeDeliverables.length} ${activeDeliverables.length === 1 ? 'entrega para acompanhar' : 'entregas para acompanhar'}.` : 'Tudo em dia por aqui.'}</h2>
          <p>{activeDeliverables.length ? 'Acompanhe o andamento e as próximas decisões.' : 'Nenhuma validação pendente no momento.'}</p>
          <Link to="/cliente/entregaveis" className="client-action-hero-cta">Ver entregas <ChevronRight size={15} /></Link>
        </section>}
      </div>

      <section className="client-executive-grid">
        <article className="executive-card project-card">
          <div className="metric-icon"><ListChecks size={18} /></div><span>Entregas do ciclo</span>
          <strong>{projectDeliverables.length}</strong>
          <div className="delivery-status-line"><b>{approvedCount}</b> aprovadas <i /> <b>{movingCount}</b> em movimento</div>
          <p>{waiting.length ? `${waiting.length} aguardando sua validação.` : 'Nenhuma validação pendente agora.'}</p>
        </article>

        <article className="executive-card nps-card">
          <div className="metric-icon"><Star size={18} /></div><span>Percepção das entregas</span>
          <strong>{data.nps == null ? '—' : `${data.nps.toFixed(1)} / 5`}</strong>
          <div className="mini-stars">{data.nps == null ? 'Ainda sem avaliação' : '★★★★★'}</div>
          <p>{data.nps == null ? 'Sua avaliação aparece aqui após as primeiras aprovações.' : `Média real de ${data.npsCount} ${data.npsCount === 1 ? 'avaliação registrada' : 'avaliações registradas'}.`}</p>
        </article>

        <article className="executive-card quality-card">
          <CompletionDonut value={data.completionPct} />
          <div><span>Conclusão das entregas</span><strong>{data.completionPct}% aprovadas</strong><p>Do projeto atual</p></div>
        </article>
      </section>

      <div className="client-home-lower-grid">
        <section className="panel client-project-panel">
          <div className="panel-title"><div><span className="section-kicker">EM MOVIMENTO</span><h2>{activeProject?.name || 'Projeto atual'}</h2></div><Link to="/cliente/entregaveis">Ver projeto</Link></div>
          {projectDeliverables.length ? <div className="client-live-deliverables">{projectDeliverables.slice(0, 4).map((deliverable) => <div className="client-live-row" key={deliverable.id}>
            <span className={`live-dot ${deliverable.status}`} />
            <div><strong>{deliverable.title}</strong><small>{statusLabel[deliverable.status] || deliverable.status}</small></div>
            <div><span>{formatDate(deliverable.due_at)}</span></div>
          </div>)}</div> : <div className="client-empty-inline">Quando a CALI abrir as primeiras entregas deste projeto, elas aparecerão aqui.</div>}
        </section>

        <section className="panel client-agenda-panel">
          <div className="panel-title"><div><span className="section-kicker">PRÓXIMOS PASSOS</span><h2>Agenda compartilhada</h2></div><Link to="/cliente/cronograma">Abrir</Link></div>
          {data.events.length ? data.events.map((event) => { const date = formatEventDate(event.starts_at); return <div className="client-event" key={event.id}><div className="date"><strong>{date.day}</strong><span>{date.month}</span></div><div><strong>{event.title}</strong><p>{date.time}{event.mode ? ` · ${event.mode}` : ''}</p></div>{event.meeting_url && <a href={event.meeting_url} target="_blank" rel="noreferrer" aria-label="Abrir reunião"><ArrowUpRight size={17} /></a>}</div>; }) : <div className="client-empty-inline"><CalendarDays size={18} />Nenhum compromisso futuro publicado para sua empresa.</div>}
          <div className="patricia-identity-card">
            <div className="patricia-photo-wrap">{data.contact?.avatar_url ? <img src={data.contact.avatar_url} alt={contactName} style={{ objectPosition: `${Number(data.contact.avatar_position_x || 50)}% ${Number(data.contact.avatar_position_y || 50)}%`, transform: `scale(${Number(data.contact.avatar_zoom || 1)})` }} /> : <span>PL</span>}</div>
            <div><span>RESPONSÁVEL EXECUTIVA DA CONTA</span><strong>{contactName}</strong><em>{contactRole}</em><p>Leitura executiva, prioridades e acompanhamento da relação com a CALI.</p></div>
          </div>
        </section>
      </div>

      <Link to="/cliente/relatorios" className="client-home-reports-link">
        <span><strong>{data.reportCount}</strong> {data.reportCount === 1 ? 'relatório publicado' : 'relatórios publicados'}</span>
        <span>Ver relatórios <ChevronRight size={16} /></span>
      </Link>

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
