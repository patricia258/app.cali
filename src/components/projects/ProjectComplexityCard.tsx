import { complexityMeta, complexityRange, type MaterialComplexity } from '../../domain/projects';
import { ProjectComplexityBadge } from './ProjectComplexityBadge';

const cardColor: Partial<Record<string, string>> = {
  MC1: 'tw:border-[#b9dcc5] tw:border-l-[#356448] tw:bg-[#f1f8f3]',
  MC2: 'tw:border-[#efd58b] tw:border-l-[#d9a514] tw:bg-[#fff9e8]',
  MC3: 'tw:border-[#eebcbc] tw:border-l-[#b23b3b] tw:bg-[#fdf1f1]',
};

export function ProjectComplexityCard({ code }: { code: string }) {
  const metadata = complexityMeta[code as MaterialComplexity];
  return (
    <div
      className={`tw:mt-[.923rem] tw:flex tw:items-start tw:gap-[1.077rem] tw:rounded-[.769rem] tw:border tw:border-l-4 tw:border-solid tw:px-[1.231rem] tw:py-[1.077rem] ${cardColor[code] ?? 'tw:border-[#eadfd5] tw:bg-[#fbf7f4]'}`}
    >
      <ProjectComplexityBadge code={code} className="tw:flex-none" />
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[.308rem]">
        <strong className="tw:text-[1rem] tw:text-cali-ink">
          {metadata?.description ?? 'Complexidade definida pela CALI conforme volume de análise e dependências.'}
        </strong>
        {metadata && (
          <span className="tw:text-[.923rem]/[1.5] tw:text-[#5f5650]">
            Prazo estimado: {complexityRange(code as MaterialComplexity)}.
          </span>
        )}
      </div>
    </div>
  );
}
