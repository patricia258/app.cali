import { Check, LayoutDashboard, Users } from 'lucide-react';
import { LandingReveal } from './LandingReveal';

const audiences = [
  {
    eyebrow: 'AMBIENTE DO CLIENTE', title: 'Visibilidade sem virar operador da ferramenta.', icon: Users,
    description: 'Cronograma, entregáveis, horas, documentos e relatórios ficam disponíveis para consulta, comentários, aprovações e ajustes com histórico.',
    actions: ['acompanhar', 'participar', 'validar', 'avaliar'],
  },
  {
    eyebrow: 'AMBIENTE CALI', title: 'A operação inteira no mesmo sistema.', icon: LayoutDashboard, dark: true,
    description: 'Carteira, projetos, agenda, documentos, relatórios, Mapa de People e propostas ficam integrados à operação conduzida pela CALI.',
    actions: ['administrar', 'executar', 'interpretar', 'decidir'],
  },
];

export function LandingAudience() {
  return (
    <div className="tw:grid tw:grid-cols-2 tw:gap-4.5 tw:[@media(max-width:51.25rem)]:grid-cols-1">
      {audiences.map(({ eyebrow, title, icon: Icon, description, actions, dark }, index) => (
        <LandingReveal as="article" key={eyebrow} direction={dark ? 'right' : 'left'}
          className={`tw:relative tw:flex tw:min-h-120 tw:flex-col tw:items-start tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-(--id-line) tw:p-[clamp(1.875rem,4vw,3rem)] tw:[background-size:2.75rem_2.75rem,2.75rem_2.75rem,auto,auto] tw:after:pointer-events-none tw:after:absolute tw:after:-right-13 tw:after:-bottom-13 tw:after:size-52.5 tw:after:bg-[url('/brand/cali-oak-mark.svg')] tw:after:bg-contain tw:after:bg-center tw:after:bg-no-repeat tw:[@media(35rem<width<=51.25rem)]:min-h-107.5 tw:[@media(max-width:35rem)]:min-h-0 ${dark
            ? 'tw:bg-[linear-gradient(rgb(var(--cali-rgb-sand-soft)/0.03529)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-sand-soft)/0.03529)_1px,transparent_1px),radial-gradient(circle_at_84%_14%,rgb(var(--cali-rgb-gold-accent)/0.149),transparent_25%),linear-gradient(145deg,var(--cali-color-burgundy-accent),var(--cali-color-burgundy-text))] tw:text-cali-neutral-surface tw:shadow-[0_1.25rem_2.75rem_rgb(var(--cali-rgb-red-inverse)/0.07059)] tw:after:opacity-[.065] tw:after:brightness-0 tw:after:invert'
            : 'tw:bg-[linear-gradient(rgb(var(--cali-rgb-burgundy-accent)/0.02353)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--cali-rgb-burgundy-accent)/0.02353)_1px,transparent_1px),linear-gradient(145deg,var(--cali-color-sand-surface),var(--cali-color-neutral-soft))] tw:text-cali-red-inverse tw:shadow-[0_.0625rem_.125rem_rgb(var(--cali-rgb-burgundy-inverse)/0.03922)] tw:after:opacity-[.055]'}`}>
          <span className={`tw:absolute tw:top-6.5 tw:right-7 tw:font-cali-body tw:text-4xl tw:leading-[inherit] tw:font-bold tw:tracking-[-.02em] ${dark ? 'tw:text-cali-sand-soft/18' : 'tw:text-cali-brand'}`} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div className={`tw:mb-auto tw:grid tw:size-12 tw:place-items-center tw:rounded-[var(--id-radius-control)] ${dark ? 'tw:bg-cali-neutral-surface/8 tw:text-cali-orange-line' : 'tw:bg-cali-brand/[.065] tw:text-cali-brand'}`}><Icon size={23} aria-hidden="true" /></div>
          <small className={`tw:mt-12 tw:text-cali-micro tw:leading-[inherit] tw:font-extrabold tw:tracking-[.13em] ${dark ? 'tw:text-cali-gold' : 'tw:text-cali-brand'}`}>{eyebrow}</small>
          <h3 className="tw:mt-3 tw:mb-3.5 tw:max-w-127.5 tw:text-[clamp(1.45rem,2.2vw,1.9rem)] tw:leading-[1.12] tw:text-current">{title}</h3>
          <p className={`tw:m-0 tw:max-w-135 tw:text-sm tw:leading-[1.68] ${dark ? 'tw:text-cali-sand-soft/58' : 'tw:text-cali-muted'}`}>{description}</p>
          <ul className={`tw:m-0 tw:mt-7 tw:grid tw:w-full tw:list-none tw:grid-cols-2 tw:gap-x-3.5 tw:gap-y-2.5 tw:border-0 tw:border-t tw:border-solid tw:p-0 tw:pt-5.5 tw:[@media(max-width:35rem)]:grid-cols-1 ${dark ? 'tw:border-cali-neutral-surface/10 tw:text-cali-sand-soft/70' : 'tw:border-(--lp-line) tw:text-cali-muted'}`}>
            {actions.map((action) => <li key={action} className="tw:inline-flex tw:items-center tw:gap-2 tw:text-xs tw:leading-[inherit] tw:font-bold"><Check className="tw:text-cali-gold" size={15} aria-hidden="true" /> {action}</li>)}
          </ul>
        </LandingReveal>
      ))}
    </div>
  );
}
