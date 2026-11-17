import type { ReactNode } from 'react';

export function ReportEditorWorkspace({ children }: { children: ReactNode }) {
  return (
    <main
      className="reports-v16-workspace tw:overflow-hidden tw:rounded-[1.38462rem] tw:border tw:border-solid tw:border-cali-sand-line
        tw:bg-cali-paper tw:shadow-[0_0.875rem_2.625rem_rgb(var(--cali-rgb-sand-inverse)/0.04314)] tw:workspace-night:border-cali-line-strong tw:workspace-night:bg-cali-surface
        tw:workspace-night:shadow-none"
    >
      {children}
    </main>
  );
}
