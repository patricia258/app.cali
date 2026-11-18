import type { ReactNode } from 'react';

type ClientDeliveryFileProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };

export function ClientDeliveryFile({ icon, title, description, action }: ClientDeliveryFileProps) {
  return (
    <div className="tw:mt-2.5 tw:flex tw:items-center tw:gap-4.5 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-sand-line tw:px-5.5 tw:py-5">
      <span aria-hidden="true" className="tw:shrink-0">
        {icon}
      </span>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-2">
        <strong className="tw:text-cali-body tw:wrap-anywhere">{title}</strong>
        <small className="tw:text-xs tw:text-cali-sand-text">{description}</small>
      </div>
      {action}
    </div>
  );
}
