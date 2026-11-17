import type { ReactNode } from 'react';

type ReviewTone = 'late' | 'soon' | 'muted' | '';

export function DocumentCardFacts({ children }: { children: ReactNode }) {
  return <dl className="v2-doc-facts tw:m-0 tw:grid tw:grid-cols-2 tw:overflow-hidden tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper">{children}</dl>;
}

export function DocumentCardFact({ label, children, note, tone = '' }: { label: string; children: ReactNode; note?: string; tone?: ReviewTone }) {
  const dateClass = tone === 'late' ? 'tw:text-cali-danger' : tone === 'muted' ? 'tw:font-normal tw:text-cali-sand-accent' : 'tw:text-cali-text';
  const noteClass = tone === 'late' ? 'tw:text-cali-danger' : tone === 'soon' ? 'tw:text-cali-warning' : 'tw:text-cali-success';

  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:border-0 tw:border-r tw:border-b tw:border-solid tw:border-cali-line tw:px-3.5 tw:py-2.5 tw:even:border-r-0 tw:[&:nth-last-child(-n+2)]:border-b-0">
    <dt className="tw:text-cali-micro/[inherit] tw:font-bold tw:tracking-[0.08em] tw:text-cali-muted tw:uppercase">{label}</dt>
    <dd className={`tw:m-0 tw:flex tw:flex-col tw:gap-0.5 tw:text-sm/[inherit] tw:font-semibold tw:[overflow-wrap:anywhere] ${dateClass}`}>
      {children}
      {note && <small className={`tw:text-xs/[inherit] tw:font-semibold ${noteClass}`}>{note}</small>}
    </dd>
  </div>;
}
