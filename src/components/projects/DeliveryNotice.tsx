import type { ReactNode } from 'react';

type DeliveryNoticeProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function DeliveryNotice({ icon, title, children, action, className = '' }: DeliveryNoticeProps) {
  return (
    <div
      className={`tw:mt-5.5 tw:flex tw:flex-wrap tw:items-start tw:gap-3.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-warning-surface tw:px-5.5 tw:py-5 tw:text-cali-gold-text ${className}`}
    >
      <span className="tw:mt-0.5 tw:shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="tw:min-w-0 tw:flex-1">
        <strong className="tw:text-cali-body tw:text-cali-gold-strong">{title}</strong>
        <p className="tw:mt-2 tw:mb-0 tw:text-sm/[1.6] tw:text-cali-sand-strong">{children}</p>
      </div>
      {action}
    </div>
  );
}
