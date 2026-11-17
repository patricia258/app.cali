import type { ReactNode } from 'react';
import './form-feedback-motion.css';

export function FormFeedbackToast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="tw:fixed tw:bottom-8.5 tw:left-1/2 tw:z-50 tw:inline-flex
        tw:items-center tw:gap-2 tw:rounded-full tw:bg-cali-text
        tw:px-5 tw:py-3 tw:font-cali-body tw:text-cali-body
        tw:font-semibold tw:text-cali-neutral-surface tw:[transform:translateX(-50%)]
        tw:[box-shadow:0_0.769rem_2.308rem_rgb(var(--cali-rgb-shadow)/0.2)]
        tw:motion-safe:[animation:form-feedback-enter_.2s_ease-out]"
    >
      {children}
    </div>
  );
}
