import type { ReactNode } from 'react';

export function ReportEditorToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="reports-v16-toolbar tw:sticky tw:top-23 tw:z-8 tw:mb-4.5 tw:flex tw:items-center
        tw:justify-between tw:gap-5 tw:rounded-[1.07692rem] tw:border tw:border-solid tw:border-cali-sand-line
        tw:bg-cali-sand-surface/96 tw:py-3.5 tw:pr-4 tw:pl-5 tw:shadow-[0_0.5rem_1.875rem_rgb(var(--cali-rgb-sand-inverse)/0.05098)]
        tw:backdrop-blur-[1.23077rem] tw:max-[680px]:relative tw:max-[680px]:top-auto tw:max-[680px]:flex-col
        tw:max-[680px]:items-start tw:workspace-night:border-cali-neutral-text tw:workspace-night:bg-cali-burgundy-inverse/95
        tw:[&>div]:flex tw:[&>div]:flex-wrap tw:[&>div]:items-center tw:[&>div]:gap-3 tw:[&>div:first-child>strong]:text-cali-body
        tw:[&>div:first-child>strong]:leading-[calc(1/0.75)] tw:[&>div:first-child>strong]:text-cali-brand
        tw:[&>div:first-child>span]:text-sm tw:[&>div:first-child>span]:text-cali-neutral-accent tw:[&>div:first-child>span+span]:before:mr-3
        tw:[&>div:first-child>span+span]:before:text-cali-sand-accent tw:[&>div:first-child>span+span]:before:content-['·']
        tw:[&_button]:min-h-[2.92308rem] tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45
        tw:[&_button:disabled]:saturate-[.6] tw:workspace-night:[&>div:first-child>strong]:text-cali-burgundy-soft
        tw:workspace-night:[&>div:first-child>span]:text-cali-sand-accent"
    >
      {children}
    </div>
  );
}
