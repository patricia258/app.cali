import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, History, TimerReset } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Role='admin'|'client';
type PerformanceRow={
  deliverable_id:string;project_id:string;protocol?:string|null;title:string;status:string;workstream?:string|null;
  planned_start_date?:string|null;actual_started_at?:string|null;original_due_at?:string|null;effective_due_at?:string|null;
  work_closed_at?:string|null;work_close_reason?:string|null;approved_at?:string|null;completion_at?:string|null;
  delivery_timing:'before_deadline'|'on_time'|'after_deadline'|'open';business_days_from_deadline?:number|null;
  start_timing:'started_early'|'started_on_time'|'started_late'|'unknown';business_days_from_original_deadline?:number|null;total_minutes:number;
};

const projectIdByProtocol=new Map<string,string>();
let lastLoadedProtocol='';
let lastLoadedAt=0;

function dateTime(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
function dateOnly(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value.slice(0,10)}T12:00:00`));}
function hours(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h${m?` ${String(m).padStart(2,'0')}min`:''}`:`${m}min`;}
function timingLabel(row:PerformanceRow){const d=Number(row.business_days_from_deadline||0);if(row.delivery_timing==='before_deadline')return d?`Entregue ${Math.abs(d)} dia(s) útil(eis) antes do prazo`:'Entregue antes do prazo';if(row.delivery_timing==='on_time')return'Entregue no prazo';if(row.delivery_timing==='after_deadline')return`Entregue ${Math.abs(d)} dia(s) útil(eis) depois do prazo`;return'Prazo ainda em aberto';}
function startLabel(status:PerformanceRow['start_timing']){return status==='started_early'?'Iniciado antes do planejado':status==='started_on_time'?'Iniciado na data planejada':status==='started_late'?'Iniciado depois do planejado':'Início planejado não definido';}
function currentProtocol(){return document.querySelector<HTMLElement>('.project-selector-v2 > button.active small')?.textContent?.trim()||'';}

export function ProjectDeliveryHistoryBridge({role}:{role:Role}){
  const location=useLocation();const [rows,setRows]=useState<PerformanceRow[]>([]),[target,setTarget]=useState<HTMLElement|null>(null),[domVersion,setDomVersion]=useState(0);
  const completed=useMemo(()=>rows.filter(r=>r.status==='approved'||Boolean(r.work_closed_at)).sort((a,b)=>new Date(b.completion_at||b.work_closed_at||0).getTime()-new Date(a.completion_at||a.work_closed_at||0).getTime()),[rows]);

  const load=useCallback(async(force=false)=>{
    if(role!=='admin'||!supabase||!location.pathname.startsWith('/admin/projetos')){setRows([]);return;}
    setTarget(document.querySelector<HTMLElement>('.project-history-v2'));
    const protocol=currentProtocol();
    if(!protocol)return;
    if(!force&&protocol===lastLoadedProtocol&&Date.now()-lastLoadedAt<30_000)return;
    lastLoadedProtocol=protocol;lastLoadedAt=Date.now();
    let projectId=projectIdByProtocol.get(protocol)||'';
    if(!projectId){
      const project=await supabase.from('projects').select('id').eq('protocol',protocol).maybeSingle();
      if(project.error||!project.data?.id)return;
      projectId=project.data.id;projectIdByProtocol.set(protocol,projectId);
    }
    const result=await supabase.from('deliverable_delivery_performance').select('*').eq('project_id',projectId);
    if(result.error){console.error('Falha ao carregar desempenho de entregas',result.error);return;}
    setRows((result.data||[]) as PerformanceRow[]);
  },[role,location.pathname]);

  useEffect(()=>{
    if(role!=='admin'||!location.pathname.startsWith('/admin/projetos'))return;
    void load(true);
    const id=window.setInterval(()=>void load(true),60_000);
    const onFocus=()=>void load();
    const onProjectIntent=(event:Event)=>{
      const target=event.target as Element|null;
      if(!target?.closest('.project-selector-v2'))return;
      window.setTimeout(()=>void load(true),80);
    };
    window.addEventListener('focus',onFocus);
    document.addEventListener('click',onProjectIntent,true);
    document.addEventListener('change',onProjectIntent,true);
    return()=>{window.clearInterval(id);window.removeEventListener('focus',onFocus);document.removeEventListener('click',onProjectIntent,true);document.removeEventListener('change',onProjectIntent,true);};
  },[role,location.pathname,load]);

  useEffect(()=>{
    if(role!=='admin'||!location.pathname.startsWith('/admin/projetos'))return;
    let scheduled=false;
    const syncDom=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setTarget(document.querySelector<HTMLElement>('.project-history-v2'));setDomVersion(v=>v+1);});};
    syncDom();
    const obs=new MutationObserver(syncDom);
    obs.observe(document.body,{childList:true,subtree:true});
    return()=>obs.disconnect();
  },[role,location.pathname]);

  useEffect(()=>{const protocols=new Set(completed.map(r=>r.protocol).filter(Boolean) as string[]);const nodes=Array.from(document.querySelectorAll<HTMLElement>('.front-deliverable-row-v3,.deliverable-list-row-v3,.kanban-v2 button'));nodes.forEach(node=>{const text=node.textContent||'';const closed=Array.from(protocols).some(p=>text.includes(p));node.classList.toggle('work-history-hidden',closed);});},[completed,domVersion]);

  if(role!=='admin'||!target||!completed.length)return null;
  return createPortal(<section className="project-delivery-history-v14"><header><div><History size={19}/><span><strong>Entregáveis concluídos</strong><small>Prazo planejado × execução real × aprovação do cliente</small></span></div><b>{completed.length}</b></header><div className="project-delivery-history-list">{completed.map(row=>{const approved=Boolean(row.approved_at);return <article key={row.deliverable_id}><div className="project-delivery-history-main"><span className={`delivery-timing-badge ${row.delivery_timing}`}>{timingLabel(row)}</span><small>{row.protocol||'Entregável'}</small><strong>{row.title}</strong><p>{approved?'Aprovado pelo cliente':'Execução encerrada pela CALI · aprovação do cliente pendente'}</p></div><div className="project-delivery-history-dates"><span><CalendarCheck2 size={15}/><em>Início planejado</em><strong>{dateOnly(row.planned_start_date)}</strong></span><span><TimerReset size={15}/><em>Início real</em><strong>{dateTime(row.actual_started_at)}</strong><small>{startLabel(row.start_timing)}</small></span><span><CalendarCheck2 size={15}/><em>Deadline</em><strong>{dateTime(row.effective_due_at)}</strong>{row.original_due_at&&row.original_due_at!==row.effective_due_at&&<small>Original: {dateTime(row.original_due_at)}</small>}</span><span><Clock3 size={15}/><em>{approved?'Aprovado em':'Execução encerrada'}</em><strong>{dateTime(row.completion_at||row.work_closed_at)}</strong><small>{hours(Number(row.total_minutes||0))} registrados</small></span></div></article>;})}</div></section>,target);
}
