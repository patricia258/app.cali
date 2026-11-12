import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, History, TimerReset } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../api/supabase';

type Role='admin'|'client';
type PerformanceRow={
  deliverable_id:string;project_id:string;protocol?:string|null;title:string;status:string;workstream?:string|null;
  planned_start_date?:string|null;actual_started_at?:string|null;original_due_at?:string|null;effective_due_at?:string|null;
  work_closed_at?:string|null;work_close_reason?:string|null;approved_at?:string|null;completion_at?:string|null;
  delivery_timing:'before_deadline'|'on_time'|'after_deadline'|'open';business_days_from_deadline?:number|null;
  start_timing:'started_early'|'started_on_time'|'started_late'|'unknown';business_days_from_original_deadline?:number|null;total_minutes:number;
};
const emptySelection = { protocol: null, target: null };
const rowSelector = '.front-deliverable-row-v3,.deliverable-list-row-v3,.kanban-v2 button';

function dateTime(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
function dateOnly(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value.slice(0,10)}T12:00:00`));}
function hours(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h${m?` ${String(m).padStart(2,'0')}min`:''}`:`${m}min`;}
function timingLabel(row:PerformanceRow){const d=Number(row.business_days_from_deadline||0);if(row.delivery_timing==='before_deadline')return d?`Entregue ${Math.abs(d)} dia(s) útil(eis) antes do prazo`:'Entregue antes do prazo';if(row.delivery_timing==='on_time')return'Entregue no prazo';if(row.delivery_timing==='after_deadline')return`Entregue ${Math.abs(d)} dia(s) útil(eis) depois do prazo`;return'Prazo ainda em aberto';}
function startLabel(status:PerformanceRow['start_timing']){return status==='started_early'?'Iniciado antes do planejado':status==='started_on_time'?'Iniciado na data planejada':status==='started_late'?'Iniciado depois do planejado':'Início planejado não definido';}

export function ProjectDeliveryHistoryBridge({role}:{role:Role}){
  const location = useLocation();
  const enabled = role === 'admin' && location.pathname.startsWith('/admin/projetos');
  const [{ protocol, target }, setSelection] = useState<{ protocol: string | null; target: HTMLElement | null }>(emptySelection);
  const [performance, setPerformance] = useState<{ protocol: string; rows: PerformanceRow[] } | null>(null);
  const completed = useMemo(() => (
    performance?.protocol === protocol ? performance.rows : []
  ).filter((row) => row.status === 'approved' || Boolean(row.work_closed_at))
    .sort((left, right) => new Date(right.completion_at || right.work_closed_at || 0).getTime() - new Date(left.completion_at || left.work_closed_at || 0).getTime()), [performance, protocol]);

  useEffect(() => {
    if (!enabled) {
      setSelection(emptySelection);
      return;
    }
    const root = document.getElementById('root');
    if (!root) return;
    const closedProtocols = completed.flatMap((row) => row.protocol ? [row.protocol] : []);
    let frame = 0;
    const syncProjectDom = () => {
      frame = 0;
      const nextProtocol = root.querySelector('.project-selector-v2 > button.active small')?.textContent?.trim() || null;
      const nextTarget = root.querySelector<HTMLElement>('.project-history-v2');
      setSelection((current) => current.protocol === nextProtocol && current.target === nextTarget
        ? current : { protocol: nextProtocol, target: nextTarget });
      for (const node of root.querySelectorAll<HTMLElement>(rowSelector)) {
        const closed = nextProtocol === protocol && closedProtocols.some((entry) => node.textContent?.includes(entry));
        if (node.classList.contains('work-history-hidden') !== closed) node.classList.toggle('work-history-hidden', closed);
      }
    };
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(syncProjectDom);
    });
    syncProjectDom();
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [enabled, protocol, completed]);

  useEffect(() => {
    const client = supabase;
    if (!enabled || !client || !protocol) return;
    let active = true;
    let busy = false;
    let projectId: string | null = null;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        if (!projectId) {
          const project = await client.from('projects').select('id').eq('protocol', protocol).maybeSingle();
          if (!active || project.error || !project.data?.id) return;
          projectId = project.data.id;
        }
        const result = await client.from('deliverable_delivery_performance').select('*').eq('project_id', projectId);
        if (!active) return;
        if (result.error) {
          console.error('Falha ao carregar desempenho de entregas', result.error);
          return;
        }
        setPerformance({ protocol, rows: (result.data || []) as PerformanceRow[] });
      } finally {
        busy = false;
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, protocol]);

  if(!enabled||!target?.isConnected||!completed.length)return null;
  return createPortal(<section className="project-delivery-history-v14"><header><div><History size={19}/><span><strong>Entregáveis concluídos</strong><small>Prazo planejado × execução real × aprovação do cliente</small></span></div><b>{completed.length}</b></header><div className="project-delivery-history-list">{completed.map(row=>{const approved=Boolean(row.approved_at);return <article key={row.deliverable_id}><div className="project-delivery-history-main"><span className={`delivery-timing-badge ${row.delivery_timing}`}>{timingLabel(row)}</span><small>{row.protocol||'Entregável'}</small><strong>{row.title}</strong><p>{approved?'Aprovado pelo cliente':'Execução encerrada pela CALI · aprovação do cliente pendente'}</p></div><div className="project-delivery-history-dates"><span><CalendarCheck2 size={15}/><em>Início planejado</em><strong>{dateOnly(row.planned_start_date)}</strong></span><span><TimerReset size={15}/><em>Início real</em><strong>{dateTime(row.actual_started_at)}</strong><small>{startLabel(row.start_timing)}</small></span><span><CalendarCheck2 size={15}/><em>Deadline</em><strong>{dateTime(row.effective_due_at)}</strong>{row.original_due_at&&row.original_due_at!==row.effective_due_at&&<small>Original: {dateTime(row.original_due_at)}</small>}</span><span><Clock3 size={15}/><em>{approved?'Aprovado em':'Execução encerrada'}</em><strong>{dateTime(row.completion_at||row.work_closed_at)}</strong><small>{hours(Number(row.total_minutes||0))} registrados</small></span></div></article>;})}</div></section>,target);
}
