import { complexityMeta, type MaterialComplexity } from '../../domain/projects';

const complexityColor: Partial<Record<string, string>> = {
  MC1: 'tw:border-cali-green-soft tw:bg-cali-green-surface tw:text-cali-green-text',
  MC2: 'tw:border-cali-warning-line tw:bg-cali-gold-soft tw:text-cali-gold-text',
  MC3: 'tw:border-cali-danger-line tw:bg-cali-burgundy-surface tw:text-cali-red-text',
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
      className={`tw:relative tw:inline-flex tw:h-8 tw:min-w-[3.385rem] tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:text-sm tw:font-extrabold ${complexityColor[category] ?? 'tw:border-transparent'} ${description ? 'tw:cursor-help tw:after:pointer-events-none tw:after:absolute tw:after:top-[calc(100%+.538rem)] tw:after:left-0 tw:after:z-60 tw:after:hidden tw:after:w-max tw:after:max-w-[min(21.54rem,66vw)] tw:after:rounded-cali-panel tw:after:border tw:after:border-solid tw:after:border-cali-line tw:after:bg-cali-neutral-surface tw:after:px-3.5 tw:after:py-3 tw:after:text-left tw:after:text-sm/[1.45] tw:after:font-medium tw:after:whitespace-normal tw:after:text-cali-ink tw:after:shadow-[0_.77rem_2rem_rgb(var(--cali-rgb-red-inverse)/0.1608)] tw:after:content-[attr(data-tip)] tw:hover:after:block' : ''} ${className}`}
      aria-label={description ? `${code}: ${description}` : undefined}
      data-tip={description}
    >
      {code}
    </b>
  );
}
