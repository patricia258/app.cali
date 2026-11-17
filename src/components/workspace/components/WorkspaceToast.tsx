import type { ReactNode } from 'react';
import './workspace-toast-motion.css';

type WorkspaceToastProps = {
  children: ReactNode;
  tone?: 'success' | 'error';
};

export function WorkspaceToast({ children, tone = 'success' }: WorkspaceToastProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`tw:fixed tw:right-7.5 tw:bottom-7.5 tw:z-1300 tw:m-0 tw:inline-flex tw:max-w-[min(32.31rem,calc(100vw-3.69rem))] tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:px-5 tw:py-3.5 tw:text-cali-body/[1.45] tw:font-semibold tw:shadow-[0_1.385rem_4.615rem_rgb(var(--cali-rgb-red-inverse)/0.149)] tw:[&_svg]:shrink-0 tw:motion-safe:animate-[workspace-toast-enter_.24s_cubic-bezier(.2,.7,.2,1)_backwards] ${tone === 'error' ? 'tw:border-cali-danger-line tw:bg-cali-danger-surface tw:text-cali-danger' : 'tw:border-cali-success-line tw:bg-cali-success-surface tw:text-cali-green-text'}`}
    >
      {children}
    </div>
  );
}
