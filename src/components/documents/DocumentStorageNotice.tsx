import type { ReactNode } from 'react';

type DocumentStorageNoticeProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function DocumentStorageNotice({ title, description, icon, action }: DocumentStorageNoticeProps) {
  return (
    <section className="tw:mb-4.5 tw:flex tw:flex-wrap tw:items-center tw:gap-5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-sand-line tw:bg-[linear-gradient(90deg,var(--cali-color-gold-soft),var(--cali-color-sand-surface))] tw:px-7 tw:py-5.5 tw:text-cali-orange-inverse">
      {icon && <span className="tw:shrink-0" aria-hidden="true">{icon}</span>}
      <div className="tw:min-w-0 tw:flex-1">
        <strong className="tw:text-cali-body">{title}</strong>
        <p className="tw:mt-2 tw:mb-0 tw:text-xs tw:wrap-anywhere tw:text-cali-sand-text">{description}</p>
      </div>
      {action}
    </section>
  );
}
