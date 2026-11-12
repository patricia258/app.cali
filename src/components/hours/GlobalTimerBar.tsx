import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Square, TimerReset, X } from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useNavigate } from '../../hooks/useNavigate';
import { hoursAvailable } from '../../api/hours/client';
import { readGlobalTimers } from '../../api/hours/timer-context';
import { finalizeTimerWork, pauseTimerSession, TIMER_EVENT } from '../../lib/timerSemantics';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';
import type { Role } from '../workspace/WorkspaceShell';
import { useWorkspaceAuth } from '../../auth/hooks/useWorkspaceAuth';
import './global-timer-overflow.css';

type TimerRow = {
  id: string; companyId: string; projectId?: string|null; deliverableId?: string|null; taskId?: string|null; accountRecordId?: string|null;
  startedAt: string; pausedSeconds: number; category?: string|null; description?: string|null;
  companyName: string; companyLogo?: string|null; projectName?: string|null; deliverableName?: string|null; taskName?: string|null; recordTitle?: string|null;
  deliverableStatus?: string|null;
};
type PendingOrigin = { deliverableId?: string|null; deliverableName?: string|null; taskId?: string|null; taskName?: string|null };
type PendingFinalization = { timer: TimerRow; target: TimerFinalizationTarget } | null;
const ORIGIN_KEY='cali:timer-origin';

function primaryTimerLimit() {
  if (window.innerWidth >= 1400) return 2;
  if (window.innerWidth >= 1024) return 1;
  return 0;
}

