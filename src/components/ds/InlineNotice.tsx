import type { ComponentPropsWithoutRef } from 'react';

const noticeClass = { info: 'inline-notice', success: 'inline-notice success', danger: 'inline-notice danger', warning: 'inline-notice warning' } as const;
const standaloneNotice = 'tw:workspace-standalone:mt-4.5 tw:workspace-standalone:flex tw:workspace-standalone:items-start tw:workspace-standalone:gap-2.5 tw:workspace-standalone:rounded-cali-panel tw:workspace-standalone:border tw:workspace-standalone:border-solid tw:workspace-standalone:px-4 tw:workspace-standalone:py-3.5 tw:workspace-standalone:text-sm/[1.5]';

type InlineNoticeProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p';
  tone?: keyof typeof noticeClass;
};

export function InlineNotice({ as: Element = 'div', tone = 'info', className, role, ...props }: InlineNoticeProps) {
  const colors = tone === 'success'
    ? 'tw:workspace-standalone:border-cali-success-line tw:workspace-standalone:bg-cali-success-surface tw:workspace-standalone:text-cali-success'
    : 'tw:workspace-standalone:border-cali-line-strong tw:workspace-standalone:bg-cali-surface-muted tw:workspace-standalone:text-cali-ink';
  return <Element
    {...props}
    className={[
      noticeClass[tone],
      tone === 'warning'
        ? 'tw:rounded-lg tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-4 tw:py-3 tw:leading-[1.55] tw:text-cali-warning'
        : `${standaloneNotice} ${colors}`,
      className,
    ].filter(Boolean).join(' ')}
    role={role ?? (tone === 'danger' ? 'alert' : tone === 'success' ? 'status' : undefined)}
  />;
}
