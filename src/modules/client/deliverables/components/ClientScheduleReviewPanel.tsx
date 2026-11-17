import { useState } from 'react';
import type { ClientDeliveryProject } from '../../../../api/projects/client-delivery';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { scheduleChangeSummary } from '../../../../domain/projects';
import { useClientScheduleReview } from '../hooks/useClientScheduleReview';
import { scheduleReviewDate } from '../scheduleReviewDate';
import { ClientScheduleAdjustmentDialog } from './ClientScheduleAdjustmentDialog';
import { ClientScheduleApprovalDialog } from './ClientScheduleApprovalDialog';

type Props = {
  companyId: string;
  project: ClientDeliveryProject;
  refreshProject: () => Promise<boolean>;
};

export function ClientScheduleReviewPanel({ companyId, project, refreshProject }: Props) {
  const { user } = useWorkspaceAuth();
  const query = useClientScheduleReview(user?.id, companyId, project.id, project.planningStatus);
  const [dialog, setDialog] = useState<'adjustment' | 'approval' | null>(null);
  const review = query.data;

  async function onSaved() {
    await Promise.all([query.refetch(), refreshProject()]);
    setDialog(null);
  }

  if (query.isError) return <InlineNotice role="alert">
    Não foi possível consultar a revisão do cronograma.{' '}
    <button type="button" onClick={() => void query.refetch()} className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:text-current tw:underline">Tentar novamente</button>
  </InlineNotice>;
  if (!review) return null;

  if (review.review.status === 'adjustment_requested') {
    const change = review.review.requested_changes ?? {};
    return <section className="tw:mb-4 tw:grid tw:gap-3 tw:rounded-xl tw:border tw:border-l-4 tw:border-solid tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-warning-surface tw:px-5 tw:py-4 tw:text-cali-gold-strong tw:workspace-night:border-cali-gold-text tw:workspace-night:bg-cali-sand-inverse tw:workspace-night:text-cali-gold-soft">
      <div className="tw:grid tw:gap-1">
        <span className="tw:text-cali-label tw:font-extrabold tw:tracking-wider tw:uppercase">Ajuste em análise · {review.review.request_number}/2</span>
        <h2 className="tw:m-0 tw:text-base tw:font-bold tw:text-cali-text">A CALI está analisando sua solicitação</h2>
        <p className="tw:m-0 tw:text-xs tw:leading-relaxed">Enquanto este pedido estiver em análise, o cronograma não pode ser aprovado e o projeto ainda não começou.</p>
      </div>
      <div className="tw:grid tw:gap-1 tw:rounded-lg tw:border tw:border-solid tw:border-cali-gold-soft tw:bg-cali-surface tw:px-3.5 tw:py-3 tw:text-xs tw:workspace-night:border-cali-line">
        <span className="tw:text-cali-label tw:font-bold">{change.actionLabel || change.targetLabel || 'Ajuste solicitado'}</span>
        <strong>{change.targetLabel || 'Cronograma'}</strong>
        {scheduleChangeSummary(change).map((item) => <span key={item}>{item}</span>)}
        <p className="tw:m-0">{review.review.response_note || 'Pedido de ajuste enviado.'}</p>
      </div>
    </section>;
  }

  const adjustmentsUsed = Math.min(2, Math.max(0, review.review.request_number - 1));
  return <>
    <section aria-label="Cronograma para aprovação" className="tw:mb-5.5 tw:grid tw:grid-cols-[minmax(0,1fr)_auto] tw:items-center tw:gap-x-7 tw:gap-y-2 tw:rounded-2xl tw:border tw:border-l-[.3125rem] tw:border-solid tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-warning-surface tw:px-6 tw:py-5 tw:workspace-night:border-cali-gold-text tw:workspace-night:bg-cali-sand-inverse tw:max-[51.25rem]:grid-cols-1">
      <div className="tw:grid tw:min-w-0 tw:gap-1">
        <span className="tw:text-xs tw:font-extrabold tw:tracking-wider tw:text-cali-warning tw:uppercase tw:workspace-night:text-cali-gold-line">Cronograma para aprovação</span>
        <h2 className="tw:m-0 tw:text-lg tw:font-bold tw:tracking-normal tw:text-cali-text tw:workspace-night:text-cali-text">Revise e confirme o cronograma</h2>
        <p className="tw:m-0 tw:text-cali-body tw:leading-[1.5] tw:text-cali-gold-strong tw:workspace-night:text-cali-gold-line">Confira frentes, entregáveis e deadlines. A aprovação confirma o plano e não altera as datas. Início planejado: {scheduleReviewDate(review.project.start_date || review.project.roadmap_start_date)}.</p>
      </div>
      <dl className="tw:col-start-1 tw:row-start-2 tw:m-0 tw:flex tw:flex-wrap tw:gap-x-5.5 tw:gap-y-1 tw:[&_div]:grid tw:[&_div]:gap-0.5 tw:[&_dt]:text-sm tw:[&_dt]:text-cali-sand-strong tw:workspace-night:[&_dt]:text-cali-gold-line tw:[&_dd]:m-0 tw:[&_dd]:text-cali-body tw:[&_dd]:font-bold tw:[&_dd]:text-cali-gold-strong tw:workspace-night:[&_dd]:text-cali-orange-surface">
        <div><dt>Frentes</dt><dd>{review.fronts.length}</dd></div>
        <div><dt>Entregáveis</dt><dd>{review.deliverables.length}</dd></div>
        <div><dt>Conclusão prevista</dt><dd>{scheduleReviewDate(review.project.roadmap_end_date)}</dd></div>
        <div><dt>Ajustes</dt><dd>{adjustmentsUsed}/2</dd></div>
      </dl>
      <div className="tw:col-start-2 tw:row-span-2 tw:row-start-1 tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-3 tw:max-[51.25rem]:col-start-1 tw:max-[51.25rem]:row-span-1 tw:max-[51.25rem]:row-start-3 tw:max-[51.25rem]:justify-start tw:[&_button]:min-h-[2.9231rem] tw:[&_button]:cursor-pointer tw:[&_button]:rounded-lg tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:px-4.5 tw:[&_button]:text-sm! tw:[&_button]:font-bold! tw:[&_button]:whitespace-nowrap">
        {adjustmentsUsed < 2 ? <button type="button" onClick={() => setDialog('adjustment')}
          className="tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-cali-brand tw:workspace-night:border-cali-orange-line/48 tw:workspace-night:bg-cali-gold-surface/7 tw:workspace-night:text-cali-gold-line">Solicitar ajuste</button>
          : <span className="tw:text-xs">2/2 ajustes utilizados</span>}
        <button type="button" onClick={() => setDialog('approval')}
          className="tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface tw:workspace-night:border-cali-orange-line tw:workspace-night:bg-cali-gold tw:workspace-night:text-cali-burgundy-inverse">Aprovar cronograma</button>
      </div>
    </section>
    {dialog === 'adjustment' && <ClientScheduleAdjustmentDialog review={review} onClose={() => setDialog(null)} onSaved={onSaved} />}
    {dialog === 'approval' && <ClientScheduleApprovalDialog project={review.project} onClose={() => setDialog(null)} onSaved={onSaved} />}
  </>;
}
