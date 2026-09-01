import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, ChevronRight, Clock3, Eye, EyeOff,
  FolderKanban, Layers3, Loader2, Play, Plus, Square, TimerReset, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type Company = {
  id: string;
  name: string;
  monthlyHours: number;
  showHoursToClient: boolean;
  servicePlan?: string | null;
};
type Project = { id: string; companyId: string; name: string };
type Deliverable = { id: string; companyId: string; projectId?: string | null; title: string; status: string };
type Task = { id: string; companyId: string; deliverableId: string; title: string; status: string };
type Cycle = { id: string; companyId: string; projectId?: string | null; referenceMonth: string; contractedHours?: number | null };
type Entry = {
  id: string;
  companyId: string;
  projectId?: string | null;
  deliverableId?: string | null;
  taskId?: string | null;
  workDate: string;
  minutes: number;
  description: string;
  category?: string | null;
  sourceType: 'timer' | 'manual' | 'calendar' | 'interaction';
  clientVisible: boolean;
  internalNote?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
};
type TimerRow = {
  id: string;
  companyId: string;
  projectId?: string | null;
  deliverableId?: string | null;
  taskId?: string | null;
  cycleId?: string | null;
  startedAt: string;
  category?: string | null;
  description?: string | null;
  clientVisible: boolean;
  userId: string;
};

type Focus = { companyId: string; projectId: string; deliverableId: string };

const categories = [
  'Entregáveis',
  'Subtarefas',
  'Reuniões e alinhamentos',
  'Análise e consultoria',
  'Documentação',
  'Comunicação e follow-up',
  'Treinamentos / encontros',
  'Outros',
];

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function monthBounds(value: string) {
  const [year, month] = value.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextDate = new Date(year, month, 1);
  const next = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, next, end };
}
function formatMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}
function timerLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
}
function dateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}
function packageLabel(plan?: string | null) {
  if (plan === 'partner') return 'CALI Partner';
  if (plan === 'full') return 'CALI Full';
  return 'Pacote CALI';
}
function sourceLabel(source: Entry['sourceType']) {
  if (source === 'timer') return 'Timer';
  if (source === 'calendar') return 'Calendário';
  if (source === 'interaction') return 'Interação';
  return 'Manual';
}

