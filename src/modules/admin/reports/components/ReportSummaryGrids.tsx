import type { ReactNode } from 'react';

export function ReportIdentification({ children }: { children: ReactNode }) {
  return (
    <dl className="reports-v16-identification tw:m-0 tw:grid tw:grid-cols-4 tw:border-y tw:border-solid tw:border-cali-line
      tw:max-[680px]:grid-cols-2 tw:workspace-night:border-cali-line-strong tw:[&>div]:min-w-0 tw:[&>div]:border-0 tw:[&>div:not(:last-child)]:border-r
      tw:[&>div]:border-solid tw:[&>div]:border-cali-line tw:[&>div]:px-4 tw:[&>div]:py-3 tw:[&_dt]:mb-1.5
      tw:[&_dt]:text-cali-label tw:[&_dt]:font-extrabold tw:[&_dt]:tracking-[0.1em] tw:[&_dt]:text-cali-sand-text
      tw:[&_dt]:uppercase tw:[&_dd]:m-0 tw:[&_dd]:text-lg tw:[&_dd]:wrap-break-word
      tw:[&_dd]:leading-[1.35] tw:[&_dd]:font-bold tw:[&_dd]:text-cali-text tw:workspace-night:[&>div]:border-cali-line-strong
      tw:workspace-night:[&_dt]:text-cali-muted tw:workspace-night:[&_dd]:text-cali-text">
      {children}
    </dl>
  );
}

export function ReportFacts({ children }: { children: ReactNode }) {
  return (
    <div className="reports-v16-fact-grid tw:grid tw:grid-cols-5 tw:border-y tw:border-solid tw:border-cali-line tw:max-[1050px]:grid-cols-3
      tw:max-[680px]:grid-cols-2 tw:workspace-night:border-cali-line-strong tw:[&>article]:min-w-0 tw:[&>article]:border-0 tw:[&>article:not(:last-child)]:border-r
      tw:[&>article]:border-solid tw:[&>article]:border-cali-line tw:[&>article]:px-4 tw:[&>article]:py-4
      tw:[&_small]:block tw:[&_small]:text-cali-micro tw:[&_small]:font-extrabold tw:[&_small]:tracking-[0.09em]
      tw:[&_small]:text-cali-sand-text tw:[&_small]:uppercase tw:[&_strong]:mt-1.5 tw:[&_strong]:block
      tw:[&_strong]:text-cali-title-lg! tw:[&_strong]:font-semibold! tw:[&_strong]:text-cali-brand! tw:workspace-night:[&>article]:border-cali-line-strong
      tw:workspace-night:[&_small]:text-cali-muted">
      {children}
    </div>
  );
}
