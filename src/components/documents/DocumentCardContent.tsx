import type { ReactNode } from 'react';

export function DocumentCardContent({ title, children }: { title: string; children: ReactNode }) {
  return <div className="tw:flex tw:flex-col tw:gap-[0.846rem] tw:px-[1.231rem] tw:pt-[1.077rem] tw:pb-[1.231rem]">
    <h2 className="tw:m-0! tw:line-clamp-2 tw:min-h-0! tw:min-w-0 tw:[overflow-wrap:anywhere] tw:text-[1.077rem]/[1.3]" title={title}>{title}</h2>
    {children}
  </div>;
}

export function DocumentCardProtocol({ value, children, folder }: { value?: string | null; children?: ReactNode; folder?: boolean }) {
  return <div className={`tw:flex tw:justify-between ${folder ? 'tw:flex-col tw:items-start tw:gap-[0.308rem]' : 'tw:items-center tw:gap-[0.769rem]'}`}>
    <strong className={`tw:m-0 tw:block tw:text-[0.769rem]/[inherit] tw:text-cali-brand ${folder ? 'tw:max-w-full tw:overflow-visible tw:whitespace-normal' : 'tw:truncate'}`}>{value || 'Sem protocolo'}</strong>
    {children}
  </div>;
}

export function DocumentCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="tw:m-0 tw:flex tw:flex-wrap tw:gap-[0.769rem]
      tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:flex-[1_1_calc(50%-0.385rem)]
      tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:justify-center tw:[&>:is(button,a)]:gap-[0.462rem]
      tw:[&>:is(button,a)]:rounded-[.538rem] tw:[&>:is(button,a)]:border tw:[&>:is(button,a)]:border-solid tw:[&>:is(button,a)]:border-[#d6b9ae]
      tw:[&>:is(button,a)]:bg-white tw:[&>:is(button,a)]:p-[.769rem] tw:[&>:is(button,a)]:text-[.846rem]/[1.2] tw:[&>:is(button,a)]:font-bold
      tw:[&>:is(button,a)]:whitespace-nowrap tw:[&>:is(button,a)]:text-cali-brand
      tw:[&>:is(button,a):nth-child(n+3)]:basis-full tw:[&>button]:cursor-pointer
      tw:[&>button:disabled]:cursor-not-allowed tw:[&>button:disabled]:opacity-45">
      {children}
    </div>
  );
}
