import type { ComponentPropsWithoutRef } from 'react';

const tableClass = { teamReport: 'team-report-table', analytics: 'pa-table' } as const;

type DataTableProps = ComponentPropsWithoutRef<'table'> & {
  variant: keyof typeof tableClass;
};

export function DataTable({ variant, className, ...props }: DataTableProps) {
  return <table {...props} className={className ? `${tableClass[variant]} ${className}` : tableClass[variant]} />;
}
