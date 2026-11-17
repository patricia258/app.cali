import { complexityMeta, complexityRange, type MaterialComplexity } from '../../domain/projects';
import { ProjectComplexityBadge } from './ProjectComplexityBadge';

const cardColor: Partial<Record<string, string>> = {
  MC1: 'tw:border-cali-green-soft tw:border-l-cali-success tw:bg-cali-success-surface',
  MC2: 'tw:border-cali-warning-line tw:border-l-cali-gold tw:bg-cali-gold-surface',
  MC3: 'tw:border-cali-danger-line tw:border-l-cali-danger tw:bg-cali-danger-surface',
};

export function ProjectComplexityCard({ code }: { code: string }) {
  const metadata = complexityMeta[code as MaterialComplexity];
  return (
    <div
      className={`tw:mt-3.5 tw:flex tw:items-start tw:gap-4.5 tw:rounded-xl tw:border tw:border-l-4 tw:border-solid tw:px-5 tw:py-4.5 ${cardColor[code] ?? 'tw:border-cali-line tw:bg-cali-surface-soft'}`}
    >
      <ProjectComplexityBadge code={code} className="tw:flex-none" />
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
        <strong className="tw:text-base tw:text-cali-ink">
          {metadata?.description ?? 'Complexidade definida pela CALI conforme volume de análise e dependências.'}
        </strong>
        {metadata && (
          <span className="tw:text-cali-body/[1.5] tw:text-cali-muted">
            Prazo estimado: {complexityRange(code as MaterialComplexity)}.
          </span>
        )}
      </div>
    </div>
  );
}
