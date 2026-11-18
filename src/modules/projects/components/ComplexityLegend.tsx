import { ProjectComplexityBadge } from '../../../components/projects/ProjectComplexityBadge';
import { complexityMeta, complexityRange, type MaterialComplexity } from '../../../domain/projects';

const complexities = Object.keys(complexityMeta) as MaterialComplexity[];

export function ComplexityLegend({ current }: { current: string }) {
  return (
    <ul
      className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4.5 tw:py-3.5"
      aria-label="O que significa cada complexidade"
    >
      {complexities.map((code) => (
        <li
          key={code}
          className={`tw:grid tw:grid-cols-[4rem_minmax(0,1fr)] tw:items-center tw:gap-3 tw:text-sm ${code === current ? 'tw:font-semibold tw:text-cali-ink' : 'tw:text-cali-muted tw:opacity-75'}`}
        >
          <ProjectComplexityBadge code={code} />
          <span className="tw:flex tw:flex-col tw:gap-0.5">
            <strong className="tw:text-sm tw:text-cali-ink">
              {complexityMeta[code].label.split(' · ')[1]} · {complexityRange(code)}
            </strong>
            {complexityMeta[code].description}
          </span>
        </li>
      ))}
      <li className="tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:pt-2.5 tw:text-sm tw:text-cali-muted">
        MC é a complexidade do entregável. M1, M2, M3… são os meses do roadmap. A faixa é referência de
        planejamento, não prazo contratual.
      </li>
    </ul>
  );
}
