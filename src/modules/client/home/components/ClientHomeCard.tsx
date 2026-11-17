import type { ComponentPropsWithoutRef } from 'react';
import { Link } from '../../../../components/navigation/Link';

type ClientHomeCardProps = ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'article';
};

export function ClientHomeCard({ as: Card = 'article', className = '', ...props }: ClientHomeCardProps) {
  return (
    <Card
      {...props}
      className={`tw:min-w-0 tw:rounded-2xl tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface/87 tw:px-5 tw:py-5 tw:[&_h3]:mt-0 tw:[&_h3]:mb-3 tw:[&_h3]:text-base/[1.3] tw:[&_h3]:tracking-[-0.015rem] tw:[&_h3_span]:font-medium tw:[&_h3_span]:text-cali-neutral-accent tw:[&_p]:my-1 tw:[&_p]:text-xs tw:[&_p]:text-cali-neutral-accent ${className}`}
    />
  );
}

export function ClientHomeLink({ className = '', ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      {...props}
      className={`tw:inline-flex tw:items-center tw:gap-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-xs tw:font-bold tw:text-cali-red-strong ${className}`}
    />
  );
}
