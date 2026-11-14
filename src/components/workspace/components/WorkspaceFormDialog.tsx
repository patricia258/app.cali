import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DialogForm } from '../../ds/DialogForm';
import { DialogFrame } from '../../ds/DialogFrame';

const frameStyle = 'tw:flex tw:w-full tw:flex-col tw:overflow-hidden tw:rounded-[1.154rem] tw:border tw:border-solid tw:border-[#e8ded6] tw:bg-white tw:font-cali-body tw:text-[0.923rem]/[inherit] tw:text-[#332b29] tw:shadow-[0_1.923rem_6.538rem_#2418234a] tw:max-h-[92dvh] tw:max-[43.1875rem]:max-h-[96dvh]';

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
    <header className="tw:flex tw:shrink-0 tw:items-start tw:justify-between tw:gap-[1.077rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eee3da] tw:bg-[linear-gradient(115deg,#fff9f4,#f8edda)] tw:px-[2.231rem] tw:pt-[2.077rem] tw:pb-[1.769rem] tw:max-[43.1875rem]:p-[1.385rem]">
      <div className="tw:min-w-0">
        <small className="tw:text-[0.769rem]/[inherit] tw:font-extrabold tw:tracking-[0.13em] tw:text-[#a67d51]">{kicker}</small>
        <h2 className="tw:mt-[0.538rem] tw:mb-[0.385rem] tw:text-[1.846rem]/[inherit] tw:tracking-[-0.035em]">{title}</h2>
        <p className="tw:m-0 tw:leading-[1.5] tw:text-[#81756f]">{description}</p>
        {children}
      </div>
      <button type="button" data-dialog-close="" className="tw:inline-flex tw:shrink-0 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#e9ddd5] tw:bg-white tw:p-[0.692rem] tw:text-[#332b29]" aria-label="Fechar" onClick={onClose}>
        <X size={19} />
      </button>
    </header>
  );
}

export function WorkspaceFormDialogBody({ children }: { children: ReactNode }) {
  return (
    <div className="tw:min-h-[9.231rem] tw:flex-1 tw:overflow-y-auto tw:px-[2.231rem] tw:py-8 tw:max-[43.1875rem]:p-[1.308rem]">
      {children}
    </div>
  );
}

export function WorkspaceFormDialogFields({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`tw:grid tw:grid-cols-2 tw:gap-[1.231rem] tw:max-[43.1875rem]:grid-cols-1 ${className}`}>{children}</div>;
}

export function WorkspaceFormDialogField({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <label className={`tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.462rem] tw:text-[0.846rem]/[inherit] tw:font-bold
      tw:[&_:is(input,select,textarea)]:min-h-[3.231rem] tw:[&_:is(input,select,textarea)]:max-w-full tw:[&_:is(input,select,textarea)]:rounded-[0.615rem]
      tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid tw:[&_:is(input,select,textarea)]:border-[#e6dbd2]
      tw:[&_:is(input,select,textarea)]:bg-white tw:[&_:is(input,select,textarea)]:px-[0.923rem] tw:[&_:is(input,select,textarea)]:py-[0.769rem]
      tw:[&_:is(input,select,textarea)]:text-[0.923rem]/[inherit] tw:[&_:is(input,select,textarea)]:font-normal tw:[&_:is(input,select,textarea)]:text-[#332b29]
      tw:[&_textarea]:min-h-[7.154rem] ${wide ? 'tw:col-span-full' : ''}`}>
      {children}
    </label>
  );
}

export function WorkspaceFormDialogCheck({ children }: { children: ReactNode }) {
  return <label className="tw:flex tw:items-center tw:gap-[0.692rem] tw:text-[#665954]">{children}</label>;
}

export function WorkspaceFormDialogContext({ values }: { values: { label: string; value: string }[] }) {
  return (
    <div className="tw:mt-[1.154rem] tw:flex tw:flex-wrap tw:gap-[0.769rem] tw:max-[43.1875rem]:flex-col">
      {values.map(({ label, value }) => (
        <span key={label} className="tw:flex tw:items-center tw:gap-[0.615rem] tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#e6d8cc] tw:bg-[#fffaf5] tw:px-[0.923rem] tw:py-[0.692rem] tw:text-[0.846rem]/[inherit] tw:text-[#967b64] tw:max-[43.1875rem]:justify-between">
          {label} <strong className="tw:font-bold tw:text-cali-brand">{value}</strong>
        </span>
      ))}
    </div>
  );
}

export function WorkspaceFormDialogFooter({ onCancel, submitLabel, disabled }: { onCancel: () => void; submitLabel: string; disabled?: boolean }) {
  return (
    <footer className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-[0.615rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#eee4dd] tw:bg-[#faf7f4] tw:px-8 tw:py-[1.231rem] tw:max-[43.1875rem]:p-[0.923rem]
      tw:[&>button]:inline-flex tw:[&>button]:cursor-pointer tw:[&>button]:items-center tw:[&>button]:justify-center tw:[&>button]:gap-[0.615rem] tw:[&>button]:rounded-[0.538rem] tw:[&>button]:border tw:[&>button]:border-solid tw:[&>button]:px-[0.923rem] tw:[&>button]:py-[0.769rem] tw:[&>button]:leading-[1.2] tw:[&>button:disabled]:cursor-not-allowed tw:[&>button:disabled]:opacity-45">
      <button type="button" className="tw:border-[#e5d9d1] tw:bg-white tw:text-cali-brand" onClick={onCancel}>Cancelar</button>
      <button type="submit" className="tw:border-cali-brand tw:bg-cali-brand tw:text-white" disabled={disabled}>{submitLabel}</button>
    </footer>
  );
}
