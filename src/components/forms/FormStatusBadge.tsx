import type { ReactNode } from 'react';

const statusColor = {
  open: 'tw:bg-cali-success-surface tw:text-cali-success',
  draft: 'tw:bg-cali-warning-surface tw:text-cali-warning',
  closed: 'tw:bg-cali-surface-muted tw:text-cali-muted',
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
      className={`tw:inline-flex tw:items-center tw:gap-2 tw:whitespace-nowrap
        tw:rounded-full tw:px-3 tw:py-1 tw:font-cali-body
        tw:text-sm tw:leading-normal tw:font-semibold tw:tracking-normal tw:normal-case
        tw:before:size-2 tw:before:rounded-full tw:before:bg-current tw:before:content-['']
        ${onClick ? 'tw:cursor-pointer tw:border-0' : ''} ${statusColor[status]}`}
    >
      {children}
    </Tag>
  );
}
