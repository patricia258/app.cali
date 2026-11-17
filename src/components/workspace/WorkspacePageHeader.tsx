import type { ReactNode } from 'react';

type WorkspacePageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actionClassName?: string;
};

export function WorkspacePageHeader({ eyebrow, title, description, children, actionClassName = '' }: WorkspacePageHeaderProps) {
  return (
    <header className="ap-title tw:mb-7 tw:flex tw:items-center tw:justify-between tw:gap-6 tw:max-[40rem]:flex-col tw:max-[40rem]:items-start">
      <div className="tw:min-w-0 tw:flex-[1_1_24.615rem] tw:max-[40rem]:flex-auto">
        <small className="tw:text-cali-label/[inherit] tw:font-bold tw:tracking-[.104rem] tw:text-cali-gold-accent">{eyebrow}</small>
        <h1 className="tw:my-2 tw:font-cali-body tw:text-cali-display/[normal] tw:font-bold tw:tracking-[-.0615rem]">
          {title}<span className="tw:text-cali-gold-accent">.</span>
        </h1>
        <p className="tw:m-0 tw:leading-[1.5] tw:text-cali-muted">{description}</p>
      </div>
      <div className={`ap-title-actions tw:flex tw:flex-none tw:items-center tw:gap-3 tw:max-[68.75rem]:flex-wrap tw:[&>*]:flex-none tw:[&>*]:whitespace-nowrap tw:[&>:is(button,a,label,input,select)]:min-h-[3.077rem] ${actionClassName}`}>
        {children}
      </div>
    </header>
  );
}
