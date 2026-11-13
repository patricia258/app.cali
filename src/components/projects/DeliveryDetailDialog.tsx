import type { ReactNode } from 'react';
import { DialogFrame } from '../ds/DialogFrame';
import '../workspace/components/workspace-dialog-motion.css';

type DeliveryDetailDialogProps = {
  title: string;
  wide?: boolean;
  hidden?: boolean;
  children: ReactNode;
};

export function DeliveryDetailDialog({ title, wide, hidden, children }: DeliveryDetailDialogProps) {
  return (
    <div
      hidden={hidden}
      className="tw:fixed tw:inset-0 tw:z-120 tw:flex tw:items-center tw:justify-center tw:bg-[#241b216e] tw:p-[1.385rem] tw:[&[hidden]]:hidden tw:motion-safe:animate-[workspace-dialog-fade_.22s_ease-out_backwards]"
    >
      <DialogFrame
        className={`tw:flex tw:h-[min(54.62rem,calc(100dvh-2.69rem))] tw:min-h-0 tw:flex-col tw:overflow-hidden tw:rounded-[.923rem] tw:bg-white tw:motion-safe:animate-[workspace-dialog-enter_.34s_cubic-bezier(.2,.7,.2,1)_backwards] ${wide ? 'tw:w-[min(69.23rem,100%)]' : 'tw:w-[min(65.38rem,100%)]'}`}
        aria-label={title}
        data-v2-operation="deliverable-workspace-modal-v2"
      >
        {children}
      </DialogFrame>
    </div>
  );
}
