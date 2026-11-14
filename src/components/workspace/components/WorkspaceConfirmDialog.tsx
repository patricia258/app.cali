import type { ComponentProps } from 'react';
import { DialogFrame } from '../../ds/DialogFrame';

export function WorkspaceConfirmDialog({ className = '', ...props }: ComponentProps<typeof DialogFrame>) {
  return (
    <DialogFrame
      {...props}
      className={`tw:flex tw:max-h-[calc(100dvh-2.77rem)] tw:w-[min(40rem,96vw)] tw:flex-col tw:gap-[1.154rem] tw:overflow-auto tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:p-8 tw:shadow-[0_1.538rem_6.154rem_#1d111344]
        tw:[&>div>small]:font-extrabold tw:[&>div>small]:tracking-[.12em] tw:[&>div>small]:text-cali-gold
        tw:[&_h2]:my-[.615rem] tw:[&_h2]:text-[1.769rem]/[normal] tw:[&_h2]:text-cali-brand
        tw:[&_p]:text-[#89796f] tw:[&>small]:text-[#a19085]
        tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-[.692rem] tw:[&_label]:text-[.923rem]/[inherit] tw:[&_label]:font-bold
        tw:[&_textarea]:h-[8.077rem] tw:[&_textarea]:resize-y tw:[&_textarea]:rounded-[.692rem] tw:[&_textarea]:border tw:[&_textarea]:border-solid tw:[&_textarea]:border-[#e5d8d0] tw:[&_textarea]:p-[.923rem]
        tw:[&_footer]:flex tw:[&_footer]:flex-wrap tw:[&_footer]:justify-end tw:[&_footer]:gap-[.769rem]
        tw:[&_footer_button]:inline-flex tw:[&_footer_button]:items-center tw:[&_footer_button]:justify-center tw:[&_footer_button]:gap-[.615rem] tw:[&_footer_button]:rounded-[.538rem] tw:[&_footer_button]:border tw:[&_footer_button]:border-solid tw:[&_footer_button]:border-[#e7dcd4] tw:[&_footer_button]:bg-white tw:[&_footer_button]:px-[1.154rem] tw:[&_footer_button]:py-[.846rem] tw:[&_footer_button]:leading-[1.2] tw:[&_footer_button]:text-cali-brand
        tw:[&_footer_button:last-child]:bg-cali-brand tw:[&_footer_button:last-child]:text-white
        tw:[&_footer_button:disabled]:cursor-not-allowed tw:[&_footer_button:disabled]:opacity-45 tw:[&_button_svg]:shrink-0 ${className}`}
    />
  );
}
