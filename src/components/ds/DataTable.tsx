import type { ComponentPropsWithoutRef } from 'react';

const tableClass = {
  teamReport: 'team-report-table',
  analytics: [
    'pa-table tw:w-full tw:border-collapse tw:text-cali-label',
    'tw:[&_th]:border-b tw:[&_th]:border-solid tw:[&_th]:border-cali-line tw:[&_th]:px-2 tw:[&_th]:py-1.5 tw:[&_th]:text-right tw:[&_th]:text-cali-micro tw:[&_th]:font-semibold tw:[&_th]:text-cali-muted',
    'tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-cali-line tw:[&_td]:p-2 tw:[&_td]:text-right tw:[&_td]:font-bold tw:[&_td]:text-cali-text',
    'tw:[&_:is(th,td):first-child]:text-left tw:[&_:is(th,td):first-child]:font-medium tw:[&_:is(th,td):first-child]:text-cali-muted tw:[&_td.warn]:text-cali-warning tw:[&_td.neg]:text-cali-danger',
  ].join(' '),
} as const;

type DataTableProps = ComponentPropsWithoutRef<'table'> & {
  variant: keyof typeof tableClass;
};

export function DataTable({ variant, className, ...props }: DataTableProps) {
  return <table {...props} className={className ? `${tableClass[variant]} ${className}` : tableClass[variant]} />;
}
