import { ArrowRight, Check } from 'lucide-react';
import { LandingSection, LandingSectionHeading, LandingWidth } from './LandingSection';
import { LandingReveal } from './LandingReveal';

const packages = [
  {
    name: 'Partner', duration: '8 meses', hours: '10–15h', kind: 'partner',
    description: 'Direção sênior para organizar prioridades e apoiar decisões de pessoas, com acompanhamento online.',
  },
  {
    name: 'Full', duration: '12 meses', hours: '20–25h', kind: 'full',
    description: 'Mais presença para decisões complexas, com ritmo quinzenal e uma visita presencial fixa por mês.',
  },
] as const;

export function LandingPackages({ features }: { features: Record<'partner' | 'full', string[]> }) {
  return (
    <LandingSection tone="canvas" id="pacotes">
      <LandingWidth>
        <LandingSectionHeading center eyebrow="ASSESSORIA ESTRATÉGICA MENSAL" title="Uma assessoria. Duas formas de estar perto."
          description="Escolha o ritmo de acompanhamento da sua empresa. O escopo é definido em proposta." />
        <div className="tw:mx-auto tw:grid tw:max-w-275 tw:grid-cols-2 tw:gap-6 tw:[@media(max-width:50rem)]:max-w-140 tw:[@media(max-width:50rem)]:grid-cols-1 tw:[@media(max-width:50rem)]:gap-9.5">
          {packages.map(({ name, duration, hours, kind, description }) => {
            const featured = kind === 'full';
            return (
              <LandingReveal as="article" key={kind} direction={featured ? 'right' : 'left'}
                className={`tw:relative tw:flex tw:min-h-130 tw:flex-col tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-(--id-line) tw:p-[clamp(1.75rem,3vw,2.5rem)] tw:motion-safe:hover:-translate-y-1 tw:[@media(max-width:50rem)]:min-h-0 tw:[@media(max-width:35rem)]:px-6 ${featured ? 'tw:bg-cali-burgundy-text tw:text-cali-day-canvas tw:shadow-[0_1.125rem_2.375rem_rgb(var(--cali-rgb-burgundy-inverse)/0.2118)]' : 'tw:bg-cali-paper tw:text-cali-brand tw:shadow-[0_.0625rem_.125rem_rgb(var(--cali-rgb-burgundy-inverse)/0.03922)]'}`}>
                {featured && <div className="tw:absolute tw:-top-4 tw:left-10 tw:z-2 tw:rounded-[var(--id-radius-control)] tw:bg-cali-orange-line tw:px-3.5 tw:py-2 tw:text-cali-micro tw:leading-[inherit] tw:font-extrabold tw:tracking-[.11em] tw:text-cali-burgundy-text tw:[@media(max-width:35rem)]:left-6">MAIOR PROXIMIDADE</div>}
                <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
                  <h3 className="tw:m-0 tw:text-[clamp(1.45rem,2.2vw,1.9rem)] tw:leading-[1.12]">CALI {name}</h3>
                  <span className={`tw:rounded-[var(--id-radius-control)] tw:border tw:border-solid tw:px-2.5 tw:py-2 tw:text-cali-label tw:leading-[inherit] tw:font-bold tw:whitespace-nowrap tw:uppercase ${featured ? 'tw:border-cali-neutral-surface/25 tw:bg-cali-neutral-surface/8 tw:text-cali-day-canvas' : 'tw:border-cali-sand-line tw:bg-cali-neutral-soft tw:text-cali-brand'}`}>{duration}</span>
                </div>
                <p className={`tw:m-0 tw:mt-5 tw:min-h-[3.5em] tw:text-cali-body tw:leading-[1.65] ${featured ? 'tw:text-cali-sand-soft/83' : 'tw:text-cali-muted'}`}>{description}</p>
                <div className="tw:mt-8 tw:flex tw:items-baseline tw:gap-2.5 tw:[@media(max-width:35rem)]:flex-wrap">
                  <strong className="tw:font-[DM_Sans,sans-serif] tw:text-[clamp(2.4rem,4vw,3.6rem)] tw:leading-none tw:tracking-[-.06em]">{hours}</strong>
                  <span className={`tw:text-cali-detail tw:leading-[1.4] ${featured ? 'tw:text-cali-sand-soft/83' : 'tw:text-cali-muted'}`}>de referência por mês</span>
                </div>
                <ul className={`tw:m-0 tw:mt-8 tw:mb-7 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0 ${featured ? 'tw:text-cali-sand-soft/86' : 'tw:text-cali-neutral-accent'}`}>
                  {features[kind].map((item) => <li key={item} className="tw:flex tw:items-start tw:gap-2 tw:text-cali-detail tw:leading-[1.45]"><Check className="tw:shrink-0 tw:text-cali-gold" size={15} aria-hidden="true" />{item}</li>)}
                </ul>
                <a className={`tw:mt-auto tw:inline-flex tw:min-h-[3.0625rem] tw:w-full tw:items-center tw:justify-center tw:gap-3 tw:rounded-[var(--id-radius-control)] tw:border tw:border-solid tw:px-4 tw:py-3 tw:text-sm tw:leading-[inherit] tw:font-semibold tw:text-cali-brand tw:transition-colors ${featured ? 'tw:border-cali-orange-line tw:bg-cali-orange-line tw:hover:bg-cali-orange-soft' : 'tw:border-cali-neutral-line tw:bg-cali-paper tw:hover:border-cali-brand tw:hover:bg-cali-orange-surface'}`}
                  href="https://calirh.com/assessoria" target="_blank" rel="noopener noreferrer">Conhecer o {name} <ArrowRight size={16} aria-hidden="true" /></a>
              </LandingReveal>
            );
          })}
        </div>
      </LandingWidth>
    </LandingSection>
  );
}
