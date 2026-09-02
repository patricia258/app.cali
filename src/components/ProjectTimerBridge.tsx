import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, TimerReset } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

type Role = 'admin' | 'client';
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
  description?: string | null;
};
type DeliverableContext = {
  id: string;
  companyId: string;
  projectId: string;
  title: string;
  protocol?: string | null;
  status: string;
  clientVisible: boolean;
};
type TaskContext = {
  id: string;
  deliverableId: string;
  title: string;
  protocol?: string | null;
  status: string;
  clientVisible: boolean;
};

type PortalTarget = { task: TaskContext; node: HTMLElement };
const TIMER_EVENT = 'cali:timers-changed';

function normalize(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function secondsFor(timer: TimerRow, nowMs: number) {
  const start = new Date(timer.startedAt).getTime();
  const end = timer.status === 'paused' && timer.pausedAt ? new Date(timer.pausedAt).getTime() : nowMs;
  return Math.max(0, Math.floor((end - start) / 1000) - Number(timer.pausedSeconds || 0));
}

function timeLabel(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':');
}

function currentModalProtocol() {
  const modal = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
  if (!modal) return '';
  return modal.querySelector<HTMLElement>('.deliverable-title-v2 .section-kicker')?.textContent?.trim() || '';
}

function findTaskNode(task: TaskContext) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.task-list-v2 article'));
  return rows.find((row) => {
    const protocol = row.querySelector('small')?.textContent?.trim();
    if (task.protocol && protocol === task.protocol) return true;
    const title = row.querySelector('strong')?.textContent;
    return normalize(title) === normalize(task.title);
  }) || null;
}

