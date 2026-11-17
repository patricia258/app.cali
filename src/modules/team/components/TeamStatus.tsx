import type { ReactNode } from 'react';
import type { Member } from '../../../domain/team';

export function TeamStatus({ status, children }: { status: Member['status']; children: ReactNode }) {
  const tone = {
    active: 'tw:bg-cali-green-surface tw:text-cali-green-text tw:workspace-night:bg-cali-green-strong tw:workspace-night:text-cali-green-soft',
    leave: 'tw:bg-cali-gold-soft tw:text-cali-gold-text tw:workspace-night:bg-cali-gold-strong tw:workspace-night:text-cali-gold-soft',
    terminated:
      'tw:bg-cali-red-surface tw:text-cali-red-text tw:workspace-night:bg-cali-burgundy-accent tw:workspace-night:text-cali-red-soft',
  }[status];

  return (
    <span
      className={`tw:inline-block tw:rounded-md tw:px-2 tw:py-1.25 tw:text-xs tw:font-bold ${tone}`}
    >
      {children}
    </span>
  );
}
