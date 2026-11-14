import { CalendarDays, FileText, FolderKanban, Leaf } from 'lucide-react';

const rise = 'tw:motion-safe:animate-[sign-in-rise_.6s_cubic-bezier(.2,.7,.3,1)_both]';
const artwork = 'tw:pointer-events-none tw:absolute tw:z-1 tw:object-contain tw:opacity-10 tw:select-none tw:brightness-0 tw:invert tw:max-[861px]:opacity-50';
const feature = `tw:flex tw:items-center tw:gap-[0.625rem] tw:rounded-[0.5625rem] tw:border tw:border-solid tw:border-cali-day-canvas/14 tw:bg-cali-day-canvas/6 tw:px-3 tw:py-[0.5625rem] tw:text-[0.8125rem] tw:font-medium tw:text-cali-day-canvas/90 tw:[&_svg]:flex-none tw:[&_svg]:text-[#e7c66f] ${rise}`;

export function SignInBrand() {
  return <section className="tw:relative tw:isolate tw:min-h-0 tw:overflow-hidden tw:bg-[linear-gradient(170deg,#6a2536_0%,var(--cali-color-burgundy)_46%,#3d1620_100%)] tw:px-[clamp(2.625rem,5.2vw,5.125rem)] tw:pt-[clamp(1.75rem,4vh,3.625rem)] tw:pb-[1.375rem] tw:text-cali-day-canvas tw:after:pointer-events-none tw:after:absolute tw:after:inset-0 tw:after:-z-2 tw:after:bg-[linear-gradient(90deg,rgba(67,21,32,.06),rgba(67,21,32,.22))] tw:max-[1081px]:px-12 tw:max-[861px]:px-5 tw:max-[861px]:pt-[22px] tw:max-[861px]:pb-[26px]" aria-label="CALI Workspace">
        <img className={`${artwork} tw:top-[9%] tw:right-[7%] tw:w-[clamp(9.0625rem,18vw,15.625rem)] tw:rotate-8 tw:max-[561px]:right-[-8%] tw:max-[561px]:w-[140px]`} src="/brand/cali-oak-mark.svg" alt="" aria-hidden="true" />
        <img className={`${artwork} tw:right-[5%] tw:bottom-[16%] tw:w-[clamp(9.375rem,18vw,15rem)] tw:-rotate-13 tw:max-[561px]:right-[-9%] tw:max-[561px]:w-[145px]`} src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
        <img className={`${artwork} tw:bottom-[-7%] tw:left-[-9%] tw:w-[clamp(9.0625rem,19vw,16.25rem)] tw:-rotate-24`} src="/brand/cali-oak-mark.svg" alt="" aria-hidden="true" />

        <div className="tw:relative tw:z-2 tw:flex tw:h-full tw:min-h-0 tw:flex-col tw:max-[861px]:gap-3">
          <img className={`${rise} tw:m-0 tw:block tw:h-auto tw:w-[clamp(10rem,14vw,13.125rem)] tw:object-contain tw:object-left tw:[animation-delay:.05s] tw:max-[861px]:w-[104px]`} src="/brand/cali-workspace-transparent.svg" alt="CALI Workspace" />
          <div className="tw:mt-auto tw:max-w-[37.5rem] tw:max-[861px]:mt-0">
            <h1 className={`${rise} tw:m-0 tw:font-[Inter,system-ui,sans-serif] tw:text-[clamp(2.2rem,3.6vw,3.1rem)] tw:leading-[1.06] tw:font-bold tw:tracking-[-.025em] tw:text-cali-paper! tw:[animation-delay:.12s] tw:max-[861px]:text-[1.85rem]`}>O trabalho<br />continua aqui<span className="tw:text-[#e7c66f]">.</span></h1>
            <span className={`${rise} tw:mx-0 tw:mt-7 tw:mb-[1.375rem] tw:block tw:h-0.5 tw:w-[2.125rem] tw:rounded-full tw:bg-[#e7c66f] tw:[animation-delay:.2s] tw:max-[861px]:hidden`} aria-hidden="true" />
            <p className={`${rise} tw:max-w-[31.25rem] tw:text-[clamp(.98rem,1.15vw,1.16rem)] tw:leading-[1.75] tw:text-cali-day-canvas/84 tw:[animation-delay:.26s] tw:max-[861px]:hidden`}>Acompanhe o ciclo, valide o que importa e decida com contexto, sem depender de e-mails e planilhas.</p>
            <ul className="tw:mx-0 tw:mt-[1.625rem] tw:mb-0 tw:grid tw:max-w-[23.75rem] tw:list-none tw:gap-2 tw:p-0 tw:max-[761px]:hidden" aria-label="O que está no Workspace">
              <li className={`${feature} tw:[animation-delay:.34s]`}><FolderKanban size={16} aria-hidden="true" />Projetos, entregas e aprovações</li>
              <li className={`${feature} tw:[animation-delay:.42s]`}><CalendarDays size={16} aria-hidden="true" />Agenda, horas e capacidade</li>
              <li className={`${feature} tw:[animation-delay:.5s]`}><FileText size={16} aria-hidden="true" />Documentos e relatórios do ciclo</li>
            </ul>
          </div>
          <div className={`${rise} tw:mt-auto tw:flex tw:items-center tw:gap-4 tw:pt-[clamp(1.25rem,3vh,2.25rem)] tw:text-cali-day-canvas/82 tw:[animation-delay:.58s] tw:max-[861px]:hidden`}>
            <span className="tw:grid tw:size-[2.625rem] tw:-rotate-10 tw:place-items-center tw:text-[2rem] tw:leading-none tw:text-cali-gold" aria-hidden="true"><Leaf size={30} /></span>
            <p className="tw:text-[.88rem] tw:leading-[1.55] tw:text-cali-day-canvas/84">Pessoas como estratégia.<br />Negócios que evoluem.</p>
          </div>
        </div>
      </section>;
}