export function ProjectTimerBridge({ role }: { role: Role }) {
  const [deliverable, setDeliverable] = useState<DeliverableContext | null>(null);
  const [tasks, setTasks] = useState<TaskContext[]>([]);
  const [timers, setTimers] = useState<TimerRow[]>([]);
  const [footerTarget, setFooterTarget] = useState<HTMLElement | null>(null);
  const [taskTargets, setTaskTargets] = useState<PortalTarget[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [domVersion, setDomVersion] = useState(0);

  const loadTimers = useCallback(async () => {
    if (role !== 'admin' || !supabase) { setTimers([]); return; }
    const userResult = await supabase.auth.getUser();
    const userId = userResult.data.user?.id;
    if (!userId) { setTimers([]); return; }
    const result = await supabase
      .from('work_timers')
      .select('id,company_id,project_id,deliverable_id,task_id,started_at,status,paused_at,paused_seconds,description')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('started_at', { ascending: true });
    if (result.error) { console.error('Falha ao carregar timers do contexto de projetos', result.error); return; }
    setTimers((result.data || []).map((row: any) => ({
      id: row.id, companyId: row.company_id, projectId: row.project_id, deliverableId: row.deliverable_id, taskId: row.task_id,
      startedAt: row.started_at, status: row.status, pausedAt: row.paused_at, pausedSeconds: Number(row.paused_seconds || 0), description: row.description,
    })));
  }, [role]);

  const loadContext = useCallback(async () => {
    if (role !== 'admin' || !supabase) return;
    const modal = document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
    const footer = modal?.querySelector<HTMLElement>('.deliverable-actions-right-v2') || null;
    setFooterTarget(footer);
    if (!modal) { setDeliverable(null); setTasks([]); setTaskTargets([]); return; }

    const protocol = currentModalProtocol();
    const title = modal.querySelector('h2')?.textContent?.trim() || '';
    let query = supabase.from('deliverables').select('id,company_id,project_id,title,protocol,status,client_visible');
    query = protocol && protocol !== '—' ? query.eq('protocol', protocol) : query.eq('title', title);
    const result = await query.limit(2);
    if (result.error || !result.data?.length) {
      setDeliverable(null); setTasks([]); setTaskTargets([]); return;
    }
    const row: any = result.data[0];
    const nextDeliverable: DeliverableContext = {
      id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, protocol: row.protocol,
      status: row.status, clientVisible: Boolean(row.client_visible),
    };
    setDeliverable(nextDeliverable);

    const taskResult = await supabase.from('deliverable_tasks').select('id,deliverable_id,title,protocol,status,client_visible').eq('deliverable_id', row.id).neq('status', 'cancelled').order('sort_order');
    const nextTasks: TaskContext[] = (taskResult.data || []).map((task: any) => ({
      id: task.id, deliverableId: task.deliverable_id, title: task.title, protocol: task.protocol, status: task.status, clientVisible: Boolean(task.client_visible),
    }));
    setTasks(nextTasks);
    setTaskTargets(nextTasks.map((task) => ({ task, node: findTaskNode(task) })).filter((item): item is PortalTarget => Boolean(item.node)));
  }, [role]);

  useEffect(() => {
    if (role !== 'admin') return;
    void loadTimers();
    void loadContext();
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    const refresh = window.setInterval(() => { void loadTimers(); void loadContext(); }, 12000);
    const onTimers = () => { void loadTimers(); void loadContext(); };
    window.addEventListener(TIMER_EVENT, onTimers);
    return () => { window.clearInterval(timer); window.clearInterval(refresh); window.removeEventListener(TIMER_EVENT, onTimers); };
  }, [role, loadTimers, loadContext]);

  useEffect(() => {
    if (role !== 'admin') return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => { scheduled = false; setDomVersion((value) => value + 1); });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [role]);

  useEffect(() => { void loadContext(); }, [domVersion, loadContext]);

  const companyTimer = useMemo(() => deliverable ? timers.find((timer) => timer.companyId === deliverable.companyId) || null : null, [timers, deliverable]);
  const deliverableTimer = useMemo(() => deliverable ? timers.find((timer) => timer.deliverableId === deliverable.id && !timer.taskId) || null : null, [timers, deliverable]);

  async function start(targetTask?: TaskContext) {
    if (!supabase || !deliverable || busyKey) return;
    if (companyTimer) { setMessage('Esta empresa já possui um timer aberto. Use o timer existente ou encerre-o antes de iniciar outro trabalho nela.'); return; }
    const key = targetTask?.id || deliverable.id;
    setBusyKey(key); setMessage('');
    try {
      const description = targetTask?.title || deliverable.title;
      const result = await supabase.rpc('start_work_timer_v2', {
        p_company_id: deliverable.companyId,
        p_project_id: deliverable.projectId,
        p_deliverable_id: deliverable.id,
        p_task_id: targetTask?.id || null,
        p_category: 'Entregáveis',
        p_description: description,
        p_client_visible: targetTask ? targetTask.clientVisible : deliverable.clientVisible,
      });
      if (result.error) throw result.error;

      if (deliverable.status === 'not_started') {
        const user = await supabase.auth.getUser();
        const updated = await supabase.from('deliverables').update({ status: 'in_progress' }).eq('id', deliverable.id);
        if (!updated.error) {
          await supabase.from('deliverable_status_history').insert({ company_id: deliverable.companyId, deliverable_id: deliverable.id, from_status: 'not_started', to_status: 'in_progress', actor_user_id: user.data.user?.id || null, note: 'Timer iniciado' });
          setDeliverable((current) => current ? { ...current, status: 'in_progress' } : current);
        }
      }
      if (targetTask && targetTask.status === 'todo') {
        await supabase.from('deliverable_tasks').update({ status: 'in_progress' }).eq('id', targetTask.id);
        setTasks((current) => current.map((task) => task.id === targetTask.id ? { ...task, status: 'in_progress' } : task));
      }
      window.dispatchEvent(new CustomEvent(TIMER_EVENT));
      await loadTimers();
    } catch (error) {
      console.error('Não foi possível iniciar o timer do contexto', error);
      setMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o timer.');
    } finally { setBusyKey(null); }
  }

  async function mutate(timer: TimerRow, action: 'pause' | 'resume' | 'stop') {
    if (!supabase || busyKey) return;
    setBusyKey(timer.id); setMessage('');
    try {
      const result = action === 'pause'
        ? await supabase.rpc('pause_work_timer', { p_timer_id: timer.id })
        : action === 'resume'
          ? await supabase.rpc('resume_work_timer', { p_timer_id: timer.id })
          : await supabase.rpc('stop_work_timer', { p_timer_id: timer.id, p_description: timer.description || 'Atuação CALI' });
      if (result.error) throw result.error;
      window.dispatchEvent(new CustomEvent(TIMER_EVENT));
      await loadTimers();
      if (action === 'stop') setMessage('Apontamento encerrado e registrado em Horas.');
    } catch (error) {
      console.error(`Não foi possível ${action} o timer`, error);
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o timer.');
    } finally { setBusyKey(null); }
  }

  function controls(timer: TimerRow, compact = false) {
    return <span className={`project-timer-controls ${compact ? 'compact' : ''}`}>
      <span className={`project-timer-live ${timer.status === 'paused' ? 'paused' : ''}`}>{timeLabel(secondsFor(timer, nowMs))}</span>
      <button type="button" disabled={busyKey === timer.id} onClick={() => void mutate(timer, timer.status === 'paused' ? 'resume' : 'pause')} title={timer.status === 'paused' ? 'Retomar timer' : 'Pausar timer'} aria-label={timer.status === 'paused' ? 'Retomar timer' : 'Pausar timer'}>{timer.status === 'paused' ? <Play size={14}/> : <Pause size={14}/>}</button>
      <button type="button" className="stop" disabled={busyKey === timer.id} onClick={() => void mutate(timer, 'stop')} title="Encerrar timer" aria-label="Encerrar timer"><Square size={13}/></button>
    </span>;
  }

  if (role !== 'admin' || !deliverable || !footerTarget) return null;

  const footerTimer = deliverableTimer || (companyTimer?.deliverableId === deliverable.id ? companyTimer : null);
  const footer = createPortal(
    <div className="global-context-timer" data-timer-context-deliverable-id={deliverable.id} data-timer-context-task-id={footerTimer?.taskId || undefined}>
      {message && <span className="project-timer-message">{message}</span>}
      {footerTimer ? <>
        <span className="project-timer-context-label"><TimerReset size={15}/>{footerTimer.taskId ? 'Timer da subtarefa' : 'Timer do entregável'}</span>
        {controls(footerTimer)}
      </> : companyTimer ? <button className="project-timer-company-busy" type="button" onClick={() => setMessage('Já existe outro timer aberto para esta empresa. Ele continua disponível no topo quando você sair deste contexto.')}><TimerReset size={15}/>Timer ativo nesta empresa</button> : <button className="timer-button-v2 project-timer-start" type="button" disabled={Boolean(busyKey)} onClick={() => void start()}><Play size={16}/>Iniciar timer</button>}
    </div>, footerTarget
  );

  const taskPortals = taskTargets.map(({ task, node }) => {
    const timer = timers.find((item) => item.taskId === task.id) || null;
    const blocked = Boolean(companyTimer && !timer);
    return createPortal(
      <span className="task-inline-timer" key={task.id} data-timer-context-task-id={task.id} data-timer-context-deliverable-id={deliverable.id}>
        {timer ? controls(timer, true) : <button type="button" disabled={blocked || Boolean(busyKey)} onClick={() => void start(task)} title={blocked ? 'Esta empresa já possui outro timer aberto' : `Iniciar timer: ${task.title}`} aria-label={`Iniciar timer para ${task.title}`}><Play size={14}/><span>Timer</span></button>}
      </span>, node
    );
  });

  return <>{footer}{taskPortals}</>;
}
