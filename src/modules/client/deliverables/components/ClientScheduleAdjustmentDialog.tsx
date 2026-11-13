import { useId, useState } from 'react';
import type { ClientScheduleReview, ScheduleAdjustment } from '../../../../api/projects/schedule';
import { useRequestClientScheduleAdjustment } from '../hooks/useRequestClientScheduleAdjustment';
import { scheduleReviewDate } from '../scheduleReviewDate';
import { ClientScheduleDialog } from './ClientScheduleDialog';

const frontPriorities = [
  'Quero antecipar esta frente',
  'Quero que esta frente tenha prioridade sobre as próximas',
  'Esta frente pode ficar para depois',
];

type Props = {
  review: ClientScheduleReview;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function ClientScheduleAdjustmentDialog({ review, onClose, onSaved }: Props) {
  const { project, fronts, deliverables } = review;
  const fieldsId = useId();
  const [type, setType] = useState<ScheduleAdjustment['p_target_type']>('workstream');
  const [targetId, setTargetId] = useState(fronts[0]?.id ?? '');
  const [action, setAction] = useState<NonNullable<ScheduleAdjustment['p_action']>>('reschedule');
  const [requestedDate, setRequestedDate] = useState('');
  const [swapTargetId, setSwapTargetId] = useState('');
  const [priority, setPriority] = useState(frontPriorities[0]);
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  const adjustment = useRequestClientScheduleAdjustment(onSaved);
  const primary = deliverables.find((row) => row.id === targetId);
  const swap = deliverables.find((row) => row.id === swapTargetId);
  const rescheduling = type === 'deliverable' && action === 'reschedule';
  const swapping = type === 'deliverable' && action === 'swap_order';
  const sameComplexity = Boolean(primary && swap && (primary.complexity || '') === (swap.complexity || ''));

  function changeType(next: ScheduleAdjustment['p_target_type']) {
    setType(next);
    setTargetId((next === 'workstream' ? fronts[0] : next === 'deliverable' ? deliverables[0] : undefined)?.id ?? '');
    setSwapTargetId('');
  }

  function submit() {
    if (reason.trim().length < 3) return setValidation('Explique o ajuste que você precisa.');
    if (type !== 'project' && !targetId) return setValidation(type === 'workstream' ? 'Selecione uma frente.' : 'Selecione um entregável.');
    if (rescheduling && !requestedDate) return setValidation('Informe a nova data desejada para o entregável.');
    if (swapping && !sameComplexity) return setValidation('A troca de prioridade só pode acontecer entre entregáveis da mesma complexidade (MC).');
    setValidation('');
    adjustment.mutate({
      p_project_id: project.id,
      p_target_type: type,
      p_target_id: type === 'project' ? null : targetId,
      p_reason: reason.trim(),
      p_priority: type === 'workstream' ? priority : null,
      p_action: type === 'deliverable' ? action : null,
      p_requested_date: rescheduling ? requestedDate : null,
      p_swap_target_id: swapping ? swapTargetId : null,
    });
  }

  const deliverableLabel = (item: ClientScheduleReview['deliverables'][number]) =>
    `${item.title} · ${item.complexity || 'sem MC'} · ${scheduleReviewDate(item.due_at)}`;

  return <ClientScheduleDialog title="Solicitar ajuste no cronograma" kicker={`Pedido ${review.review.request_number} de 2`}
    action="Enviar pedido" pending={adjustment.isPending} error={validation || adjustment.error?.message} onClose={onClose} onSubmit={submit}>
    <div className="tw:grid tw:gap-1.5">
      <label htmlFor={`${fieldsId}-type`}>O que você quer ajustar?</label>
      <select id={`${fieldsId}-type`} value={type} onChange={(event) => changeType(event.target.value as ScheduleAdjustment['p_target_type'])}>
        <option value="workstream">Prioridade de uma frente</option>
        <option value="deliverable">Um entregável</option>
        <option value="project">Outro ponto do cronograma</option>
      </select>
    </div>
    {type !== 'project' && <div className="tw:grid tw:gap-1.5">
      <label htmlFor={`${fieldsId}-target`}>{type === 'workstream' ? 'Frente' : 'Entregável'}</label>
      <select id={`${fieldsId}-target`} value={targetId} onChange={(event) => { setTargetId(event.target.value); setSwapTargetId(''); }}>
        {type === 'workstream' ? fronts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)
          : deliverables.map((row) => <option key={row.id} value={row.id}>{deliverableLabel(row)}</option>)}
      </select>
    </div>}
    {type === 'workstream' && <div className="tw:grid tw:gap-1.5">
      <label htmlFor={`${fieldsId}-priority`}>Como você quer reorganizar esta frente?</label>
      <select id={`${fieldsId}-priority`} value={priority} onChange={(event) => setPriority(event.target.value)}>
        {frontPriorities.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>}
    {type === 'deliverable' && <div className="tw:grid tw:gap-1.5">
      <label htmlFor={`${fieldsId}-action`}>O que você quer mudar neste entregável?</label>
      <select id={`${fieldsId}-action`} value={action} onChange={(event) => { setAction(event.target.value as typeof action); setSwapTargetId(''); }}>
        <option value="reschedule">Alterar a data</option>
        <option value="swap_order">Trocar a ordem/prioridade com outro entregável</option>
        <option value="change_proposal">Solicitar uma proposta diferente para este entregável</option>
      </select>
    </div>}
    {rescheduling && <label>Nova data desejada
      <input type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} />
    </label>}
    {swapping && <div className="tw:grid tw:gap-1.5">
      <label htmlFor={`${fieldsId}-swap`}>Trocar a prioridade com</label>
      <select id={`${fieldsId}-swap`} value={swapTargetId} onChange={(event) => setSwapTargetId(event.target.value)}>
        <option value="">Selecionar outro entregável</option>
        {deliverables.filter((row) => row.id !== targetId).map((row) => <option key={row.id} value={row.id}>{deliverableLabel(row)}</option>)}
      </select>
    </div>}
    {swapping && primary && <p role="status" className={`tw:m-0 tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-2.5 tw:text-xs tw:leading-relaxed ${swap ? sameComplexity ? 'tw:border-cali-success/25 tw:bg-cali-success/5 tw:text-cali-success' : 'tw:border-cali-danger/25 tw:bg-cali-danger/5 tw:text-cali-danger' : 'tw:border-cali-line tw:bg-(--theme-surface-soft) tw:text-cali-muted'}`}>
      {!swap ? `${primary.title} é ${primary.complexity || 'sem MC'}. Selecione outro entregável da mesma complexidade.`
        : sameComplexity ? `Troca válida: os dois entregáveis são ${primary.complexity || 'da mesma complexidade'}.`
          : `Só é possível trocar a prioridade entre entregáveis da mesma complexidade. “${primary.title}” é ${primary.complexity || 'sem MC'} e “${swap.title}” é ${swap.complexity || 'sem MC'}.`}
    </p>}
    <label>Explique o ajuste
      <textarea rows={5} value={reason} placeholder="Explique o contexto e o que precisa mudar." onChange={(event) => setReason(event.target.value)} />
    </label>
    <p className="tw:m-0 tw:rounded-lg tw:border tw:border-solid tw:border-cali-gold/30 tw:bg-cali-gold/10 tw:px-3.5 tw:py-3 tw:text-xs tw:leading-relaxed tw:text-cali-muted">A CALI recebe o pedido, analisa e responde com justificativa. A aprovação final confirma o cronograma, mas não altera a data de início nem desloca as deadlines automaticamente.</p>
  </ClientScheduleDialog>;
}
