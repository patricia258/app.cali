import type { ComponentPropsWithoutRef } from 'react';

const noticeClass = { info: 'inline-notice', success: 'inline-notice success', danger: 'inline-notice danger' } as const;
const standaloneNotice = 'tw:workspace-standalone:mt-[1.125rem] tw:workspace-standalone:flex tw:workspace-standalone:items-start tw:workspace-standalone:gap-[.625rem] tw:workspace-standalone:rounded-[.6875rem] tw:workspace-standalone:border tw:workspace-standalone:border-solid tw:workspace-standalone:px-4 tw:workspace-standalone:py-[.875rem] tw:workspace-standalone:text-[.9rem]/[1.5]';

type InlineNoticeProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p';
  tone?: keyof typeof noticeClass;
};

export function InlineNotice({ as: Element = 'div', tone = 'info', className, role, ...props }: InlineNoticeProps) {
  const colors = tone === 'success'
    ? 'tw:workspace-standalone:border-[#bdd0c2] tw:workspace-standalone:bg-[#eef5ef] tw:workspace-standalone:text-[#2f5b40]'
    : 'tw:workspace-standalone:border-[#d7c8c0] tw:workspace-standalone:bg-[#f6efe9] tw:workspace-standalone:text-cali-ink';
  return <Element
    {...props}
    className={[noticeClass[tone], standaloneNotice, colors, className].filter(Boolean).join(' ')}
    role={role ?? (tone === 'danger' ? 'alert' : tone === 'success' ? 'status' : undefined)}
  />;
}
