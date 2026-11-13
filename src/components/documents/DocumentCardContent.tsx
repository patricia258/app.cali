import type { ReactNode } from 'react';

export function DocumentCardContent({ title, children }: { title: string; children: ReactNode }) {
  return <div className="wf-doc-content tw:flex tw:flex-col tw:gap-[0.846rem] tw:px-[1.231rem] tw:pt-[1.077rem] tw:pb-[1.231rem]">
    <h2 className="tw:m-0! tw:line-clamp-2 tw:min-h-0! tw:min-w-0 tw:[overflow-wrap:anywhere] tw:text-[1.077rem]/[1.3]" title={title}>{title}</h2>
    {children}
  </div>;
}

export function DocumentCardProtocol({ value, children, folder }: { value?: string | null; children?: ReactNode; folder?: boolean }) {
  return <div className={`v2-doc-foot tw:flex tw:justify-between ${folder ? 'tw:flex-col tw:items-start tw:gap-[0.308rem]' : 'tw:items-center tw:gap-[0.769rem]'}`}>
    <strong className={`wf-doc-protocol tw:m-0! tw:border-0! tw:p-0! tw:text-[0.769rem]/[inherit] ${folder ? 'tw:max-w-full tw:overflow-visible tw:whitespace-normal' : 'tw:truncate'}`}>{value || 'Sem protocolo'}</strong>
    {children}
  </div>;
}

export function DocumentCardActions({ children }: { children: ReactNode }) {
  return <div className="wf-doc-actions tw:mt-0! tw:[&>button]:inline-flex tw:[&>button]:cursor-pointer tw:[&>button]:items-center tw:[&>button]:justify-center tw:[&>button]:gap-[0.462rem] tw:[&>button]:leading-[1.2] tw:[&>button:disabled]:cursor-not-allowed tw:[&>button:disabled]:opacity-45">{children}</div>;
}
