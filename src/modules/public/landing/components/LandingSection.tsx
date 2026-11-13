import type { ReactNode } from 'react';
import { LandingReveal } from './LandingReveal';

const sectionTone = {
  light: 'tw:bg-[linear-gradient(#5a1e2d08_1px,transparent_1px),linear-gradient(90deg,#5a1e2d08_1px,transparent_1px),radial-gradient(circle_at_90%_18%,#b58c5214,transparent_24%)] tw:bg-cali-paper tw:[background-size:3.375rem_3.375rem,3.375rem_3.375rem,auto]',
  ivory: 'tw:bg-[linear-gradient(#5a1e2d09_1px,transparent_1px),linear-gradient(90deg,#5a1e2d09_1px,transparent_1px),radial-gradient(circle_at_12%_86%,#b58c521c,transparent_23%),linear-gradient(180deg,#f7f3ee,#f2ebe4)] tw:[background-size:3.25rem_3.25rem,3.25rem_3.25rem,auto,auto]',
  burgundy: 'tw:bg-[linear-gradient(#f7f3ee0a_1px,transparent_1px),linear-gradient(90deg,#f7f3ee0a_1px,transparent_1px),radial-gradient(circle_at_78%_16%,#b58c5230,transparent_27%),radial-gradient(circle_at_7%_88%,#f7f3ee0d,transparent_22%),linear-gradient(145deg,#551a2a,#351019)] tw:[background-size:3.25rem_3.25rem,3.25rem_3.25rem,auto,auto,auto] tw:text-cali-day-canvas',
  canvas: 'tw:bg-cali-day-canvas',
};

export function LandingSection({ tone, id, children }: { tone: keyof typeof sectionTone; id?: string; children: ReactNode }) {
  return <section id={id} className={`tw:relative tw:py-28 tw:[@media(35rem<width<=51.25rem)]:py-22 tw:[@media(max-width:35rem)]:py-[4.875rem] ${sectionTone[tone]}`}>{children}</section>;
}

export function LandingWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`tw:mx-auto tw:w-[min(73.75rem,calc(100%-4rem))] tw:max-[51.25rem]:w-[min(73.75rem,calc(100%-2.25rem))] tw:max-[35rem]:w-[calc(100%-1.75rem)] ${className ?? ''}`}>{children}</div>;
}

export function LandingSectionHeading({ title, eyebrow, description, center, dark }: {
  title: string;
  eyebrow: string;
  description?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <LandingReveal className={`tw:mb-[3.375rem] tw:max-w-[48.75rem] ${center ? 'tw:mx-auto tw:text-center' : ''}`}>
      <span className={`tw:mb-[1.125rem] tw:inline-block tw:text-[.656rem] tw:leading-[inherit] tw:font-bold tw:tracking-[.14em] tw:uppercase ${dark ? 'tw:text-cali-gold' : 'tw:text-cali-brand'}`}>{eyebrow}</span>
      <h2 className={`tw:m-0 tw:text-[clamp(1.9rem,3.4vw,2.9rem)] tw:leading-[1.08] tw:font-bold tw:tracking-[-.025em] ${dark ? 'tw:text-cali-day-canvas' : 'tw:text-cali-brand'}`}>{title}</h2>
      {description && <p className={`tw:m-0 tw:mt-5 tw:max-w-[42.5rem] tw:text-[.98rem] tw:leading-[1.7] ${center ? 'tw:mx-auto' : ''} ${dark ? 'tw:text-[#f7f3ee91]' : 'tw:text-[#655d58]'}`}>{description}</p>}
    </LandingReveal>
  );
}
