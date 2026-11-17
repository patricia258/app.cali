import { Select } from '../../../../components/ds/Select';
import type { ComponentPropsWithoutRef } from 'react';

export function SatisfactionSelectFilter(props: ComponentPropsWithoutRef<'select'>) {
  return <Select variant="filter" {...props} className="tw:h-11 tw:flex-[1_1_11.54rem] tw:[@media(max-width:40rem)]:flex-[1_1_100%]" />;
}
