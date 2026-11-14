import type { AdminProjectLifecycle } from '../../../api/projects/lifecycle';
import { formatProjectDate } from '../../../domain/projects';

const lifecycleTitles: Record<string, string> = {
  paused: 'Projeto pausado',
  suspended: 'Projeto suspenso',
  cancelled: 'Projeto cancelado',
};

export function ProjectLifecycleBanner({ context, onManage }: { context: AdminProjectLifecycle; onManage: () => void }) {
  const { project, holds } = context;
  const state = project.execution_status || 'normal';
  if (state === 'normal' && !holds.length) return null;

  const hold = holds.find((event) => event.scope_type === 'project') ?? holds[0];
  const title = lifecycleTitles[state] ?? (holds.length === 1 ? 'Interrupção parcial ativa' : `${holds.length} interrupções parciais ativas`);
  const reason = project.lifecycle_reason || hold?.reason || 'Há uma interrupção operacional registrada neste projeto.';
  const resume = project.lifecycle_resume_date || hold?.resume_date;
  const danger = state === 'suspended' || state === 'cancelled';

  return <section aria-label="Controle de execução" className={`tw:mb-[1.23rem] tw:flex tw:items-center tw:justify-between tw:gap-5 tw:rounded-xl tw:border tw:border-solid tw:px-5 tw:py-4 tw:max-sm:flex-col tw:max-sm:items-start ${danger ? 'tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]' : 'tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:text-[#7a5a2c]'}`}>
    <div className="tw:grid tw:gap-1">
      <span className="tw:text-[.6538rem] tw:font-black tw:tracking-[.11em] tw:uppercase">Controle de execução</span>
      <strong className="tw:text-base">{title}</strong>
      <p className="tw:m-0 tw:text-[.8462rem] tw:leading-[1.45]">{reason}{resume && ` · retomada prevista ${formatProjectDate(resume)}`}. O cronograma está congelado. Na retomada, o período efetivamente interrompido será contabilizado e a Previsão CALI será recalculada.</p>
    </div>
    <button type="button" onClick={onManage} className="tw:cursor-pointer tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#dec9c3] tw:bg-white tw:px-4 tw:py-2.5 tw:text-[.8462rem] tw:font-bold tw:text-cali-brand">Gerenciar</button>
  </section>;
}
