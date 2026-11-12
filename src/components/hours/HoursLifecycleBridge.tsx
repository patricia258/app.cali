import { useCallback, useEffect, useState } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { hoursAvailable } from '../../api/hours/client';
import { readHoursTimerLifecycle } from '../../api/hours/timer-context';
import { finalizeTimerWork, TIMER_EVENT } from '../../lib/timerSemantics';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';

type Role='admin'|'client';
type TimerRow={id:string;deliverableId?:string|null;taskId?:string|null;description?:string|null;deliverableName?:string|null;taskName?:string|null;deliverableStatus?:string|null};
type Pending={timer:TimerRow;target:TimerFinalizationTarget}|null;

export function HoursLifecycleBridge({role}:{role:Role}){
  const location=useLocation();const [timers,setTimers]=useState<TimerRow[]>([]),[closedDeliverables,setClosedDeliverables]=useState<Set<string>>(new Set()),[closedTasks,setClosedTasks]=useState<Set<string>>(new Set()),[pending,setPending]=useState<Pending>(null),[step,setStep]=useState<1|2>(1),[busy,setBusy]=useState(false);

  const load = useCallback(async () => {
    if (role !== 'admin' || !hoursAvailable || !location.pathname.startsWith('/admin/horas')) {
      setTimers([]);
      return;
    }
    const next = await readHoursTimerLifecycle();
    if (!next) return;
    setClosedDeliverables(next.closedDeliverables);
    setClosedTasks(next.closedTasks);
    setTimers(next.timers);
  }, [role, location.pathname]);

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),8000),changed=()=>void load();window.addEventListener(TIMER_EVENT,changed);return()=>{window.clearInterval(id);window.removeEventListener(TIMER_EVENT,changed);};},[load]);
  useEffect(()=>{if(!location.pathname.startsWith('/admin/horas'))return;const apply=()=>{document.querySelectorAll<HTMLOptionElement>('select option').forEach(option=>{if(closedDeliverables.has(option.value)||closedTasks.has(option.value)){option.disabled=true;option.hidden=true;}});};apply();const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[location.pathname,closedDeliverables,closedTasks]);
  useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/horas'))return;const handler=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;const button=target?.closest<HTMLButtonElement>('.hours-v13-timer-actions .primary');if(!button)return;const timerId=button.closest<HTMLElement>('.hours-v13-timer-row')?.dataset.workTimerId;const timer=timers.find(item=>item.id===timerId);if(!timer)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setPending({timer,target:{id:timer.taskId||timer.deliverableId||timer.id,label:timer.taskName||timer.deliverableName||timer.description||'esta atuação',kind:timer.taskId?'task':'deliverable',clientApproved:timer.deliverableStatus==='approved'}});setStep(1);};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true);},[role,location.pathname,timers]);

  async function confirm(){if(!pending||busy)return;setBusy(true);try{await finalizeTimerWork(pending.timer);setPending(null);setStep(1);await load();}catch(error){console.error('Falha ao finalizar timer na página Horas',error);}finally{setBusy(false);}}
  return <TimerFinalizationDialog target={pending?.target||null} step={step} busy={busy} onCancel={()=>{setPending(null);setStep(1);}} onAdvance={()=>setStep(2)} onConfirm={()=>void confirm()}/>;
}
