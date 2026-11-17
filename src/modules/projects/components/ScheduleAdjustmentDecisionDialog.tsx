import { useState } from 'react';
import type { ScheduleReviewRequest } from '../../../api/projects/schedule';
import { scheduleChangeSummary } from '../../../domain/projects';
import { useResolveScheduleAdjustment } from '../hooks/useResolveScheduleAdjustment';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  projectId: string;
  review: ScheduleReviewRequest;
  accept: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function ScheduleAdjustmentDecisionDialog({ projectId, review, accept, onClose, onSaved }: Props) {
  const [note, setNote] = useState('');
  const mutation = useResolveScheduleAdjustment(projectId, review.id, accept, onSaved);
  const change = review.requested_changes ?? {};

  return <ProjectActionDialog title={accept ? 'Acolher pedido de ajuste' : 'Não aplicar pedido'} kicker="Análise CALI"
    action="Enviar decisão" pending={mutation.isPending} error={mutation.error?.message} disabled={note.trim().length < 3}
    onClose={onClose} onSubmit={() => mutation.mutate(note)}>
    <div className="tw:grid tw:gap-1.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4.5 tw:py-3.5 tw:text-cali-warning">
      <span className="tw:text-cali-micro tw:font-black tw:tracking-[.08em] tw:text-cali-red-strong">Pedido {review.request_number} de 2</span>
      <strong>{change.targetLabel || 'Cronograma'}</strong>
      {scheduleChangeSummary(change).map((item) => <span key={item} className="tw:text-cali-label tw:text-cali-gold-text">{item}</span>)}
      <p className="tw:m-0 tw:text-cali-detail tw:leading-[1.45] tw:text-cali-muted">{review.response_note}</p>
    </div>
    <label className="tw:grid tw:gap-2 tw:text-sm tw:font-bold">Justificativa da decisão
      <textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)}
        placeholder="Explique ao cliente o que será feito e por quê."
        className="tw:w-full tw:resize-y tw:rounded-lg tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body tw:font-normal" />
    </label>
    <p className="tw:m-0 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4.5 tw:py-3.5 tw:text-sm tw:leading-[1.6] tw:text-cali-warning">
      Depois da decisão, o cronograma volta para validação do cliente. Se o pedido for acolhido, faça a alteração correspondente antes da aprovação final.
    </p>
  </ProjectActionDialog>;
}