export function AdminHoursPageV2() {
  const [period, setPeriod] = useState(monthValue());
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimerRow | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [focus, setFocus] = useState<Focus>({ companyId: '', projectId: '', deliverableId: '' });

  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [deliverableId, setDeliverableId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [clientVisible, setClientVisible] = useState(true);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualMinutes, setManualMinutes] = useState('60');
  const [internalNote, setInternalNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void load(); }, [period]);
  useEffect(() => {
    if (!activeTimer) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);
  useEffect(() => {
    document.body.classList.toggle('workspace-modal-open', manualOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [manualOpen]);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { start, next } = monthBounds(period);
      const userResult = await supabase.auth.getUser();
      if (userResult.error) throw userResult.error;
      const userId = userResult.data.user?.id || '';
      const [companyResult, projectResult, deliverableResult, taskResult, cycleResult, entryResult, timerResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,monthly_hours_contracted,show_hours_to_client,service_plan').neq('status', 'closed').order('display_name'),
        supabase.from('projects').select('id,company_id,name').neq('status', 'cancelled').order('name'),
        supabase.from('deliverables').select('id,company_id,project_id,title,status').neq('status', 'cancelled').order('title'),
        supabase.from('deliverable_tasks').select('id,company_id,deliverable_id,title,status').neq('status', 'cancelled').order('title'),
        supabase.from('service_cycles').select('id,company_id,project_id,reference_month,contracted_hours').gte('reference_month', start).lt('reference_month', next),
        supabase.from('hour_entries').select('id,company_id,project_id,deliverable_id,task_id,work_date,minutes,description,category,source_type,client_visible,internal_note,started_at,ended_at,created_at').gte('work_date', start).lt('work_date', next).order('work_date', { ascending: false }).order('created_at', { ascending: false }),
        userId
          ? supabase.from('work_timers').select('id,company_id,project_id,deliverable_id,task_id,cycle_id,user_id,started_at,status,category,description,client_visible').eq('status', 'active').eq('user_id', userId).order('started_at', { ascending: false }).limit(1)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (companyResult.error) throw companyResult.error;
      if (projectResult.error) throw projectResult.error;
      if (deliverableResult.error) throw deliverableResult.error;
      if (taskResult.error) throw taskResult.error;
      if (cycleResult.error) throw cycleResult.error;
      if (entryResult.error) throw entryResult.error;
      if (timerResult.error) throw timerResult.error;

      const nextCompanies: Company[] = (companyResult.data || []).map((row: any) => ({
        id: row.id,
        name: row.display_name,
        monthlyHours: Number(row.monthly_hours_contracted || 0),
        showHoursToClient: Boolean(row.show_hours_to_client),
        servicePlan: row.service_plan,
      }));
      const nextProjects: Project[] = (projectResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, name: row.name }));
      const nextDeliverables: Deliverable[] = (deliverableResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, status: row.status }));
      const nextTasks: Task[] = (taskResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, deliverableId: row.deliverable_id, title: row.title, status: row.status }));
      const nextCycles: Cycle[] = (cycleResult.data || []).map((row: any) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, referenceMonth: row.reference_month, contractedHours: row.contracted_hours === null ? null : Number(row.contracted_hours) }));
      const nextEntries: Entry[] = (entryResult.data || []).map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        taskId: row.task_id,
        workDate: row.work_date,
        minutes: Number(row.minutes || 0),
        description: row.description,
        category: row.category,
        sourceType: row.source_type || 'manual',
        clientVisible: Boolean(row.client_visible),
        internalNote: row.internal_note,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        createdAt: row.created_at,
      }));
      const timer = (timerResult.data || [])[0];

      setCompanies(nextCompanies);
      setProjects(nextProjects);
      setDeliverables(nextDeliverables);
      setTasks(nextTasks);
      setCycles(nextCycles);
      setEntries(nextEntries);
      setActiveTimer(timer ? {
        id: timer.id,
        companyId: timer.company_id,
        projectId: timer.project_id,
        deliverableId: timer.deliverable_id,
        taskId: timer.task_id,
        cycleId: timer.cycle_id,
        userId: timer.user_id,
        startedAt: timer.started_at,
        category: timer.category,
        description: timer.description,
        clientVisible: Boolean(timer.client_visible),
      } : null);

      const fallbackCompany = focus.companyId || companyId || nextCompanies[0]?.id || '';
      if (!companyId && fallbackCompany) setCompanyId(fallbackCompany);
      if (!focus.companyId && fallbackCompany) setFocus({ companyId: fallbackCompany, projectId: '', deliverableId: '' });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar as horas.');
    } finally {
      setLoading(false);
    }
  }

  const projectMap = useMemo(() => new Map(projects.map((item) => [item.id, item])), [projects]);
  const deliverableMap = useMemo(() => new Map(deliverables.map((item) => [item.id, item])), [deliverables]);
  const taskMap = useMemo(() => new Map(tasks.map((item) => [item.id, item])), [tasks]);
  const companyMap = useMemo(() => new Map(companies.map((item) => [item.id, item])), [companies]);

  const cycleFor = (targetCompanyId: string, targetProjectId?: string | null) => {
    const exact = cycles.find((cycle) => cycle.companyId === targetCompanyId && targetProjectId && cycle.projectId === targetProjectId);
    return exact || cycles.find((cycle) => cycle.companyId === targetCompanyId) || null;
  };
  const contractedHoursFor = (targetCompanyId: string) => {
    const cycle = cycleFor(targetCompanyId);
    if (cycle?.contractedHours !== null && cycle?.contractedHours !== undefined) return Number(cycle.contractedHours || 0);
    return Number(companyMap.get(targetCompanyId)?.monthlyHours || 0);
  };
  const minutesFor = (predicate: (entry: Entry) => boolean) => entries.filter(predicate).reduce((sum, entry) => sum + entry.minutes, 0);
  const companyTotals = useMemo(() => companies.map((company) => {
    const minutes = minutesFor((entry) => entry.companyId === company.id);
    const contracted = contractedHoursFor(company.id);
    return { ...company, minutes, contracted, pct: contracted > 0 ? Math.round((minutes / (contracted * 60)) * 100) : null };
  }), [companies, entries, cycles]);

  const focusCompany = companyMap.get(focus.companyId) || null;
  const focusProject = projectMap.get(focus.projectId) || null;
  const focusDeliverable = deliverableMap.get(focus.deliverableId) || null;
  const focusEntries = useMemo(() => entries.filter((entry) => {
    if (focus.companyId && entry.companyId !== focus.companyId) return false;
    if (focus.projectId && entry.projectId !== focus.projectId) return false;
    if (focus.deliverableId && entry.deliverableId !== focus.deliverableId) return false;
    return true;
  }), [entries, focus]);

  const projectRows = useMemo(() => projects
    .filter((project) => project.companyId === focus.companyId)
    .map((project) => ({ ...project, minutes: minutesFor((entry) => entry.companyId === focus.companyId && entry.projectId === project.id) }))
    .sort((a, b) => b.minutes - a.minutes), [projects, entries, focus.companyId]);
  const deliverableRows = useMemo(() => deliverables
    .filter((item) => item.companyId === focus.companyId && (!focus.projectId || item.projectId === focus.projectId))
    .map((item) => ({ ...item, minutes: minutesFor((entry) => entry.deliverableId === item.id) }))
    .sort((a, b) => b.minutes - a.minutes), [deliverables, entries, focus.companyId, focus.projectId]);
  const categoryTotals = useMemo(() => {
    const grouped = new Map<string, number>();
    focusEntries.forEach((entry) => grouped.set(entry.category || 'Outros', (grouped.get(entry.category || 'Outros') || 0) + entry.minutes));
    return Array.from(grouped.entries()).map(([label, minutes]) => ({ label, minutes })).sort((a, b) => b.minutes - a.minutes);
  }, [focusEntries]);

  const companyProjects = projects.filter((item) => item.companyId === companyId);
  const companyDeliverables = deliverables.filter((item) => item.companyId === companyId && (!projectId || item.projectId === projectId));
  const deliverableTasks = tasks.filter((item) => item.companyId === companyId && deliverableId && item.deliverableId === deliverableId && item.status !== 'done');
  const focusTotal = focusEntries.reduce((sum, item) => sum + item.minutes, 0);
  const focusContracted = focus.companyId ? contractedHoursFor(focus.companyId) : 0;
  const focusPct = focusContracted > 0 ? Math.round((minutesFor((entry) => entry.companyId === focus.companyId) / (focusContracted * 60)) * 100) : null;

  function selectFocusCompany(nextCompanyId: string) {
    setFocus({ companyId: nextCompanyId, projectId: '', deliverableId: '' });
  }
  function selectFocusProject(nextProjectId: string) {
    setFocus((current) => ({ ...current, projectId: nextProjectId, deliverableId: '' }));
  }
  function selectFocusDeliverable(nextDeliverableId: string) {
    setFocus((current) => ({ ...current, deliverableId: nextDeliverableId }));
  }
  function useFocusInTimer() {
    if (!focus.companyId) return;
    setCompanyId(focus.companyId);
    setProjectId(focus.projectId);
    setDeliverableId(focus.deliverableId);
    setTaskId('');
    setDescription('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function currentCycleId(targetCompanyId: string, targetProjectId?: string | null) {
    return cycleFor(targetCompanyId, targetProjectId)?.id || null;
  }

  async function startTimer() {
    if (!supabase || !companyId || !description.trim()) return;
    setSaving(true);
    setError('');
    try {
      const user = await supabase.auth.getUser();
      if (user.error) throw user.error;
      const result = await supabase.from('work_timers').insert({
        company_id: companyId,
        project_id: projectId || null,
        deliverable_id: deliverableId || null,
        task_id: taskId || null,
        cycle_id: currentCycleId(companyId, projectId),
        user_id: user.data.user?.id,
        started_at: new Date().toISOString(),
        status: 'active',
        category,
        description: description.trim(),
        client_visible: clientVisible,
      }).select('id,company_id,project_id,deliverable_id,task_id,cycle_id,user_id,started_at,category,description,client_visible').single();
      if (result.error) throw result.error;
      setActiveTimer({
        id: result.data.id,
        companyId: result.data.company_id,
        projectId: result.data.project_id,
        deliverableId: result.data.deliverable_id,
        taskId: result.data.task_id,
        cycleId: result.data.cycle_id,
        userId: result.data.user_id,
        startedAt: result.data.started_at,
        category: result.data.category,
        description: result.data.description,
        clientVisible: Boolean(result.data.client_visible),
      });
      setElapsed(0);
      setNotice('Timer iniciado e vinculado ao contexto selecionado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function stopTimer() {
    if (!supabase || !activeTimer) return;
    setSaving(true);
    setError('');
    try {
      const stoppedAt = new Date();
      const minutes = Math.max(1, Math.round((stoppedAt.getTime() - new Date(activeTimer.startedAt).getTime()) / 60000));
      const entryResult = await supabase.from('hour_entries').insert({
        company_id: activeTimer.companyId,
        project_id: activeTimer.projectId || null,
        deliverable_id: activeTimer.deliverableId || null,
        task_id: activeTimer.taskId || null,
        cycle_id: activeTimer.cycleId || null,
        work_date: stoppedAt.toISOString().slice(0, 10),
        minutes,
        description: activeTimer.description || 'Atuação registrada por timer',
        category: activeTimer.category || 'Outros',
        source_type: 'timer',
        started_at: activeTimer.startedAt,
        ended_at: stoppedAt.toISOString(),
        client_visible: activeTimer.clientVisible,
        created_by: activeTimer.userId,
      });
      if (entryResult.error) throw entryResult.error;
      const timerResult = await supabase.from('work_timers').update({ status: 'stopped', stopped_at: stoppedAt.toISOString(), minutes }).eq('id', activeTimer.id);
      if (timerResult.error) throw timerResult.error;
      setNotice(`${formatMinutes(minutes)} registrados automaticamente.`);
      setActiveTimer(null);
      setElapsed(0);
      setDescription('');
      setTaskId('');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível encerrar o timer.');
    } finally {
      setSaving(false);
    }
  }

  async function saveManual(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !companyId || !description.trim()) return;
    const minutes = Math.round(Number(manualMinutes.replace(',', '.')));
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      setError('Informe a duração em minutos, entre 1 e 1440.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const user = await supabase.auth.getUser();
      if (user.error) throw user.error;
      const result = await supabase.from('hour_entries').insert({
        company_id: companyId,
        project_id: projectId || null,
        deliverable_id: deliverableId || null,
        task_id: taskId || null,
        cycle_id: currentCycleId(companyId, projectId),
        work_date: manualDate,
        minutes,
        description: description.trim(),
        category,
        source_type: 'manual',
        internal_note: internalNote.trim() || null,
        client_visible: clientVisible,
        created_by: user.data.user?.id,
      });
      if (result.error) throw result.error;
      setManualOpen(false);
      setNotice('Lançamento manual registrado no cliente e contexto corretos.');
      setDescription('');
      setInternalNote('');
      setTaskId('');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível registrar a hora.');
    } finally {
      setSaving(false);
    }
  }

  return <Shell role="admin">
    <section className="page hours-v13">
      <header className="hours-v13-heading">
        <div>
          <span className="eyebrow">GESTÃO DE CAPACIDADE</span>
          <h1>Horas</h1>
          <p>Comece pelo cliente e aprofunde até projeto e entregável. O timer e os lançamentos manuais gravam o mesmo contexto e alimentam o consumo do pacote.</p>
        </div>
        <div className="hours-v13-heading-actions">
          <label><span>Período</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
          <button className="secondary" type="button" onClick={() => setManualOpen(true)}><Plus size={16} />Lançar hora manual</button>
        </div>
      </header>

      {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="inline-notice"><AlertTriangle size={18} />{error}</div>}

      <section className={`hours-v13-timer panel ${activeTimer ? 'running' : ''}`}>
        <div className="hours-v13-timer-title"><TimerReset size={22} /><div><span>{activeTimer ? 'TIMER EM ANDAMENTO' : 'INICIAR ATUAÇÃO'}</span><strong>{activeTimer ? `${companyMap.get(activeTimer.companyId)?.name || 'Cliente'} · ${activeTimer.category || 'Atuação'}` : 'Vincule o tempo ao contexto real do trabalho'}</strong>{activeTimer && <small>{activeTimer.description}</small>}</div></div>
        {activeTimer ? <>
          <strong className="hours-v13-clock">{timerLabel(elapsed)}</strong>
          <button className="primary danger-action" disabled={saving} type="button" onClick={() => void stopTimer()}><Square size={15} />Encerrar e registrar</button>
        </> : <>
          <div className="hours-v13-timer-form">
            <label><span>Cliente</span><select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setProjectId(''); setDeliverableId(''); setTaskId(''); }}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label><span>Projeto</span><select value={projectId} disabled={!companyId} onChange={(event) => { setProjectId(event.target.value); setDeliverableId(''); setTaskId(''); }}><option value="">Sem projeto específico</option>{companyProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label><span>Entregável</span><select value={deliverableId} disabled={!companyId} onChange={(event) => { setDeliverableId(event.target.value); setTaskId(''); }}><option value="">Sem entregável específico</option>{companyDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label><span>Subtarefa</span><select value={taskId} disabled={!deliverableId} onChange={(event) => setTaskId(event.target.value)}><option value="">Sem subtarefa específica</option>{deliverableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
            <label><span>Natureza</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="description"><span>O que está sendo feito?</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: análise da política de cargos / reunião mensal / revisão do entregável" /></label>
            <label className="hours-v13-visibility"><input type="checkbox" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} />{clientVisible ? <Eye size={14} /> : <EyeOff size={14} />}<span>{clientVisible ? 'Detalhe pode aparecer ao cliente' : 'Detalhe interno CALI'}</span></label>
          </div>
          <button className="primary hours-v13-start" disabled={saving || !companyId || !description.trim()} type="button" onClick={() => void startTimer()}><Play size={15} />Iniciar timer</button>
        </>}
      </section>

      {loading ? <div className="panel data-loading"><Loader2 className="spin" size={20} />Lendo apontamentos e consumo do período…</div> : <>
        <section className="hours-v13-clients">
          <div className="hours-v13-section-head"><div><span className="section-kicker">CARTEIRA</span><h2>Consumo por cliente</h2></div><small>Clique no cliente para abrir o detalhamento.</small></div>
          <div className="hours-v13-client-grid">{companyTotals.map((item) => <button key={item.id} type="button" className={focus.companyId === item.id ? 'active' : ''} onClick={() => selectFocusCompany(item.id)}>
            <div className="hours-v13-client-top"><span><strong>{item.name}</strong><small>{packageLabel(item.servicePlan)}</small></span><b>{item.pct === null ? '—' : `${item.pct}%`}</b></div>
            <div className="hours-v13-progress"><i className={item.pct !== null && item.pct >= 100 ? 'critical' : item.pct !== null && item.pct >= 85 ? 'warning' : ''} style={{ width: `${Math.min(100, item.pct || 0)}%` }} /></div>
            <div className="hours-v13-client-foot"><span>{formatMinutes(item.minutes)} realizadas</span><span>{item.contracted ? `${item.contracted}h contratadas` : 'Sem carga configurada'}</span></div>
          </button>)}</div>
        </section>

        {focusCompany && <section className="hours-v13-drill panel">
          <header className="hours-v13-drill-head">
            <div className="hours-v13-breadcrumb">
              <button type="button" onClick={() => setFocus({ companyId: focus.companyId, projectId: '', deliverableId: '' })}>{focusCompany.name}</button>
              {focusProject && <><ChevronRight size={13} /><button type="button" onClick={() => setFocus((current) => ({ ...current, deliverableId: '' }))}>{focusProject.name}</button></>}
              {focusDeliverable && <><ChevronRight size={13} /><strong>{focusDeliverable.title}</strong></>}
            </div>
            <div><span>{formatMinutes(focusTotal)}</span><small>{focus.deliverableId ? 'neste entregável' : focus.projectId ? 'neste projeto' : 'no cliente neste mês'}</small><button type="button" onClick={useFocusInTimer}>Usar no timer</button></div>
          </header>

          {!focus.projectId && <div className="hours-v13-drill-grid">
            <section><div className="hours-v13-subhead"><FolderKanban size={16} /><div><strong>Projetos</strong><small>Horas acumuladas por projeto</small></div></div>{projectRows.length ? projectRows.map((project) => <button className="hours-v13-row" type="button" key={project.id} onClick={() => selectFocusProject(project.id)}><span><strong>{project.name}</strong><small>{deliverables.filter((item) => item.projectId === project.id).length} entregável(eis)</small></span><b>{formatMinutes(project.minutes)}</b><ChevronRight size={14} /></button>) : <p className="hours-v13-empty">Nenhum projeto vinculado.</p>}</section>
            <section><div className="hours-v13-subhead"><BarChart3 size={16} /><div><strong>Natureza do consumo</strong><small>Como o tempo foi utilizado</small></div></div><CategoryBreakdown items={categoryTotals} /></section>
          </div>}

          {focus.projectId && !focus.deliverableId && <div className="hours-v13-drill-grid">
            <section><div className="hours-v13-subhead"><Layers3 size={16} /><div><strong>Entregáveis</strong><small>Desça mais um nível para ver o tempo real</small></div></div>{deliverableRows.length ? deliverableRows.map((item) => <button className="hours-v13-row" type="button" key={item.id} onClick={() => selectFocusDeliverable(item.id)}><span><strong>{item.title}</strong><small>{item.status.replaceAll('_', ' ')}</small></span><b>{formatMinutes(item.minutes)}</b><ChevronRight size={14} /></button>) : <p className="hours-v13-empty">Nenhum entregável neste projeto.</p>}</section>
            <section><div className="hours-v13-subhead"><BarChart3 size={16} /><div><strong>Natureza do consumo</strong><small>Composição deste projeto</small></div></div><CategoryBreakdown items={categoryTotals} /></section>
          </div>}

          {focus.deliverableId && <div className="hours-v13-drill-grid single"><section><div className="hours-v13-subhead"><Clock3 size={16} /><div><strong>Extrato do entregável</strong><small>Registros ligados diretamente a este trabalho</small></div></div><EntryList entries={focusEntries} projectMap={projectMap} deliverableMap={deliverableMap} taskMap={taskMap} /></section><section><div className="hours-v13-subhead"><BarChart3 size={16} /><div><strong>Natureza do consumo</strong><small>Composição deste entregável</small></div></div><CategoryBreakdown items={categoryTotals} /></section></div>}

          {!focus.deliverableId && <section className="hours-v13-extract"><div className="hours-v13-subhead"><Clock3 size={16} /><div><strong>Extrato do recorte</strong><small>{focusProject ? focusProject.name : focusCompany.name}</small></div></div><EntryList entries={focusEntries} projectMap={projectMap} deliverableMap={deliverableMap} taskMap={taskMap} /></section>}

          {focusPct !== null && <footer className={`hours-v13-consumption ${focusPct >= 100 ? 'critical' : focusPct >= 85 ? 'warning' : focusPct >= 70 ? 'attention' : ''}`}><span><strong>{focusPct}% do pacote consumido</strong><small>{formatMinutes(minutesFor((entry) => entry.companyId === focus.companyId))} de {focusContracted}h no período</small></span>{focusPct >= 100 ? <b>Limite atingido</b> : focusPct >= 85 ? <b>Faixa de alerta</b> : focusPct >= 70 ? <b>Acompanhar consumo</b> : <b>Dentro da capacidade</b>}</footer>}
        </section>}
      </>}

      {manualOpen && <div className="modal-backdrop workspace-modal-backdrop"><form className="modal-card hours-v13-manual" onSubmit={saveManual} role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={() => setManualOpen(false)}><X size={20} /></button>
        <header><span className="section-kicker">LANÇAMENTO MANUAL</span><h2>Registrar tempo já realizado</h2><p>Para reunião, análise, comunicação ou qualquer atuação que não tenha sido cronometrada pelo timer.</p></header>
        <div className="hours-v13-manual-grid">
          <label className="stacked-label">Cliente<select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setProjectId(''); setDeliverableId(''); setTaskId(''); }}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
          <label className="stacked-label">Data<input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} /></label>
          <label className="stacked-label">Duração em minutos<input type="number" min="1" max="1440" step="1" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} /></label>
          <label className="stacked-label">Projeto<select value={projectId} disabled={!companyId} onChange={(event) => { setProjectId(event.target.value); setDeliverableId(''); setTaskId(''); }}><option value="">Sem projeto específico</option>{companyProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label className="stacked-label">Entregável<select value={deliverableId} disabled={!companyId} onChange={(event) => { setDeliverableId(event.target.value); setTaskId(''); }}><option value="">Sem entregável específico</option>{companyDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="stacked-label">Subtarefa<select value={taskId} disabled={!deliverableId} onChange={(event) => setTaskId(event.target.value)}><option value="">Sem subtarefa específica</option>{deliverableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
          <label className="stacked-label">Natureza<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="stacked-label wide">Atividade<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva objetivamente onde o tempo foi utilizado." /></label>
          <label className="stacked-label wide">Observação interna CALI <span className="optional">opcional</span><textarea rows={2} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Justificativa ou contexto que não deve aparecer ao cliente." /></label>
          <label className="hours-v13-visibility wide"><input type="checkbox" checked={clientVisible} onChange={(event) => setClientVisible(event.target.checked)} />{clientVisible ? <Eye size={14} /> : <EyeOff size={14} />}<span>{clientVisible ? 'O cliente poderá ver este registro no extrato dele.' : 'Registro interno: conta no consumo, mas o detalhe não será exibido ao cliente.'}</span></label>
        </div>
        <footer><button className="secondary" type="button" onClick={() => setManualOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving || !companyId || !description.trim()}>{saving ? <Loader2 className="spin" size={15} /> : <Clock3 size={15} />}Registrar</button></footer>
      </form></div>}
    </section>
  </Shell>;
}

function CategoryBreakdown({ items }: { items: Array<{ label: string; minutes: number }> }) {
  const total = items.reduce((sum, item) => sum + item.minutes, 0);
  if (!items.length) return <p className="hours-v13-empty">Ainda sem horas neste recorte.</p>;
  return <div className="hours-v13-categories">{items.map((item) => <div key={item.label}><span><strong>{item.label}</strong><small>{total ? `${Math.round((item.minutes / total) * 100)}%` : '0%'}</small></span><b>{formatMinutes(item.minutes)}</b><i><em style={{ width: `${total ? (item.minutes / total) * 100 : 0}%` }} /></i></div>)}</div>;
}

function EntryList({ entries, projectMap, deliverableMap, taskMap }: {
  entries: Entry[];
  projectMap: Map<string, Project>;
  deliverableMap: Map<string, Deliverable>;
  taskMap: Map<string, Task>;
}) {
  if (!entries.length) return <p className="hours-v13-empty">Nenhum apontamento neste recorte.</p>;
  return <div className="hours-v13-entry-list">{entries.slice(0, 40).map((entry) => <article key={entry.id}>
    <time>{dateLabel(entry.workDate)}</time>
    <div><strong>{entry.description}</strong><small>{[
      entry.projectId ? projectMap.get(entry.projectId)?.name : null,
      entry.deliverableId ? deliverableMap.get(entry.deliverableId)?.title : null,
      entry.taskId ? taskMap.get(entry.taskId)?.title : null,
    ].filter(Boolean).join(' · ') || entry.category || 'Atuação CALI'}</small></div>
    <span className="hours-v13-source">{sourceLabel(entry.sourceType)}</span>
    <span className={`hours-v13-entry-visibility ${entry.clientVisible ? 'visible' : 'internal'}`}>{entry.clientVisible ? <Eye size={12} /> : <EyeOff size={12} />}{entry.clientVisible ? 'cliente' : 'interno'}</span>
    <b>{formatMinutes(entry.minutes)}</b>
  </article>)}</div>;
}
