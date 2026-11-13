import type { ComponentPropsWithoutRef } from 'react';

export function WorkflowPage({ as: Element = 'div', className, ...props }: ComponentPropsWithoutRef<'div'> & { as?: 'div' | 'section' }) {
  return <Element {...props} className={`wf tw:mx-auto tw:max-w-[113.85rem] tw:font-cali-body tw:text-[#302b2d] ${className ?? ''}`} />;
}
