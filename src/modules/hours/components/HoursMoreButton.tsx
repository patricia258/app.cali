import type { ReactNode } from 'react';
import { Button } from '../../../components/ds/Button';

export function HoursMoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="unstyled" type="button" className="tw:mx-auto tw:mt-4 tw:block tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3 tw:text-sm tw:leading-[inherit] tw:font-semibold tw:text-cali-brand" onClick={onClick}>
      {children}
    </Button>
  );
}
