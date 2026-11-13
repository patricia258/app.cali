import type { ReactNode } from 'react';
import './form-feedback-motion.css';

export function FormFeedbackToast({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="tw:fixed tw:bottom-[2.154rem] tw:left-1/2 tw:z-50 tw:inline-flex
        tw:items-center tw:gap-[0.538rem] tw:rounded-full tw:bg-[#2b2024]
        tw:px-[1.231rem] tw:py-[0.769rem] tw:font-cali-body tw:text-[0.923rem]
        tw:font-semibold tw:text-white tw:[transform:translateX(-50%)]
        tw:[box-shadow:0_0.769rem_2.308rem_rgba(0,0,0,.2)]
        tw:motion-safe:[animation:form-feedback-enter_.2s_ease-out]"
    >
      {children}
    </div>
  );
}
