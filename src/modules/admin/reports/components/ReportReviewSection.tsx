import type { ReactNode } from 'react';

export function ReportReviewSection({ children, surface = 'default' }: {
  children: ReactNode;
  surface?: 'default' | 'alert' | 'editorial';
}) {
  const appearance = surface === 'alert'
    ? 'reports-v16-alert-section tw:bg-[#fcfaf7] tw:workspace-night:bg-[#241c1f]'
    : surface === 'editorial'
      ? 'reports-v16-editorial tw:bg-white tw:workspace-night:bg-[#21191c]'
      : '';

  return (
    <section
      className={`reports-v16-section tw:border-t tw:border-solid tw:border-[#ece5df] tw:px-[2.46rem] tw:py-[2.15rem]
        tw:first:border-t-0 tw:max-[680px]:px-[1.38rem] tw:workspace-night:border-[#3b2d32]
        tw:[&_h3]:mt-[1.54rem]! tw:[&_h3]:mb-[0.92rem]! tw:[&_h3]:text-[1rem]!
        tw:[&_h3]:leading-[1.3]! tw:[&>div>h3:first-child]:mt-[1.69rem]! ${appearance}`}
    >
      {children}
    </section>
  );
}
