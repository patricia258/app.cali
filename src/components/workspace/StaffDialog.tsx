import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ds/Button';
import { DialogForm } from '../ds/DialogForm';
import { DialogFrame } from '../ds/DialogFrame';

function dialogClass(compact?: boolean, className?: string) {
  return `tw:max-h-[92dvh] tw:max-w-full tw:overflow-hidden tw:rounded-[.92rem] tw:bg-[#fffdfb] tw:shadow-[0_1.5rem_4.2rem_#24182140] ${compact ? 'tw:w-[36.923rem]' : 'tw:w-[47.692rem]'} tw:flex tw:flex-col ${className ?? ''}`;
}

export function StaffDialog({ compact, className, ...props }: ComponentPropsWithoutRef<typeof DialogFrame> & { compact?: boolean }) {
  return <DialogFrame {...props} className={dialogClass(compact, className)} />;
}

export function StaffDialogForm({ compact, className, ...props }: ComponentPropsWithoutRef<typeof DialogForm> & { compact?: boolean }) {
  return <DialogForm {...props} className={dialogClass(compact, className)} />;
}

export function StaffDialogHeader({ children, onClose, disabled }: { children: ReactNode; onClose?: () => void; disabled?: boolean }) {
  return (
    <header className="tw:flex tw:shrink-0 tw:items-start tw:justify-between tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-[#eee2db] tw:px-7 tw:py-5 tw:[&_h2]:m-0 tw:[&_h2]:mt-1.5 tw:[&_h2]:text-[1.385rem] tw:[&_h2]:leading-[inherit] tw:[&_h2]:text-[#322f2c] tw:[&_small]:text-[.77rem] tw:[&_small]:font-extrabold tw:[&_small]:tracking-[.092rem] tw:[&_small]:text-[#af8f72]">
      {children}
      {onClose && <Button variant="unstyled" type="button" aria-label="Fechar" data-dialog-close="" disabled={disabled} onClick={onClose} className="tw:grid tw:size-[2.31rem] tw:flex-none tw:cursor-pointer tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-[#ecded5] tw:bg-white tw:text-[#322f2c]">
        <X size={16} aria-hidden="true" />
      </Button>}
    </header>
  );
}

export function StaffDialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`tw:flex tw:min-h-0 tw:flex-col tw:gap-5 tw:overflow-y-auto tw:px-7 tw:py-5 tw:[scrollbar-width:none] tw:[&>*]:shrink-0 tw:[&>fieldset]:m-0 tw:[&>fieldset]:flex tw:[&>fieldset]:min-w-0 tw:[&>fieldset]:flex-col tw:[&>fieldset]:gap-2.5 tw:[&>fieldset]:border-0 tw:[&>fieldset]:p-0 tw:[&_legend]:mb-2.5 tw:[&_legend]:p-0 tw:[&_legend]:text-[.846rem] tw:[&_legend]:font-bold tw:[&_legend]:text-[#322f2c] tw:[&::-webkit-scrollbar]:hidden ${className ?? ''}`}>
      {children}
    </div>
  );
}

export function StaffDialogFields({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const grid = columns === 1 ? 'tw:grid-cols-1' : columns === 2 ? 'tw:grid-cols-2' : 'tw:grid-cols-3';
  return (
    <div className={`tw:grid tw:gap-4 tw:[@media(max-width:53.75rem)]:grid-cols-1 ${grid} tw:[&>label]:flex tw:[&>label]:min-w-0 tw:[&>label]:flex-col tw:[&>label]:gap-2 tw:[&>label]:text-[.846rem] tw:[&>label]:font-bold tw:[&>label]:text-[#322f2c] tw:[&_:is(input,select,textarea)]:min-w-0 tw:[&_:is(input,select,textarea)]:rounded-lg tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid tw:[&_:is(input,select,textarea)]:border-[#e5d8d0] tw:[&_:is(input,select,textarea)]:bg-white tw:[&_:is(input,select,textarea)]:px-4 tw:[&_:is(input,select,textarea)]:text-[.923rem] tw:[&_:is(input,select,textarea)]:font-normal tw:[&_:is(input,select,textarea)]:text-[#322f2c] tw:[&_:is(input,select)]:h-[3.077rem] tw:[&_select]:w-full tw:[&_textarea]:py-2.5 tw:[&_input:disabled]:bg-[#f7f3ee] tw:[&_input:disabled]:text-[#8c7e74]`}>
      {children}
    </div>
  );
}

export function StaffDialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer className={`tw:flex tw:shrink-0 tw:items-center tw:justify-end tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-[#ece1da] tw:px-7 tw:py-4 tw:[&>:is(button,a)]:inline-flex tw:[&>:is(button,a)]:h-[2.923rem] tw:[&>:is(button,a)]:cursor-pointer tw:[&>:is(button,a)]:items-center tw:[&>:is(button,a)]:justify-center tw:[&>:is(button,a)]:rounded-lg tw:[&>:is(button,a)]:px-5 tw:[&>:is(button,a)]:text-[.923rem] tw:[&>:is(button,a)]:font-bold tw:[&>:is(button,a)]:gap-[.54rem]
      tw:[&>.wf-secondary]:border tw:[&>.wf-secondary]:border-solid tw:[&>.wf-secondary]:border-[#dec9c3] tw:[&>.wf-secondary]:bg-white tw:[&>.wf-secondary]:text-cali-brand
      tw:[&>.wf-primary]:border tw:[&>.wf-primary]:border-solid tw:[&>.wf-primary]:border-cali-brand tw:[&>.wf-primary]:bg-cali-brand tw:[&>.wf-primary]:text-white ${className ?? ''}`}>
      {children}
    </footer>
  );
}
