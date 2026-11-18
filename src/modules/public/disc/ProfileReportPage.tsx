import { useEffect } from 'react';

export function ProfileReportPage() {
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  return <main className="cali-profile-shell tw:min-h-screen tw:bg-cali-day-canvas tw:pb-10 tw:font-[Inter,system-ui,sans-serif] tw:text-cali-ink tw:[color-scheme:light] tw:print:bg-cali-neutral-surface tw:print:p-0">
    <div className="tw:mx-auto tw:flex tw:min-h-[calc(100vh-3rem)] tw:max-w-130 tw:flex-col tw:items-center tw:justify-center tw:gap-3.5 tw:px-5.5 tw:py-10 tw:text-center tw:font-[Inter,sans-serif]">
      <img className="tw:mb-4.5 tw:h-10 tw:w-auto" src="/brand/cali-rh-bordo.png" alt="CALI RH" />
      <span className="tw:flex tw:size-21 tw:items-center tw:justify-center tw:rounded-full tw:bg-cali-brand tw:shadow-[0_0.875rem_2.125rem_rgb(var(--cali-rgb-burgundy-accent)/0.22)]" aria-hidden="true">
        <img className="tw:size-12.5" src="/brand/cali-oak-mark-light.svg" alt="" />
      </span>
      <h1 className="tw:mx-0 tw:mt-1.5 tw:mb-0 tw:text-3xl tw:leading-[1.2] tw:text-cali-brand">Obrigada por responder!</h1>
      <p className="tw:m-0 tw:text-base tw:text-cali-ink">Suas respostas foram registradas.</p>
      <div className="tw:flex tw:max-w-110 tw:items-center tw:justify-center tw:gap-2.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:px-4 tw:py-3.5 tw:text-sm tw:leading-[1.55] tw:text-cali-muted">
        Se precisar de uma cópia do seu relatório em PDF, solicite à CALI RH.
      </div>
      <small className="tw:mt-2.5 tw:text-xs tw:text-cali-sand-text"><a href="mailto:privacidade@calirh.com">privacidade@calirh.com</a></small>
    </div>
  </main>;
}
