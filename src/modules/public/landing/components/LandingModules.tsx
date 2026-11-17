import type { LucideIcon } from 'lucide-react';
import { LandingReveal } from './LandingReveal';

export function LandingModules({ modules }: { modules: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <div className="tw:grid tw:grid-cols-3 tw:gap-px tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-cali-sand-soft/[0.07451] tw:bg-cali-sand-soft/[0.07451] tw:[@media(35rem<width<=65rem)]:grid-cols-2 tw:[@media(max-width:35rem)]:grid-cols-1">
      {modules.map(({ icon: Icon, title, text }, index) => (
        <LandingReveal
          as="article"
          key={title}
          className={`tw:min-h-[12.1875rem] tw:p-6.5 tw:[@media(max-width:35rem)]:min-h-42.5 tw:hover:bg-[linear-gradient(145deg,rgb(var(--cali-rgb-red-strong)/0.9804),rgb(var(--cali-rgb-burgundy-text)/0.9608))] ${index % 3 === 1 ? 'tw:bg-[linear-gradient(145deg,rgb(var(--cali-rgb-burgundy-accent)/0.9608),rgb(var(--cali-rgb-burgundy-text)/0.9412))]' : 'tw:bg-[linear-gradient(145deg,rgb(var(--cali-rgb-burgundy-accent)/0.9608),rgb(var(--cali-rgb-burgundy-text)/0.9412))]'}`}
          direction={index % 3 === 0 ? 'left' : index % 3 === 1 ? 'up' : 'right'}
          style={{ transitionDelay: `${index * 55}ms` }}
        >
          <Icon size={21} className="tw:text-cali-orange-line" aria-hidden="true" />
          <h3 className="tw:mt-8.5 tw:mb-2 tw:text-base tw:leading-[1.25] tw:text-cali-neutral-surface">{title}</h3>
          <p className="tw:m-0 tw:text-cali-detail tw:leading-[1.62] tw:text-cali-sand-soft/47">{text}</p>
        </LandingReveal>
      ))}
    </div>
  );
}
