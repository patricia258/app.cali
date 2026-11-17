import type { ComponentPropsWithoutRef } from 'react';
import { DialogFrame } from './DialogFrame';
import { DialogForm } from './DialogForm';

type DivProps = ComponentPropsWithoutRef<'div'>;

export function WorkflowDialogOverlay({ className = '', ...props }: DivProps) {
  return <div {...props} className={`wf-overlay tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center
    tw:bg-cali-overlay/50 tw:p-5.5 tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]
    tw:motion-safe:[&>*:not(.wf-record-drawer)]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]
    ${className}`} />;
}

function panelClass(create: boolean | undefined, className = '') {
  return `wf-modal tw:max-h-[calc(100vh-2.769rem)] tw:overflow-y-auto tw:rounded-2xl tw:bg-cali-neutral-surface
    tw:p-7.5 tw:shadow-cali-dialog
    tw:[&_h2]:mt-0 tw:[&_h2]:mb-3 tw:[&_h2]:text-cali-title/[inherit]
    tw:[&_h2]:font-bold tw:[&_h2]:tracking-[-0.046rem]
    tw:[&_p]:mt-4 tw:[&_p]:mb-5.5 tw:[&_p]:text-sm/[1.65] tw:[&_p]:text-cali-muted
    ${create ? 'wf-create tw:w-[min(45.385rem,100%)]' : 'tw:w-[min(43.077rem,100%)]'}
    ${className}`;
}

export function WorkflowDialog({ create, className, ...props }: ComponentPropsWithoutRef<typeof DialogFrame> & { create?: boolean }) {
  return <DialogFrame {...props} className={panelClass(create, className)} />;
}

export function WorkflowDialogForm({ create, className, ...props }: ComponentPropsWithoutRef<typeof DialogForm> & { create?: boolean }) {
  return <DialogForm {...props} className={panelClass(create, className)} />;
}

export function WorkflowDialogHeader({ className = '', ...props }: DivProps) {
  return <div {...props} className={`wf-modal-header tw:mb-6 tw:flex tw:items-center tw:justify-between
    tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:pb-5
    tw:text-cali-label/[inherit] tw:font-bold tw:tracking-widest tw:text-cali-muted
    tw:[&>button]:grid tw:[&>button]:size-9 tw:[&>button]:place-items-center tw:[&>button]:rounded-lg
    tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:border-cali-line
    tw:[&>button]:bg-cali-surface-soft tw:[&>button]:text-cali-muted ${className}`} />;
}

export function WorkflowDialogActions({ className = '', ...props }: DivProps) {
  return <div {...props} className={`wf-modal-actions tw:mt-6 tw:flex tw:items-center tw:justify-end tw:gap-3
    tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:pt-5
    tw:[&>button:first-child]:rounded-lg tw:[&>button:first-child]:border tw:[&>button:first-child]:border-solid
    tw:[&>button:first-child]:border-cali-line tw:[&>button:first-child]:bg-cali-neutral-surface tw:[&>button:first-child]:px-4.5
    tw:[&>button:first-child]:py-3 tw:[&>button:first-child]:text-sm/[inherit]
    tw:[&>button:first-child]:text-cali-muted tw:[&>.wf-outline]:px-4 ${className}`} />;
}
