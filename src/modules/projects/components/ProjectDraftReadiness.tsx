import { scheduleBanner } from './AdminScheduleReview';

export function ProjectDraftReadiness({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return <section className={scheduleBanner}>
    <div className="tw:grid tw:min-w-0 tw:gap-[.2308rem]">
      <span className="tw:text-[.6923rem] tw:font-black tw:tracking-[.1em] tw:text-[#7e4d5a]">RASCUNHO</span>
      <strong className="tw:text-[1rem] tw:text-cali-text">Finalize o cronograma antes de enviar</strong>
      <p className="tw:m-0 tw:mt-[.2308rem] tw:text-[.8462rem] tw:leading-[1.45] tw:text-cali-muted">{issues.join(' ')}</p>
    </div>
  </section>;
}
