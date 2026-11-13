import { StatusBadge } from '../../../../components/ds/StatusBadge';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { ProjectComplexityBadge } from '../../../../components/projects/ProjectComplexityBadge';

type ClientDeliveryRowMetadataProps = {
  complexity?: string | null;
  status: string;
  statusTone: 'scheduled' | 'review' | 'active';
  due: string;
  children?: ReactNode;
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
          <ProjectComplexityBadge code={complexity} explain className="tw:z-10 tw:w-fit tw:max-w-full" />
        ) : (
          <span className="tw:w-fit tw:text-[#b5a79d]">—</span>
        )}
        <StatusBadge
          variant="delivery"
          tone={statusTone}
          className="tw:w-fit tw:max-w-full tw:text-center tw:@min-[56rem]:w-full"
        >
          {status}
        </StatusBadge>
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
