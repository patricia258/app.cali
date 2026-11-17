import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '../../../components/navigation/Link';

export const discReport = {
  shell: 'cali-profile-shell tw:min-h-screen tw:bg-cali-day-canvas tw:pb-10 tw:font-[Inter,system-ui,sans-serif] tw:text-cali-ink tw:[color-scheme:light] tw:print:bg-cali-neutral-surface tw:print:p-0',
  header: 'tw:sticky tw:top-0 tw:z-5 tw:flex tw:items-center tw:gap-4 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-[color:rgb(var(--cali-rgb-sand-soft)/0.94)] tw:px-6 tw:py-3 tw:backdrop-blur-[.5rem] tw:max-[641px]:flex-wrap tw:max-[641px]:gap-2.5 tw:max-[641px]:px-3.5 tw:max-[641px]:py-2.5 tw:print:hidden',
  back: 'tw:inline-flex tw:items-center tw:gap-1.5 tw:border-0 tw:bg-transparent tw:font-[Inter,sans-serif] tw:text-cali-detail tw:leading-[normal] tw:font-semibold tw:text-cali-brand tw:no-underline tw:cursor-pointer',
  status: 'tw:flex-1 tw:text-cali-detail tw:text-cali-muted tw:max-[641px]:order-3 tw:max-[641px]:basis-full tw:max-[641px]:text-xs',
  primary: 'tw:inline-flex tw:items-center tw:gap-2 tw:rounded-cali-panel tw:border-0 tw:bg-cali-brand tw:px-4 tw:py-2.5 tw:font-[Inter,sans-serif] tw:text-cali-detail tw:leading-[normal] tw:font-bold tw:text-cali-neutral-surface tw:cursor-pointer tw:disabled:cursor-wait tw:disabled:opacity-60',
  secondary: 'tw:inline-flex tw:items-center tw:gap-2 tw:rounded-cali-panel tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-2 tw:font-[Inter,sans-serif] tw:text-cali-detail tw:leading-[normal] tw:font-semibold tw:text-cali-brand tw:cursor-pointer',
  toolbar: 'tw:mx-auto tw:mt-4.5 tw:max-w-198.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3 tw:text-cali-detail tw:print:hidden',
  note: 'tw:text-xs tw:text-cali-muted',
  report: 'tw:flex tw:justify-center tw:px-3 tw:py-6 tw:print:p-0 tw:print:[zoom:1]!',
  capture: 'tw:pointer-events-none tw:absolute tw:top-0 tw:left-[-10000px] tw:w-[794px] tw:[&_.cali-profile-report]:gap-0 tw:[&_.cpr-page]:shadow-none tw:print:hidden',
};

const centered = 'tw:flex tw:min-h-[80vh] tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:p-6 tw:text-center';

export function DiscReportEmpty({ message, back }: { message: string; back: string }) {
  return <div className={discReport.shell}><div className={centered}>
    <img className="tw:h-11 tw:w-auto tw:max-w-none" src="/brand/cali-rh-bordo.png" alt="CALI RH" />
    <h1 className="tw:m-0 tw:text-cali-title-lg tw:text-cali-brand">Relatório não disponível</h1>
    <p className="tw:m-0 tw:text-cali-muted">{message}</p>
    <Link className={discReport.back} to={back}><ArrowLeft size={15} /> Voltar</Link>
  </div></div>;
}

export function DiscReportLoading() {
  return <div className={discReport.shell}><div className={centered}>
    <span className="tw:size-8.5 tw:animate-[spin_.8s_linear_infinite] tw:rounded-full tw:border-[3px] tw:border-solid tw:border-[color:rgb(var(--cali-rgb-burgundy-accent)/0.15)] tw:border-t-cali-brand" aria-label="Carregando" />
  </div></div>;
}

export function DiscReportNotice({ children }: { children: ReactNode }) {
  return <div className={centered}>{children}</div>;
}
