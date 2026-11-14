import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLandingSlides } from '../hooks/useLandingSlides';
import { LandingWidth } from './LandingSection';
import { LandingReveal } from './LandingReveal';

export type ScreenSlot = {
  label: string;
  eyebrow: string;
  description: string;
  src?: string;
  fallbackSrc?: string;
};

function ScreenVisual({ slot }: { slot: ScreenSlot }) {
  const [failed, setFailed] = useState(false);
  const source = failed && slot.fallbackSrc ? slot.fallbackSrc : slot.src;
  if (source) {
    return <img className="tw:block tw:h-auto tw:w-full tw:bg-white tw:object-contain tw:object-top" src={source} alt={slot.label} decoding="async" onError={() => setFailed(true)} />;
  }
  return (
    <div className="tw:relative tw:grid tw:aspect-video tw:place-content-center tw:justify-items-center tw:overflow-hidden tw:bg-[linear-gradient(145deg,#461621,#241116)] tw:text-center" aria-label={`Espaço reservado para print: ${slot.label}`}>
      <img className="tw:absolute tw:w-[18.125rem] tw:opacity-5 tw:brightness-0 tw:invert" src="/brand/cali-oak-mark-light.svg" alt="" aria-hidden="true" />
      <span className="tw:relative tw:text-[.62rem] tw:font-extrabold tw:tracking-[.16em] tw:text-[#d0a972]">{slot.eyebrow}</span>
      <strong className="tw:relative tw:mt-2 tw:font-cali-heading tw:text-[clamp(1.8rem,4vw,3.6rem)] tw:text-white">{slot.label}</strong>
      <small className="tw:relative tw:mt-2.5 tw:text-[.7rem] tw:text-[#f7f3ee59]">print reservado para inserir depois</small>
    </div>
  );
}

function ScreenArrow({ previous, onClick }: { previous?: boolean; onClick: () => void }) {
  const Icon = previous ? ChevronLeft : ChevronRight;
  return (
    <button type="button" aria-label={previous ? 'Tela anterior' : 'Próxima tela'} onClick={onClick}
      className="tw:pointer-events-auto tw:grid tw:size-[2.1875rem] tw:flex-none tw:cursor-pointer tw:place-items-center tw:rounded-full tw:border tw:border-solid tw:border-white/48 tw:bg-transparent tw:p-0 tw:text-cali-day-canvas tw:transition-colors tw:hover:border-cali-day-canvas tw:hover:bg-cali-day-canvas tw:hover:text-cali-brand tw:focus-visible:border-cali-day-canvas tw:focus-visible:bg-cali-day-canvas tw:focus-visible:text-cali-brand tw:[@media(max-width:51.25rem)]:size-10">
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function LandingScreens({ screens }: { screens: ScreenSlot[] }) {
  const { active, select, move } = useLandingSlides(screens.length);
  return (
    <section className="tw:bg-[#35121f] tw:py-[clamp(4.125rem,8vw,6.875rem)] tw:[@media(max-width:35rem)]:pt-16 tw:[@media(max-width:35rem)]:pb-[4.625rem]">
      <LandingWidth className="tw:[@media(max-width:35rem)]:px-[.6875rem]!">
        <LandingReveal className="tw:relative tw:mx-auto tw:w-full tw:max-w-[68.75rem] tw:px-[3.375rem] tw:pb-[2.125rem] tw:[@media(max-width:35rem)]:px-0 tw:[@media(max-width:35rem)]:pb-[3.4375rem]"
          role="region" aria-roledescription="carrossel" aria-label="Telas do CALI Workspace na prática" direction="zoom">
          <div className="tw:relative tw:w-full tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-white/27 tw:bg-cali-day-canvas tw:shadow-[0_1.375rem_3.4375rem_#1204093d]">
            {screens.map((slot, index) => (
              <div key={slot.label} aria-hidden={index !== active} data-landing-screen={index === active ? 'current' : 'hidden'}
                className={index === active ? 'tw:relative tw:z-2' : 'tw:pointer-events-none tw:invisible tw:absolute tw:inset-0'}>
                <ScreenVisual slot={slot} />
              </div>
            ))}
          </div>
          <div className="tw:pointer-events-none tw:absolute tw:inset-x-0 tw:top-0 tw:flex tw:h-[calc(100%-2.125rem)] tw:items-center tw:justify-between tw:[@media(max-width:35rem)]:top-auto tw:[@media(max-width:35rem)]:bottom-0 tw:[@media(max-width:35rem)]:h-10 tw:[@media(max-width:35rem)]:px-1.5">
            <ScreenArrow previous onClick={() => move(-1)} />
            <ScreenArrow onClick={() => move(1)} />
          </div>
          <div className="tw:absolute tw:inset-x-0 tw:bottom-0 tw:flex tw:items-center tw:justify-center tw:gap-[.4375rem] tw:[@media(max-width:35rem)]:pointer-events-none tw:[@media(max-width:35rem)]:bottom-3.5" aria-label="Selecionar tela">
            {screens.map((slot, index) => (
              <button key={slot.label} type="button" aria-label={`Ver ${slot.label}`} aria-current={index === active ? 'true' : undefined} onClick={() => select(index)}
                className={`tw:pointer-events-auto tw:h-[.4375rem] tw:cursor-pointer tw:rounded-full tw:border-0 tw:p-0 tw:transition-[width,background] ${index === active ? 'tw:w-[1.125rem] tw:bg-[#d6ac73]' : 'tw:w-[.4375rem] tw:bg-white/38'}`} />
            ))}
          </div>
        </LandingReveal>
      </LandingWidth>
    </section>
  );
}
