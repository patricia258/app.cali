import type { ReactNode } from 'react';

type DeliveryDetailHeaderProps = {
  title: string;
  code: string;
  complexity: string;
  description: string;
  children: ReactNode;
  className?: string;
};

export function DeliveryDetailHeader({
  title,
  code,
  complexity,
  description,
  children,
  className = '',
}: DeliveryDetailHeaderProps) {
  return (
    <header
      className={`tw:m-0 tw:flex tw:shrink-0 tw:flex-wrap tw:items-start tw:justify-between tw:gap-5 tw:bg-[linear-gradient(90deg,var(--cali-color-sand-surface),var(--cali-color-orange-surface))] tw:px-8.5 tw:pt-7 tw:pb-5 ${className}`}
      data-v2-operation="deliverable-workspace-header-v2"
    >
      <div className="tw:min-w-0 tw:flex-1" data-v2-operation="deliverable-title-v2">
        <small className="tw:text-xs tw:tracking-[.092rem] tw:text-cali-warning">
          {code} · {complexity}
        </small>
        <h2 className="tw:my-2 tw:text-cali-title tw:wrap-anywhere">{title}</h2>
        <p>{description}</p>
      </div>
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-3">{children}</div>
    </header>
  );
}
