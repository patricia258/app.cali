import { CalendarCheck2, Clock3, History, TimerReset } from 'lucide-react';
import { useProjectDeliveryHistory } from '../hooks/useProjectDeliveryHistory';
import type { DeliveryPerformance } from '../../../api/projects/performance';

function dateTime(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
function dateOnly(value?:string|null){if(!value)return'—';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value.slice(0,10)}T12:00:00`));}
function hours(minutes:number){const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h${m?` ${String(m).padStart(2,'0')}min`:''}`:`${m}min`;}
function timingLabel(row:DeliveryPerformance){const d=Number(row.business_days_from_deadline||0);if(row.delivery_timing==='before_deadline')return d?`Entregue ${Math.abs(d)} dia(s) útil(eis) antes do prazo`:'Entregue antes do prazo';if(row.delivery_timing==='on_time')return'Entregue no prazo';if(row.delivery_timing==='after_deadline')return`Entregue ${Math.abs(d)} dia(s) útil(eis) depois do prazo`;return'Prazo ainda em aberto';}
function startLabel(status:DeliveryPerformance['start_timing']){return status==='started_early'?'Iniciado antes do planejado':status==='started_on_time'?'Iniciado na data planejada':status==='started_late'?'Iniciado depois do planejado':'Início planejado não definido';}

export function ProjectDeliveryHistory({ projectId }: { projectId: string }) {
  const history = useProjectDeliveryHistory(projectId);
  const completed = (history.data ?? [])
    .filter((row) => row.status === 'approved' || Boolean(row.work_closed_at))
    .sort((left, right) => new Date(right.completion_at || right.work_closed_at || 0).getTime()
      - new Date(left.completion_at || left.work_closed_at || 0).getTime());
  if (!completed.length) return null;
  return <section className="project-delivery-history-v14"><header><div><History size={19}/><span><strong>Entregáveis concluídos</strong><small>Prazo planejado × execução real × aprovação do cliente</small></span></div><b>{completed.length}</b></header><div className="project-delivery-history-list">{completed.map(row=>{const approved=Boolean(row.approved_at);return <article key={row.deliverable_id}><div className="project-delivery-history-main"><span className={`delivery-timing-badge ${row.delivery_timing}`}>{timingLabel(row)}</span><small>{row.protocol||'Entregável'}</small><strong>{row.title}</strong><p>{approved?'Aprovado pelo cliente':'Execução encerrada pela CALI · aprovação do cliente pendente'}</p></div><div className="project-delivery-history-dates"><span><CalendarCheck2 size={15}/><em>Início planejado</em><strong>{dateOnly(row.planned_start_date)}</strong></span><span><TimerReset size={15}/><em>Início real</em><strong>{dateTime(row.actual_started_at)}</strong><small>{startLabel(row.start_timing)}</small></span><span><CalendarCheck2 size={15}/><em>Deadline</em><strong>{dateTime(row.effective_due_at)}</strong>{row.original_due_at&&row.original_due_at!==row.effective_due_at&&<small>Original: {dateTime(row.original_due_at)}</small>}</span><span><Clock3 size={15}/><em>{approved?'Aprovado em':'Execução encerrada'}</em><strong>{dateTime(row.completion_at||row.work_closed_at)}</strong><small>{hours(Number(row.total_minutes||0))} registrados</small></span></div></article>;})}</div></section>;
}
