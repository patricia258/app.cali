import type { ReactNode } from 'react';

export function ReportReviewSection({ children, surface = 'default' }: {
  children: ReactNode;
  surface?: 'default' | 'alert' | 'editorial';
}) {
  const appearance = surface === 'alert'
    ? 'reports-v16-alert-section tw:bg-cali-sand-surface tw:workspace-night:bg-cali-surface'
    : surface === 'editorial'
      ? 'reports-v16-editorial tw:bg-cali-neutral-surface tw:workspace-night:bg-cali-surface'
      : '';

  return (
    <section
      className={`reports-v16-section tw:border-t tw:border-solid tw:border-cali-sand-line tw:px-10 tw:py-8.5
        tw:first:border-t-0 tw:max-[680px]:px-5.5 tw:workspace-night:border-cali-neutral-strong
        tw:[&_h3]:mt-6! tw:[&_h3]:mb-3.5! tw:[&_h3]:text-base!
        tw:[&_h3]:leading-[1.3]! tw:[&>div>h3:first-child]:mt-7! ${appearance}`}
    >
      {children}
    </section>
  );
}
