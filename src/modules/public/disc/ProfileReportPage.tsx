import { useEffect } from 'react';

export function ProfileReportPage() {
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  return <main className="cali-profile-shell tw:min-h-screen tw:bg-cali-day-canvas tw:pb-10 tw:font-[Inter,system-ui,sans-serif] tw:text-cali-ink tw:[color-scheme:light] tw:print:bg-white tw:print:p-0">
    <div className="tw:mx-auto tw:flex tw:min-h-[calc(100vh-3rem)] tw:max-w-[32.5rem] tw:flex-col tw:items-center tw:justify-center tw:gap-[0.875rem] tw:px-[1.375rem] tw:py-10 tw:text-center tw:font-[Inter,sans-serif]">
      <img className="tw:mb-[1.125rem] tw:h-10 tw:w-auto" src="/brand/cali-rh-bordo.png" alt="CALI RH" />
      <span className="tw:flex tw:size-[5.25rem] tw:items-center tw:justify-center tw:rounded-full tw:bg-cali-brand tw:shadow-[0_0.875rem_2.125rem_rgba(90,30,45,.22)]" aria-hidden="true">
        <img className="tw:size-[3.125rem]" src="/brand/cali-oak-mark-light.svg" alt="" />
      </span>
      <h1 className="tw:mx-0 tw:mt-[0.375rem] tw:mb-0 tw:text-[1.875rem] tw:leading-[1.2] tw:text-cali-brand">Obrigada por responder!</h1>
      <p className="tw:m-0 tw:text-[1rem] tw:text-cali-ink">Suas respostas foram registradas.</p>
      <div className="tw:flex tw:max-w-[27.5rem] tw:items-center tw:justify-center tw:gap-[0.625rem] tw:rounded-xl tw:border tw:border-solid tw:border-[#e8ddd4] tw:bg-white tw:px-4 tw:py-[0.875rem] tw:text-[0.875rem] tw:leading-[1.55] tw:text-[#6b5d63]">
        Se precisar de uma cópia do seu relatório em PDF, solicite à CALI RH.
      </div>
      <small className="tw:mt-[0.625rem] tw:text-[0.75rem] tw:text-[#8c807a]"><a href="mailto:privacidade@calirh.com">privacidade@calirh.com</a></small>
    </div>
  </main>;
}
