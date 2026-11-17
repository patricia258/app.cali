import type { ReactNode } from 'react';

export function HoursField({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <label className={`tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:text-sm tw:leading-[inherit] tw:font-bold tw:text-cali-text tw:[&_em]:font-normal tw:[&_em]:text-cali-muted tw:[&_em]:not-italic tw:[&>small]:text-xs tw:[&>small]:font-normal tw:[&>small:not([role=alert])]:text-cali-muted tw:[&>:is(input,select,textarea)]:box-border tw:[&>:is(input,select,textarea)]:min-h-[3.23rem] tw:[&>:is(input,select,textarea)]:w-full tw:[&>:is(input,select,textarea)]:rounded-lg tw:[&>:is(input,select,textarea)]:border tw:[&>:is(input,select,textarea)]:border-solid tw:[&>:is(input,select,textarea)]:border-cali-input-line tw:[&>:is(input,select,textarea)]:bg-cali-neutral-surface tw:[&>:is(input,select,textarea)]:px-4 tw:[&>:is(input,select,textarea)]:py-3 tw:[&>:is(input,select,textarea)]:text-cali-body tw:[&>:is(input,select,textarea)]:font-normal tw:[&>textarea]:min-h-[5.85rem] tw:[&>textarea]:resize-y ${wide ? 'tw:col-span-full' : ''}`}>
      {children}
    </label>
  );
}
