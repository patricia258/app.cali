import { useGoogleOAuthCallback } from './hooks/useGoogleOAuthCallback';

export function GoogleCalendarCallbackPage() {
  const { label, message } = useGoogleOAuthCallback();

  return <main className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-cali-day-canvas tw:p-6 tw:font-[Inter,Arial,sans-serif] tw:text-cali-ink">
    <section className="tw:w-full tw:max-w-[35rem] tw:rounded-[1.375rem] tw:border tw:border-solid tw:border-[#e5d9d2] tw:bg-white tw:p-8 tw:shadow-[0_1.375rem_4.375rem_rgba(55,30,36,.12)]">
      <div className="tw:mb-[0.625rem] tw:text-[0.75rem] tw:font-extrabold tw:tracking-[.16em] tw:text-cali-brand">CALI WORKSPACE</div>
      <h1 className="tw:mx-0 tw:mt-0 tw:mb-[0.625rem] tw:text-[1.75rem]">{label}</h1>
      <p className="tw:m-0 tw:text-[1rem] tw:leading-[1.55] tw:text-[#6c625e]" role="status">{message}</p>
    </section>
  </main>;
}
