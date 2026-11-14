import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';

export function RecordClosureClientActions({ experience }: { experience: RecordClosureExperience }) {
  if (experience.role !== 'client' || !experience.ctx) return null;
  return <>
    {experience.openClosure && !experience.clientFeedbackOpen && <button type="button" onClick={experience.openFeedback}>Avaliar atendimento</button>}
    {experience.reopenAvailable && <button type="button" className="tw:min-w-[13.0769rem] tw:flex-none tw:max-[721px]:w-full tw:max-[721px]:min-w-0" disabled={Boolean(experience.pendingReopen)} onClick={experience.openReopen}>
      {experience.pendingReopen ? 'Reabertura solicitada' : 'Solicitar reabertura'}
    </button>}
  </>;
}
