import type { ReactNode } from 'react';

type ReviewTone = 'late' | 'soon' | 'muted' | '';

export function DocumentCardFacts({ children }: { children: ReactNode }) {
  return <dl className="v2-doc-facts tw:m-0 tw:grid tw:grid-cols-2 tw:overflow-hidden tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb]">{children}</dl>;
}

export function DocumentCardFact({ label, children, note, tone = '' }: { label: string; children: ReactNode; note?: string; tone?: ReviewTone }) {
  const dateClass = tone === 'late' ? 'tw:text-[#b7495d]' : tone === 'muted' ? 'tw:font-normal tw:text-[#b3a59c]' : 'tw:text-[#322f2c]';
  const noteClass = tone === 'late' ? 'tw:text-[#b7495d]' : tone === 'soon' ? 'tw:text-[#97672f]' : 'tw:text-[#31805a]';

  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.231rem] tw:border-0 tw:border-r tw:border-b tw:border-solid tw:border-[#efe7df] tw:px-[0.846rem] tw:py-[0.615rem] tw:even:border-r-0 tw:[&:nth-last-child(-n+2)]:border-b-0">
    <dt className="tw:text-[0.654rem]/[inherit] tw:font-bold tw:tracking-[0.08em] tw:text-[#9a8c83] tw:uppercase">{label}</dt>
    <dd className={`tw:m-0 tw:flex tw:flex-col tw:gap-[0.154rem] tw:text-[0.846rem]/[inherit] tw:font-semibold tw:[overflow-wrap:anywhere] ${dateClass}`}>
      {children}
      {note && <small className={`tw:text-[0.731rem]/[inherit] tw:font-semibold ${noteClass}`}>{note}</small>}
    </dd>
  </div>;
}
