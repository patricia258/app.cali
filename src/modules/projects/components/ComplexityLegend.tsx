import { ProjectComplexityBadge } from '../../../components/projects/ProjectComplexityBadge';
import { complexityMeta, complexityRange, type MaterialComplexity } from '../../../domain/projects';

const complexities = Object.keys(complexityMeta) as MaterialComplexity[];

export function ComplexityLegend({ current }: { current: string }) {
  return (
    <ul
      className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-[.615rem] tw:rounded-[.769rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white tw:px-[1.077rem] tw:py-[.923rem]"
      aria-label="O que significa cada complexidade"
    >
      {complexities.map((code) => (
        <li
          key={code}
          className={`tw:grid tw:grid-cols-[4rem_minmax(0,1fr)] tw:items-center tw:gap-[.769rem] tw:text-[.885rem] ${code === current ? 'tw:font-semibold tw:text-cali-ink' : 'tw:text-[#8a7c74] tw:opacity-75'}`}
        >
          <ProjectComplexityBadge code={code} />
          <span className="tw:flex tw:flex-col tw:gap-[.154rem]">
            <strong className="tw:text-[.885rem] tw:text-cali-ink">
              {complexityMeta[code].label.split(' · ')[1]} · {complexityRange(code)}
            </strong>
            {complexityMeta[code].description}
          </span>
        </li>
      ))}
      <li className="tw:border-0 tw:border-t tw:border-solid tw:border-[#f0e8e1] tw:pt-[.615rem] tw:text-[.846rem] tw:text-[#8a7c74]">
        MC é a complexidade do entregável. M1, M2, M3… são os meses do roadmap. A faixa é referência de
        planejamento, não prazo contratual.
      </li>
    </ul>
  );
}
