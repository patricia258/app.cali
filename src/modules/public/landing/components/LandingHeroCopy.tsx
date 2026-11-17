import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from '../../../../components/navigation/Link';
import { LandingReveal } from './LandingReveal';

const proof = [
  ['Entregas', 'aprovação e histórico'],
  ['Horas', 'consumo do ciclo'],
  ['Documentos', 'versões aprovadas'],
];

export function LandingHeroCopy() {
  return (
    <LandingReveal className="tw:max-w-140 tw:text-left tw:[@media(max-width:60rem)]:max-w-175 tw:[@media(max-width:60rem)]:text-center" direction="left">
      <span className="tw:inline-block tw:text-cali-micro tw:leading-[inherit] tw:font-bold tw:tracking-[.14em] tw:text-(--id-gold-soft) tw:uppercase">CALI WORKSPACE</span>
      <h1 className="tw:m-0 tw:mt-6 tw:max-w-155 tw:text-[clamp(2.4rem,4.1vw,3.7rem)] tw:leading-[1.02] tw:tracking-[-.035em] tw:text-cali-gold-surface">Acompanhe seus projetos <span className="tw:mt-3 tw:block tw:text-(--id-gold-soft) tw:[@media(max-width:35rem)]:mt-2">com o app da CALI.</span></h1>
      <p className="tw:m-0 tw:mt-5 tw:max-w-125 tw:text-base tw:leading-[1.6] tw:text-cali-sand-soft/78">Entregas, horas, agenda, documentos e decisões da sua empresa com a CALI, no mesmo lugar e com histórico.</p>
      <div className="tw:mt-7.5 tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:[@media(max-width:47.5rem)]:w-full tw:[@media(max-width:47.5rem)]:flex-nowrap tw:[@media(max-width:47.5rem)]:gap-2 tw:[@media(max-width:47.5rem)]:[&>*]:box-border tw:[@media(max-width:47.5rem)]:[&>*]:min-h-12 tw:[@media(max-width:47.5rem)]:[&>*]:min-w-0 tw:[@media(max-width:47.5rem)]:[&>*]:max-w-1/2 tw:[@media(max-width:47.5rem)]:[&>*]:flex-1 tw:[@media(max-width:47.5rem)]:[&>*]:justify-center tw:[@media(max-width:47.5rem)]:[&>*]:gap-1.5 tw:[@media(max-width:47.5rem)]:[&>*]:px-2.5 tw:[@media(max-width:47.5rem)]:[&>*]:py-1.5 tw:[@media(max-width:47.5rem)]:[&>*]:text-center tw:[@media(max-width:47.5rem)]:[&>*]:text-cali-detail tw:[@media(max-width:47.5rem)]:[&>*]:leading-[1.2]">
        <Link className="tw:inline-flex tw:min-h-[3.4375rem] tw:w-max tw:items-center tw:justify-center tw:gap-5 tw:rounded-[var(--id-radius-control)] tw:bg-cali-gold-surface tw:px-5.5 tw:font-cali-body tw:text-sm tw:leading-none tw:font-semibold tw:text-(--id-burgundy) tw:motion-safe:transition-transform tw:motion-safe:hover:-translate-y-0.75 tw:focus-visible:outline-2 tw:focus-visible:outline-offset-3 tw:focus-visible:outline-cali-gold" to="/login">
          Entrar no Workspace <ArrowUpRight className="tw:shrink-0 tw:[@media(max-width:47.5rem)]:size-4" size={19} aria-hidden="true" />
        </Link>
        <a className="tw:inline-flex tw:min-h-13 tw:items-center tw:gap-2 tw:rounded-[var(--id-radius-control)] tw:border tw:border-solid tw:border-cali-neutral-surface/28 tw:px-4.5 tw:font-semibold tw:text-cali-day-canvas tw:no-underline tw:transition-colors tw:hover:border-cali-neutral-surface/45 tw:hover:bg-cali-neutral-surface/8" href="#workspace">
          Ver o app por dentro <ArrowRight className="tw:shrink-0 tw:[@media(max-width:47.5rem)]:size-4" size={17} aria-hidden="true" />
        </a>
      </div>
      <ul className="tw:m-0 tw:mt-8.5 tw:flex tw:list-none tw:flex-wrap tw:p-0 tw:[@media(max-width:56.25rem)]:hidden" aria-label="O que o Workspace reúne">
        {proof.map(([title, detail]) => <li key={title} className="tw:grid tw:gap-0.5 tw:border-0 tw:border-l tw:border-solid tw:border-cali-neutral-surface/18 tw:px-5.5 tw:first:border-l-0 tw:first:pl-0"><strong className="tw:text-cali-body tw:leading-[inherit] tw:font-bold tw:text-cali-gold-surface">{title}</strong><span className="tw:text-cali-detail tw:leading-[inherit] tw:text-cali-sand-soft/62">{detail}</span></li>)}
      </ul>
    </LandingReveal>
  );
}
