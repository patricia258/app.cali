import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Square, TimerReset, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { resolveWorkspaceMedia } from '../lib/workspaceMedia';
import { finalizeTimerWork, pauseTimerSession, TIMER_EVENT } from '../lib/timerSemantics';
import { TimerFinalizationDialog, type TimerFinalizationTarget } from './TimerFinalizationDialog';
import type { Role } from './WorkspaceShell';

type TimerRow = {
  id: string; companyId: string; projectId?: string|null; deliverableId?: string|null; taskId?: string|null;
  startedAt: string; pausedSeconds: number; category?: string|null; description?: string|null;
  companyName: string; companyLogo?: string|null; projectName?: string|null; deliverableName?: string|null; taskName?: string|null;
  deliverableStatus?: string|null;
};
type PendingOrigin = { deliverableId?: string|null; deliverableName?: string|null; taskId?: string|null; taskName?: string|null };
type PendingFinalization = { timer: TimerRow; target: TimerFinalizationTarget } | null;
const ORIGIN_KEY='cali:timer-origin';

function timerSeconds(timer:TimerRow,nowMs:number){return Math.max(0,Math.floor((nowMs-new Date(timer.startedAt).getTime())/1000)-Number(timer.pausedSeconds||0));}
function timerLabel(seconds:number){const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return[h,m,s].map(v=>String(v).padStart(2,'0')).join(':');}
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();}
function normalize(value?:string|null){return(value||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-BR');}
function contextIsVisible(timer:TimerRow,pathname:string){
  if(pathname.startsWith('/admin/horas'))return true;
  const explicit=Array.from(document.querySelectorAll<HTMLElement>('[data-timer-context-deliverable-id],[data-timer-context-task-id]'));
  if(explicit.some(node=>(timer.taskId&&node.dataset.timerContextTaskId===timer.taskId)||(timer.deliverableId&&node.dataset.timerContextDeliverableId===timer.deliverableId)))return true;
  const modal=document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');
  return Boolean(modal&&timer.deliverableName&&normalize(modal.querySelector('h2')?.textContent)===normalize(timer.deliverableName));
}
function findOriginButton(deliverableName:string){const title=normalize(deliverableName);return Array.from(document.querySelectorAll<HTMLButtonElement>('.front-deliverable-open-v3,.deliverable-list-open-v3,button')).find(b=>{const t=normalize(b.textContent);return t===title||t.includes(title);})||null;}
function openPendingOrigin(origin:PendingOrigin){
  if(!origin.deliverableName)return false;const button=findOriginButton(origin.deliverableName);if(!button)return false;button.click();
  window.setTimeout(()=>{if(!origin.taskName)return;const modal=document.querySelector<HTMLElement>('.deliverable-workspace-modal-v2');if(!modal)return;Array.from(modal.querySelectorAll<HTMLButtonElement>('.deliverable-tabs-v2 button')).find(x=>normalize(x.textContent).startsWith('subtarefas'))?.click();window.setTimeout(()=>{const task=Array.from(document.querySelectorAll<HTMLElement>('.task-list-v2 article')).find(x=>normalize(x.textContent).includes(normalize(origin.taskName)));if(task){task.classList.add('timer-origin-highlight');task.scrollIntoView({behavior:'smooth',block:'center'});window.setTimeout(()=>task.classList.remove('timer-origin-highlight'),3500);}},180);},180);return true;
}

export function GlobalTimerBar({role}:{role:Role}){
  const location=useLocation(),navigate=useNavigate();
  const [timers,setTimers]=useState<TimerRow[]>([]),[nowMs,setNowMs]=useState(Date.now()),[busyId,setBusyId]=useState<string|null>(null),[moreOpen,setMoreOpen]=useState(false),[domVersion,setDomVersion]=useState(0);
  const [pending,setPending]=useState<PendingFinalization>(null),[confirmStep,setConfirmStep]=useState<1|2>(1);const mounted=useRef(true);

  const load=useCallback(async()=>{
    if(role!=='admin'||!supabase){setTimers([]);return;}const user=(await supabase.auth.getUser()).data.user;if(!user){setTimers([]);return;}
    const timerResult=await supabase.from('work_timers').select('id,company_id,project_id,deliverable_id,task_id,started_at,paused_seconds,category,description').eq('user_id',user.id).eq('status','active').order('started_at',{ascending:true});
    if(timerResult.error||!timerResult.data?.length){if(mounted.current)setTimers([]);return;}
    const raw=timerResult.data as any[],companyIds=[...new Set(raw.map(r=>r.company_id).filter(Boolean))],projectIds=[...new Set(raw.map(r=>r.project_id).filter(Boolean))],deliverableIds=[...new Set(raw.map(r=>r.deliverable_id).filter(Boolean))],taskIds=[...new Set(raw.map(r=>r.task_id).filter(Boolean))];
    const [companies,projects,deliverables,tasks]=await Promise.all([
      companyIds.length?supabase.from('companies').select('id,display_name,logo_url').in('id',companyIds):Promise.resolve({data:[]} as any),
      projectIds.length?supabase.from('projects').select('id,name').in('id',projectIds):Promise.resolve({data:[]} as any),
      deliverableIds.length?supabase.from('deliverables').select('id,title,status').in('id',deliverableIds):Promise.resolve({data:[]} as any),
      taskIds.length?supabase.from('deliverable_tasks').select('id,title').in('id',taskIds):Promise.resolve({data:[]} as any),
    ]);
    const cm=new Map<string,any>((companies.data||[]).map((r:any)=>[r.id,r])),pm=new Map<string,any>((projects.data||[]).map((r:any)=>[r.id,r])),dm=new Map<string,any>((deliverables.data||[]).map((r:any)=>[r.id,r])),tm=new Map<string,any>((tasks.data||[]).map((r:any)=>[r.id,r]));
    const next=await Promise.all(raw.map(async r=>{const c=cm.get(r.company_id),d=dm.get(r.deliverable_id);return{id:r.id,companyId:r.company_id,projectId:r.project_id,deliverableId:r.deliverable_id,taskId:r.task_id,startedAt:r.started_at,pausedSeconds:Number(r.paused_seconds||0),category:r.category,description:r.description,companyName:c?.display_name||'Cliente',companyLogo:await resolveWorkspaceMedia(c?.logo_url||''),projectName:pm.get(r.project_id)?.name||null,deliverableName:d?.title||null,deliverableStatus:d?.status||null,taskName:tm.get(r.task_id)?.title||null} as TimerRow;}));
    if(mounted.current)setTimers(next);
  },[role]);

  useEffect(()=>{mounted.current=true;void load();const refresh=window.setInterval(()=>void load(),15000),tick=window.setInterval(()=>setNowMs(Date.now()),1000),changed=()=>void load();window.addEventListener(TIMER_EVENT,changed);return()=>{mounted.current=false;window.clearInterval(refresh);window.clearInterval(tick);window.removeEventListener(TIMER_EVENT,changed);};},[load]);
  useEffect(()=>{const observer=new MutationObserver(()=>setDomVersion(v=>v+1));observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();},[]);
  useEffect(()=>{if(role!=='admin'||!location.pathname.startsWith('/admin/projetos'))return;const raw=sessionStorage.getItem(ORIGIN_KEY);if(!raw)return;let origin:PendingOrigin|null=null;try{origin=JSON.parse(raw);}catch{sessionStorage.removeItem(ORIGIN_KEY);}if(!origin)return;let attempts=0;const id=window.setInterval(()=>{attempts++;if(openPendingOrigin(origin as PendingOrigin)||attempts>=30){window.clearInterval(id);sessionStorage.removeItem(ORIGIN_KEY);}},180);return()=>window.clearInterval(id);},[role,location.pathname]);

  const visibleTimers=useMemo(()=>timers.filter(t=>!contextIsVisible(t,location.pathname)),[timers,location.pathname,domVersion]);
  async function pause(timer:TimerRow){if(busyId)return;setBusyId(timer.id);try{await pauseTimerSession(timer.id);await load();}catch(e){console.error('Falha ao pausar e registrar sessão',e);}finally{setBusyId(null);}}
  function requestStop(timer:TimerRow){setPending({timer,target:{id:timer.taskId||timer.deliverableId||timer.id,label:timer.taskName||timer.deliverableName||timer.description||'esta atuação',kind:timer.taskId?'task':'deliverable',clientApproved:timer.deliverableStatus==='approved'}});setConfirmStep(1);setMoreOpen(false);}
  async function confirmStop(){if(!pending||busyId)return;setBusyId(pending.timer.id);try{await finalizeTimerWork(pending.timer);setPending(null);setConfirmStep(1);await load();}catch(e){console.error('Falha ao finalizar execução',e);}finally{setBusyId(null);}}
  function goToOrigin(timer:TimerRow){const origin={deliverableId:timer.deliverableId,deliverableName:timer.deliverableName,taskId:timer.taskId,taskName:timer.taskName};sessionStorage.setItem(ORIGIN_KEY,JSON.stringify(origin));setMoreOpen(false);if(location.pathname.startsWith('/admin/projetos')){if(!openPendingOrigin(origin))setDomVersion(v=>v+1);return;}navigate('/admin/projetos');}

  const primary=visibleTimers.slice(0,3),overflow=visibleTimers.slice(3);
  const chip=(timer:TimerRow,extended=false)=><article className={`global-timer-chip ${extended?'global-timer-chip-expanded':''}`} key={timer.id}>
    <button className="global-timer-origin" type="button" onClick={()=>goToOrigin(timer)} title="Abrir tarefa/entregável de origem"><span className="global-timer-logo">{timer.companyLogo?<img src={timer.companyLogo} alt=""/>:initials(timer.companyName)}</span><span className="global-timer-copy"><strong>{timer.companyName}</strong>{extended&&<small>{timer.taskName||timer.deliverableName||timer.description||timer.projectName||'Atuação CALI'}</small>}</span></button>
    <span className="global-timer-clock">{timerLabel(timerSeconds(timer,nowMs))}</span>
    <button className="global-timer-control" type="button" disabled={busyId===timer.id} onClick={()=>void pause(timer)} aria-label="Pausar e registrar esta sessão" title="Pausar: registra esta sessão e remove o timer"><Pause size={14}/></button>
    <button className="global-timer-control stop" type="button" disabled={busyId===timer.id} onClick={()=>requestStop(timer)} aria-label="Finalizar trabalho definitivamente" title="Stop: finalizar trabalho definitivamente"><Square size={13}/></button>
  </article>;

  return <>{role==='admin'&&visibleTimers.length>0&&<div className="global-timers" aria-label="Timers ativos"><span className="global-timers-mark" title={`${visibleTimers.length} timer(s) fora do contexto atual`}><TimerReset size={16}/></span><div className="global-timers-primary">{primary.map(t=>chip(t))}</div>{overflow.length>0&&<div className="global-timers-more-wrap"><button className="global-timers-more" type="button" onClick={()=>setMoreOpen(v=>!v)}>+{overflow.length}</button>{moreOpen&&<div className="global-timers-popover"><header><div><strong>Outros timers</strong><small>Empresas diferentes podem rodar em paralelo.</small></div><button type="button" onClick={()=>setMoreOpen(false)}><X size={16}/></button></header><div>{overflow.map(t=>chip(t,true))}</div></div>}</div>}</div>}
    <TimerFinalizationDialog target={pending?.target||null} step={confirmStep} busy={Boolean(pending&&busyId===pending.timer.id)} onCancel={()=>{setPending(null);setConfirmStep(1);}} onAdvance={()=>setConfirmStep(2)} onConfirm={()=>void confirmStop()}/>
  </>;
}
