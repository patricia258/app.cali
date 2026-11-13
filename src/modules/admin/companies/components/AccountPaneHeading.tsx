import type { LucideIcon } from 'lucide-react';

type AccountPaneHeadingProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function AccountPaneHeading({ icon: Icon, title, description, className = '' }: AccountPaneHeadingProps) {
  return (
    <div className={`tw:mb-[1.077rem] tw:flex tw:items-center tw:gap-[.923rem] tw:rounded-[.769rem] tw:border tw:border-solid tw:border-[#e9ddd4] tw:bg-[#fbf7f4] tw:px-[1.385rem] tw:py-[1.077rem] tw:text-cali-brand ${className}`}>
      <Icon aria-hidden="true" className="tw:size-[1.385rem] tw:shrink-0" />
      <div className="tw:flex tw:flex-col tw:gap-[.308rem]">
        <strong className="tw:text-[1rem] tw:text-[#322f2c]">{title}</strong>
        <span className="tw:text-[.846rem] tw:text-[#9a8c83]">{description}</span>
      </div>
    </div>
  );
}
