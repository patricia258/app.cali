import type { ReactNode } from 'react';

export function ReportSectionHeading({ number, title, description, alert = false }: {
  number: string;
  title: ReactNode;
  description: ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="reports-v16-section-heading tw:mb-[1.53846rem] tw:grid tw:grid-cols-[2.625rem_minmax(0,1fr)] tw:items-start tw:gap-[1.07692rem]">
      <span className="tw:pt-[0.23077rem] tw:text-[0.84615rem] tw:font-bold tw:tracking-[0.06em] tw:text-cali-gold">{number}</span>
      <div>
        <h2 className="tw:m-0 tw:text-[1.15385rem] tw:leading-[1.3] tw:tracking-normal tw:text-[#292522] tw:workspace-night:text-[#f5efec]">{title}</h2>
        <p className={`tw:mt-[0.38462rem] tw:mb-0 tw:text-[0.92308rem] tw:leading-[calc(1/0.75)] tw:leading-normal ${alert ? 'tw:font-semibold tw:text-[#97672f]' : 'tw:text-[#857872] tw:workspace-night:text-[#b6a8a3]'}`}>{description}</p>
      </div>
    </div>
  );
}
