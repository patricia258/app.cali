import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, Square, TimerReset, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { hoursAvailable } from '../../api/hours/client';
import { readProjectTimerDeliverable, readProjectTimers, readProjectTimerTasks } from '../../api/hours/timer-context';
import { startAdminTimer } from '../../api/hours/timers';
import { finalizeTimerWork, pauseTimerSession, TIMER_EVENT } from '../../lib/timerSemantics';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';

type Role='admin'|'client';
type TimerRow={id:string;companyId:string;projectId?:string|null;deliverableId?:string|null;taskId?:string|null;startedAt:string;pausedSeconds:number;description?:string|null};
type DeliverableContext={id:string;companyId:string;projectId:string;title:string;protocol?:string|null;status:string;clientVisible:boolean;workClosedAt?:string|null;approvedAt?:string|null};
type TaskContext={id:string;deliverableId:string;title:string;protocol?:string|null;status:string;clientVisible:boolean;workClosedAt?:string|null};
type PortalTarget={task:TaskContext;node:HTMLElement};
type PendingFinalization={timer:TimerRow;target:TimerFinalizationTarget}|null;

function normalize(value?:string|null){return(value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-BR');}
function secondsFor(timer:TimerRow,nowMs:number){return Math.max(0,Math.floor((nowMs-new Date(timer.startedAt).getTime())/1000)-Number(timer.pausedSeconds||0));}
function timeLabel(seconds:number){const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function currentModalProtocol(){return document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~=\"deliverable-workspace-modal-v2\"]) :is(.deliverable-title-v2,[data-v2-operation~=\"deliverable-title-v2\"]) .section-kicker")?.textContent?.trim()||'';}
function findTaskNode(task:TaskContext){return Array.from(document.querySelectorAll<HTMLElement>('.task-list-v2 article')).find(row=>{const protocol=row.querySelector('small')?.textContent?.trim();return Boolean(task.protocol&&protocol===task.protocol)||normalize(row.querySelector('strong')?.textContent)===normalize(task.title);})||null;}

export function ProjectTimerBridge({role}:{role:Role}){
  const [deliverable,setDeliverable]=useState<DeliverableContext|null>(null),[tasks,setTasks]=useState<TaskContext[]>([]),[timers,setTimers]=useState<TimerRow[]>([]),[headerTarget,setHeaderTarget]=useState<HTMLElement|null>(null),[taskTargets,setTaskTargets]=useState<PortalTarget[]>([]);
  const [nowMs,setNowMs]=useState(Date.now()),[busyKey,setBusyKey]=useState<string|null>(null),[message,setMessage]=useState(''),[domVersion,setDomVersion]=useState(0),[pending,setPending]=useState<PendingFinalization>(null),[confirmStep,setConfirmStep]=useState<1|2>(1);

  const loadTimers = useCallback(async () => {
    if (role !== 'admin' || !hoursAvailable) {
      setTimers([]);
      return;
    }
    const { timers: next, error } = await readProjectTimers();
    if (error) {
      console.error(error);
      return;
    }
    setTimers(next);
  }, [role]);

  const loadContext = useCallback(async () => {
    if (role !== 'admin' || !hoursAvailable) return;
    const modal = document.querySelector<HTMLElement>(":is(.deliverable-workspace-modal-v2,[data-v2-operation~='deliverable-workspace-modal-v2'])");
    setHeaderTarget(modal?.querySelector<HTMLElement>('.deliverable-head-actions-v2') ?? null);
    const next = modal ? await readProjectTimerDeliverable(currentModalProtocol(), modal.querySelector('h2')?.textContent?.trim() ?? '') : null;
    if (!next) {
      setDeliverable(null);
      setTasks([]);
      setTaskTargets([]);
      return;
    }
    setDeliverable(next);
    const nextTasks = await readProjectTimerTasks(next.id);
    setTasks(nextTasks);
    setTaskTargets(nextTasks.flatMap((task) => {
      const node = findTaskNode(task);
      return node ? [{ task, node }] : [];
    }));
  }, [role]);

  useEffect(()=>{if(role!=='admin')return;void loadTimers();void loadContext();const tick=window.setInterval(()=>setNowMs(Date.now()),1000),refresh=window.setInterval(()=>{void loadTimers();void loadContext();},12000),onTimers=()=>{void loadTimers();void loadContext();};window.addEventListener(TIMER_EVENT,onTimers);return()=>{window.clearInterval(tick);window.clearInterval(refresh);window.removeEventListener(TIMER_EVENT,onTimers);};},[role,loadTimers,loadContext]);
  useEffect(()=>{if(role!=='admin')return;let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;window.requestAnimationFrame(()=>{scheduled=false;setDomVersion(v=>v+1);});});observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[role]);
  useEffect(()=>{void loadContext();},[domVersion,loadContext]);

  const companyTimer=useMemo(()=>deliverable?timers.find(t=>t.companyId===deliverable.companyId)||null:null,[timers,deliverable]);
  const deliverableTimer=useMemo(()=>deliverable?timers.find(t=>t.deliverableId===deliverable.id&&!t.taskId)||null:null,[timers,deliverable]);
  const workLocked=Boolean(deliverable?.workClosedAt||deliverable?.status==='approved'||deliverable?.status==='cancelled');

  async function start(targetTask?:TaskContext){if(!hoursAvailable||!deliverable||busyKey)return;if(workLocked){setMessage('A execução deste entregável já foi encerrada. Novas horas estão bloqueadas.');return;}if(targetTask&&(targetTask.workClosedAt||targetTask.status==='done')){setMessage('Esta subtarefa já foi finalizada.');return;}if(companyTimer){setMessage('Esta empresa já possui um timer ativo. Pause a sessão atual antes de iniciar outra.');return;}setBusyKey(targetTask?.id||deliverable.id);setMessage('');try{const result=await startAdminTimer({p_company_id:deliverable.companyId,p_project_id:deliverable.projectId,p_deliverable_id:deliverable.id,p_task_id:targetTask?.id||null,p_category:'Entregáveis',p_description:targetTask?.title||deliverable.title,p_client_visible:targetTask?targetTask.clientVisible:deliverable.clientVisible});if(result.error)throw result.error;window.dispatchEvent(new CustomEvent(TIMER_EVENT));await Promise.all([loadTimers(),loadContext()]);}catch(e){console.error(e);setMessage(e instanceof Error?e.message:'Não foi possível iniciar o timer.');}finally{setBusyKey(null);}}
  async function pause(timer:TimerRow){if(busyKey)return;setBusyKey(timer.id);setMessage('');try{await pauseTimerSession(timer.id);setMessage('Sessão pausada e registrada no histórico de Horas. Você pode iniciar uma nova sessão depois.');await Promise.all([loadTimers(),loadContext()]);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível pausar a sessão.');}finally{setBusyKey(null);}}
  function requestStop(timer:TimerRow,task?:TaskContext){if(!deliverable)return;setPending({timer,target:{id:task?.id||deliverable.id,label:task?.title||deliverable.title,kind:task?'task':'deliverable',clientApproved:deliverable.status==='approved'}});setConfirmStep(1);}
  async function confirmStop(){if(!pending||busyKey)return;setBusyKey(pending.timer.id);try{await finalizeTimerWork({...pending.timer,deliverableName:deliverable?.title,taskName:pending.target.kind==='task'?pending.target.label:null});setMessage(`${pending.target.kind==='task'?'Subtarefa':'Execução do entregável'} finalizada. Novas horas estão bloqueadas.`);setPending(null);setConfirmStep(1);await Promise.all([loadTimers(),loadContext()]);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível finalizar a execução.');}finally{setBusyKey(null);}}
  function controls(timer:TimerRow,task?:TaskContext){return <span className={`project-timer-controls ${task?'compact':''}`}><span className="project-timer-live">{timeLabel(secondsFor(timer,nowMs))}</span><button type="button" disabled={busyKey===timer.id} onClick={()=>void pause(timer)} title="Pausar: registra esta sessão e libera para continuar depois" aria-label="Pausar e registrar sessão"><Pause size={14}/></button><button type="button" className="stop" disabled={busyKey===timer.id} onClick={()=>requestStop(timer,task)} title="Stop: finalizar definitivamente" aria-label="Finalizar trabalho definitivamente"><Square size={13}/></button></span>;}

  if(role!=='admin'||!deliverable)return null;
  const contextTimer=deliverableTimer||(companyTimer?.deliverableId===deliverable.id?companyTimer:null);
  const headerPortal=headerTarget?createPortal(<div className={`project-header-timer ${contextTimer?'active':''}`} data-timer-context-deliverable-id={deliverable.id} data-timer-context-task-id={contextTimer?.taskId||undefined}>{message&&<span className="project-timer-message project-timer-message-floating">{message}</span>}{contextTimer?<><span className="project-header-timer-label"><TimerReset size={15}/>{contextTimer.taskId?'Subtarefa em execução':'Timer ativo'}</span>{controls(contextTimer,tasks.find(t=>t.id===contextTimer.taskId))}</>:companyTimer?<button className="project-timer-company-busy" type="button" title="Só é possível um cronômetro por empresa. Pare o que está ligado (ele aparece no topo da tela) para iniciar outro aqui." onClick={()=>setMessage('Só é possível um cronômetro por empresa. Pare o que está ligado — ele aparece no topo da tela — para iniciar outro neste entregável.')}><AlertTriangle size={15}/>Já há um cronômetro ligado nesta empresa</button>:!workLocked?<button className="project-header-timer-start" type="button" disabled={Boolean(busyKey)} onClick={()=>void start()}><Play size={15}/>Iniciar timer</button>:<span className="project-work-closed"><TimerReset size={15}/>Execução encerrada</span>}</div>,headerTarget):null;
  const taskPortals=taskTargets.map(({task,node})=>{const timer=timers.find(t=>t.taskId===task.id)||null,blocked=Boolean(companyTimer&&!timer)||workLocked||Boolean(task.workClosedAt)||task.status==='done';return createPortal(<span className="task-inline-timer" key={task.id} data-timer-context-task-id={task.id} data-timer-context-deliverable-id={deliverable.id}>{timer?controls(timer,task):<button type="button" disabled={blocked||Boolean(busyKey)} onClick={()=>void start(task)} title={blocked?'Subtarefa indisponível para novas horas':`Iniciar timer: ${task.title}`}><Play size={14}/><span>{task.workClosedAt||task.status==='done'?'Finalizada':'Timer'}</span></button>}</span>,node);});

  return <>{headerPortal}{taskPortals}<TimerFinalizationDialog target={pending?.target||null} step={confirmStep} busy={Boolean(pending&&busyKey===pending.timer.id)} onCancel={()=>{setPending(null);setConfirmStep(1);}} onAdvance={()=>setConfirmStep(2)} onConfirm={()=>void confirmStop()}/></>;
}
