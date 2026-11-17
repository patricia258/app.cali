import { scheduleBanner } from './AdminScheduleReview';

export function ProjectDraftReadiness({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return <section className={scheduleBanner}>
    <div className="tw:grid tw:min-w-0 tw:gap-1">
      <span className="tw:text-cali-label tw:font-black tw:tracking-[.1em] tw:text-cali-red-strong">RASCUNHO</span>
      <strong className="tw:text-base tw:text-cali-text">Finalize o cronograma antes de enviar</strong>
      <p className="tw:m-0 tw:mt-1 tw:text-sm tw:leading-[1.45] tw:text-cali-muted">{issues.join(' ')}</p>
    </div>
  </section>;
}
