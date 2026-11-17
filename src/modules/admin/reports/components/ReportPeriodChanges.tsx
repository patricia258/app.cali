import type { periodChangeSignalsV17 } from '../../../../lib/reportEditorial';

export function ReportPeriodChanges({ changes }: { changes: ReturnType<typeof periodChangeSignalsV17> }) {
  return (
    <div
      className="reports-v16-change-grid tw:grid tw:grid-cols-4 tw:gap-3 tw:max-[1050px]:grid-cols-2 tw:[&_article]:rounded-[1.07692rem]
        tw:[&_article]:border tw:[&_article]:border-solid tw:[&_article]:border-cali-sand-line tw:[&_article]:bg-cali-neutral-surface
        tw:[&_article]:p-4.5 tw:[&_span]:block tw:[&_span]:text-cali-label tw:[&_span]:font-extrabold
        tw:[&_span]:tracking-[0.07em] tw:[&_span]:text-cali-neutral-accent tw:[&_span]:uppercase tw:[&_strong]:mt-1.5
        tw:[&_strong]:mb-2 tw:[&_strong]:block tw:[&_strong]:text-cali-title-lg tw:[&_strong]:font-medium
        tw:[&_strong]:text-cali-brand tw:[&_p]:m-0 tw:[&_p]:text-xs tw:[&_p]:leading-[1.45] tw:[&_p]:text-cali-neutral-accent
        tw:[&_.tone-positive]:border-cali-green-surface tw:[&_.tone-positive]:bg-cali-neutral-surface tw:[&_.tone-attention]:border-cali-gold-line
        tw:[&_.tone-attention]:bg-cali-gold-surface tw:workspace-night:[&_article]:border-cali-neutral-text tw:workspace-night:[&_article]:bg-cali-burgundy-strong
        tw:workspace-night:[&_span]:text-cali-sand-accent tw:workspace-night:[&_p]:text-cali-sand-accent tw:workspace-night:[&_strong]:text-cali-orange-line
        tw:workspace-night:[&_.tone-positive]:border-cali-green-strong tw:workspace-night:[&_.tone-positive]:bg-cali-green-inverse
        tw:workspace-night:[&_.tone-attention]:border-cali-gold-strong tw:workspace-night:[&_.tone-attention]:bg-cali-gold-inverse"
    >
      {changes.map((item) => (
        <article className={'tone-' + item.tone} key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}
