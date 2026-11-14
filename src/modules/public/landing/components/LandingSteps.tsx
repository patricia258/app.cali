import { LineChart, Target, Users, Workflow } from 'lucide-react';
import { LandingSection, LandingSectionHeading, LandingWidth } from './LandingSection';
import { LandingReveal } from './LandingReveal';
import './landing-steps-motion.css';

const steps = [
  { icon: Target, title: 'Direção', text: 'A CALI entende o momento do negócio, define prioridade e organiza o ciclo.' },
  { icon: Workflow, title: 'Planejamento', text: 'Projetos, marcos, reuniões e entregáveis entram no Workspace com clareza.' },
  { icon: Users, title: 'Execução conjunta', text: 'A CALI conduz. A liderança acompanha, participa e valida sem operar um SaaS de RH.' },
  { icon: LineChart, title: 'Leitura executiva', text: 'O ciclo fecha com resultado, riscos, decisões tomadas e próximos movimentos.' },
];

const grid = 'tw:relative tw:grid tw:grid-cols-[repeat(4,1fr)] tw:gap-5 tw:[@media(35rem<width<=65rem)]:grid-cols-[repeat(2,1fr)] tw:[@media(35rem<width<=65rem)]:gap-x-6 tw:[@media(35rem<width<=65rem)]:gap-y-12 tw:[@media(max-width:35rem)]:grid-cols-[1fr] tw:[@media(max-width:35rem)]:gap-[2.375rem]';
const connector = "tw:before:absolute tw:before:inset-x-[8%] tw:before:top-[2.1875rem] tw:before:h-px tw:before:bg-[linear-gradient(90deg,transparent,rgba(90,30,45,.24),transparent)] tw:before:origin-left tw:before:[transform:scaleX(0)] tw:before:content-[''] tw:[&.is-visible]:before:animate-[landing-step-line_1.15s_cubic-bezier(.22,1,.36,1)_.08s_forwards] tw:[@media(max-width:65rem)]:before:hidden tw:motion-reduce:before:[transform:scaleX(1)]! tw:motion-reduce:before:animate-none!";
const article = 'tw:group tw:relative tw:px-[.625rem] tw:text-center tw:text-cali-ink tw:[@media(max-width:35rem)]:grid tw:[@media(max-width:35rem)]:grid-cols-[4.25rem_minmax(0,1fr)] tw:[@media(max-width:35rem)]:gap-[1.125rem] tw:[@media(max-width:35rem)]:text-left';
const iconFrame = 'tw:order-first tw:grid tw:size-[4.125rem] tw:place-items-center tw:rounded-[.75rem] tw:bg-cali-brand tw:text-white tw:shadow-[0_.75rem_1.875rem_rgba(90,30,45,.16)] tw:[transition:transform_.28s_ease,box-shadow_.28s_ease,background_.28s_ease] tw:[article:hover_&]:[transform:translateY(-.375rem)_scale(1.06)] tw:[article:hover_&]:bg-[linear-gradient(145deg,#6d2539,#4b1725)] tw:[article:hover_&]:shadow-[0_1.125rem_2.125rem_rgba(90,30,45,.22)] tw:group-[.is-visible]:animate-[landing-step-icon_.72s_cubic-bezier(.2,.9,.25,1.25)_both] tw:motion-reduce:animate-none!';
const heading = 'tw:mx-0 tw:mt-[1.375rem] tw:mb-2 tw:text-[1.02rem]/[1.25] tw:text-cali-brand tw:[text-shadow:none] tw:[@media(max-width:51.25rem)]:mt-0 tw:[@media(max-width:51.25rem)]:text-[1.25rem]/[1.15] tw:[@media(max-width:35rem)]:self-end tw:[@media(max-width:35rem)]:text-[1.2rem]/[1.15]!';
const description = 'tw:m-0 tw:text-[.76rem]/[1.62] tw:text-[#5f5854] tw:[@media(max-width:51.25rem)]:text-[.97rem]/[1.6] tw:[@media(max-width:35rem)]:col-start-2 tw:[@media(max-width:35rem)]:text-[.95rem]/[1.55]!';

export function LandingSteps() {
  return <LandingSection tone="light" id="como-funciona">
    <LandingWidth>
      <LandingSectionHeading center eyebrow="COMO FUNCIONA" title="Da direção à leitura executiva." />
      <LandingReveal className={`${grid} ${connector}`} flow>
        {steps.map(({ icon: Icon, title, text }, index) => (
          <LandingReveal as="article" className={article} key={title} direction={index % 2 === 0 ? 'left' : 'right'} style={{ transitionDelay: `${index * 80}ms` }}>
            <div className="tw:relative tw:z-1 tw:grid tw:justify-items-center tw:gap-[.375rem] tw:rounded-[.75rem] tw:[@media(max-width:35rem)]:row-span-2">
              <span className="tw:text-[.62rem] tw:font-[850] tw:tracking-[.14em] tw:text-cali-gold">{String(index + 1).padStart(2, '0')}</span>
              <i className={iconFrame} style={{ animationDelay: `${index * 100}ms` }}><Icon size={20} aria-hidden="true" /></i>
            </div>
            <h3 className={heading}>{title}</h3>
            <p className={description}>{text}</p>
          </LandingReveal>
        ))}
      </LandingReveal>
    </LandingWidth>
  </LandingSection>;
}
