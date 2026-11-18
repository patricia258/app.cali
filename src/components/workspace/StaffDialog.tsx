import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ds/Button';
import { DialogForm } from '../ds/DialogForm';
import { DialogFrame } from '../ds/DialogFrame';

function dialogClass(compact?: boolean, className?: string) {
  return `tw:max-h-[92dvh] tw:max-w-full tw:overflow-hidden tw:rounded-[.92rem] tw:bg-cali-paper tw:shadow-[0_1.5rem_4.2rem_rgb(var(--cali-rgb-burgundy-inverse)/0.251)] ${compact ? 'tw:w-[36.923rem]' : 'tw:w-[47.692rem]'} tw:flex tw:flex-col ${className ?? ''}`;
}

export function StaffDialog({ compact, className, ...props }: ComponentPropsWithoutRef<typeof DialogFrame> & { compact?: boolean }) {
  return <DialogFrame {...props} className={dialogClass(compact, className)} />;
}

export function StaffDialogForm({ compact, className, ...props }: ComponentPropsWithoutRef<typeof DialogForm> & { compact?: boolean }) {
  return <DialogForm {...props} className={dialogClass(compact, className)} />;
}

export function StaffDialogHeader({ children, onClose, disabled }: { children: ReactNode; onClose?: () => void; disabled?: boolean }) {
  return (
    <header className="tw:flex tw:shrink-0 tw:items-start tw:justify-between tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:px-7 tw:py-5 tw:[&_h2]:m-0 tw:[&_h2]:mt-1.5 tw:[&_h2]:text-cali-title-sm tw:[&_h2]:leading-[inherit] tw:[&_h2]:text-cali-text tw:[&_small]:text-xs tw:[&_small]:font-extrabold tw:[&_small]:tracking-[.092rem] tw:[&_small]:text-cali-warning">
      {children}
      {onClose && <Button variant="unstyled" type="button" aria-label="Fechar" data-dialog-close="" disabled={disabled} onClick={onClose} className="tw:grid tw:size-9 tw:flex-none tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:text-cali-text">
        <X size={16} aria-hidden="true" />
      </Button>}
    </header>
  );
}

export function StaffDialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`tw:flex tw:min-h-0 tw:flex-col tw:gap-5 tw:overflow-y-auto tw:px-7 tw:py-5 tw:[scrollbar-width:none] tw:[&>*]:shrink-0 tw:[&>fieldset]:m-0 tw:[&>fieldset]:flex tw:[&>fieldset]:min-w-0 tw:[&>fieldset]:flex-col tw:[&>fieldset]:gap-2.5 tw:[&>fieldset]:border-0 tw:[&>fieldset]:p-0 tw:[&_legend]:mb-2.5 tw:[&_legend]:p-0 tw:[&_legend]:text-sm tw:[&_legend]:font-bold tw:[&_legend]:text-cali-text tw:[&::-webkit-scrollbar]:hidden ${className ?? ''}`}>
      {children}
    </div>
  );
}

export function StaffDialogFields({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const grid = columns === 1 ? 'tw:grid-cols-1' : columns === 2 ? 'tw:grid-cols-2' : 'tw:grid-cols-3';
  return (
    <div className={`tw:grid tw:gap-4 tw:[@media(max-width:53.75rem)]:grid-cols-1 ${grid} tw:[&>label]:flex tw:[&>label]:min-w-0 tw:[&>label]:flex-col tw:[&>label]:gap-2 tw:[&>label]:text-sm tw:[&>label]:font-bold tw:[&>label]:text-cali-text tw:[&_:is(input,select,textarea)]:min-w-0 tw:[&_:is(input,select,textarea)]:rounded-lg tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid tw:[&_:is(input,select,textarea)]:border-cali-input-line tw:[&_:is(input,select,textarea)]:bg-cali-neutral-surface tw:[&_:is(input,textarea)]:px-4 tw:[&_:is(input,select,textarea)]:text-cali-body tw:[&_:is(input,select,textarea)]:font-normal tw:[&_:is(input,select,textarea)]:text-cali-text tw:[&_:is(input,select)]:h-12.5 tw:[&_select:not([data-ds-field])]:w-full tw:[&_textarea:not([data-ds-field])]:py-2.5 tw:[&_input:disabled:not([data-ds-field])]:bg-cali-day-canvas tw:[&_input:disabled:not([data-ds-field])]:text-cali-muted`}>
      {children}
    </div>
  );
}

export function StaffDialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={`tw:flex tw:shrink-0 tw:items-center tw:justify-end tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-7 tw:py-4 tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:h-11.5 tw:[&>:is(button,a)]:cursor-pointer tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:justify-center tw:[&>:is(button,a)]:rounded-lg tw:[&>:is(button,a)]:px-5 tw:[&>:is(button,a)]:text-cali-body tw:[&>:is(button,a)]:font-bold tw:[&>:is(button,a)]:gap-2
      tw:[&>.wf-secondary]:border tw:[&>.wf-secondary]:border-solid tw:[&>.wf-secondary]:border-cali-line-strong tw:[&>.wf-secondary]:bg-cali-neutral-surface tw:[&>.wf-secondary]:text-cali-brand
      tw:[&>.wf-primary]:border tw:[&>.wf-primary]:border-solid tw:[&>.wf-primary]:border-cali-brand tw:[&>.wf-primary]:bg-cali-brand tw:[&>.wf-primary]:text-cali-neutral-surface ${className ?? ''}`}>
      {children}
    </footer>
  );
}
