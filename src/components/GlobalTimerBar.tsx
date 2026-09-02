import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Square, TimerReset, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { resolveWorkspaceMedia } from '../lib/workspaceMedia';
import type { Role } from './WorkspaceShell';

type TimerStatus = 'active' | 'paused';
type TimerRow = {
  id: string;
  companyId: string;
  projectId?: string | null;
  deliverableId?: string | null;
  taskId?: string | null;
  startedAt: string;
  status: TimerStatus;
  pausedAt?: string | null;
  pausedSeconds: number;
  category?: string | null;
  description?: string | null;
  companyName: string;
  companyLogo?: string | null;
  projectName?: string | null;
  deliverableName?: string | null;
  taskName?: string | null;
};

type PendingOrigin = {
  deliverableId?: string | null;
  deliverableName?: string | null;
  taskId?: string | null;
  taskName?: string | null;
};

const TIMER_EVENT = 'cali:timers-changed';
const ORIGIN_KEY = 'cali:timer-origin';

function timerSeconds(timer: TimerRow, nowMs: number) {
  const started = new Date(timer.startedAt).getTime();
  const stoppedClock = timer.status === 'paused' && timer.pausedAt ? new Date(timer.pausedAt).getTime() : nowMs;
  return Math.max(0, Math.floor((stoppedClock - started) / 1000) - Number(timer.pausedSeconds || 0));
}

function timerLabel(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':');
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function normalize(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function contextIsVisible(timer: TimerRow, pathname: string) {
  if (pathname.startsWith('/admin/horas')) return true;

  const explicit = Array.from(document.querySelectorAll<HTMLElement>('[data-timer-context-deliverable-id],[data-timer-context-task-id]'));
  if (explicit.some((node) =>
    (timer.taskId && node.dataset.timerContextTaskId === timer.taskId) ||
    (timer.deliverableId && node.dataset.timerContextDeliverableId === timer.deliverableId)
  )) return true;

  const modal = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
  if (!modal || !timer.deliverableName) return false;
  const heading = modal.querySelector('h2')?.textContent;
  return normalize(heading) === normalize(timer.deliverableName);
}

function findOriginButton(deliverableName: string) {
  const title = normalize(deliverableName);
  const preferred = Array.from(document.querySelectorAll<HTMLButtonElement>('.front-deliverable-open-v3, .deliverable-card-v3, .deliverable-list-v3 button, button'));
  return preferred.find((button) => {
    const text = normalize(button.textContent);
    return text === title || text.includes(title);
  }) || null;
}

function openPendingOrigin(origin: PendingOrigin) {
  if (!origin.deliverableName) return false;
  const button = findOriginButton(origin.deliverableName);
  if (!button) return false;
  button.click();

  window.setTimeout(() => {
    if (!origin.taskName) return;
    const modal = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
    if (!modal) return;
    const tasksTab = Array.from(modal.querySelectorAll<HTMLButtonElement>('.deliverable-tabs-v2 button'))
      .find((item) => normalize(item.textContent).startsWith('subtarefas'));
    tasksTab?.click();
    window.setTimeout(() => {
      const task = Array.from(document.querySelectorAll<HTMLElement>('.task-list-v2 article'))
        .find((item) => normalize(item.textContent).includes(normalize(origin.taskName)));
      if (!task) return;
      task.classList.add('timer-origin-highlight');
      task.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => task.classList.remove('timer-origin-highlight'), 3500);
    }, 180);
  }, 180);
  return true;
}

