import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { DialogForm } from '../../../components/ds/DialogForm';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { Link } from '../../../components/navigation/Link';

type DialogMode = 'compose' | 'detail' | 'calendar';

type NoticeDialogProps = {
  mode: DialogMode;
  title: string;
  heading?: ReactNode;
  onClose?: () => void;
  onSubmit?: ComponentPropsWithoutRef<'form'>['onSubmit'];
  children: ReactNode;
};

export function NoticeDialog({ mode, title, heading, onClose, onSubmit, children }: NoticeDialogProps) {
  const dimensions = {
    compose: 'tw:max-w-[56.923rem] tw:max-h-[min(92vh,66.154rem)] tw:rounded-[0.923rem]',
    detail: 'tw:max-w-[36.923rem] tw:max-h-[min(90dvh,55.385rem)] tw:rounded-[0.769rem]',
    calendar: 'tw:max-w-[32.308rem] tw:max-h-[min(80dvh,43.077rem)] tw:rounded-[0.769rem]',
  }[mode];
  const className = `tw:flex tw:w-full tw:flex-col tw:overflow-hidden tw:bg-white tw:focus:outline-none tw:shadow-[0_1.538rem_4.615rem_#19070a44] tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] ${dimensions}`;
  const header = heading ? (
    <header
      className={`tw:flex tw:flex-none tw:items-center tw:justify-between tw:border-0 tw:border-b tw:border-solid tw:border-[#eee2db] ${mode === 'compose' ? 'tw:px-8 tw:py-[1.538rem]' : 'tw:px-[1.231rem] tw:py-[0.923rem]'}`}
    >
      <span
        className={`tw:font-bold tw:text-[#ab8a6b] ${mode === 'compose' ? 'tw:text-[0.769rem] tw:tracking-[0.123rem]' : 'tw:text-[0.692rem] tw:tracking-[0.092rem]'}`}
      >
        {heading}
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`tw:grid tw:place-items-center tw:rounded-[0.462rem] tw:border tw:border-solid tw:border-[#ebdfd6] tw:bg-[#faf7f4] ${mode === 'compose' ? 'tw:p-[0.538rem]' : 'tw:p-[0.308rem]'}`}
        >
          <X size={19} />
        </button>
      )}
    </header>
  ) : null;

  return (
    <div
      className={`tw:fixed tw:inset-0 tw:grid tw:place-items-center tw:bg-[#20151d80] tw:p-[1.385rem] tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards] ${mode === 'calendar' ? 'tw:z-990' : 'tw:z-105'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      {onSubmit ? (
        <DialogForm className={className} aria-label={title} onSubmit={onSubmit}>
          {header}
          {children}
        </DialogForm>
      ) : (
        <DialogFrame className={className} aria-label={title}>
          {header}
          {children}
        </DialogFrame>
      )}
    </div>
  );
}

export function NoticeDialogBody({ mode, children }: { mode: DialogMode; children: ReactNode }) {
  return (
    <div
      className={[
        'tw:flex tw:min-h-0 tw:flex-col tw:overflow-y-auto tw:[scrollbar-width:none] tw:[&>*]:shrink-0 tw:[&_.inline-notice]:text-[0.846rem]',
        mode === 'compose'
          ? 'tw:gap-[0.923rem] tw:px-[1.923rem] tw:py-[1.692rem] tw:[&_h2]:my-[1.308rem] tw:[&_h2]:text-[1.769rem] tw:[&>p]:text-[1rem]/[1.8] tw:[&>p]:text-[#655a55]'
          : 'tw:relative tw:gap-[0.923rem] tw:p-[1.231rem] tw:[&>*]:m-0',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function NoticeDialogFooter({ mode, children }: { mode: DialogMode; children: ReactNode }) {
  return (
    <footer
      className={[
        'tw:flex tw:flex-none tw:items-center tw:border-0 tw:border-t tw:border-solid tw:border-[#ece1da]',
        mode === 'compose' &&
          'tw:justify-end tw:gap-[0.923rem] tw:px-8 tw:py-[1.308rem] tw:max-[50rem]:flex-wrap tw:max-[50rem]:p-[0.923rem]',
        mode === 'detail' && 'tw:gap-[0.615rem] tw:px-[1.231rem] tw:py-[0.769rem] tw:max-[23rem]:flex-wrap',
        mode === 'calendar' && 'tw:justify-end tw:gap-[0.769rem] tw:px-[1.231rem] tw:py-[0.769rem]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </footer>
  );
}

type NoticeButtonProps = ComponentPropsWithoutRef<'button'> & {
  appearance?: 'primary' | 'secondary';
  compact?: boolean;
};

export function NoticeButton({
  appearance = 'secondary',
  compact = false,
  type = 'button',
  className,
  ...props
}: NoticeButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[
        'tw:flex tw:cursor-pointer tw:items-center tw:rounded-[0.538rem] tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        appearance === 'primary'
          ? 'tw:gap-[0.692rem] tw:border-0 tw:bg-cali-brand tw:text-[0.923rem] tw:text-white'
          : 'tw:gap-[0.462rem] tw:border tw:border-solid tw:border-[#d9c9c0] tw:bg-white tw:text-[0.846rem] tw:text-cali-brand',
        compact ? 'tw:min-h-[3.154rem] tw:px-[0.846rem] tw:py-[0.615rem]' : 'tw:px-[1.231rem] tw:py-[0.923rem]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export function NoticeBoardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      to={href}
      className="tw:flex tw:items-center tw:gap-[0.692rem] tw:rounded-[0.538rem] tw:bg-cali-brand tw:px-[0.846rem] tw:py-[0.615rem] tw:text-[0.846rem] tw:font-bold tw:text-white tw:no-underline"
    >
      {children}
    </Link>
  );
}

export function NoticeComposeFields({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        'tw:flex tw:flex-col tw:gap-[0.923rem]',
        'tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-[0.462rem] tw:[&_label]:text-[0.846rem] tw:[&_label]:font-bold tw:[&_label]:text-[#59443c]',
        'tw:[&_:is(input,select,textarea)]:rounded-[0.462rem] tw:[&_:is(input,select,textarea)]:border tw:[&_:is(input,select,textarea)]:border-solid tw:[&_:is(input,select,textarea)]:border-[#e6d9cf] tw:[&_:is(input,select,textarea)]:bg-white tw:[&_:is(input,select,textarea)]:p-[0.846rem] tw:[&_:is(input,select,textarea)]:text-[0.923rem] tw:[&_:is(input,select,textarea)]:text-[#3e3130]',
        'tw:[&_textarea]:min-h-[6.538rem] tw:[&_textarea]:resize-y tw:[&_input[type=file]]:p-[0.769rem]',
        'tw:[&_label:has(>input[type=checkbox])]:m-0 tw:[&_label:has(>input[type=checkbox])]:flex-row tw:[&_label:has(>input[type=checkbox])]:items-center tw:[&_label:has(>input[type=checkbox])]:font-medium tw:[&_input[type=checkbox]]:accent-cali-brand',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
