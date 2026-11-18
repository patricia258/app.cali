import { BarChart3, Leaf, ShieldCheck, Users } from 'lucide-react';
import { LandingReveal } from './LandingReveal';

const principles = [
  { title: 'Direção', description: 'prioridade antes de atividade', icon: Leaf },
  { title: 'Leitura', description: 'dados antes de opinião solta', icon: BarChart3, accented: true },
  { title: 'Proximidade', description: 'ao lado da liderança', icon: Users, accented: true },
  { title: 'Governança', description: 'registro sem burocracia', icon: ShieldCheck },
];

export function LandingPrinciples() {
  return (
    <LandingReveal className="tw:grid tw:grid-cols-2 tw:gap-2.5 tw:[@media(max-width:65rem)]:max-w-180 tw:[@media(max-width:35rem)]:grid-cols-1" direction="right">
      {principles.map(({ title, description, icon: Icon, accented }) => (
        <article key={title} className={`tw:relative tw:flex tw:min-h-40 tw:flex-col tw:items-start tw:justify-end tw:overflow-hidden tw:rounded-2xl tw:border tw:border-solid tw:border-cali-brand/13 tw:p-5.5 tw:shadow-[0_.94rem_2rem_rgb(var(--cali-rgb-burgundy-text)/0.0549)] tw:transition-[transform,border-color,background] tw:duration-200 tw:after:pointer-events-none tw:after:absolute tw:after:-right-9.5 tw:after:-bottom-11.5 tw:after:size-30 tw:after:rounded-full tw:after:bg-[radial-gradient(circle,rgb(var(--cali-rgb-gold-accent)/0.1608),transparent_70%)] tw:hover:-translate-y-0.75 tw:hover:border-cali-brand/21 tw:motion-reduce:transition-none tw:[@media(max-width:35rem)]:min-h-34 ${accented ? 'tw:bg-[linear-gradient(145deg,rgb(var(--cali-rgb-gold-accent)/0.102),rgb(var(--cali-rgb-sand-surface)/0.949))]' : 'tw:bg-[linear-gradient(145deg,rgb(var(--cali-rgb-sand-surface)/0.9608),rgb(var(--cali-rgb-sand-soft)/0.8784))]'}`}>
          <Icon size={21} className="tw:mb-auto tw:text-cali-brand" aria-hidden="true" />
          <span className="tw:text-cali-label tw:leading-[inherit] tw:font-extrabold tw:tracking-[.12em] tw:text-(--lp-gold) tw:uppercase">{title}</span>
          <strong className="tw:mt-1.5 tw:font-cali-body tw:text-lg tw:leading-[1.2] tw:font-bold tw:tracking-[-.01em] tw:text-cali-red-inverse">{description}</strong>
        </article>
      ))}
    </LandingReveal>
  );
}
