import { useState, type CSSProperties, type PointerEvent } from 'react';
import { LandingReveal } from './LandingReveal';
import './landing-product-motion.css';

const idleTilt = { '--tilt-x': '0deg', '--tilt-y': '0deg' };

function PreviewChip({ kind }: { kind: 'validation' | 'hours' }) {
  const validation = kind === 'validation';
  return (
    <div aria-hidden="true" className={`tw:absolute tw:z-3 tw:flex tw:gap-2.5 tw:rounded-xl tw:border tw:border-solid tw:border-(--id-line) tw:bg-cali-paper tw:px-3.5 tw:py-3 tw:font-cali-body tw:text-(--id-ink) tw:shadow-[0_1.125rem_2.5rem_rgb(var(--cali-rgb-neutral-inverse)/0.2784)] tw:motion-safe:animate-[landing-product-chip-float_6s_ease-in-out_infinite] ${validation
      ? 'tw:bottom-[18%] tw:-left-7 tw:items-center tw:[@media(max-width:47.5rem)]:-bottom-4.5 tw:[@media(max-width:47.5rem)]:left-2'
      : 'tw:top-[14%] tw:-right-5.5 tw:min-w-42.5 tw:flex-col tw:items-stretch tw:[animation-delay:-3s] tw:[@media(max-width:47.5rem)]:hidden'}`}>
      {validation && <span className="tw:size-2.5 tw:rounded-full tw:bg-cali-orange-line tw:shadow-[0_0_0_.25rem_rgb(var(--cali-rgb-orange-line)/0.2)]" />}
      <div>
        <small className="tw:block tw:text-cali-micro tw:leading-[inherit] tw:font-bold tw:tracking-[.12em] tw:text-(--id-gold)">{validation ? 'VALIDAÇÃO' : 'HORAS DO MÊS'}</small>
        <strong className="tw:mt-0.5 tw:block tw:text-cali-detail tw:leading-[inherit] tw:font-bold">{validation ? '1 entrega aguarda você' : '1h30 de 20h'}</strong>
      </div>
      {!validation && <div className="tw:h-1 tw:overflow-hidden tw:rounded-full tw:bg-cali-sand-line"><div className="tw:h-full tw:w-[18%] tw:rounded-full tw:bg-cali-green-accent" /></div>}
    </div>
  );
}

export function LandingProductPreview({ image }: { image: string }) {
  const [tilt, setTilt] = useState(idleTilt);

  function adjustTilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setTilt({ '--tilt-x': `${-y * 7}deg`, '--tilt-y': `${x * 9}deg` });
  }

  return (
    <LandingReveal className="tw:relative tw:mx-auto tw:w-full tw:min-w-0 tw:max-w-180 tw:[perspective:81.25rem] tw:before:pointer-events-none tw:before:absolute tw:before:inset-[12%_-7%_-12%] tw:before:bg-[radial-gradient(ellipse_at_center,rgb(var(--cali-rgb-gold-accent)/0.2784),rgb(var(--cali-rgb-burgundy-accent)/0.07059)_48%,transparent_72%)] tw:before:blur-[1.875rem]" direction="right">
      <div className="tw:motion-safe:animate-[landing-product-float_7s_ease-in-out_infinite]">
        <div
          className="tw:relative tw:rounded-[var(--id-radius-card)] tw:border tw:border-solid tw:border-cali-sand-soft/16 tw:bg-cali-day-canvas tw:shadow-[0_2.5rem_5rem_-1.875rem_rgb(var(--cali-rgb-shadow)/0.6),0_.75rem_1.875rem_rgb(var(--cali-rgb-shadow)/0.2)] tw:motion-safe:transform-[rotateX(var(--tilt-x))_rotateY(var(--tilt-y))] tw:motion-safe:transition-transform tw:motion-safe:duration-500 tw:motion-safe:ease-[cubic-bezier(.18,.7,.3,1)]"
          style={tilt as CSSProperties}
          onPointerMove={adjustTilt}
          onPointerLeave={() => setTilt(idleTilt)}
        >
          <img className="tw:block tw:h-auto tw:w-full tw:rounded-[var(--id-radius-card)]" src={image} alt="Visão geral do CALI Workspace" />
          <PreviewChip kind="validation" />
          <PreviewChip kind="hours" />
        </div>
      </div>
    </LandingReveal>
  );
}
