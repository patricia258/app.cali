import type { ComponentPropsWithoutRef } from 'react';

export function SatisfactionSelectFilter(props: ComponentPropsWithoutRef<'select'>) {
  return <select {...props} className="tw:h-11 tw:min-w-0 tw:flex-[1_1_11.54rem] tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-3 tw:text-sm tw:leading-[inherit] tw:text-cali-text tw:[@media(max-width:40rem)]:flex-[1_1_100%]" />;
}
