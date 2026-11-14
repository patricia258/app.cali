export function ProjectForecastAlert({ days }: { days: number }) {
  return <div role="status" className="tw:absolute tw:top-[1.6923rem] tw:right-[14.6154rem] tw:m-0 tw:inline-flex tw:box-border tw:max-w-[46%] tw:items-center tw:gap-[.6154rem] tw:rounded-[.6154rem] tw:border tw:border-solid tw:border-[#f2dfb8] tw:border-l-[.3077rem] tw:border-l-[#d9a514] tw:bg-[#fff8e6] tw:px-[.9231rem] tw:py-[.5385rem] tw:text-[.8846rem] tw:leading-[1.3] tw:whitespace-nowrap tw:text-[#6b5330] tw:[@media(max-width:1180px)]:static tw:[@media(max-width:1180px)]:mt-[.9231rem] tw:[@media(max-width:1180px)]:max-w-full tw:[@media(max-width:1180px)]:whitespace-normal">
    <strong className="tw:text-[.9231rem] tw:text-[#4a3a1c]">Previsão {days} {days === 1 ? 'dia útil' : 'dias úteis'} depois da meta</strong>
    <span className="tw:overflow-hidden tw:text-[.8846rem] tw:font-normal tw:tracking-normal tw:text-ellipsis tw:text-[#6b5330] tw:normal-case">Antecipe prazos ou mude a meta.</span>
  </div>;
}
