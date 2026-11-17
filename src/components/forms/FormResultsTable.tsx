import type { ReactNode } from 'react';

type FormResultsTableProps = {
  children: ReactNode;
  pinResponseColumns?: boolean;
};

export function FormResultsTable({ children, pinResponseColumns = false }: FormResultsTableProps) {
  return (
    <div className="tw:max-h-[calc(100vh-23.077rem)] tw:overflow-auto tw:rounded-[0.923rem]
      tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface">
      <table className={`tw:border-separate tw:[border-spacing:0] tw:w-max tw:min-w-full tw:text-cali-body tw:[&_th]:sticky
        tw:[&_th]:top-0 tw:[&_th]:z-1 tw:[&_th]:bg-cali-surface-soft tw:[&_th]:text-left tw:[&_th]:text-xs
        tw:[&_th]:font-bold tw:[&_th]:tracking-[.04em] tw:[&_th]:uppercase tw:[&_th]:text-[color:var(--fm-muted)]
        tw:[&_th]:[padding:0.846rem_1.077rem] tw:[&_th]:[border-bottom:1px_solid_var(--fm-line)] tw:[&_th]:max-w-80
        tw:[&_th]:overflow-hidden tw:[&_th]:text-ellipsis tw:[&_th]:whitespace-nowrap tw:[&_td]:[padding:0.846rem_1.077rem]
        tw:[&_td]:[border-bottom:1px_solid_var(--cali-color-neutral-soft)] tw:[&_td]:text-[color:var(--fm-ink)] tw:[&_td]:max-w-80
        tw:[&_td]:overflow-hidden tw:[&_td]:text-ellipsis tw:[&_td]:whitespace-nowrap tw:[&_td]:align-top
        tw:[&_tbody_tr]:cursor-default tw:[&_tbody_tr:hover_td]:bg-cali-surface-soft tw:[&_th:first-child]:sticky
        tw:[&_th:first-child]:left-0 tw:[&_th:first-child]:bg-cali-surface-soft tw:[&_td:first-child]:sticky tw:[&_td:first-child]:left-0
        tw:[&_td:first-child]:bg-cali-neutral-surface tw:[&_td:first-child]:z-2 tw:[&_th:first-child]:z-3
        ${pinResponseColumns ? `tw:[&_th_button]:border-0 tw:[&_th_button]:bg-transparent tw:[&_th_button]:p-0 tw:[&_th_button]:[font:inherit]
                  tw:[&_th_button]:text-[inherit] tw:[&_th_button]:[text-transform:inherit] tw:[&_th_button]:tracking-[inherit]
                  tw:[&_th_button]:cursor-pointer tw:[&_th_button]:max-w-full tw:[&_th_button]:overflow-hidden tw:[&_th_button]:text-ellipsis
                  tw:[&_th_button]:whitespace-nowrap tw:[&_th_button:hover]:text-cali-brand tw:[&_tbody_tr.is-selected_td]:bg-cali-danger-surface!
                  tw:[&_th.v2-forms-check-col]:sticky tw:[&_th.v2-forms-check-col]:left-0 tw:[&_th.v2-forms-check-col]:z-2
                  tw:[&_td.v2-forms-check-col]:sticky tw:[&_td.v2-forms-check-col]:left-0 tw:[&_td.v2-forms-check-col]:z-2
                  tw:[&_td.v2-forms-check-col]:bg-cali-neutral-surface tw:[&_th.v2-forms-check-col]:bg-cali-surface-soft tw:[&_th.v2-forms-check-col]:z-3
                  tw:[&_.v2-forms-date-col]:sticky tw:[&_.v2-forms-date-col]:left-21.5! tw:[&_.v2-forms-date-col]:z-2
                  tw:[&_.v2-forms-date-col]:bg-cali-neutral-surface tw:[&_th.v2-forms-date-col]:bg-cali-surface-soft tw:[&_th.v2-forms-date-col]:z-3
                  tw:[&_.v2-forms-edit-col]:sticky tw:[&_.v2-forms-edit-col]:left-11 tw:[&_.v2-forms-edit-col]:z-2
                  tw:[&_.v2-forms-edit-col]:w-10.5 tw:[&_.v2-forms-edit-col]:min-w-[2.615rem] tw:[&_.v2-forms-edit-col]:max-w-[2.615rem]
                  tw:[&_.v2-forms-edit-col]:pl-0.5! tw:[&_.v2-forms-edit-col]:pr-0.5! tw:[&_.v2-forms-edit-col]:bg-cali-neutral-surface
                  tw:[&_th.v2-forms-edit-col]:bg-cali-surface-soft tw:[&_th.v2-forms-edit-col]:z-3 tw:[&_.v2-forms-date-col]:[box-shadow:0.462rem_0_0.615rem_-0.462rem_rgb(var(--cali-rgb-burgundy-strong)/0.18)]
                  tw:[&_tbody_tr.is-selected_td.v2-forms-edit-col]:bg-cali-danger-surface!` : ''}`}>
        {children}
      </table>
    </div>
  );
}
