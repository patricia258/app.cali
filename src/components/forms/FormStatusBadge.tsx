import type { ReactNode } from 'react';

const statusColor = {
  open: 'tw:bg-[#e6f6ec] tw:text-[#31805a]',
  draft: 'tw:bg-[#fff4de] tw:text-[#9b6c21]',
  closed: 'tw:bg-[#f1ece8] tw:text-[#8c7e74]',
};

export type FormStatus = keyof typeof statusColor;

type FormStatusBadgeProps = {
  status: FormStatus;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
};

export function FormStatusBadge({ status, children, onClick, title }: FormStatusBadgeProps) {
  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={`tw:inline-flex tw:items-center tw:gap-[0.462rem] tw:whitespace-nowrap
        tw:rounded-full tw:px-[0.769rem] tw:py-[0.308rem] tw:font-cali-body
        tw:text-[0.846rem] tw:leading-normal tw:font-semibold tw:tracking-normal tw:normal-case
        tw:before:size-[0.538rem] tw:before:rounded-full tw:before:bg-current tw:before:content-['']
        ${onClick ? 'tw:cursor-pointer tw:border-0' : ''} ${statusColor[status]}`}
    >
      {children}
    </Tag>
  );
}
