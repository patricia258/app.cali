import type { ReactNode } from 'react';
import { LandingReveal } from './LandingReveal';

const sectionTone = {
  light: 'tw:bg-[linear-gradient(rgb(var(--cali-rgb-burgundy-accent)/0.03137)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-burgundy-accent)/0.03137)_1px,transparent_1px),radial-gradient(circle_at_90%_18%,rgb(var(--cali-rgb-gold-accent)/0.07843),transparent_24%)] tw:bg-cali-paper tw:[background-size:3.375rem_3.375rem,3.375rem_3.375rem,auto]',
  ivory: 'tw:bg-[linear-gradient(rgb(var(--cali-rgb-burgundy-accent)/0.03529)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-burgundy-accent)/0.03529)_1px,transparent_1px),radial-gradient(circle_at_12%_86%,rgb(var(--cali-rgb-gold-accent)/0.1098),transparent_23%),linear-gradient(180deg,var(--cali-color-sand-soft),var(--cali-color-neutral-soft))] tw:[background-size:3.25rem_3.25rem,3.25rem_3.25rem,auto,auto]',
  burgundy: 'tw:bg-[linear-gradient(rgb(var(--cali-rgb-sand-soft)/0.03922)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-sand-soft)/0.03922)_1px,transparent_1px),radial-gradient(circle_at_78%_16%,rgb(var(--cali-rgb-gold-accent)/0.1882),transparent_27%),radial-gradient(circle_at_7%_88%,rgb(var(--cali-rgb-sand-soft)/0.05098),transparent_22%),linear-gradient(145deg,var(--cali-color-burgundy-accent),var(--cali-color-burgundy-text))] tw:[background-size:3.25rem_3.25rem,3.25rem_3.25rem,auto,auto,auto] tw:text-cali-day-canvas',
  canvas: 'tw:bg-cali-day-canvas',
};

export function LandingSection({ tone, id, children }: { tone: keyof typeof sectionTone; id?: string; children: ReactNode }) {
  return <section id={id} className={`tw:relative tw:py-28 tw:[@media(35rem<width<=51.25rem)]:py-22 tw:[@media(max-width:35rem)]:py-19.5 ${sectionTone[tone]}`}>{children}</section>;
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
    <LandingReveal className={`tw:mb-13.5 tw:max-w-195 ${center ? 'tw:mx-auto tw:text-center' : ''}`}>
      <span className={`tw:mb-4.5 tw:inline-block tw:text-cali-micro tw:leading-[inherit] tw:font-bold tw:tracking-[.14em] tw:uppercase ${dark ? 'tw:text-cali-gold' : 'tw:text-cali-brand'}`}>{eyebrow}</span>
      <h2 className={`tw:m-0 tw:text-[clamp(1.9rem,3.4vw,2.9rem)] tw:leading-[1.08] tw:font-bold tw:tracking-[-.025em] ${dark ? 'tw:text-cali-day-canvas' : 'tw:text-cali-brand'}`}>{title}</h2>
      {description && <p className={`tw:m-0 tw:mt-5 tw:max-w-170 tw:text-base tw:leading-[1.7] ${center ? 'tw:mx-auto' : ''} ${dark ? 'tw:text-cali-sand-soft/57' : 'tw:text-cali-muted'}`}>{description}</p>}
    </LandingReveal>
  );
}
