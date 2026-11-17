export function ProjectForecastAlert({ days }: { days: number }) {
  return <div role="status" className="tw:absolute tw:top-7 tw:right-[14.6154rem] tw:m-0 tw:inline-flex tw:box-border tw:max-w-[46%] tw:items-center tw:gap-2.5 tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-warning-line tw:border-l-[.3077rem] tw:border-l-cali-gold tw:bg-cali-warning-surface tw:px-3.5 tw:py-2 tw:text-sm tw:leading-[1.3] tw:whitespace-nowrap tw:text-cali-gold-strong tw:[@media(max-width:1180px)]:static tw:[@media(max-width:1180px)]:mt-3.5 tw:[@media(max-width:1180px)]:max-w-full tw:[@media(max-width:1180px)]:whitespace-normal">
    <strong className="tw:text-cali-body tw:text-cali-gold-strong">Previsão {days} {days === 1 ? 'dia útil' : 'dias úteis'} depois da meta</strong>
    <span className="tw:overflow-hidden tw:text-sm tw:font-normal tw:tracking-normal tw:text-ellipsis tw:text-cali-gold-strong tw:normal-case">Antecipe prazos ou mude a meta.</span>
  </div>;
}
