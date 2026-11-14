import type { ComponentPropsWithoutRef } from 'react';
import { DialogFrame } from './DialogFrame';
import { DialogForm } from './DialogForm';

type DivProps = ComponentPropsWithoutRef<'div'>;

export function WorkflowDialogOverlay({ className = '', ...props }: DivProps) {
  return <div {...props} className={`wf-overlay tw:fixed tw:inset-0 tw:z-100 tw:flex tw:items-center tw:justify-center
    tw:bg-[#1c151b80] tw:p-[1.385rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]
    tw:motion-safe:[&>*:not(.wf-record-drawer)]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]
    ${className}`} />;
}

function panelClass(create: boolean | undefined, className = '') {
  return `wf-modal tw:max-h-[calc(100vh-2.769rem)] tw:overflow-y-auto tw:rounded-[1rem] tw:bg-white
    tw:p-[1.923rem] tw:shadow-[0_1.154rem_4.615rem_#22172232]
    tw:[&_h2]:mt-0 tw:[&_h2]:mb-[0.769rem] tw:[&_h2]:text-[1.615rem]/[inherit]
    tw:[&_h2]:font-bold tw:[&_h2]:tracking-[-0.046rem]
    tw:[&_p]:mt-4 tw:[&_p]:mb-[1.385rem] tw:[&_p]:text-[0.846rem]/[1.65] tw:[&_p]:text-[#82786f]
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
  return <div {...props} className={`wf-modal-header tw:mb-[1.462rem] tw:flex tw:items-center tw:justify-between
    tw:border-0 tw:border-b tw:border-solid tw:border-[#eee8e2] tw:pb-[1.231rem]
    tw:text-[0.692rem]/[inherit] tw:font-bold tw:tracking-widest tw:text-[#a38571]
    tw:[&>button]:grid tw:[&>button]:size-[2.308rem] tw:[&>button]:place-items-center tw:[&>button]:rounded-[0.538rem]
    tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:border-[#ece4dd]
    tw:[&>button]:bg-[#faf6f3] tw:[&>button]:text-[#6b4d4a] ${className}`} />;
}

export function WorkflowDialogActions({ className = '', ...props }: DivProps) {
  return <div {...props} className={`wf-modal-actions tw:mt-[1.538rem] tw:flex tw:items-center tw:justify-end tw:gap-[0.692rem]
    tw:border-0 tw:border-t tw:border-solid tw:border-[#eee8e2] tw:pt-[1.231rem]
    tw:[&>button:first-child]:rounded-[0.538rem] tw:[&>button:first-child]:border tw:[&>button:first-child]:border-solid
    tw:[&>button:first-child]:border-[#e9ddd5] tw:[&>button:first-child]:bg-white tw:[&>button:first-child]:px-[1.077rem]
    tw:[&>button:first-child]:py-[0.769rem] tw:[&>button:first-child]:text-[0.846rem]/[inherit]
    tw:[&>button:first-child]:text-[#77685f] tw:[&>.wf-outline]:px-4 ${className}`} />;
}