export function GlobalTimerBar({ role }: { role: Role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [domVersion, setDomVersion] = useState(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (role !== 'admin' || !supabase) {
      setTimers([]);
      return;
    }
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;
    if (!userId) {
      setTimers([]);
      return;
    }

    const timerResult = await supabase
      .from('work_timers')
      .select('id,company_id,project_id,deliverable_id,task_id,started_at,status,paused_at,paused_seconds,category,description')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('started_at', { ascending: true });
    if (timerResult.error || !timerResult.data?.length) {
      if (mounted.current) setTimers([]);
      return;
    }

    const rawTimers = timerResult.data as any[];
    const companyIds = [...new Set(rawTimers.map((row) => row.company_id).filter(Boolean))];
    const projectIds = [...new Set(rawTimers.map((row) => row.project_id).filter(Boolean))];
    const deliverableIds = [...new Set(rawTimers.map((row) => row.deliverable_id).filter(Boolean))];
    const taskIds = [...new Set(rawTimers.map((row) => row.task_id).filter(Boolean))];

    const [companyResult, projectResult, deliverableResult, taskResult] = await Promise.all([
      companyIds.length ? supabase.from('companies').select('id,display_name,logo_url').in('id', companyIds) : Promise.resolve({ data: [], error: null } as any),
      projectIds.length ? supabase.from('projects').select('id,name').in('id', projectIds) : Promise.resolve({ data: [], error: null } as any),
      deliverableIds.length ? supabase.from('deliverables').select('id,title').in('id', deliverableIds) : Promise.resolve({ data: [], error: null } as any),
      taskIds.length ? supabase.from('deliverable_tasks').select('id,title').in('id', taskIds) : Promise.resolve({ data: [], error: null } as any),
    ]);

    const companyMap = new Map<string, any>((companyResult.data || []).map((row: any) => [row.id, row]));
    const projectMap = new Map<string, any>((projectResult.data || []).map((row: any) => [row.id, row]));
    const deliverableMap = new Map<string, any>((deliverableResult.data || []).map((row: any) => [row.id, row]));
    const taskMap = new Map<string, any>((taskResult.data || []).map((row: any) => [row.id, row]));

    const next = await Promise.all(rawTimers.map(async (row): Promise<TimerRow> => {
      const company = companyMap.get(row.company_id);
      return {
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        deliverableId: row.deliverable_id,
        taskId: row.task_id,
        startedAt: row.started_at,
        status: row.status,
        pausedAt: row.paused_at,
        pausedSeconds: Number(row.paused_seconds || 0),
        category: row.category,
        description: row.description,
        companyName: company?.display_name || 'Cliente',
        companyLogo: await resolveWorkspaceMedia(company?.logo_url || ''),
        projectName: row.project_id ? projectMap.get(row.project_id)?.name || null : null,
        deliverableName: row.deliverable_id ? deliverableMap.get(row.deliverable_id)?.title || null : null,
        taskName: row.task_id ? taskMap.get(row.task_id)?.title || null : null,
      };
    }));
    if (mounted.current) setTimers(next);
  }, [role]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = window.setInterval(() => void load(), 15000);
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    const handleChanged = () => void load();
    window.addEventListener(TIMER_EVENT, handleChanged);
    return () => {
      mounted.current = false;
      window.clearInterval(refresh);
      window.clearInterval(tick);
      window.removeEventListener(TIMER_EVENT, handleChanged);
    };
  }, [load]);

  useEffect(() => {
    const observer = new MutationObserver(() => setDomVersion((value) => value + 1));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (role !== 'admin' || !location.pathname.startsWith('/admin/projetos')) return;
    const raw = sessionStorage.getItem(ORIGIN_KEY);
    if (!raw) return;
    let origin: PendingOrigin | null = null;
    try { origin = JSON.parse(raw) as PendingOrigin; } catch { sessionStorage.removeItem(ORIGIN_KEY); }
    if (!origin) return;

    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (openPendingOrigin(origin as PendingOrigin) || attempts >= 30) {
        window.clearInterval(id);
        sessionStorage.removeItem(ORIGIN_KEY);
      }
    }, 180);
    return () => window.clearInterval(id);
  }, [location.pathname]);

  const visibleTimers = useMemo(
    () => timers.filter((timer) => !contextIsVisible(timer, location.pathname)),
    [timers, location.pathname, domVersion]
  );

  async function mutate(timer: TimerRow, action: 'pause' | 'resume' | 'stop') {
    if (!supabase || busyId) return;
    setBusyId(timer.id);
    try {
      const result = action === 'pause'
        ? await supabase.rpc('pause_work_timer', { p_timer_id: timer.id })
        : action === 'resume'
          ? await supabase.rpc('resume_work_timer', { p_timer_id: timer.id })
          : await supabase.rpc('stop_work_timer', { p_timer_id: timer.id, p_description: timer.description || timer.taskName || timer.deliverableName || 'Atuação CALI' });
      if (result.error) throw result.error;
      window.dispatchEvent(new CustomEvent(TIMER_EVENT));
      await load();
    } catch (error) {
      console.error(`Falha ao ${action} timer`, error);
    } finally {
      setBusyId(null);
    }
  }

  function goToOrigin(timer: TimerRow) {
    const origin: PendingOrigin = {
      deliverableId: timer.deliverableId,
      deliverableName: timer.deliverableName,
      taskId: timer.taskId,
      taskName: timer.taskName,
    };
    sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(origin));
    setMoreOpen(false);
    if (location.pathname.startsWith('/admin/projetos')) {
      if (!openPendingOrigin(origin)) setDomVersion((value) => value + 1);
      return;
    }
    navigate('/admin/projetos');
  }

  if (role !== 'admin' || visibleTimers.length === 0) return null;
  const primary = visibleTimers.slice(0, 3);
  const overflow = visibleTimers.slice(3);

  const timerChip = (timer: TimerRow, extended = false) => (
    <article className={`global-timer-chip ${extended ? 'global-timer-chip-expanded' : ''}`} key={timer.id}>
      <button className="global-timer-origin" type="button" onClick={() => goToOrigin(timer)} title="Abrir tarefa/entregável de origem">
        <span className="global-timer-logo">
          {timer.companyLogo ? <img src={timer.companyLogo} alt="" /> : initials(timer.companyName)}
        </span>
        <span className="global-timer-copy">
          <strong>{timer.companyName}</strong>
          {extended && <small>{timer.taskName || timer.deliverableName || timer.description || timer.projectName || 'Atuação CALI'}</small>}
        </span>
      </button>
      <span className={`global-timer-clock ${timer.status === 'paused' ? 'paused' : ''}`}>{timerLabel(timerSeconds(timer, nowMs))}</span>
      <button className="global-timer-control" type="button" disabled={busyId === timer.id} onClick={() => void mutate(timer, timer.status === 'paused' ? 'resume' : 'pause')} aria-label={timer.status === 'paused' ? 'Retomar timer' : 'Pausar timer'} title={timer.status === 'paused' ? 'Retomar' : 'Pausar'}>
        {timer.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <button className="global-timer-control stop" type="button" disabled={busyId === timer.id} onClick={() => void mutate(timer, 'stop')} aria-label="Encerrar timer" title="Encerrar e registrar horas">
        <Square size={13} />
      </button>
    </article>
  );

  return <div className="global-timers" aria-label="Timers ativos">
    <span className="global-timers-mark" title={`${visibleTimers.length} timer(s) fora do contexto atual`}><TimerReset size={16}/></span>
    <div className="global-timers-primary">{primary.map((timer) => timerChip(timer))}</div>
    {overflow.length > 0 && <div className="global-timers-more-wrap">
      <button className="global-timers-more" type="button" onClick={() => setMoreOpen((value) => !value)}>+{overflow.length}</button>
      {moreOpen && <div className="global-timers-popover">
        <header><div><strong>Outros timers</strong><small>Empresas diferentes podem rodar em paralelo.</small></div><button type="button" onClick={() => setMoreOpen(false)}><X size={16}/></button></header>
        <div>{overflow.map((timer) => timerChip(timer, true))}</div>
      </div>}
    </div>}
  </div>;
}
