import type { LucideIcon } from 'lucide-react';

type AccountPaneHeadingProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function AccountPaneHeading({ icon: Icon, title, description, className = '' }: AccountPaneHeadingProps) {
  return (
    <div className={`tw:mb-4.5 tw:flex tw:items-center tw:gap-3.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-5.5 tw:py-4.5 tw:text-cali-brand ${className}`}>
      <Icon aria-hidden="true" className="tw:size-5.5 tw:shrink-0" />
      <div className="tw:flex tw:flex-col tw:gap-1">
        <strong className="tw:text-base tw:text-cali-text">{title}</strong>
        <span className="tw:text-sm tw:text-cali-muted">{description}</span>
      </div>
    </div>
  );
}
