import { Fragment, useEffect, useMemo, useState } from 'react';
import { capacityOf, capacityMessages, minutesLabel, percentLabel } from '../../lib/capacity';
import { CapacityBar } from '../../v2/CapacityBar';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type Project = { id: string; name: string };
type Deliverable = { id: string; projectId?: string | null; title: string; workstream?: string | null };
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
  const [rows, setRows] = useState<{ kind: string; project: string | null; title: string; protocol: string | null; front: string | null; minutes: number }[]>([]);
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
        supabase.from('deliverables').select('id,project_id,title,workstream').eq('company_id', companyId).eq('client_visible', true).neq('status', 'cancelled').order('title'),
        supabase.rpc('get_client_hours_breakdown', { p_period_start: start, p_period_end: end }),
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
      setDeliverables((deliverableResult.data || []).map((row: any) => ({ id: row.id, projectId: row.project_id, title: row.title, workstream: row.workstream || null })));
      setEntries([]);
      setRows(((entryResult.data || []) as any[]).map((row) => ({ kind: row.kind, project: row.project_name, title: row.item_title, protocol: row.protocol, front: row.front, minutes: Number(row.minutes || 0) })));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item.name])), [projects]);
  const deliverableMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item.title])), [deliverables]);
  // Frente de cada lançamento: a do entregável vinculado; sem vínculo, fica em "Assessoria geral".
  const frontMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item.workstream || null])), [deliverables]);
  const frontOf = (entry: Entry) => (entry.deliverableId ? frontMap.get(entry.deliverableId) : null) || 'Assessoria geral';
  const frontTones = ['purple', 'blue', 'green', 'gold'];
  const fronts = useMemo(() => {
    const totals = new Map<string, number>();
    rows.forEach((row) => { const name = row.front || 'Assessoria geral'; totals.set(name, (totals.get(name) || 0) + row.minutes); });
    const all = [...totals.values()].reduce((sum, value) => sum + value, 0);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, minutes], index) => ({ name, minutes, share: all ? Math.round(minutes / all * 100) : 0, tone: frontTones[index % frontTones.length] }));
  }, [rows]);
  const kindOfFilter: Record<string, string[]> = { all: [], deliverable: ['Entregável', 'Subtarefa'], project: ['Projeto'], interaction: ['Ocorrência', 'Outras'] };
  const filteredRows = useMemo(() => rows.filter((row) => contextFilter === 'all' || kindOfFilter[contextFilter].includes(row.kind)), [rows, contextFilter]);
  const toneOf = (name: string) => fronts.find((item) => item.name === name)?.tone || 'gold';
  const filteredEntries = useMemo(() => entries.filter((entry) => contextFilter === 'all' || contextOf(entry) === contextFilter), [entries, contextFilter]);

  const capacity = capacityOf(summary?.contractedHours, summary?.consumedMinutes);
  const percentage = summary?.usagePercent === null || summary?.usagePercent === undefined
    ? 0
    : Math.min(100, Math.max(0, summary.usagePercent));

  // Avisos de andamento do mês: informam o avanço do consumo, sem tom de bloqueio.
  let alertText = '';
  let alertTone = '';
  const usage = summary?.usagePercent;
  if (usage !== null && usage !== undefined) {
    const shown = Math.round(usage);
    if (usage > 100) { alertText = capacityMessages.excess; alertTone = 'critical'; }
    else if (usage >= 100) { alertText = capacityMessages.full; alertTone = 'critical'; }
    else if (usage >= 75) { alertText = capacityMessages.attention; alertTone = 'warning'; }
  }

  if (loading) {
    return <Shell role="client"><section className="v2-client-module"><div className="data-loading" aria-live="polite" aria-busy="true">Carregando horas…</div></section></Shell>;
  }

  return <Shell role="client">
    <section className="v2-client-module">
      <header className="page-head"><div><div className="eyebrow">CONTA / ACOMPANHAMENTO EXECUTIVO</div><h1>Horas<span className="title-dot">.</span></h1><p>Onde a assessoria investiu tempo, o que foi realizado e o saldo do ciclo.</p></div></header>
      {error && <div className="inline-notice" role="alert"><AlertTriangle size={18} />{error}</div>}
      {summary && !summary.visible ? <section className="wf-empty"><Clock3 size={24} /><strong>A visualização de horas não está habilitada para este mês.</strong><p>Os meses já liberados continuam disponíveis para consulta. Selecione outro mês abaixo.</p><label><span>Consultar mês</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label></section> : summary && <>
        {alertText && <div className={`v2-hours-notice ${alertTone}`} role="status"><Clock3 size={16}/><span>{alertText}</span></div>}
        <div className="hours-context"><span className="plan-mark">Período</span><input className="v2-hours-month" aria-label="Consultar mês" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /><span className="hours-context-end"><Clock3 size={14}/> Visibilidade contratual habilitada</span></div>
        <div className="hours-ledger">
          <section className="ledger-main">
            <div className="ledger-summary"><div><span>Contratadas</span><strong>{summary.contractedHours ? <>{summary.contractedHours}h <small>{Number.isInteger(summary.contractedHours) ? '00m' : ''}</small></> : '—'}</strong></div><div><span>Utilizadas</span><strong>{((formatted) => { const [hours, minutes] = formatted.split(' '); return hours.endsWith('h') ? <>{hours.padStart(3, '0')} <small>{minutes?.replace('min', 'm') || '00m'}</small></> : <>00h <small>{hours.replace('min', 'm').padStart(3, '0')}</small></>; })(formatMinutes(summary.consumedMinutes))}</strong></div><div className={capacity.excessMinutes > 0 ? 'v2-excess-on' : ''}><span>Excedentes</span><strong>{capacity.excessMinutes > 0 ? minutesLabel(capacity.excessMinutes) : '0h'}</strong><small className="v2-card-foot">{capacity.excessMinutes > 0 ? `${percentLabel(capacity.excessPercent)} acima do contratado` : `Saldo do mês: ${minutesLabel(capacity.balanceMinutes)}`}</small></div></div>
            <div className="v2-cap-wrap"><CapacityBar capacity={capacity} /></div>
            <div className="ledger-header"><h2>Onde o tempo foi investido</h2><span>{filteredRows.length} {filteredRows.length === 1 ? 'item neste período' : 'itens neste período'}</span><label className="ledger-filter">Tipo<select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as ContextFilter)}><option value="all">Todos</option><option value="deliverable">Entregáveis e subtarefas</option><option value="project">Projeto</option><option value="interaction">Ocorrências e outras</option></select></label></div>
            {filteredRows.length === 0 ? <div className="wf-empty">Nenhum registro de horas neste período.</div> : <div className="ledger-table v2-ledger-v2">
              <div className="ledger-row ledger-heading"><span>Projeto</span><span>Tarefa</span><span>Tipo</span><span>Frente</span><span>Protocolo</span><span>Duração</span></div>
              {filteredRows.map((row, index) => <div className="ledger-row" key={`${row.kind}:${row.protocol || row.title}:${index}`}>
                <span className="ledger-project">{row.project || '—'}</span><span className="ledger-title"><strong>{row.title}</strong></span><span className={`v2-ledger-kind k-${row.kind.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`}>{row.kind === 'Outras' ? 'Assessoria' : row.kind}</span><span>{row.front ? <span className={`chip v2-front-tag v2-front-${toneOf(row.front)}`}>{row.front}</span> : '—'}</span><span className="ledger-protocol">{row.protocol || '—'}</span><strong>{formatMinutes(row.minutes)}</strong>
              </div>)}
            </div>}
          </section>
          <aside className="ledger-side"><div className="side-title">COMO LER ESTE EXTRATO</div><h2>Tempo dedicado a decisões que importam.</h2><p>As horas registram atividades executadas pela CALI. Você acompanha o que foi feito, sem editar os lançamentos.</p><div className="side-rule"/><span className="side-title">DISTRIBUIÇÃO POR FRENTE</span>{fronts.length ? fronts.map((item) => <div key={item.name} className="distribution"><span><i className={`v2-front-dot ${item.tone}`}/>{item.name}</span><strong>{item.share}%</strong></div>) : <div className="distribution"><span>Sem lançamentos neste mês</span><strong>—</strong></div>}<div className="distribution"><span>Consumo mensal</span><strong>{percentLabel(capacity.usagePercent)}</strong></div><div className="side-foot">Todo o tempo dedicado à sua empresa entra no consumo. O extrato mostra em quê foi investido, somado por item.</div></aside>
        </div>
      </>}
    </section>
  </Shell>;
}
