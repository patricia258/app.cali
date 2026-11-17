import type { ComponentProps } from 'react';
import { DialogFrame } from '../../ds/DialogFrame';

export function WorkspaceConfirmDialog({ className = '', ...props }: ComponentProps<typeof DialogFrame>) {
  return (
    <DialogFrame
      {...props}
      className={`tw:flex tw:max-h-[calc(100dvh-2.77rem)] tw:w-[min(40rem,96vw)] tw:flex-col tw:gap-4.5 tw:overflow-auto tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-cali-line tw:bg-cali-paper tw:p-8 tw:shadow-[0_1.538rem_6.154rem_rgb(var(--cali-rgb-neutral-inverse)/0.2667)]
        tw:[&>div>small]:font-extrabold tw:[&>div>small]:tracking-[.12em] tw:[&>div>small]:text-cali-gold
        tw:[&_h2]:my-2.5 tw:[&_h2]:text-cali-title-lg/[normal] tw:[&_h2]:text-cali-brand
        tw:[&_p]:text-cali-sand-text tw:[&>small]:text-cali-sand-text
        tw:[&_label]:flex tw:[&_label]:flex-col tw:[&_label]:gap-3 tw:[&_label]:text-cali-body/[inherit] tw:[&_label]:font-bold
        tw:[&_textarea]:h-[8.077rem] tw:[&_textarea]:resize-y tw:[&_textarea]:rounded-cali-panel tw:[&_textarea]:border tw:[&_textarea]:border-solid tw:[&_textarea]:border-cali-input-line tw:[&_textarea]:p-3.5
        tw:[&_footer]:flex tw:[&_footer]:flex-wrap tw:[&_footer]:justify-end tw:[&_footer]:gap-3
        tw:[&_footer_button]:inline-flex tw:[&_footer_button]:items-center tw:[&_footer_button]:justify-center tw:[&_footer_button]:gap-2.5 tw:[&_footer_button]:rounded-lg tw:[&_footer_button]:border tw:[&_footer_button]:border-solid tw:[&_footer_button]:border-cali-sand-line tw:[&_footer_button]:bg-cali-neutral-surface tw:[&_footer_button]:px-4.5 tw:[&_footer_button]:py-3.5 tw:[&_footer_button]:leading-[1.2] tw:[&_footer_button]:text-cali-brand
        tw:[&_footer_button:last-child]:bg-cali-brand tw:[&_footer_button:last-child]:text-cali-neutral-surface
        tw:[&_footer_button:disabled]:cursor-not-allowed tw:[&_footer_button:disabled]:opacity-45 tw:[&_button_svg]:shrink-0 ${className}`}
    />
  );
}
