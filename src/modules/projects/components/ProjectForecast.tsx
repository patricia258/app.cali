import type { WorkspaceProject } from '../../../domain/projects';
import { formatProjectDate } from '../../../domain/projects';

export function ProjectForecast({ project }: { project: WorkspaceProject }) {
  const label = 'tw:text-[.6923rem] tw:font-bold tw:tracking-[.08em] tw:text-[#e9cbb9] tw:uppercase tw:opacity-[.74]';
  const value = 'tw:text-[1.0769rem] tw:text-white';
  const item = 'tw:flex tw:min-w-[9.8462rem] tw:flex-col tw:gap-[.2308rem]';

  return <div className="tw:mt-[1.0769rem] tw:flex tw:flex-wrap tw:items-start tw:gap-[2rem] tw:border-0 tw:border-t tw:border-solid tw:border-white/[.17] tw:pt-[.9231rem]">
    <div className={item}><span className={label}>Meta desejada</span><strong className={value}>{project.endDate ? formatProjectDate(project.endDate) : 'Sem meta fixa'}</strong></div>
    <div className={item}><span className={label}>Previsão CALI</span><strong className={value}>{project.forecastEndDate ? formatProjectDate(project.forecastEndDate) : 'Em construção'}</strong></div>
    {!project.deliverables.some((entry) => entry.status !== 'cancelled') &&
      <p className="tw:m-0 tw:flex-[1_1_20rem] tw:text-[.8077rem] tw:leading-[1.45] tw:text-white/[.77]">A previsão aparece conforme os entregáveis e suas complexidades forem inseridos.</p>}
  </div>;
}
