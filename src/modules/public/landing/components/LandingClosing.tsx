import { ArrowRight, MessageCircle } from 'lucide-react';
import { Link } from '../../../../components/navigation/Link';
import { LandingWidth } from './LandingSection';
import { LandingReveal } from './LandingReveal';

export function LandingClosing({ contactHref }: { contactHref: string }) {
  return (
    <section className="tw:relative tw:overflow-hidden tw:bg-[#4d1725] tw:bg-[linear-gradient(#f7f3ee06_1px,transparent_1px),linear-gradient(90deg,#f7f3ee06_1px,transparent_1px)] tw:[background-size:3.25rem_3.25rem] tw:py-[5.75rem] tw:text-cali-day-canvas">
      <img className="tw:pointer-events-none tw:absolute tw:-top-[3.4375rem] tw:right-[4%] tw:w-[18.75rem] tw:rotate-11 tw:opacity-[.065] tw:brightness-0 tw:invert" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
      <LandingWidth>
      <LandingReveal className="tw:relative tw:z-1 tw:grid tw:grid-cols-[1fr_auto] tw:items-center tw:gap-16 tw:[@media(max-width:65rem)]:grid-cols-1" direction="up">
        <div>
          <span className="tw:inline-block tw:text-[.656rem] tw:leading-[inherit] tw:font-bold tw:tracking-[.14em] tw:text-(--id-gold-soft)">JÁ É CLIENTE CALI?</span>
          <h2 className="tw:mt-3.5 tw:text-[clamp(1.9rem,3.4vw,2.9rem)] tw:leading-[1.08] tw:text-white">O trabalho continua aqui.</h2>
          <p className="tw:m-0 tw:mt-4 tw:text-[#f7f3ee94]">Entre com seu e-mail cadastrado e retome o ciclo de onde parou.</p>
        </div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-4 tw:[@media(max-width:65rem)]:justify-start tw:[@media(max-width:35rem)]:flex-col tw:[@media(max-width:35rem)]:items-start">
          <Link className="tw:inline-flex tw:min-h-12 tw:items-center tw:justify-center tw:gap-3 tw:rounded-[var(--id-radius-control)] tw:bg-white tw:px-5 tw:text-sm tw:font-semibold tw:text-cali-brand tw:motion-safe:hover:-translate-y-0.5 tw:[@media(max-width:35rem)]:w-full" to="/login">
            Acessar Workspace <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <a className="tw:inline-flex tw:items-center tw:gap-2 tw:rounded-[var(--id-radius-control)] tw:text-sm tw:font-semibold tw:text-[#f7f3eed1] tw:hover:underline" href={contactHref} target="_blank" rel="noreferrer">
            Ainda não é cliente? Fale com a CALI <MessageCircle size={15} aria-hidden="true" />
          </a>
        </div>
      </LandingReveal>
      </LandingWidth>
    </section>
  );
}
