import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';
import { closureDate, feedbackCopy } from '../feedbackCopy';

const tone = {
  good: { card: 'tw:border-cali-green-soft tw:border-l-cali-success tw:bg-cali-green-surface', score: 'tw:text-cali-green-strong' },
  neutral: { card: 'tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-warning-surface', score: 'tw:text-cali-warning' },
  low: { card: 'tw:border-cali-orange-soft tw:border-l-cali-orange-accent tw:bg-cali-orange-surface', score: 'tw:text-cali-orange-text' },
};

export function RecordClosureClientHistory({ experience }: { experience: RecordClosureExperience }) {
  const feedback = experience.ctx?.feedback;
  if (experience.role !== 'client' || !feedback) return null;
  const variant = tone[feedback.score >= 4 ? 'good' : feedback.score === 3 ? 'neutral' : 'low'];

  return <div className={`tw:my-5 tw:flex tw:items-center tw:gap-5.5 tw:overflow-hidden tw:rounded-[.9231rem] tw:border tw:border-l-4 tw:border-solid tw:px-6 tw:py-5 ${variant.card}`}>
    <div className="tw:flex tw:flex-none tw:items-center tw:gap-3">
      <span className="tw:text-cali-display-lg tw:leading-none">{feedbackCopy(feedback.score).face}</span>
      <strong className={`tw:text-cali-display tw:font-extrabold tw:tracking-[-.02em] ${variant.score}`}>{feedback.score}/5</strong>
    </div>
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
      <span className="tw:text-base tw:font-bold tw:text-cali-ink">Sua avaliação deste atendimento</span>
      {feedback.comment?.trim() && <p className="tw:m-0 tw:text-cali-body tw:leading-[1.5] tw:text-cali-text tw:[overflow-wrap:anywhere]">{feedback.comment.trim()}</p>}
      <small className="tw:text-sm tw:text-cali-muted">Registrada em {closureDate(feedback.created_at)}</small>
    </div>
  </div>;
}
