import { useId, type ReactNode } from 'react';
import { useProjectFrontExpansion } from '../hooks/useProjectFrontExpansion';

type Props = {
  name: string;
  emblem: string;
  storageKey: string | null;
  heading: ReactNode;
  children: ReactNode;
};

export function ProjectFrontDisclosure({ name, emblem, storageKey, heading, children }: Props) {
  const { expanded, toggle } = useProjectFrontExpansion(storageKey);
  const controls = useId();
  const tooltip = expanded ? 'Clique para recolher os entregáveis' : 'Clique para visualizar os entregáveis';

  return <section className="front-section-v2 tw:overflow-hidden tw:rounded-[.77rem] tw:border tw:border-solid tw:border-[#eadfd5] tw:bg-white">
    <div className={`front-header-v2 tw:grid tw:w-auto tw:cursor-pointer tw:grid-cols-[3.23rem_minmax(18.46rem,1.2fr)_minmax(25.38rem,1.7fr)_auto_auto]! tw:items-center tw:gap-[1.08rem] tw:border-0 tw:bg-[#fbf7f3] tw:px-[1.23rem] tw:py-[1.08rem] tw:text-left tw:text-[#3b2b2a] tw:[@media(max-width:980px)]:grid-cols-[3.08rem_minmax(14.62rem,1fr)_minmax(19.23rem,1.35fr)_auto_auto]! tw:[@media(max-width:820px)]:grid-cols-[2.92rem_minmax(0,1fr)_auto_auto]! ${expanded ? '' : 'tw:border-b-0!'}`}>
      <div className="tw:group tw:relative tw:grid tw:size-[2.1538rem] tw:place-items-center">
        <button type="button" aria-expanded={expanded} aria-controls={controls} aria-label={`${expanded ? 'Recolher' : 'Visualizar'} entregáveis da frente ${name}`}
          onClick={toggle}
          className="tw:grid tw:size-full tw:cursor-pointer tw:place-items-center tw:border-0 tw:bg-transparent tw:p-0 tw:focus-visible:rounded-sm tw:focus-visible:outline-2 tw:focus-visible:outline-cali-accent tw:motion-safe:transition-[opacity,transform] tw:motion-safe:duration-180 tw:hover:scale-105">
          <img src={emblem} alt="" className="tw:block tw:size-[2.1538rem] tw:object-contain" />
        </button>
        <span aria-hidden="true" className="tw:pointer-events-none tw:invisible tw:absolute tw:top-0 tw:left-[calc(100%+.9231rem)] tw:z-40 tw:w-max tw:max-w-[min(23.0769rem,calc(100vw-7rem))] tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-[#e8ddd5] tw:bg-[#fffcf8] tw:px-[.9231rem] tw:py-[.6923rem] tw:text-[.9231rem] tw:leading-[1.35] tw:font-[750] tw:text-[#2d2927] tw:opacity-0 tw:shadow-[0_.9231rem_2.1538rem_#2a191e29] tw:motion-safe:transition-opacity tw:motion-safe:duration-160 tw:group-hover:visible tw:group-hover:opacity-100 tw:group-focus-within:visible tw:group-focus-within:opacity-100">{tooltip}</span>
      </div>
      {heading}
    </div>
    <div id={controls} hidden={!expanded} className="tw:overflow-x-auto tw:px-[1.23rem] tw:pb-[.46rem]">
      {children}
    </div>
  </section>;
}
