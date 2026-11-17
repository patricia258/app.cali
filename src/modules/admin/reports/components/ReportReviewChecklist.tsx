import type { ReactNode } from 'react';

export function ReportReviewChecklist({ children }: { children: ReactNode }) {
  return (
    <div
      className="reports-v16-check-list tw:grid tw:border-t tw:border-solid tw:border-cali-line tw:workspace-night:border-cali-line-strong
        tw:[&_label]:flex tw:[&_label]:cursor-pointer tw:[&_label]:items-start tw:[&_label]:gap-3.5
        tw:[&_label]:border-b tw:[&_label]:border-solid tw:[&_label]:border-cali-line tw:[&_label]:py-3.5
        tw:[&_label]:text-sm tw:[&_label]:leading-[1.48] tw:[&_label]:text-cali-neutral-strong tw:[&_input]:mt-0.5
        tw:[&_input]:accent-cali-brand tw:workspace-night:[&_label]:border-cali-line-strong tw:workspace-night:[&_label]:text-cali-sand-line"
    >
      {children}
    </div>
  );
}
