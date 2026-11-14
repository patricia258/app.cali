import type { ComponentPropsWithoutRef } from 'react';
import { DialogFrame } from './DialogFrame';

export function CompactDialogOverlay({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`modal-backdrop full-screen-modal tw:fixed tw:inset-0 tw:z-110 tw:flex tw:items-center
    tw:justify-center tw:bg-[#241b2066] tw:p-[1.385rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]
    tw:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] ${className}`} />;
}

export function CompactDialog({ className = '', ...props }: ComponentPropsWithoutRef<typeof DialogFrame>) {
  return <DialogFrame {...props} className={`modal-card tw:relative tw:max-h-[calc(100vh-2.769rem)] tw:w-full tw:max-w-[52.308rem]
    tw:overflow-y-auto tw:overscroll-contain tw:rounded-[1rem] tw:bg-white tw:px-[1.923rem] tw:py-[1.692rem]
    tw:text-[0.923rem]/[inherit] tw:text-[#322f2c] tw:shadow-[0_1.923rem_5.385rem_#0003]
    tw:[&_h2]:mt-[0.462rem] tw:[&_h2]:mb-[0.615rem] tw:[&_h2]:text-[1.538rem]/[inherit] tw:[&_h2]:font-semibold
    tw:[&_h3]:mt-0 tw:[&_h3]:mb-[0.769rem] tw:[&_h3]:text-[1rem]/[inherit]
    tw:[&_p]:text-[0.846rem]/[1.6] tw:[&_p]:text-[#95877f] tw:[&_button:disabled]:opacity-40
    tw:[&_:is(input:not([type=checkbox],[type=radio],[type=range],[type=file]),select,textarea)]:w-full
    tw:[&_:is(input,select,textarea):disabled]:bg-[#faf7f4] tw:[&_:is(input,select,textarea):disabled]:text-[#948a84] ${className}`} />;
}

export function CompactDialogActions({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`modal-actions tw:flex tw:justify-end tw:gap-[0.769rem] tw:pt-[1.385rem]
    tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:gap-[0.538rem]
    tw:[&>:is(button,a)]:rounded-[0.538rem] tw:[&>:is(button,a)]:border tw:[&>:is(button,a)]:border-solid
    tw:[&>:is(button,a)]:border-[#ded0c7] tw:[&>:is(button,a)]:bg-white tw:[&>:is(button,a)]:px-[1.077rem] tw:[&>:is(button,a)]:py-[0.769rem]
    tw:[&>:is(button,a)]:text-[0.923rem]/normal tw:[&>:is(button,a)]:font-normal tw:[&>:is(button,a)]:text-cali-brand
    tw:[&>.primary]:border-cali-brand tw:[&>.primary]:bg-cali-brand tw:[&>.primary]:text-white ${className}`} />;
}
