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
    detail: 'tw:max-w-[36.923rem] tw:max-h-[min(90dvh,55.385rem)] tw:rounded-xl',
    calendar: 'tw:max-w-[32.308rem] tw:max-h-[min(80dvh,43.077rem)] tw:rounded-xl',
  }[mode];
  const className = `tw:flex tw:w-full tw:flex-col tw:overflow-hidden tw:bg-cali-neutral-surface tw:focus:outline-none tw:shadow-[0_1.538rem_4.615rem_rgb(var(--cali-rgb-neutral-inverse)/0.2667)] tw:motion-safe:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] ${dimensions}`;
  const header = heading ? (
    <header
      className={`tw:flex tw:flex-none tw:items-center tw:justify-between tw:border-0 tw:border-b tw:border-solid tw:border-cali-sand-line ${mode === 'compose' ? 'tw:px-8 tw:py-6' : 'tw:px-5 tw:py-3.5'}`}
    >
      <span
        className={`tw:font-bold tw:text-cali-gold-accent ${mode === 'compose' ? 'tw:text-xs tw:tracking-[0.123rem]' : 'tw:text-cali-label tw:tracking-[0.092rem]'}`}
      >
        {heading}
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`tw:grid tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-surface-soft ${mode === 'compose' ? 'tw:p-2' : 'tw:p-1'}`}
        >
          <X size={19} />
        </button>
      )}
    </header>
  ) : null;

  return (
    <div
      className={`tw:fixed tw:inset-0 tw:grid tw:place-items-center tw:bg-cali-burgundy-inverse/50 tw:p-5.5 tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards] ${mode === 'calendar' ? 'tw:z-990' : 'tw:z-105'}`}
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
        'tw:flex tw:min-h-0 tw:flex-col tw:overflow-y-auto tw:[scrollbar-width:none] tw:[&>*]:shrink-0 tw:[&_.inline-notice]:text-sm',
        mode === 'compose'
          ? 'tw:gap-3.5 tw:px-7.5 tw:py-7 tw:[&_h2]:my-5 tw:[&_h2]:text-cali-title-lg tw:[&>p]:text-base/[1.8] tw:[&>p]:text-cali-muted'
          : 'tw:relative tw:gap-3.5 tw:p-5 tw:[&>*]:m-0',
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
        'tw:flex tw:flex-none tw:items-center tw:border-0 tw:border-t tw:border-solid tw:border-cali-sand-line',
        mode === 'compose' &&
          'tw:justify-end tw:gap-3.5 tw:px-8 tw:py-5 tw:max-[50rem]:flex-wrap tw:max-[50rem]:p-3.5',
        mode === 'detail' && 'tw:gap-2.5 tw:px-5 tw:py-3 tw:max-[23rem]:flex-wrap',
        mode === 'calendar' && 'tw:justify-end tw:gap-3 tw:px-5 tw:py-3',
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
        'tw:flex tw:cursor-pointer tw:items-center tw:rounded-lg tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        appearance === 'primary'
          ? 'tw:gap-3 tw:border-0 tw:bg-cali-brand tw:text-cali-body tw:text-cali-neutral-surface'
          : 'tw:gap-2 tw:border tw:border-solid tw:border-cali-line-strong tw:bg-cali-neutral-surface tw:text-sm tw:text-cali-brand',
        compact ? 'tw:min-h-[3.154rem] tw:px-3.5 tw:py-2.5' : 'tw:px-5 tw:py-3.5',
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
      className="tw:flex tw:items-center tw:gap-3 tw:rounded-lg tw:bg-cali-brand tw:px-3.5 tw:py-2.5 tw:text-sm tw:font-bold tw:text-cali-neutral-surface tw:no-underline"
    >
      {children}
    </Link>
  );
}

export function NoticeComposeFields({ children }: { children: ReactNode }) {
  return <div className="tw:flex tw:flex-col tw:gap-3.5">{children}</div>;
}
