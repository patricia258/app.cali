import type { ReactNode } from 'react';
import type { Member } from '../../../domain/team';

export function TeamStatus({ status, children }: { status: Member['status']; children: ReactNode }) {
  const tone = {
    active: 'tw:bg-[#e3f2e9] tw:text-[#236344] tw:workspace-night:bg-[#24533d] tw:workspace-night:text-[#d4f8e2]',
    leave: 'tw:bg-[#fff0d4] tw:text-[#785015] tw:workspace-night:bg-[#62491c] tw:workspace-night:text-[#fff0c3]',
    terminated:
      'tw:bg-[#fae4e5] tw:text-[#8d3338] tw:workspace-night:bg-[#5c2938] tw:workspace-night:text-[#ffd9df]',
  }[status];

  return (
    <span
      className={`tw:inline-block tw:rounded-[0.4375rem] tw:px-2 tw:py-1.25 tw:text-[0.72rem] tw:font-bold ${tone}`}
    >
      {children}
    </span>
  );
}
