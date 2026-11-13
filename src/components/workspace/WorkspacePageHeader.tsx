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
    <header className="ap-title tw:mb-[1.692rem] tw:flex tw:items-center tw:justify-between tw:gap-[1.538rem] tw:max-[40rem]:flex-col tw:max-[40rem]:items-start">
      <div className="tw:min-w-0 tw:flex-[1_1_24.615rem] tw:max-[40rem]:flex-auto">
        <small className="tw:text-[.692rem]/[inherit] tw:font-bold tw:tracking-[.104rem] tw:text-[#b28a5f]">{eyebrow}</small>
        <h1 className="tw:my-[.538rem] tw:font-cali-body tw:text-[2rem]/[normal] tw:font-bold tw:tracking-[-.0615rem]">
          {title}<span className="tw:text-[#bd9157]">.</span>
        </h1>
        <p className="tw:m-0 tw:leading-[1.5] tw:text-[#978980]">{description}</p>
      </div>
      <div className={`ap-title-actions tw:flex tw:flex-none tw:items-center tw:gap-[.769rem] tw:max-[68.75rem]:flex-wrap tw:[&>*]:flex-none tw:[&>*]:whitespace-nowrap tw:[&>:is(button,a,label,input,select)]:min-h-[3.077rem] ${actionClassName}`}>
        {children}
      </div>
    </header>
  );
}
