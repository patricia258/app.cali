import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { complexityMeta, type MaterialComplexity } from '../../../../domain/projects';

type ClientDeliveryRowMetadataProps = {
  complexity?: string | null;
  status: string;
  statusTone: 'scheduled' | 'review' | 'active';
  due: string;
  children?: ReactNode;
};

const statusStyle = {
  scheduled: 'tw:bg-[#f2edf9] tw:text-[#7559a6]',
  review: 'tw:bg-[#fff0d9] tw:text-[#986523]',
  active: 'tw:bg-[#e6f2fc] tw:text-[#4475a3]',
};

export function ClientDeliveryRowMetadata({
  complexity,
  status,
  statusTone,
  due,
  children,
}: ClientDeliveryRowMetadataProps) {
  return (
    <>
      <span className="tw:col-start-2 tw:col-end-4 tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1.5 tw:@min-[56rem]:contents">
        {children}
        {complexity ? (
          <b
            className={`mc-chip tw:z-10 tw:w-fit tw:max-w-full ${complexity.toLowerCase()}`}
            data-tip={complexityMeta[complexity as MaterialComplexity]?.description || ''}
          >
            {complexity}
          </b>
        ) : (
          <span className="tw:w-fit tw:text-[#b5a79d]">—</span>
        )}
        <span
          className={`tw:w-fit tw:max-w-full tw:rounded-[.538rem] tw:px-[.77rem] tw:py-[.538rem] tw:text-center tw:text-[.77rem] tw:@min-[56rem]:w-full ${statusStyle[statusTone]}`}
        >
          {status}
        </span>
        <span className="tw:text-[.77rem] tw:whitespace-nowrap tw:text-[#928077] tw:@min-[56rem]:text-right">
          {due}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        size={15}
        className="tw:col-start-3 tw:row-start-1 tw:shrink-0 tw:@min-[56rem]:col-start-auto tw:@min-[56rem]:row-start-auto"
      />
    </>
  );
}
