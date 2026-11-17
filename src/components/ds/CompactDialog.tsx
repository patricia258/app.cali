import type { ComponentPropsWithoutRef } from 'react';
import { DialogFrame } from './DialogFrame';

export function CompactDialogOverlay({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`modal-backdrop full-screen-modal tw:fixed tw:inset-0 tw:z-110 tw:flex tw:items-center
    tw:justify-center tw:bg-cali-overlay/40 tw:p-5.5 tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]
    tw:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] ${className}`} />;
}

export function CompactDialog({ className = '', ...props }: ComponentPropsWithoutRef<typeof DialogFrame>) {
  return <DialogFrame {...props} className={`modal-card tw:relative tw:max-h-[calc(100vh-2.769rem)] tw:w-full tw:max-w-[52.308rem]
    tw:overflow-y-auto tw:overscroll-contain tw:rounded-2xl tw:bg-cali-neutral-surface tw:px-7.5 tw:py-7
    tw:text-cali-body/[inherit] tw:text-cali-text tw:shadow-cali-dialog
    tw:[&_h2]:mt-2 tw:[&_h2]:mb-2.5 tw:[&_h2]:text-2xl/[inherit] tw:[&_h2]:font-semibold
    tw:[&_h3]:mt-0 tw:[&_h3]:mb-3 tw:[&_h3]:text-base/[inherit]
    tw:[&_p]:text-sm/[1.6] tw:[&_p]:text-cali-muted tw:[&_button:disabled]:opacity-40
    tw:[&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:w-full
    tw:[&_:is(input,select,textarea):disabled]:bg-cali-surface-soft tw:[&_:is(input,select,textarea):disabled]:text-cali-muted ${className}`} />;
}

export function CompactDialogActions({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`modal-actions tw:flex tw:justify-end tw:gap-3 tw:pt-5.5
    tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:gap-2
    tw:[&>:is(button,a)]:rounded-lg tw:[&>:is(button,a)]:border tw:[&>:is(button,a)]:border-solid
    tw:[&>:is(button,a)]:border-cali-line-strong tw:[&>:is(button,a)]:bg-cali-neutral-surface tw:[&>:is(button,a)]:px-4.5 tw:[&>:is(button,a)]:py-3
    tw:[&>:is(button,a)]:text-cali-body/normal tw:[&>:is(button,a)]:font-normal tw:[&>:is(button,a)]:text-cali-brand
    tw:[&>.primary]:border-cali-brand tw:[&>.primary]:bg-cali-brand tw:[&>.primary]:text-cali-neutral-surface ${className}`} />;
}
