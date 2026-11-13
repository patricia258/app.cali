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
      className={`tw:order-2 tw:inline-flex tw:h-[3.077rem] tw:flex-none tw:cursor-pointer tw:items-center tw:rounded-[.692rem] tw:border tw:border-solid tw:font-bold tw:whitespace-nowrap tw:disabled:cursor-default tw:disabled:opacity-45 ${scope === 'task' ? 'tw:gap-[.462rem] tw:px-[.923rem] tw:text-[.846rem]' : 'tw:gap-[.538rem] tw:px-[1.077rem] tw:text-[.923rem]'} ${running ? 'tw:border-[#356448] tw:bg-[#356448] tw:text-white' : 'tw:border-[#dfd3ca] tw:bg-white tw:text-cali-brand'}`}
    />
  );
}
