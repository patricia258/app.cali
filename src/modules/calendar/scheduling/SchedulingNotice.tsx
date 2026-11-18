import { createPortal } from 'react-dom';

export type Notice = { message: string; tone?: 'error' };

export function SchedulingNotice({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return createPortal(
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      data-tone={notice.tone}
      className="
        tw:fixed tw:right-7 tw:bottom-7 tw:z-10100 tw:max-w-[min(30rem,calc(100vw-3.5rem))] tw:rounded-2xl
        tw:bg-cali-text tw:px-4.5 tw:py-3.5 tw:text-xs/[1.45] tw:text-cali-neutral-surface tw:shadow-[0_1.25rem_3.25rem_rgb(var(--cali-rgb-shadow)/0.2667)]
        tw:data-[tone=error]:bg-cali-red-strong
      "
    >
      {notice.message}
    </div>,
    document.body,
  );
}
