import type { ComponentPropsWithoutRef } from 'react';
import { Link } from '../../../../components/navigation/Link';

type ClientHomeCardProps = ComponentPropsWithoutRef<'section'> & {
  as?: 'section' | 'article';
};

export function ClientHomeCard({ as: Card = 'article', className = '', ...props }: ClientHomeCardProps) {
  return (
    <Card
      {...props}
      className={`tw:min-w-0 tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#e8d4bf] tw:bg-[#ffffffdf] tw:px-[1.308rem] tw:py-[1.231rem] tw:[&_h3]:mt-0 tw:[&_h3]:mb-[0.692rem] tw:[&_h3]:text-[1rem]/[1.3] tw:[&_h3]:tracking-[-0.015rem] tw:[&_h3_span]:font-medium tw:[&_h3_span]:text-[#7f7772] tw:[&_p]:my-[0.231rem] tw:[&_p]:text-[0.769rem] tw:[&_p]:text-[#79716b] ${className}`}
    />
  );
}

export function ClientHomeLink({ className = '', ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      {...props}
      className={`tw:inline-flex tw:items-center tw:gap-[0.308rem] tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[0.769rem] tw:font-bold tw:text-[#64283a] ${className}`}
    />
  );
}
