import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';
import { closureDate, feedbackCopy } from '../feedbackCopy';

export function RecordClosureAdminSummary({ experience }: { experience: RecordClosureExperience }) {
  if (experience.role !== 'admin' || !experience.ctx) return null;
  const { feedback } = experience.ctx;
  const { pendingReopen, adminDecisionOpen, openAdminDecision, thanks } = experience;
  const response = feedback && feedbackCopy(feedback.score);

  return <>
    {pendingReopen && !adminDecisionOpen && !thanks && <div className="tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-[1rem] tw:border tw:border-solid tw:border-[color:color-mix(in_srgb,#b58c52_42%,var(--theme-line))] tw:bg-[color:color-mix(in_srgb,#b58c52_8%,var(--theme-surface))] tw:px-[1.0769rem] tw:py-[.9231rem] tw:max-[721px]:flex-col tw:max-[721px]:items-stretch">
      <div className="tw:grid tw:gap-[.1538rem]">
        <span className="tw:text-[.6923rem] tw:font-[850] tw:tracking-[.09em] tw:text-cali-gold">PEDIDO DE REABERTURA PENDENTE</span>
        <strong className="tw:text-[.8846rem] tw:text-cali-text">Decisão aguardando sua análise.</strong>
      </div>
      <button type="button" className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:px-3 tw:py-2 tw:font-semibold tw:text-cali-accent" onClick={openAdminDecision}>Rever pedido</button>
    </div>}
    {feedback && response && <section className="tw:mx-[1.8462rem] tw:mt-[.9231rem] tw:flex tw:items-center tw:gap-[.9231rem] tw:rounded-[.6923rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-[1.0769rem] tw:py-[.7692rem]">
      <div className="tw:inline-flex tw:flex-none tw:items-center tw:gap-[.4615rem]">
        <span className="tw:text-[1.3846rem]">{response.face}</span>
        <strong className="tw:text-[1.2308rem] tw:leading-none tw:text-[#322f2c]">{feedback.score}<small className="tw:text-[.7692rem] tw:text-[#9a8c83]">/5</small></strong>
      </div>
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.1538rem]">
        <span className="tw:text-[.6923rem] tw:font-bold tw:tracking-[.1em] tw:text-cali-gold">AVALIAÇÃO DO CLIENTE</span>
        <strong className="tw:text-[.8462rem] tw:text-[#322f2c]">{response.title}</strong>
        <p className="tw:m-0 tw:text-[.7692rem] tw:leading-[1.45] tw:text-[#857870]">{feedback.comment || 'O cliente não deixou comentário adicional.'}</p>
        <small className="tw:text-[.7692rem] tw:text-[#857870]">Registrada {closureDate(feedback.created_at)}</small>
      </div>
    </section>}
  </>;
}
