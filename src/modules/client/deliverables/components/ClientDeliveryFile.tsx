import type { ReactNode } from 'react';

type ClientDeliveryFileProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };

export function ClientDeliveryFile({ icon, title, description, action }: ClientDeliveryFileProps) {
  return (
    <div className="tw:mt-[.615rem] tw:flex tw:items-center tw:gap-[1.154rem] tw:rounded-[.692rem] tw:border tw:border-solid tw:border-[#ebe0d7] tw:px-[1.385rem] tw:py-[1.231rem]">
      <span aria-hidden="true" className="tw:shrink-0">
        {icon}
      </span>
      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[.462rem]">
        <strong className="tw:text-[.923rem] tw:wrap-anywhere">{title}</strong>
        <small className="tw:text-[.769rem] tw:text-[#a39185]">{description}</small>
      </div>
      {action}
    </div>
  );
}
