import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Clock3, Eye, Info, Loader2 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type Company = { id: string; name: string; showHours: boolean; servicePlan?: string | null };
type Project = { id: string; name: string };
type Deliverable = { id: string; projectId?: string | null; title: string };
type Entry = {
  id: string;
  projectId?: string | null;
  deliverableId?: string | null;
  workDate: string;
  minutes: number;
  description: string;
  category?: string | null;
};
type Summary = {
  visible: boolean;
  contractedHours: number;
  consumedMinutes: number;
  remainingMinutes: number;
  overMinutes: number;
  usagePercent: number | null;
};

type AlertRow = { threshold: number; clientNotifiedAt?: string | null };

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}
function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}
function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}
function packageLabel(plan?: string | null) {
  if (plan === 'partner') return 'CALI Partner';
  if (plan === 'full') return 'CALI Full';
  return 'CALI RH';
}

export function ClientHoursPage() {
  const [period, setPeriod] = useState(monthValue());
  const [company, setCompany] = useState<Company | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, [period]);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { start, end } = monthBounds(period);
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const profileResult = await supabase.from('profiles').select('company_id').eq('id', userResult.data.user?.id || '').maybeSingle();
      if (profileResult.error) throw profileResult.error;
      const companyId = profileResult.data?.company_id;
      if (!companyId) throw new Error('Empresa vinculada ao acesso não encontrada.');

      const [companyResult, summaryResult, projectResult, deliverableResult, entryResult, alertResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,show_hours_to_client,service_plan').eq('id', companyId).maybeSingle(),
        supabase.rpc('get_client_hours_summary', { p_period_start: start, p_period_end: end }),
        supabase.from('projects').select('id,name').eq('company_id', companyId).neq('status', 'cancelled').order('name'),
        supabase.from('deliverables').select('id,project_id,title').eq('company_id', companyId).eq('client_visible', true).neq('status', 'cancelled').order('title'),
        supabase.from('hour_entries').select('id,project_id,deliverable_id,work_date,minutes,description,category').eq('company_id', companyId).gte('work_date', start).lte('work_date', end).eq('client_visible', true).order('work_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('hour_alerts').select('threshold_percent,client_notified_at').eq('company_id', companyId).order('threshold_percent'),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (summaryResult.error) throw summaryResult.error;
      if (projectResult.error) throw projectResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (entryResult.error) throw entryResult.error;
      if (alertResult.error) throw alertResult.error;

      const rawSummary = (summaryResult.data || {}) as any;
      setCompany(companyResult.data ? {
        id: companyResult.data.id,
        name: companyResult.data.display_name,
        showHours: Boolean(companyResult.data.show_hours_to_client),
        servicePlan: companyResult.data.service_plan,
      } : null);
      setSummary({
        visible: rawSummary.visible === true,
        contractedHours: Number(rawSummary.contractedHours || 0),
        consumedMinutes: Number(rawSummary.consumedMinutes || 0),
        remainingMinutes: Number(rawSummary.remainingMinutes || 0),
        overMinutes: Number(rawSummary.overMinutes || 0),
        usagePercent: rawSummary.usagePercent === null || rawSummary.usagePercent === undefined ? null : Number(rawSummary.usagePercent),
      });
      setProjects((projectResult.data || []).map((row: any) => ({ id: row.id, name: row.name })));
      setDeliverables((deliverableResult.data || []).map((row: any) => ({ id: row.id, projectId: row.project_id, title: row.title })));
      setEntries((entryResult.data || []).map((row: any) => ({ id: row.id, projectId: row.project_id, deliverableId: row.deliverable_id, workDate: row.work_date, minutes: Number(row.minutes || 0), description: row.description, category: row.category })));
      setAlerts((alertResult.data || []).map((row: any) => ({ threshold: Number(row.threshold_percent), clientNotifiedAt: row.client_notified_at })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const deliverableMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item.title])), [deliverables]);
  const visibleEntries = useMemo(() => entries.filter((entry) => projectFilter === 'all' || entry.projectId === projectFilter), [entries, projectFilter]);
  const categoryTotals = useMemo(() => {
    const grouped = new Map<string, number>();
    visibleEntries.forEach((entry) => grouped.set(entry.category || 'Outros', (grouped.get(entry.category || 'Outros') || 0) + entry.minutes));
    return Array.from(grouped.entries()).map(([label, minutes]) => ({ label, minutes })).sort((a, b) => b.minutes - a.minutes);
  }, [visibleEntries]);
  const projectTotals = useMemo(() => projects.map((project) => ({
    ...project,
    minutes: entries.filter((entry) => entry.projectId === project.id).reduce((sum, entry) => sum + entry.minutes, 0),
  })).filter((project) => project.minutes > 0).sort((a, b) => b.minutes - a.minutes), [projects, entries]);

  if (loading) return <Shell role="client"><section className="page client-hours-v13"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando consumo do período…</div></section></Shell>;

  return <Shell role="client">
    <section className="page client-hours-v13">
      <header className="client-hours-v13-heading">
        <div><span className="eyebrow">TRANSPARÊNCIA DO SERVIÇO</span><h1>Horas do ciclo</h1><p>Acompanhe o consumo contratado e os registros que a CALI compartilhou com a sua empresa.</p></div>
        <label><span>Período</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
      </header>

      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      {summary && !summary.visible ? <section className="panel client-hours-v13-disabled"><Info size={24} /><div><strong>A visualização de horas não está habilitada para este contrato.</strong><p>Quando a gestão de horas estiver compartilhada, o consumo e os registros liberados pela CALI aparecerão aqui.</p></div></section> : summary && <>
        <section className={`client-hours-v13-hero ${summary.usagePercent !== null && summary.usagePercent >= 100 ? 'critical' : summary.usagePercent !== null && summary.usagePercent >= 85 ? 'warning' : ''}`}>
          <div className="client-hours-v13-hero-main">
            <span>{company?.name || 'Sua empresa'} · {packageLabel(company?.servicePlan)}</span>
            <strong>{formatMinutes(summary.consumedMinutes)} <small>de {summary.contractedHours ? `${summary.contractedHours}h contratadas` : 'carga em configuração'}</small></strong>
            <div className="client-hours-v13-progress"><i style={{ width: `${Math.min(100, summary.usagePercent || 0)}%` }} /></div>
            <small>{summary.usagePercent === null ? 'Sem carga mensal configurada para cálculo percentual.' : `${Math.round(summary.usagePercent)}% consumido no período.`}</small>
          </div>
          <div className="client-hours-v13-balance"><span>{summary.overMinutes > 0 ? 'Excedente do período' : 'Saldo disponível'}</span><strong>{formatMinutes(summary.overMinutes > 0 ? summary.overMinutes : summary.remainingMinutes)}</strong></div>
        </section>

        {summary.usagePercent !== null && <section className="client-hours-v13-thresholds">
          {[70, 85, 100].map((threshold) => {
            const reached = summary.usagePercent !== null && summary.usagePercent >= threshold;
            const persisted = alerts.some((alert) => alert.threshold === threshold);
            return <article key={threshold} className={reached ? threshold === 100 ? 'critical reached' : 'reached' : ''}><strong>{threshold}%</strong><span>{reached ? persisted ? 'Alerta registrado' : 'Faixa atingida' : threshold === 70 ? 'Acompanhamento' : threshold === 85 ? 'Alerta de consumo' : 'Limite contratado'}</span></article>;
          })}
        </section>}

        <div className="client-hours-v13-layout">
          <main className="panel client-hours-v13-extract">
            <div className="client-hours-v13-panel-head"><div><span className="section-kicker">REGISTROS COMPARTILHADOS</span><h2>Onde o tempo foi utilizado</h2></div><label><span>Projeto</span><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">Todos os projetos</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label></div>
            {visibleEntries.length ? <div className="client-hours-v13-entry-list">{visibleEntries.map((entry) => <article key={entry.id}><time>{dateLabel(entry.workDate)}</time><div><strong>{entry.description}</strong><small>{[
              entry.projectId ? projectMap.get(entry.projectId) : null,
              entry.deliverableId ? deliverableMap.get(entry.deliverableId) : null,
              entry.category || null,
            ].filter(Boolean).join(' · ') || 'Atuação CALI'}</small></div><b>{formatMinutes(entry.minutes)}</b></article>)}</div> : <div className="client-hours-v13-empty"><Eye size={22} /><div><strong>Nenhum registro compartilhado neste recorte.</strong><span>O consumo total pode incluir atuações internas da CALI cujo detalhamento não é exibido individualmente.</span></div></div>}
          </main>

          <aside className="client-hours-v13-side">
            <section className="panel"><div className="client-hours-v13-side-title"><BarChart3 size={17} /><div><strong>Composição compartilhada</strong><small>Somente registros visíveis para sua empresa</small></div></div>{categoryTotals.length ? <div className="client-hours-v13-breakdown">{categoryTotals.map((item) => { const total = categoryTotals.reduce((sum, row) => sum + row.minutes, 0); return <div key={item.label}><span><strong>{item.label}</strong><small>{total ? `${Math.round((item.minutes / total) * 100)}%` : '0%'}</small></span><b>{formatMinutes(item.minutes)}</b><i><em style={{ width: `${total ? (item.minutes / total) * 100 : 0}%` }} /></i></div>; })}</div> : <p className="client-hours-v13-side-empty">Sem composição disponível.</p>}</section>
            <section className="panel"><div className="client-hours-v13-side-title"><Clock3 size={17} /><div><strong>Por projeto</strong><small>Tempo compartilhado no período</small></div></div>{projectTotals.length ? <div className="client-hours-v13-projects">{projectTotals.map((project) => <button key={project.id} type="button" onClick={() => setProjectFilter(project.id)}><span>{project.name}</span><strong>{formatMinutes(project.minutes)}</strong></button>)}</div> : <p className="client-hours-v13-side-empty">Sem horas vinculadas a projetos.</p>}</section>
          </aside>
        </div>

        <section className="client-hours-v13-note"><Info size={16} /><p><strong>Como funciona:</strong> o total de consumo considera a atuação registrada no contrato. O extrato mostra apenas os itens que foram marcados para compartilhamento; observações e justificativas internas da CALI não são exibidas.</p></section>
      </>}
    </section>
  </Shell>;
}
