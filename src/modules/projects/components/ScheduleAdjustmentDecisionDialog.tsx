import { useState } from 'react';
import type { ScheduleReviewRequest } from '../../../api/projects/schedule';
import { scheduleChangeSummary } from '../../../domain/projects';
import { useResolveScheduleAdjustment } from '../hooks/useResolveScheduleAdjustment';
import { ProjectActionDialog } from './ProjectActionDialog';

type Props = {
  review: ScheduleReviewRequest;
  accept: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function ScheduleAdjustmentDecisionDialog({ review, accept, onClose, onSaved }: Props) {
  const [note, setNote] = useState('');
  const mutation = useResolveScheduleAdjustment(review.id, accept, onSaved);
  const change = review.requested_changes ?? {};

  return <ProjectActionDialog title={accept ? 'Acolher pedido de ajuste' : 'Não aplicar pedido'} kicker="Análise CALI"
    action="Enviar decisão" pending={mutation.isPending} error={mutation.error?.message} disabled={note.trim().length < 3}
    onClose={onClose} onSubmit={() => mutation.mutate(note)}>
    <div className="tw:grid tw:gap-[.3846rem] tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem] tw:text-[#7a5a2c]">
      <span className="tw:text-[.6538rem] tw:font-black tw:tracking-[.08em] tw:text-[#865767]">Pedido {review.request_number} de 2</span>
      <strong>{change.targetLabel || 'Cronograma'}</strong>
      {scheduleChangeSummary(change).map((item) => <span key={item} className="tw:text-[.6923rem] tw:text-[#896b3d]">{item}</span>)}
      <p className="tw:m-0 tw:text-[.8077rem] tw:leading-[1.45] tw:text-cali-muted">{review.response_note}</p>
    </div>
    <label className="tw:grid tw:gap-[.4615rem] tw:text-[.8462rem] tw:font-bold">Justificativa da decisão
      <textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)}
        placeholder="Explique ao cliente o que será feito e por quê."
        className="tw:w-full tw:resize-y tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.9231rem] tw:py-[.7692rem] tw:text-[.9231rem] tw:font-normal" />
    </label>
    <p className="tw:m-0 tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:px-[1.1538rem] tw:py-[.9231rem] tw:text-[.8462rem] tw:leading-[1.6] tw:text-[#7a5a2c]">
      Depois da decisão, o cronograma volta para validação do cliente. Se o pedido for acolhido, faça a alteração correspondente antes da aprovação final.
    </p>
  </ProjectActionDialog>;
}
