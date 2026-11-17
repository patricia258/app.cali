import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';
import { closureDate, feedbackCopy } from '../feedbackCopy';

export function RecordClosureAdminSummary({ experience }: { experience: RecordClosureExperience }) {
  if (experience.role !== 'admin' || !experience.ctx) return null;
  const { feedback } = experience.ctx;
  const { pendingReopen, adminDecisionOpen, openAdminDecision, thanks } = experience;
  const response = feedback && feedbackCopy(feedback.score);

  return <>
    {pendingReopen && !adminDecisionOpen && !thanks && <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-2xl tw:border tw:border-solid tw:border-[color:color-mix(in_srgb,var(--cali-color-gold-accent)_42%,var(--theme-line))] tw:bg-[color:color-mix(in_srgb,var(--cali-color-gold-accent)_8%,var(--theme-surface))] tw:px-4.5 tw:py-3.5 tw:max-[721px]:flex-col tw:max-[721px]:items-stretch">
      <div className="tw:grid tw:gap-0.5">
        <span className="tw:text-cali-label tw:font-[850] tw:tracking-[.09em] tw:text-cali-gold">PEDIDO DE REABERTURA PENDENTE</span>
        <strong className="tw:text-sm tw:text-cali-text">Decisão aguardando sua análise.</strong>
      </div>
      <button type="button" className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-3 tw:py-2 tw:font-semibold tw:text-cali-accent" onClick={openAdminDecision}>Rever pedido</button>
    </div>}
    {feedback && response && <section className="tw:mx-7.5 tw:mt-3.5 tw:flex tw:items-center tw:gap-3.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:px-4.5 tw:py-3">
      <div className="tw:inline-flex tw:flex-none tw:items-center tw:gap-2">
        <span className="tw:text-cali-title-sm">{response.face}</span>
        <strong className="tw:text-xl tw:leading-none tw:text-cali-text">{feedback.score}<small className="tw:text-xs tw:text-cali-muted">/5</small></strong>
      </div>
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5">
        <span className="tw:text-cali-label tw:font-bold tw:tracking-[.1em] tw:text-cali-gold">AVALIAÇÃO DO CLIENTE</span>
        <strong className="tw:text-sm tw:text-cali-text">{response.title}</strong>
        <p className="tw:m-0 tw:text-xs tw:leading-[1.45] tw:text-cali-muted">{feedback.comment || 'O cliente não deixou comentário adicional.'}</p>
        <small className="tw:text-xs tw:text-cali-muted">Registrada {closureDate(feedback.created_at)}</small>
      </div>
    </section>}
  </>;
}
