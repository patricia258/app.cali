import { complexityMeta, type MaterialComplexity } from '../../domain/projects';

const complexityColor: Partial<Record<string, string>> = {
  MC1: 'tw:border-[#b9dcc5] tw:bg-[#e3f1e7] tw:text-[#24583a]',
  MC2: 'tw:border-[#efd58b] tw:bg-[#fdf0cc] tw:text-[#7a5606]',
  MC3: 'tw:border-[#eebcbc] tw:bg-[#fbe1e1] tw:text-[#8f2a2a]',
};

type ProjectComplexityBadgeProps = {
  code: string;
  explain?: boolean;
  className?: string;
};

export function ProjectComplexityBadge({ code, explain = false, className = '' }: ProjectComplexityBadgeProps) {
  const category = code.toUpperCase();
  const description = explain ? complexityMeta[category as MaterialComplexity]?.description : undefined;
  return (
    <b
      className={`tw:relative tw:inline-flex tw:h-[2rem] tw:min-w-[3.385rem] tw:items-center tw:justify-center tw:rounded-[.538rem] tw:border tw:border-solid tw:px-[.692rem] tw:text-[.846rem] tw:font-extrabold ${complexityColor[category] ?? 'tw:border-transparent'} ${description ? 'tw:cursor-help tw:after:pointer-events-none tw:after:absolute tw:after:top-[calc(100%+.538rem)] tw:after:left-0 tw:after:z-60 tw:after:hidden tw:after:w-max tw:after:max-w-[min(21.54rem,66vw)] tw:after:rounded-[.692rem] tw:after:border tw:after:border-solid tw:after:border-[#e6d9ce] tw:after:bg-white tw:after:px-[.923rem] tw:after:py-[.692rem] tw:after:text-left tw:after:text-[.885rem]/[1.45] tw:after:font-medium tw:after:whitespace-normal tw:after:text-cali-ink tw:after:shadow-[0_.77rem_2rem_#2b181e29] tw:after:content-[attr(data-tip)] tw:hover:after:block' : ''} ${className}`}
      aria-label={description ? `${code}: ${description}` : undefined}
      data-tip={description}
    >
      {code}
    </b>
  );
}
