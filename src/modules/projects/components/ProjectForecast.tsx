import type { WorkspaceProject } from '../../../domain/projects';
import { formatProjectDate } from '../../../domain/projects';

export function ProjectForecast({ project }: { project: WorkspaceProject }) {
  const label = 'tw:text-cali-label tw:font-bold tw:tracking-[.08em] tw:text-cali-sand-accent tw:uppercase tw:opacity-[.74]';
  const value = 'tw:text-lg tw:text-cali-neutral-surface';
  const item = 'tw:flex tw:min-w-[9.8462rem] tw:flex-col tw:gap-1';

  return <div className="tw:mt-4.5 tw:flex tw:flex-wrap tw:items-start tw:gap-8 tw:border-0 tw:border-t tw:border-solid tw:border-cali-neutral-surface/[.17] tw:pt-3.5">
    <div className={item}><span className={label}>Meta desejada</span><strong className={value}>{project.endDate ? formatProjectDate(project.endDate) : 'Sem meta fixa'}</strong></div>
    <div className={item}><span className={label}>Previsão CALI</span><strong className={value}>{project.forecastEndDate ? formatProjectDate(project.forecastEndDate) : 'Em construção'}</strong></div>
    {!project.deliverables.some((entry) => entry.status !== 'cancelled') &&
      <p className="tw:m-0 tw:flex-[1_1_20rem] tw:text-cali-detail tw:leading-[1.45] tw:text-cali-neutral-surface/[.77]">A previsão aparece conforme os entregáveis e suas complexidades forem inseridos.</p>}
  </div>;
}
