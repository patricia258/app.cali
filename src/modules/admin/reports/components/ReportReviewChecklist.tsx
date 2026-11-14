import type { ReactNode } from 'react';

export function ReportReviewChecklist({ children }: { children: ReactNode }) {
  return (
    <div
      className="reports-v16-check-list tw:grid tw:border-t tw:border-solid tw:border-[#eee7e2] tw:workspace-night:border-[#433339]
        tw:[&_label]:flex tw:[&_label]:cursor-pointer tw:[&_label]:items-start tw:[&_label]:gap-[0.84615rem]
        tw:[&_label]:border-b tw:[&_label]:border-solid tw:[&_label]:border-[#eee7e2] tw:[&_label]:py-[0.84615rem]
        tw:[&_label]:text-[0.84615rem] tw:[&_label]:leading-[1.48] tw:[&_label]:text-[#3f3834] tw:[&_input]:mt-[0.15385rem]
        tw:[&_input]:accent-cali-brand tw:workspace-night:[&_label]:border-[#3d3034] tw:workspace-night:[&_label]:text-[#e8dfdc]"
    >
      {children}
    </div>
  );
}
