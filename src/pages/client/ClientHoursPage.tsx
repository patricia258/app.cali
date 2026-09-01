import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock3, Loader2 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type Project = { id: string; name: string };
type Deliverable = { id: string; projectId?: string | null; title: string };
type ContextFilter = 'all' | 'deliverable' | 'project' | 'interaction';
type SourceType = 'timer' | 'manual' | 'calendar' | 'interaction';

type Entry = {
  id: string;
  projectId?: string | null;
  deliverableId?: string | null;
  workDate: string;
  minutes: number;
  description: string;
  category?: string | null;
  sourceType: SourceType;
  startedAt?: string | null;
  endedAt?: string | null;
};

type Summary = {
  visible: boolean;
  contractedHours: number;
  consumedMinutes: number;
  remainingMinutes: number;
  overMinutes: number;
  usagePercent: number | null;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function timeLabel(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest}min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${String(rest).padStart(2, '0')}min`;
}

function sourceLabel(source: SourceType) {
  if (source === 'manual') return 'Manual';
  if (source === 'interaction') return 'Interação';
  if (source === 'calendar') return 'Calendário';
  return 'Timer';
}

function contextOf(entry: Entry): Exclude<ContextFilter, 'all'> {
  if (entry.sourceType === 'interaction' || entry.sourceType === 'calendar') return 'interaction';
  if (entry.deliverableId) return 'deliverable';
  return 'project';
}

function contextLabel(context: Exclude<ContextFilter, 'all'>) {
  if (context === 'deliverable') return 'Entregável';
  if (context === 'interaction') return 'Interação';
  return 'Projeto';
}

export function ClientHoursPage() {
  const [period, setPeriod] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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

      const [summaryResult, projectResult, deliverableResult, entryResult] = await Promise.all([
        supabase.rpc('get_client_hours_summary', { p_period_start: start, p_period_end: end }),
        supabase.from('projects').select('id,name').eq('company_id', companyId).neq('status', 'cancelled').order('name'),
        supabase.from('deliverables').select('id,project_id,title').eq('company_id', companyId).eq('client_visible', true).neq('status', 'cancelled').order('title'),
        supabase.from('hour_entries').select('id,project_id,deliverable_id,work_date,minutes,description,category,source_type,started_at,ended_at').eq('company_id', companyId).gte('work_date', start).lte('work_date', end).eq('client_visible', true).order('work_date', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (projectResult.error) throw projectResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (entryResult.error) throw entryResult.error;

      const raw = (summaryResult.data || {}) as any;
      setSummary({
        visible: raw.visible === true,
        contractedHours: Number(raw.contractedHours || 0),
        consumedMinutes: Number(raw.consumedMinutes || 0),
        remainingMinutes: Number(raw.remainingMinutes || 0),
        overMinutes: Number(raw.overMinutes || 0),
        usagePercent: raw.usagePercent === null || raw.usagePercent === undefined ? null : Number(raw.usagePercent),
      });
      setProjects((projectResult.data || []).map((row: any) => ({ id: row.id, name: row.name })));
      setDeliverables((deliverableResult.data || []).map((row: any) => ({ id: row.id, projectId: row.project_id, title: row.title })));
      setEntries((entryResult.data || []).map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        workDate: row.work_date,
        minutes: Number(row.minutes || 0),
        description: row.description,
        category: row.category,
        sourceType: row.source_type || 'manual',
        startedAt: row.started_at,
        endedAt: row.ended_at,
      })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const deliverableMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item.title])), [deliverables]);
  const filteredEntries = useMemo(() => entries.filter((entry) => contextFilter === 'all' || contextOf(entry) === contextFilter), [entries, contextFilter]);

  const percentage = summary?.usagePercent === null || summary?.usagePercent === undefined
    ? 0
    : Math.min(100, Math.max(0, summary.usagePercent));

  let alertText = '';
  let alertTone = '';
  if (summary?.usagePercent !== null && summary?.usagePercent !== undefined) {
    if (summary.usagePercent >= 100) {
      alertText = 'Pacote mensal totalmente consumido. Entre em contato com a CALI para alinharmos a continuidade.';
      alertTone = 'critical';
    } else if (summary.usagePercent >= 85) {
      alertText = 'Alerta: 85% ou mais do pacote foi consumido neste período.';
      alertTone = 'warning';
    } else if (summary.usagePercent >= 70) {
      alertText = 'Atenção: o consumo do pacote já ultrapassou 70%.';
      alertTone = 'warning';
    }
  }

  if (loading) {
    return <Shell role="client"><section className="page client-hours-connect"><div className="data-loading"><Loader2 className="spin" size={20} />Carregando horas…</div></section></Shell>;
  }

  return <Shell role="client">
    <section className="page client-hours-connect">
      <header className="client-hours-connect-header">
        <div><h1>Horas Consumidas</h1><p>Acompanhe o consumo do seu pacote.</p></div>
      </header>

      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      {summary && !summary.visible ? <section className="hours-connect-card client-hours-disabled"><Clock3 size={24} /><div><strong>A visualização de horas não está habilitada para este contrato.</strong><p>Quando esse acompanhamento estiver disponível, o consumo mensal aparecerá aqui.</p></div></section> : summary && <>
        <section className="hours-connect-card client-hours-summary">
          {alertTone === 'critical' && <div className="client-hours-alert critical"><AlertTriangle size={18} /><span>{alertText}</span></div>}
          <div className="client-hours-summary-top">
            <div><span>Horas do mês</span><h2>{monthLabel(period)}</h2></div>
            <div className="client-hours-summary-numbers"><Clock3 size={18} /><strong>{formatMinutes(summary.consumedMinutes)} / {summary.contractedHours ? `${summary.contractedHours}h` : '—'}</strong><span>·</span><em>{summary.overMinutes > 0 ? `${formatMinutes(summary.overMinutes)} excedentes` : `${formatMinutes(summary.remainingMinutes)} restantes`}</em></div>
          </div>
          <div className="client-hours-progress"><i className={alertTone} style={{ width: `${percentage}%` }} /></div>
          {alertText && alertTone !== 'critical' && <p className={`client-hours-alert-text ${alertTone}`}>{alertText}</p>}
        </section>

        <div className="client-hours-filters">
          <label><span>Mês</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
          <label><span>Contexto</span><select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as ContextFilter)}><option value="all">Todos</option><option value="deliverable">Entregável</option><option value="project">Projeto</option><option value="interaction">Interação</option></select></label>
        </div>

        {filteredEntries.length === 0 ? <section className="hours-connect-card client-hours-empty"><Clock3 size={24} /><p>Nenhum registro de horas neste período.</p></section> : <>
          <section className="hours-connect-card client-hours-table-card">
            <div className="client-hours-table-wrap"><table className="client-hours-table"><thead><tr><th className="expand" /><th>Data</th><th>Início–Fim</th><th>Duração</th><th>Ação</th><th>Projeto / Entregável</th><th>Contexto</th><th>Tipo</th></tr></thead><tbody>{filteredEntries.map((entry) => {
              const open = Boolean(expanded[entry.id]);
              const context = contextOf(entry);
              const project = entry.projectId ? projectMap.get(entry.projectId) || '—' : '—';
              const deliverable = entry.deliverableId ? deliverableMap.get(entry.deliverableId) || '—' : '—';
              return <>
                <tr key={entry.id} className="client-hours-row" onClick={() => setExpanded((current) => ({ ...current, [entry.id]: !current[entry.id] }))}><td className="expand">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td><td>{dateLabel(entry.workDate)}</td><td>{timeLabel(entry.startedAt)}–{timeLabel(entry.endedAt)}</td><td><strong>{formatMinutes(entry.minutes)}</strong></td><td className="action">{entry.description}</td><td><span>{project}</span>{deliverable !== '—' && <small>{deliverable}</small>}</td><td><span className={`client-hours-context ${context}`}>{contextLabel(context)}</span></td><td>{entry.sourceType === 'timer' ? <span className="client-hours-timer-label">Timer</span> : <span className={`hours-connect-type ${entry.sourceType}`}>{sourceLabel(entry.sourceType)}</span>}</td></tr>
                {open && <tr className="client-hours-detail"><td colSpan={8}><div><strong>Ação completa:</strong><span>{entry.description}</span>{entry.category && <em>{entry.category}</em>}</div></td></tr>}
              </>;
            })}</tbody></table></div>
          </section>

          <div className="client-hours-mobile">{filteredEntries.map((entry) => {
            const open = Boolean(expanded[entry.id]);
            const context = contextOf(entry);
            const project = entry.projectId ? projectMap.get(entry.projectId) || '—' : '—';
            const deliverable = entry.deliverableId ? deliverableMap.get(entry.deliverableId) || '—' : '—';
            return <article className="hours-connect-card" key={entry.id}><button type="button" onClick={() => setExpanded((current) => ({ ...current, [entry.id]: !current[entry.id] }))}><div><span>{dateLabel(entry.workDate)} · {timeLabel(entry.startedAt)}–{timeLabel(entry.endedAt)}</span><strong>{formatMinutes(entry.minutes)}</strong></div><h3>{entry.description}</h3><p>{project}{deliverable !== '—' ? ` · ${deliverable}` : ''}</p><footer><span className={`client-hours-context ${context}`}>{contextLabel(context)}</span><span>{sourceLabel(entry.sourceType)}</span>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</footer>{open && entry.category && <aside>{entry.category}</aside>}</button></article>;
          })}</div>
        </>}
      </>}
    </section>
  </Shell>;
}
