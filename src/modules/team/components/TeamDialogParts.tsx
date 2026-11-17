import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export function TeamDialogHeader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <header className="tw:flex tw:flex-none tw:items-start tw:justify-between tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-6 tw:py-4.5">
      <div className="tw:flex tw:flex-col tw:gap-1 tw:[&_h2]:m-0 tw:[&_h2]:text-xl tw:[&_h2]:font-semibold">
        {children}
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="tw:static tw:grid tw:flex-none tw:place-items-center tw:rounded-md tw:border-0 tw:bg-cali-day-canvas tw:p-1.75 tw:text-cali-brand"
      >
        <X size={18} />
      </button>
    </header>
  );
}

export function TeamDialogEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="tw:block tw:font-cali-body tw:text-cali-micro/[1.3] tw:font-bold tw:tracking-[0.0625rem] tw:text-cali-muted">
      {children}
    </span>
  );
}

export function TeamDialogFooter({ className, ...props }: ComponentPropsWithoutRef<'footer'>) {
  return (
    <footer
      {...props}
      className={`tw:flex tw:flex-none tw:justify-end tw:gap-2.5 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-6 tw:py-4.5 ${className ?? ''}`}
    />
  );
}

export function TeamEditorFields({ children, optional = false }: { children: ReactNode; optional?: boolean }) {
  return (
    <div
      className={[
        'tw:grid tw:grid-cols-2 tw:content-start tw:gap-4 tw:max-[40.625rem]:grid-cols-1',
        optional
          ? 'tw:px-0 tw:pt-3 tw:pb-4'
          : 'tw:min-h-0 tw:flex-auto tw:auto-rows-max tw:overflow-y-auto tw:px-6 tw:pt-3.75 tw:pb-5',
        'tw:[&_label]:static tw:[&_label]:block tw:[&_label]:h-auto tw:[&_label]:min-h-0 tw:[&_label]:max-h-none tw:[&_label]:border-0 tw:[&_label]:bg-none tw:[&_label]:p-0 tw:[&_label]:text-cali-label/[1.4] tw:[&_label]:font-semibold tw:[&_label>*]:static',
        'tw:[&_label.full]:col-span-full tw:[&_label[hidden]]:hidden tw:[&_small]:mt-1 tw:[&_small]:block tw:[&_small]:text-cali-micro/[1.5] tw:[&_small]:font-normal tw:[&_small]:text-cali-muted',
        'tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:mt-1.75 tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:block tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:h-auto tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:w-full tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:rounded-md tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:border tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:border-solid tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:border-cali-line tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:bg-cali-neutral-surface tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:p-2.75 tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:font-normal tw:[&_:is(input:not([type=checkbox],[type=radio]),select,textarea)]:text-cali-text',
        'tw:[&_input:disabled]:opacity-60 tw:[&_label:has(>input[type=checkbox])]:flex tw:[&_label:has(>input[type=checkbox])]:items-center tw:[&_label:has(>input[type=checkbox])]:gap-2 tw:[&_label:has(>input[type=checkbox])]:self-end tw:[&_label:has(>input[type=checkbox])]:pb-2.75 tw:[&_input[type=checkbox]]:m-0 tw:[&_input[type=checkbox]]:size-4 tw:[&_input[type=checkbox]]:flex-none tw:[&_input[type=checkbox]]:accent-cali-brand',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
