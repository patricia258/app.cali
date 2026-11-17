import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DialogForm } from '../../ds/DialogForm';
import { DialogFrame } from '../../ds/DialogFrame';

const frameStyle = 'tw:flex tw:w-full tw:flex-col tw:overflow-hidden tw:rounded-[1.154rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:font-cali-body tw:text-cali-body/[inherit] tw:text-cali-text tw:shadow-[0_1.923rem_6.538rem_rgb(var(--cali-rgb-burgundy-inverse)/0.2902)] tw:max-h-[92dvh] tw:max-[43.1875rem]:max-h-[96dvh]';

export function WorkspaceFormDialog({ className = '', ...props }: ComponentPropsWithoutRef<typeof DialogForm>) {
  return <DialogForm {...props} className={`${frameStyle} tw:max-w-[70.769rem] ${className}`} />;
}

export function WorkspaceFormDialogFrame({ className = '', ...props }: ComponentPropsWithoutRef<typeof DialogFrame>) {
  return <DialogFrame {...props} className={`${frameStyle} tw:max-w-[58.462rem] ${className}`} />;
}

export function WorkspaceFormDialogHeader({ kicker, title, description, onClose, children }: {
  kicker: string;
  title: string;
  description: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="tw:flex tw:shrink-0 tw:items-start tw:justify-between tw:gap-4.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(115deg,var(--cali-color-sand-surface),var(--cali-color-orange-surface))] tw:px-9 tw:pt-8.5 tw:pb-7 tw:max-[43.1875rem]:p-5.5">
      <div className="tw:min-w-0">
        <small className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[0.13em] tw:text-cali-gold-accent">{kicker}</small>
        <h2 className="tw:mt-2 tw:mb-1.5 tw:text-3xl/[inherit] tw:tracking-[-0.035em]">{title}</h2>
        <p className="tw:m-0 tw:leading-[1.5] tw:text-cali-neutral-accent">{description}</p>
        {children}
      </div>
      <button type="button" data-dialog-close="" className="tw:inline-flex tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-3 tw:text-cali-text" aria-label="Fechar" onClick={onClose}>
        <X size={19} />
      </button>
    </header>
  );
}

export function WorkspaceFormDialogBody({ children }: { children: ReactNode }) {
  return (
    <div className="tw:min-h-[9.231rem] tw:flex-1 tw:overflow-y-auto tw:px-9 tw:py-8 tw:max-[43.1875rem]:p-5">
      {children}
    </div>
  );
}

export function WorkspaceFormDialogFields({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`tw:grid tw:grid-cols-2 tw:gap-5 tw:max-[43.1875rem]:grid-cols-1 ${className}`}>{children}</div>;
}

export function WorkspaceFormDialogField({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <label className={`tw:flex tw:min-w-0 tw:flex-col tw:gap-2 tw:text-sm/[inherit] tw:font-bold
      tw:[&_:is(input,select,textarea)]:min-h-[3.231rem] tw:[&_:is(input,select,textarea)]:max-w-full tw:[&_:is(input,select,textarea)]:rounded-cali-compact-control
      tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid tw:[&_:is(input,select,textarea)]:border-cali-sand-line
      tw:[&_:is(input,select,textarea)]:bg-cali-neutral-surface tw:[&_:is(input,select,textarea)]:px-3.5 tw:[&_:is(input,select,textarea)]:py-3
      tw:[&_:is(input,select,textarea)]:text-cali-body/[inherit] tw:[&_:is(input,select,textarea)]:font-normal tw:[&_:is(input,select,textarea)]:text-cali-text
      tw:[&_textarea]:min-h-[7.154rem] ${wide ? 'tw:col-span-full' : ''}`}>
      {children}
    </label>
  );
}

export function WorkspaceFormDialogCheck({ children }: { children: ReactNode }) {
  return <label className="tw:flex tw:items-center tw:gap-3 tw:text-cali-neutral-accent">{children}</label>;
}

export function WorkspaceFormDialogContext({ values }: { values: { label: string; value: string }[] }) {
  return (
    <div className="tw:mt-4.5 tw:flex tw:flex-wrap tw:gap-3 tw:max-[43.1875rem]:flex-col">
      {values.map(({ label, value }) => (
        <span key={label} className="tw:flex tw:items-center tw:gap-2.5 tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-sand-surface tw:px-3.5 tw:py-3 tw:text-sm/[inherit] tw:text-cali-sand-text tw:max-[43.1875rem]:justify-between">
          {label} <strong className="tw:font-bold tw:text-cali-brand">{value}</strong>
        </span>
      ))}
    </div>
  );
}

export function WorkspaceFormDialogFooter({ onCancel, submitLabel, disabled }: { onCancel: () => void; submitLabel: string; disabled?: boolean }) {
  return (
    <footer className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-8 tw:py-5 tw:max-[43.1875rem]:p-3.5
      tw:[&>button]:inline-flex tw:[&>button]:cursor-pointer tw:[&>button]:items-center tw:[&>button]:justify-center tw:[&>button]:gap-2.5 tw:[&>button]:rounded-lg tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:px-3.5 tw:[&>button]:py-3 tw:[&>button]:leading-[1.2] tw:[&>button:disabled]:cursor-not-allowed tw:[&>button:disabled]:opacity-45">
      <button type="button" className="tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:text-cali-brand" onClick={onCancel}>Cancelar</button>
      <button type="submit" className="tw:border-cali-brand tw:bg-cali-brand tw:text-cali-neutral-surface" disabled={disabled}>{submitLabel}</button>
    </footer>
  );
}
