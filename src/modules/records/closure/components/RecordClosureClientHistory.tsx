import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';
import { closureDate, feedbackCopy } from '../feedbackCopy';

const tone = {
  good: { card: 'tw:border-[#cfe3d5] tw:border-l-[#356448] tw:bg-[#eef7f0]', score: 'tw:text-[#24523a]' },
  neutral: { card: 'tw:border-[#f2dfb8] tw:border-l-[#d9a514] tw:bg-[#fff8e6]', score: 'tw:text-[#8a5a12]' },
  low: { card: 'tw:border-[#f3d2b5] tw:border-l-[#d9772b] tw:bg-[#fff1e4]', score: 'tw:text-[#a04e12]' },
};

export function RecordClosureClientHistory({ experience }: { experience: RecordClosureExperience }) {
  const feedback = experience.ctx?.feedback;
  if (experience.role !== 'client' || !feedback) return null;
  const variant = tone[feedback.score >= 4 ? 'good' : feedback.score === 3 ? 'neutral' : 'low'];

  return <div className={`tw:my-[1.2308rem] tw:flex tw:items-center tw:gap-[1.3846rem] tw:overflow-hidden tw:rounded-[.9231rem] tw:border tw:border-l-4 tw:border-solid tw:px-[1.5385rem] tw:py-[1.2308rem] ${variant.card}`}>
    <div className="tw:flex tw:flex-none tw:items-center tw:gap-[.7692rem]">
      <span className="tw:text-[2.6154rem] tw:leading-none">{feedbackCopy(feedback.score).face}</span>
      <strong className={`tw:text-[2rem] tw:font-extrabold tw:tracking-[-.02em] ${variant.score}`}>{feedback.score}/5</strong>
    </div>
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.3077rem]">
      <span className="tw:text-[1rem] tw:font-bold tw:text-cali-ink">Sua avaliação deste atendimento</span>
      {feedback.comment?.trim() && <p className="tw:m-0 tw:text-[.9615rem] tw:leading-[1.5] tw:text-[#3d3531] tw:[overflow-wrap:anywhere]">{feedback.comment.trim()}</p>}
      <small className="tw:text-[.8462rem] tw:text-[#7d726b]">Registrada em {closureDate(feedback.created_at)}</small>
    </div>
  </div>;
}
