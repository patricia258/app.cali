import type { ReactNode } from 'react';

type DocumentStorageNoticeProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function DocumentStorageNotice({ title, description, icon, action }: DocumentStorageNoticeProps) {
  return (
    <section className="tw:mb-[1.154rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[1.308rem] tw:rounded-[.769rem] tw:border tw:border-solid tw:border-[#ecdac3] tw:bg-[linear-gradient(90deg,#f8e8c9,#fdfaf4)] tw:px-[1.692rem] tw:py-[1.385rem] tw:text-[#7a5134]">
      {icon && <span className="tw:shrink-0" aria-hidden="true">{icon}</span>}
      <div className="tw:min-w-0 tw:flex-1">
        <strong className="tw:text-[.923rem]">{title}</strong>
        <p className="tw:mt-[.538rem] tw:mb-0 tw:text-[.769rem] tw:wrap-anywhere tw:text-[#9c8575]">{description}</p>
      </div>
      {action}
    </section>
  );
}
