import type { ReactNode } from 'react';
import { Button } from '../../../components/ds/Button';

export function HoursMoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="unstyled" type="button" className="tw:mx-auto tw:mt-4 tw:block tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-[#ead9ce] tw:bg-white tw:px-4 tw:py-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-semibold tw:text-[#603144]" onClick={onClick}>
      {children}
    </Button>
  );
}
