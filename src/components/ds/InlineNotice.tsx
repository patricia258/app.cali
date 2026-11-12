import type { ComponentPropsWithoutRef } from 'react';

const noticeClass = { info: 'inline-notice', success: 'inline-notice success', danger: 'inline-notice danger' } as const;

type InlineNoticeProps = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'p';
  tone?: keyof typeof noticeClass;
};

export function InlineNotice({ as: Element = 'div', tone = 'info', className, role, ...props }: InlineNoticeProps) {
  return <Element
    {...props}
    className={className ? `${noticeClass[tone]} ${className}` : noticeClass[tone]}
    role={role ?? (tone === 'danger' ? 'alert' : tone === 'success' ? 'status' : undefined)}
  />;
}
