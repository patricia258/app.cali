import type { ComponentPropsWithoutRef } from 'react';

type ProjectTimerButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
  running?: boolean;
  scope: 'task' | 'deliverable';
};

export function ProjectTimerButton({ running = false, scope, ...props }: ProjectTimerButtonProps) {
  return (
    <button
      {...props}
      type="button"
      className={`tw:order-2 tw:inline-flex tw:h-12.5 tw:flex-none tw:cursor-pointer tw:items-center tw:rounded-cali-panel tw:border tw:border-solid tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-default tw:disabled:opacity-45 ${scope === 'task' ? 'tw:gap-2 tw:px-3.5 tw:text-sm' : 'tw:gap-2 tw:px-4.5 tw:text-cali-body'} ${running ? 'tw:border-cali-success tw:bg-cali-success tw:text-cali-neutral-surface' : 'tw:border-cali-input-line tw:bg-cali-neutral-surface tw:text-cali-brand'}`}
    />
  );
}
