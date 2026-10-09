import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
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
    } else if (summary.usagePercent >= 50) {
      alertText = 'Atenção: você já utilizou 50% ou mais do pacote mensal.';
      alertTone = 'warning';
    } else if (summary.usagePercent >= 40) {
      alertText = 'O consumo está se aproximando de 50% do pacote mensal.';
      alertTone = 'warning';
    }
  }

  if (loading) {
    return <Shell role="client"><section className="v2-client-module"><div className="data-loading" aria-live="polite" aria-busy="true">Carregando horas…</div></section></Shell>;
  }

  return <Shell role="client">
    <section className="v2-client-module">
      <header className="page-head"><div><div className="eyebrow">CONTA / ACOMPANHAMENTO EXECUTIVO</div><h1>Horas<span className="title-dot">.</span></h1><p>Onde a assessoria investiu tempo, o que foi realizado e o saldo do ciclo.</p></div></header>
      {error && <div className="inline-notice" role="alert"><AlertTriangle size={18} />{error}</div>}
      {summary && !summary.visible ? <section className="wf-empty"><Clock3 size={24} /><strong>A visualização de horas não está habilitada para este mês.</strong><p>Os meses já liberados continuam disponíveis para consulta. Selecione outro mês abaixo.</p><label><span>Consultar mês</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label></section> : summary && <>
        <div className="hours-context"><span className="plan-mark">{monthLabel(period)}</span><input className="v2-hours-month" aria-label="Consultar mês" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /><span className="hours-context-end"><Clock3 size={14}/> Visibilidade contratual habilitada</span></div>
        <div className="hours-ledger">
          <section className="ledger-main">
            {alertText && <div className={`inline-notice ${alertTone}`} role="status"><AlertTriangle size={18}/>{alertText}</div>}
            <div className="ledger-summary"><div><span>Contratadas</span><strong>{summary.contractedHours ? <>{summary.contractedHours}h <small>{Number.isInteger(summary.contractedHours) ? '00m' : ''}</small></> : '—'}</strong></div><div><span>Utilizadas</span><strong>{((formatted) => { const [hours, minutes] = formatted.split(' '); return hours.endsWith('h') ? <>{hours.padStart(3, '0')} <small>{minutes?.replace('min', 'm') || '00m'}</small></> : <>00h <small>{hours.replace('min', 'm').padStart(3, '0')}</small></>; })(formatMinutes(summary.consumedMinutes))}</strong></div><div><span>{summary.overMinutes > 0 ? 'Excedentes' : 'Disponíveis'}</span><strong>{((formatted) => { const [hours, minutes] = formatted.split(' '); return hours.endsWith('h') ? <>{hours.padStart(3, '0')} <small>{minutes?.replace('min', 'm') || '00m'}</small></> : <>00h <small>{hours.replace('min', 'm').padStart(3, '0')}</small></>; })(summary.overMinutes > 0 ? formatMinutes(summary.overMinutes) : formatMinutes(summary.remainingMinutes))}</strong></div></div>
            <div className="ledger-progress" role="progressbar" aria-label="Consumo das horas contratadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><span style={{ width: `${percentage}%` }}/></div>
            <div className="ledger-header"><h2>Registro de atuação</h2><span>{filteredEntries.length} {filteredEntries.length === 1 ? 'atividade neste período' : 'atividades neste período'}</span><label className="ledger-filter">Contexto<select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as ContextFilter)}><option value="all">Todos</option><option value="deliverable">Entregável</option><option value="project">Projeto</option><option value="interaction">Interação</option></select></label></div>
            {filteredEntries.length === 0 ? <div className="wf-empty">Nenhum registro de horas neste período.</div> : <div className="ledger-table">
              <div className="ledger-row ledger-heading"><span>Data</span><span>Atuação / contexto</span><span>Origem</span><span>Duração</span></div>
              {filteredEntries.map((entry) => {
                const open = Boolean(expanded[entry.id]);
                const context = contextOf(entry);
                const project = entry.projectId ? projectMap.get(entry.projectId) || '—' : '—';
                const deliverable = entry.deliverableId ? deliverableMap.get(entry.deliverableId) || '—' : '—';
                return <Fragment key={entry.id}><button type="button" className="ledger-row" aria-expanded={open} aria-controls={`hour-detail-${entry.id}`} onClick={() => setExpanded((current) => ({ ...current, [entry.id]: !current[entry.id] }))}>
                  <span className="ledger-date">{dateLabel(entry.workDate)}</span><span className="ledger-title"><strong>{entry.description}</strong><small>{project}{deliverable !== '—' ? ` · ${deliverable}` : ''}</small></span><span><span className="chip neutral">{sourceLabel(entry.sourceType)}</span></span><strong>{formatMinutes(entry.minutes)}</strong>
                </button>{open && <div className="ledger-entry-detail" id={`hour-detail-${entry.id}`}><strong>Detalhes: {entry.description}</strong><span>{contextLabel(context)} · {project}{deliverable !== '—' ? ` · ${deliverable}` : ''}</span><span>Horário: {timeLabel(entry.startedAt)}–{timeLabel(entry.endedAt)} · Origem: {sourceLabel(entry.sourceType)}</span>{entry.category && <span>Natureza: {entry.category}</span>}</div>}</Fragment>;
              })}
            </div>}
          </section>
          <aside className="ledger-side"><div className="side-title">COMO LER ESTE EXTRATO</div><h2>Tempo dedicado a decisões que importam.</h2><p>As horas registram atividades executadas pela CALI. Você acompanha o que foi feito, sem editar os lançamentos.</p><div className="side-rule"/><span className="side-title">CONTEXTO DOS REGISTROS</span><div className="distribution"><span>Período</span><strong>{monthLabel(period)}</strong></div><div className="distribution"><span>Consumo mensal</span><strong>{summary.usagePercent === null ? '—' : `${summary.usagePercent}%`}</strong></div><div className="side-foot">Dados dos registros compartilhados pela CALI. Os filtros alteram o detalhamento; o consumo representa todo o mês.</div></aside>
        </div>
      </>}
    </section>
  </Shell>;
}
