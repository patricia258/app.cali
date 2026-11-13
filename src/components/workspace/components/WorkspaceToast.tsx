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
      className={`tw:fixed tw:right-[1.846rem] tw:bottom-[1.846rem] tw:z-1300 tw:m-0 tw:inline-flex tw:max-w-[min(32.31rem,calc(100vw-3.69rem))] tw:items-center tw:gap-[.769rem] tw:rounded-[.769rem] tw:border tw:border-solid tw:px-[1.23rem] tw:py-[.923rem] tw:text-[.923rem]/[1.45] tw:font-semibold tw:shadow-[0_1.385rem_4.615rem_#28172426] tw:[&_svg]:shrink-0 tw:motion-safe:animate-[workspace-toast-enter_.24s_cubic-bezier(.2,.7,.2,1)_backwards] ${tone === 'error' ? 'tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]' : 'tw:border-[#d6e8dd] tw:bg-[#f1f8f3] tw:text-[#2f6b4b]'}`}
    >
      {children}
    </div>
  );
}
