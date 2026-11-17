import type { ReactNode } from 'react';

export function DocumentCardContent({ title, children }: { title: string; children: ReactNode }) {
  return <div className="tw:flex tw:flex-col tw:gap-3.5 tw:px-5 tw:pt-4.5 tw:pb-5">
    <h2 className="tw:m-0! tw:line-clamp-2 tw:min-h-0! tw:min-w-0 tw:[overflow-wrap:anywhere] tw:text-lg/[1.3]" title={title}>{title}</h2>
    {children}
  </div>;
}

export function DocumentCardProtocol({ value, children, folder }: { value?: string | null; children?: ReactNode; folder?: boolean }) {
  return <div className={`tw:flex tw:justify-between ${folder ? 'tw:flex-col tw:items-start tw:gap-1' : 'tw:items-center tw:gap-3'}`}>
    <strong className={`tw:m-0 tw:block tw:text-xs/[inherit] tw:text-cali-brand ${folder ? 'tw:max-w-full tw:overflow-visible tw:whitespace-normal' : 'tw:truncate'}`}>{value || 'Sem protocolo'}</strong>
    {children}
  </div>;
}

export function DocumentCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="tw:m-0 tw:flex tw:flex-wrap tw:gap-3
      tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:flex-[1_1_calc(50%-0.385rem)]
      tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:justify-center tw:[&>:is(button,a)]:gap-2
      tw:[&>:is(button,a)]:rounded-lg tw:[&>:is(button,a)]:border tw:[&>:is(button,a)]:border-solid tw:[&>:is(button,a)]:border-cali-sand-accent
      tw:[&>:is(button,a)]:bg-cali-neutral-surface tw:[&>:is(button,a)]:p-3 tw:[&>:is(button,a)]:text-sm/[1.2] tw:[&>:is(button,a)]:font-bold
      tw:[&>:is(button,a)]:whitespace-nowrap tw:[&>:is(button,a)]:text-cali-brand
      tw:[&>:is(button,a):nth-child(n+3)]:basis-full tw:[&>button]:cursor-pointer
      tw:[&>button:disabled]:cursor-not-allowed tw:[&>button:disabled]:opacity-45">
      {children}
    </div>
  );
}
