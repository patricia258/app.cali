import { MessageCircle } from 'lucide-react';
import { LandingWidth } from './LandingSection';
import { LandingReveal } from './LandingReveal';

export function LandingContact({ contactHref, video, poster }: { contactHref: string; video: string; poster: string }) {
  return (
    <section id="fale-com-a-pati" className="tw:relative tw:overflow-hidden tw:bg-[linear-gradient(rgb(var(--cali-rgb-burgundy-accent)/0.03137)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-burgundy-accent)/0.03137)_1px,transparent_1px),radial-gradient(circle_at_82%_24%,rgb(var(--cali-rgb-gold-accent)/0.1216),transparent_24%),linear-gradient(180deg,var(--cali-color-sand-surface),var(--cali-color-sand-soft))] tw:[background-size:3.25rem_3.25rem,3.25rem_3.25rem,auto,auto] tw:py-[clamp(5.5rem,9vw,8rem)] tw:[@media(max-width:35rem)]:py-17.5">
      <img className="tw:pointer-events-none tw:absolute tw:-top-12 tw:right-0 tw:w-80 tw:opacity-5" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true" />
      <img className="tw:pointer-events-none tw:absolute tw:-bottom-12 tw:left-0 tw:w-64 tw:opacity-5" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
      <LandingWidth className="tw:relative tw:grid tw:grid-cols-[minmax(0,1fr)_minmax(18.75rem,21.875rem)] tw:items-center tw:gap-[clamp(2.75rem,7vw,5.5rem)] tw:[@media(max-width:51.25rem)]:grid-cols-1 tw:[@media(max-width:51.25rem)]:gap-7">
        <LandingReveal className="tw:relative tw:z-3 tw:w-full tw:max-w-162.5" direction="left">
          <span className="tw:mb-4.5 tw:inline-block tw:text-cali-micro tw:font-bold tw:tracking-[.14em] tw:text-cali-gold">FALE COM A PATI</span>
          <h2 className="tw:mt-3.5 tw:mb-5 tw:max-w-155 tw:text-[clamp(2.7rem,4.8vw,4.7rem)] tw:leading-[.98] tw:tracking-[-.045em] tw:text-cali-brand tw:[@media(max-width:51.25rem)]:text-[clamp(2.45rem,10.5vw,4rem)]">Tem gente de verdade do outro lado.</h2>
          <p className="tw:mt-0 tw:max-w-147.5 tw:text-base tw:leading-[1.65] tw:text-cali-neutral-text">
            Quando algo pede contexto, a conversa não vira ticket. Você fala com a Pati,
            com a mesma proximidade que orienta o trabalho da CALI.
          </p>
          <a className="tw:mt-6 tw:inline-flex tw:min-h-12 tw:items-center tw:justify-center tw:gap-3 tw:rounded-[var(--id-radius-control)] tw:border tw:border-solid tw:border-cali-brand/12 tw:bg-cali-neutral-surface tw:px-5 tw:text-sm tw:font-semibold tw:text-cali-brand tw:motion-safe:hover:-translate-y-0.5 tw:[@media(max-width:35rem)]:w-full" href={contactHref} target="_blank" rel="noreferrer">
            Falar com a Pati <MessageCircle size={17} aria-hidden="true" />
          </a>
        </LandingReveal>
        <LandingReveal className="tw:grid tw:w-full tw:max-w-87.5 tw:gap-3 tw:justify-self-end tw:[@media(max-width:51.25rem)]:max-w-75 tw:[@media(max-width:51.25rem)]:justify-self-center tw:[@media(max-width:35rem)]:w-[min(16.875rem,76vw)]" direction="right">
          <div className="tw:relative tw:aspect-square tw:w-full tw:max-w-85 tw:overflow-hidden tw:rounded-[1.75rem] tw:border-4 tw:border-solid tw:border-cali-orange-line tw:bg-cali-sand-line tw:shadow-[0_1.375rem_3.125rem_rgb(var(--cali-rgb-burgundy-text)/0.1412)]">
            <video className="tw:block tw:size-full tw:object-cover tw:object-[50%_44%]" src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label="Vídeo da Patrícia, CALI RH" />
          </div>
          <div className="tw:flex tw:flex-wrap tw:items-baseline tw:justify-center tw:gap-2 tw:text-center tw:text-cali-neutral-accent">
            <strong className="tw:text-base tw:leading-[inherit] tw:font-semibold tw:text-cali-brand">Patrícia Lima</strong>
            <span className="tw:text-cali-label tw:leading-[inherit] tw:tracking-[.025em]">People Advisory Executive · CALI RH</span>
          </div>
        </LandingReveal>
      </LandingWidth>
    </section>
  );
}
