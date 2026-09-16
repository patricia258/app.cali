import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { finalizeTimerWork, TIMER_EVENT } from '../lib/timerSemantics';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';

type Role='admin'|'client';
type TimerRow={id:string;deliverableId?:string|null;taskId?:string|null;description?:string|null;deliverableName?:string|null;taskName?:string|null;deliverableStatus?:string|null};
type Pending={timer:TimerRow;target:TimerFinalizationTarget}|null;

export function HoursLifecycleBridge({role}:{role:Role}){
  const location=useLocation();const [timers,setTimers]=useState<TimerRow[]>([]),[closedDeliverables,setClosedDeliverables]=useState<Set<string>>(new Set()),[closedTasks,setClosedTasks]=useState<Set<string>>(new Set()),[pending,setPending]=useState<Pending>(null),[step,setStep]=useState<1|2>(1),[busy,setBusy]=useState(false);

  const load=useCallback(async()=>{if(role!=='admin'||!supabase||!location.pathname.startsWith('/admin/horas')){setTimers([]);return;}const user=(await supabase.auth.getUser()).data.user;if(!user)return;const [timerResult,deliverableResult,taskResult]=await Promise.all([
    supabase.from('work_timers').select('id,deliverable_id,task_id,description').eq('user_id',user.id).eq('status','active').order('started_at',{ascending:true}),
    supabase.from('deliverables').select('id,title,status,work_closed_at').or('status.eq.approved,work_closed_at.not.is.null'),
    supabase.from('deliverable_tasks').select('id,title,status,work_closed_at').or('status.eq.done,work_closed_at.not.is.null'),
  ]);const deliverables=deliverableResult.data||[],tasks=taskResult.data||[];const dm=new Map<string,any>(deliverables.map((r:any)=>[r.id,r])),tm=new Map<string,any>(tasks.map((r:any)=>[r.id,r]));setClosedDeliverables(new Set(deliverables.map((r:any)=>r.id)));setClosedTasks(new Set(tasks.map((r:any)=>r.id)));setTimers((timerResult.data||[]).map((r:any)=>({id:r.id,deliverableId:r.deliverable_id,taskId:r.task_id,description:r.description,deliverableName:dm.get(r.deliverable_id)?.title||null,taskName:tm.get(r.task_id)?.title||null,deliverableStatus:dm.get(r.deliverable_id)?.status||null})));},[role,location.pathname]);

  useEffect(()=>{void load();const id=window.setInterval(()=>void load(),8000),changed=()=>void load();window.addEventListener(TIMER_EVENT,changed);return()=>{window.clearInterval(id);window.removeEventListener(TIMER_EVENT,changed);};},[load]);
  useEffect(()=>{if(!location.pathname.startsWith('/admin/horas'))return;const apply=()=>{document.querySelectorAll<HTMLOptionElement>('select option').forEach(option=>{if(closedDeliverables.has(option.value)||closedTasks.has(option.value)){option.disabled=true;option.hidden=true;}});};apply();const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[location.pathname,closedDeliverables,closedTasks]);
  useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/horas'))return;const handler=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;const button=target?.closest<HTMLButtonElement>('.hours-v13-timer-actions .primary');if(!button)return;const row=button.closest<HTMLElement>('.hours-v13-timer-row');if(!row)return;const rows=Array.from(document.querySelectorAll<HTMLElement>('.hours-v13-timer-row'));const index=rows.indexOf(row);const timer=timers[index];if(!timer)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();setPending({timer,target:{id:timer.taskId||timer.deliverableId||timer.id,label:timer.taskName||timer.deliverableName||timer.description||'esta atuação',kind:timer.taskId?'task':'deliverable',clientApproved:timer.deliverableStatus==='approved'}});setStep(1);};document.addEventListener('click',handler,true);return()=>document.removeEventListener('click',handler,true);},[role,location.pathname,timers]);

  async function confirm(){if(!pending||busy)return;setBusy(true);try{await finalizeTimerWork(pending.timer);setPending(null);setStep(1);await load();window.setTimeout(()=>window.location.reload(),120);}catch(error){console.error('Falha ao finalizar timer na página Horas',error);}finally{setBusy(false);}}
  return <TimerFinalizationDialog target={pending?.target||null} step={step} busy={busy} onCancel={()=>{setPending(null);setStep(1);}} onAdvance={()=>setStep(2)} onConfirm={()=>void confirm()}/>;
}
