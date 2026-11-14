import type { ComponentPropsWithoutRef } from 'react';

const tableClass = {
  teamReport: 'team-report-table',
  analytics: [
    'pa-table tw:w-full tw:border-collapse tw:text-[0.6875rem]',
    'tw:[&_th]:border-b tw:[&_th]:border-solid tw:[&_th]:border-[#eadfd8] tw:[&_th]:px-2 tw:[&_th]:py-1.5 tw:[&_th]:text-right tw:[&_th]:text-[0.625rem] tw:[&_th]:font-semibold tw:[&_th]:text-[#a18e80]',
    'tw:[&_td]:border-b tw:[&_td]:border-solid tw:[&_td]:border-[#f4ede7] tw:[&_td]:p-2 tw:[&_td]:text-right tw:[&_td]:font-bold tw:[&_td]:text-[#322f2c]',
    'tw:[&_:is(th,td):first-child]:text-left tw:[&_:is(th,td):first-child]:font-medium tw:[&_:is(th,td):first-child]:text-[#67574c] tw:[&_td.warn]:text-[#a66a00] tw:[&_td.neg]:text-[#b7495d]',
  ].join(' '),
} as const;

type DataTableProps = ComponentPropsWithoutRef<'table'> & {
  variant: keyof typeof tableClass;
};

export function DataTable({ variant, className, ...props }: DataTableProps) {
  return <table {...props} className={className ? `${tableClass[variant]} ${className}` : tableClass[variant]} />;
}
