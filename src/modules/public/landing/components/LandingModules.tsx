import type { LucideIcon } from 'lucide-react';
import { LandingReveal } from './LandingReveal';

export function LandingModules({ modules }: { modules: { icon: LucideIcon; title: string; text: string }[] }) {
  return (
    <div className="tw:grid tw:grid-cols-3 tw:gap-px tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-[#f7f3ee13] tw:bg-[#f7f3ee13] tw:[@media(35rem<width<=65rem)]:grid-cols-2 tw:[@media(max-width:35rem)]:grid-cols-1">
      {modules.map(({ icon: Icon, title, text }, index) => (
        <LandingReveal
          as="article"
          key={title}
          className={`tw:min-h-[12.1875rem] tw:p-6.5 tw:[@media(max-width:35rem)]:min-h-[10.625rem] tw:hover:bg-[linear-gradient(145deg,#6f2d3efa,#441622f5)] ${index % 3 === 1 ? 'tw:bg-[linear-gradient(145deg,#521a28f5,#401923f0)]' : 'tw:bg-[linear-gradient(145deg,#5b1c2cf5,#351019f0)]'}`}
          direction={index % 3 === 0 ? 'left' : index % 3 === 1 ? 'up' : 'right'}
          style={{ transitionDelay: `${index * 55}ms` }}
        >
          <Icon size={21} className="tw:text-[#d0aa72]" aria-hidden="true" />
          <h3 className="tw:mt-[2.125rem] tw:mb-[.5625rem] tw:text-[1.02rem] tw:leading-[1.25] tw:text-white">{title}</h3>
          <p className="tw:m-0 tw:text-[.79rem] tw:leading-[1.62] tw:text-[#f7f3ee78]">{text}</p>
        </LandingReveal>
      ))}
    </div>
  );
}
