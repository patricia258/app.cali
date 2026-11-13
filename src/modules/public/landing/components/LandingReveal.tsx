import type { ComponentPropsWithoutRef } from 'react';
import { useLandingReveal } from '../hooks/useLandingReveal';

type Props = ComponentPropsWithoutRef<'div'> & {
  as?: 'div' | 'article';
  direction?: '' | 'left' | 'right' | 'up' | 'down' | 'zoom';
  flow?: boolean;
};

const startingTransform = {
  '': 'tw:translate-y-6',
  left: 'tw:-translate-x-[2.875rem]',
  right: 'tw:translate-x-[2.875rem]',
  up: 'tw:translate-y-11',
  down: 'tw:-translate-y-[2.375rem]',
  zoom: 'tw:scale-95',
} as const;

export function LandingReveal({ as = 'div', direction = '', flow = false, className, ...props }: Props) {
  const { ref, visible } = useLandingReveal<HTMLElement>();
  const motion = flow ? '' : `tw:transition-[opacity,transform,translate,scale] tw:duration-800 tw:ease-[cubic-bezier(.22,1,.36,1)] tw:motion-reduce:transform-none tw:motion-reduce:translate-none tw:motion-reduce:scale-none tw:motion-reduce:opacity-100 tw:motion-reduce:transition-none ${visible ? 'tw:opacity-100' : `tw:opacity-0 ${startingTransform[direction]}`}`;
  const visibility = { className: [className, motion, visible && 'is-visible'].filter(Boolean).join(' ') };

  if (as === 'article') return <article ref={ref} {...props} {...visibility} />;
  return <div ref={ref} {...props} {...visibility} />;
}
