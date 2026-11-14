import type { ReactNode } from 'react';

export function ReportEditorWorkspace({ children }: { children: ReactNode }) {
  return (
    <main
      className="reports-v16-workspace tw:overflow-hidden tw:rounded-[1.38462rem] tw:border tw:border-solid tw:border-[#e7dfd9]
        tw:bg-[#fffdfa] tw:shadow-[0_0.875rem_2.625rem_#4530270b] tw:workspace-night:border-[#443339] tw:workspace-night:bg-[#21191c]
        tw:workspace-night:shadow-none"
    >
      {children}
    </main>
  );
}
