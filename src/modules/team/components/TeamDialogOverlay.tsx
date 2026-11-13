import type { ReactNode } from 'react';

export function TeamDialogOverlay({ children, onClose, detail }: {
  children: ReactNode;
  onClose: () => void;
  detail?: boolean;
}) {
  return (
    <div
      className={`v2-client-module tw:fixed tw:inset-0 tw:flex tw:items-center tw:justify-center tw:p-[1.385rem]
        tw:motion-safe:animate-[v2-fade_.22s_ease-out_backwards]
        tw:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards]
        ${detail ? 'tw:z-110 tw:bg-[#241b2066]' : 'tw:z-12100 tw:bg-[#241b216e]'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
