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
      className={`tw:mt-[1.385rem] tw:flex tw:flex-wrap tw:items-start tw:gap-[.923rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#eedcc6] tw:bg-[#fff9ed] tw:px-[1.385rem] tw:py-[1.231rem] tw:text-[#815923] ${className}`}
    >
      <span className="tw:mt-[.154rem] tw:shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="tw:min-w-0 tw:flex-1">
        <strong className="tw:text-[.923rem] tw:text-[#664725]">{title}</strong>
        <p className="tw:mt-[.462rem] tw:mb-0 tw:text-[.846rem]/[1.6] tw:text-[#8b7457]">{children}</p>
      </div>
      {action}
    </div>
  );
}
