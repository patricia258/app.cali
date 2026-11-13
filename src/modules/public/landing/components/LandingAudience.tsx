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
          className={`tw:relative tw:flex tw:min-h-[30rem] tw:flex-col tw:items-start tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-(--id-line) tw:p-[clamp(1.875rem,4vw,3rem)] tw:[background-size:2.75rem_2.75rem,2.75rem_2.75rem,auto,auto] tw:after:pointer-events-none tw:after:absolute tw:after:-right-13 tw:after:-bottom-13 tw:after:size-[13.125rem] tw:after:bg-[url('/brand/cali-oak-mark.svg')] tw:after:bg-contain tw:after:bg-center tw:after:bg-no-repeat tw:[@media(35rem<width<=51.25rem)]:min-h-[26.875rem] tw:[@media(max-width:35rem)]:min-h-0 ${dark
            ? 'tw:bg-[linear-gradient(#f7f3ee09_1px,transparent_1px),linear-gradient(90deg,#f7f3ee09_1px,transparent_1px),radial-gradient(circle_at_84%_14%,#b58c5226,transparent_25%),linear-gradient(145deg,#672138,#3a121d)] tw:text-white tw:shadow-[0_1.25rem_2.75rem_#401f2512] tw:after:opacity-[.065] tw:after:brightness-0 tw:after:invert'
            : 'tw:bg-[linear-gradient(#5a1e2d06_1px,transparent_1px),linear-gradient(90deg,#5a1e2d06_1px,transparent_1px),linear-gradient(145deg,#fffdf9,#f5eee8)] tw:text-[#3d252c] tw:shadow-[0_.0625rem_.125rem_#27181c0a] tw:after:opacity-[.055]'}`}>
          <span className={`tw:absolute tw:top-6.5 tw:right-7 tw:font-cali-body tw:text-[2.2rem] tw:leading-[inherit] tw:font-bold tw:tracking-[-.02em] ${dark ? 'tw:text-[#f7f3ee2e]' : 'tw:text-cali-brand'}`} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div className={`tw:mb-auto tw:grid tw:size-12 tw:place-items-center tw:rounded-[var(--id-radius-control)] ${dark ? 'tw:bg-white/8 tw:text-[#d0aa72]' : 'tw:bg-cali-brand/[.065] tw:text-cali-brand'}`}><Icon size={23} aria-hidden="true" /></div>
          <small className={`tw:mt-12 tw:text-[.65rem] tw:leading-[inherit] tw:font-extrabold tw:tracking-[.13em] ${dark ? 'tw:text-cali-gold' : 'tw:text-cali-brand'}`}>{eyebrow}</small>
          <h3 className="tw:mt-3 tw:mb-3.5 tw:max-w-[31.875rem] tw:text-[clamp(1.45rem,2.2vw,1.9rem)] tw:leading-[1.12] tw:text-current">{title}</h3>
          <p className={`tw:m-0 tw:max-w-[33.75rem] tw:text-[.9rem] tw:leading-[1.68] ${dark ? 'tw:text-[#f7f3ee94]' : 'tw:text-[#655d58]'}`}>{description}</p>
          <ul className={`tw:m-0 tw:mt-7 tw:grid tw:w-full tw:list-none tw:grid-cols-2 tw:gap-x-3.5 tw:gap-y-2.5 tw:border-0 tw:border-t tw:border-solid tw:p-0 tw:pt-5.5 tw:[@media(max-width:35rem)]:grid-cols-1 ${dark ? 'tw:border-white/10 tw:text-[#f7f3eeb3]' : 'tw:border-(--lp-line) tw:text-[#655d58]'}`}>
            {actions.map((action) => <li key={action} className="tw:inline-flex tw:items-center tw:gap-[.4375rem] tw:text-[.73rem] tw:leading-[inherit] tw:font-bold"><Check className="tw:text-cali-gold" size={15} aria-hidden="true" /> {action}</li>)}
          </ul>
        </LandingReveal>
      ))}
    </div>
  );
}
