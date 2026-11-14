import type { ReactNode } from 'react';

export function ReportEditorToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="reports-v16-toolbar tw:sticky tw:top-[5.69231rem] tw:z-8 tw:mb-[1.07692rem] tw:flex tw:items-center
        tw:justify-between tw:gap-[1.23077rem] tw:rounded-[1.07692rem] tw:border tw:border-solid tw:border-[#e4dcd6]
        tw:bg-[#fffdfaf5] tw:py-[0.84615rem] tw:pr-[1rem] tw:pl-[1.23077rem] tw:shadow-[0_0.5rem_1.875rem_#3a28200d]
        tw:backdrop-blur-[1.23077rem] tw:max-[680px]:relative tw:max-[680px]:top-auto tw:max-[680px]:flex-col
        tw:max-[680px]:items-start tw:workspace-night:border-[#4a383f] tw:workspace-night:bg-[#231b1ef2]
        tw:[&>div]:flex tw:[&>div]:flex-wrap tw:[&>div]:items-center tw:[&>div]:gap-[0.69231rem] tw:[&>div:first-child>strong]:text-[0.92308rem]
        tw:[&>div:first-child>strong]:leading-[calc(1/0.75)] tw:[&>div:first-child>strong]:text-cali-brand
        tw:[&>div:first-child>span]:text-[0.84615rem] tw:[&>div:first-child>span]:text-[#82766f] tw:[&>div:first-child>span+span]:before:mr-[0.69231rem]
        tw:[&>div:first-child>span+span]:before:text-[#b4a8a1] tw:[&>div:first-child>span+span]:before:content-['·']
        tw:[&_button]:min-h-[2.92308rem] tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45
        tw:[&_button:disabled]:saturate-[.6] tw:workspace-night:[&>div:first-child>strong]:text-[#e6b5c1]
        tw:workspace-night:[&>div:first-child>span]:text-[#bcaeaa]"
    >
      {children}
    </div>
  );
}
