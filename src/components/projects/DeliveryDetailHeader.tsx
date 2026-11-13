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
      className={`tw:m-0 tw:flex tw:shrink-0 tw:flex-wrap tw:items-start tw:justify-between tw:gap-[1.23rem] tw:bg-[linear-gradient(90deg,#fffaf6,#f8ecd9)] tw:px-[2.08rem] tw:pt-[1.77rem] tw:pb-[1.23rem] ${className}`}
      data-v2-operation="deliverable-workspace-header-v2"
    >
      <div className="tw:min-w-0 tw:flex-1" data-v2-operation="deliverable-title-v2">
        <small className="tw:text-[.769rem] tw:tracking-[.092rem] tw:text-[#af8f72]">
          {code} · {complexity}
        </small>
        <h2 className="tw:my-[.538rem] tw:text-[1.615rem] tw:wrap-anywhere">{title}</h2>
        <p>{description}</p>
      </div>
      <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-[.769rem]">{children}</div>
    </header>
  );
}
