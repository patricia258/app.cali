import type { ComponentPropsWithoutRef } from 'react';

export function SatisfactionSelectFilter(props: ComponentPropsWithoutRef<'select'>) {
  return <select {...props} className="tw:h-[2.77rem] tw:min-w-0 tw:flex-[1_1_11.54rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#e5d9d0] tw:bg-white tw:px-3 tw:text-[.846rem] tw:leading-[inherit] tw:text-[#322f2c] tw:[@media(max-width:40rem)]:flex-[1_1_100%]" />;
}