function timerSeconds(timer:TimerRow,nowMs:number){return Math.max(0,Math.floor((nowMs-new Date(timer.startedAt).getTime())/1000)-Number(timer.pausedSeconds||0));}
function timerLabel(seconds:number){const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();}
function normalize(value?:string|null){return(value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-BR');}
function contextIsVisible(timer:TimerRow,pathname:string){
  if(pathname.startsWith('/admin/horas'))return true;
  // O cronômetro de ocorrência aparece no topo também dentro de Ocorrências (pedido da proprietária em 2026-10-13).
  return false;
}
function findOriginButton(deliverableName:string){const title=normalize(deliverableName);return Array.from(document.querySelectorAll<HTMLButtonElement>('.front-deliverable-open-v3,.deliverable-list-open-v3,button')).find(b=>{const t=normalize(b.textContent);return t===title||t.includes(title);})||null;}
function openPendingOrigin(origin:PendingOrigin){
  if(!origin.deliverableName)return false;const button=findOriginButton(origin.deliverableName);if(!button)return false;button.click();
  window.setTimeout(()=>{if(!origin.taskName)return;const modal=document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"])");if(!modal)return;Array.from(modal.querySelectorAll<HTMLButtonElement>('.deliverable-tabs-v2 button')).find(x=>normalize(x.textContent).startsWith('subtarefas'))?.click();window.setTimeout(()=>{const task=Array.from(document.querySelectorAll<HTMLElement>('.task-list-v2 article')).find(x=>normalize(x.textContent).includes(normalize(origin.taskName)));if(task){task.classList.add('timer-origin-highlight');task.scrollIntoView({behavior:'smooth',block:'center'});window.setTimeout(()=>task.classList.remove('timer-origin-highlight'),3500);}},180);},180);return true;
}

export function GlobalTimerBar({role}:{role:Role}){
  const { user } = useWorkspaceAuth();
  const location=useLocation(),navigate=useNavigate();
  const [timers,setTimers]=useState<TimerRow[]>([]),[nowMs,setNowMs]=useState(Date.now()),[busyId,setBusyId]=useState<string|null>(null),[moreOpen,setMoreOpen]=useState(false);
  const [pending,setPending]=useState<PendingFinalization>(null),[confirmStep,setConfirmStep]=useState<1|2>(1);const mounted=useRef(true);
  const [primaryLimit, setPrimaryLimit] = useState(primaryTimerLimit);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 16 });
  const moreButton = useRef<HTMLButtonElement>(null);
  const morePanel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const panelTitleId = useId();

  const updatePanelPosition = useCallback(() => {
    const trigger = moreButton.current?.getBoundingClientRect();
    if (trigger) setPanelPosition({
      top: trigger.bottom + 8,
      right: Math.max(16, Math.min(window.innerWidth - trigger.right, window.innerWidth - 446)),
    });
  }, []);

  const closePanel = useCallback(() => {
    setMoreOpen(false);
    moreButton.current?.focus();
  }, []);

  useEffect(() => {
    const resize = () => {
      setPrimaryLimit(primaryTimerLimit());
      if (moreOpen) requestAnimationFrame(updatePanelPosition);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [moreOpen, updatePanelPosition]);

  useEffect(() => {
    if (!moreOpen) return;
    morePanel.current?.querySelector('button')?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !morePanel.current?.contains(event.target) && !moreButton.current?.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', updatePanelPosition);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', updatePanelPosition);
    };
  }, [closePanel, moreOpen, updatePanelPosition]);

  const load = useCallback(async () => {
    if (role !== 'admin' || !hoursAvailable || !user) {
      setTimers([]);
      return;
    }
    const next = await readGlobalTimers(user.id);
    if (mounted.current) setTimers(next);
  }, [role, user]);

  useEffect(()=>{mounted.current=true;void load();const refresh=window.setInterval(()=>void load(),15000),tick=window.setInterval(()=>setNowMs(Date.now()),1000),changed=()=>void load();window.addEventListener(TIMER_EVENT,changed);return()=>{mounted.current=false;window.clearInterval(refresh);window.clearInterval(tick);window.removeEventListener(TIMER_EVENT,changed);};},[load]);
  useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/projetos'))return;const raw=sessionStorage.getItem(ORIGIN_KEY);if(!raw)return;let origin:PendingOrigin|null=null;try{origin=JSON.parse(raw);}catch{sessionStorage.removeItem(ORIGIN_KEY);}if(!origin)return;let attempts=0;const id=window.setInterval(()=>{attempts++;if(openPendingOrigin(origin as PendingOrigin)||attempts>=30){window.clearInterval(id);sessionStorage.removeItem(ORIGIN_KEY);}},180);return()=>window.clearInterval(id);},[role,location.pathname]);

  const visibleTimers=useMemo(()=>timers.filter(t=>!contextIsVisible(t,location.pathname)),[timers,location.pathname]);
  async function pause(timer:TimerRow){if(busyId)return;setBusyId(timer.id);try{await pauseTimerSession(timer.id);await load();}catch(e){console.error('Falha ao pausar e registrar sessão',e);}finally{setBusyId(null);}}
  function requestStop(timer:TimerRow){if(timer.accountRecordId)return;setPending({timer,target:{id:timer.taskId||timer.deliverableId||timer.id,label:timer.taskName||timer.deliverableName||timer.description||'esta atuação',kind:timer.taskId?'task':'deliverable',clientApproved:timer.deliverableStatus==='approved'}});setConfirmStep(1);setMoreOpen(false);}
  async function confirmStop(){if(!pending||busyId)return;setBusyId(pending.timer.id);try{await finalizeTimerWork(pending.timer);setPending(null);setConfirmStep(1);await load();}catch(e){console.error('Falha ao finalizar execução',e);}finally{setBusyId(null);}}
  function goToOrigin(timer:TimerRow){
    setMoreOpen(false);
    if(timer.accountRecordId){navigate(`/admin/registros?record=${timer.accountRecordId}`);return;}
    const origin={deliverableId:timer.deliverableId,deliverableName:timer.deliverableName,taskId:timer.taskId,taskName:timer.taskName};sessionStorage.setItem(ORIGIN_KEY,JSON.stringify(origin));
    if(location.pathname.startsWith('/admin/projetos')){openPendingOrigin(origin);return;}navigate('/admin/projetos');
  }

  const primary = visibleTimers.slice(0, primaryLimit);
  const overflow = visibleTimers.slice(primaryLimit);
  const showMore = moreOpen && overflow.length > 0;
  function chip(timer: TimerRow, extended = false) {
    const workLabel = timer.recordTitle || timer.taskName || timer.deliverableName;
    return <article className={extended ? 'global-timer-chip global-timer-chip-expanded' : 'global-timer-chip'} key={timer.id}>
      <button className="global-timer-origin" type="button" onClick={() => goToOrigin(timer)} title="Abrir origem do timer">
        <span className="global-timer-logo">
          {timer.companyLogo
            ? <img src={timer.companyLogo} alt="" width={29} height={29} decoding="async" />
            : initials(timer.companyName)}
        </span>
        <span className="global-timer-copy">
          <strong title={workLabel || timer.description || ''}>
            {workLabel || (timer.description || '').split(' · ').pop() || timer.projectName || 'Atuação CALI'}
          </strong>
          {extended && <small>{timer.companyName}</small>}
        </span>
      </button>
      <span className="global-timer-clock">{timerLabel(timerSeconds(timer, nowMs))}</span>
      <button className="global-timer-control" type="button" disabled={busyId === timer.id} onClick={() => void pause(timer)}
        aria-label="Pausar e registrar esta sessão" title="Pausar: registra esta sessão e remove o timer">
        <Pause size={14}/>
      </button>
      {!timer.accountRecordId && <button className="global-timer-control stop" type="button" disabled={busyId === timer.id}
        onClick={() => requestStop(timer)} aria-label="Finalizar trabalho definitivamente" title="Stop: finalizar trabalho definitivamente">
        <Square size={13}/>
      </button>}
    </article>;
  }

  return <>
    {role === 'admin' && visibleTimers.length > 0 && <div className="global-timers global-timers-fit" aria-label="Timers ativos">
      <span className="global-timers-mark" title={`${visibleTimers.length} timer(s) fora do contexto atual`}><TimerReset size={16}/></span>
      {primary.length > 0 && <div className="global-timers-primary">{primary.map(timer => chip(timer))}</div>}
      {overflow.length > 0 && <button
        ref={moreButton}
        className="global-timers-more"
        type="button"
        aria-label={overflow.length === 1 ? 'Ver mais 1 timer ativo' : `Ver mais ${overflow.length} timers ativos`}
        aria-haspopup="dialog"
        aria-expanded={showMore}
        aria-controls={showMore ? panelId : undefined}
        onClick={() => {
          if (showMore) closePanel();
          else {
            updatePanelPosition();
            setMoreOpen(true);
          }
        }}
      >{primary.length === 0 && <TimerReset size={14}/>}+{overflow.length}</button>}
    </div>}
    {showMore && createPortal(
      <div
        className="global-timers-popover global-timers-overlay"
        id={panelId}
        ref={morePanel}
        role="dialog"
        aria-labelledby={panelTitleId}
        style={{ top: panelPosition.top, right: panelPosition.right, maxHeight: `calc(100dvh - ${panelPosition.top + 16}px)` }}
      >
        <header>
          <div><strong id={panelTitleId}>{primary.length > 0 ? 'Outros timers' : 'Timers ativos'}</strong><small>Empresas diferentes podem rodar em paralelo.</small></div>
          <button type="button" aria-label="Fechar timers" onClick={closePanel}><X size={16}/></button>
        </header>
        <div>{overflow.map(timer => chip(timer, true))}</div>
      </div>,
      document.body,
    )}
    <TimerFinalizationDialog target={pending?.target||null} step={confirmStep} busy={Boolean(pending&&busyId===pending.timer.id)} onCancel={()=>{setPending(null);setConfirmStep(1);}} onAdvance={()=>setConfirmStep(2)} onConfirm={()=>void confirmStop()}/>
  </>;
}
