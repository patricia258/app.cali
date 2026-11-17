import { useGoogleOAuthCallback } from './hooks/useGoogleOAuthCallback';

export function GoogleCalendarCallbackPage() {
  const { label, message } = useGoogleOAuthCallback();

  return <main className="tw:grid tw:min-h-screen tw:place-items-center tw:bg-cali-day-canvas tw:p-6 tw:font-[Inter,Arial,sans-serif] tw:text-cali-ink">
    <section className="tw:w-full tw:max-w-140 tw:rounded-[1.375rem] tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface tw:p-8 tw:shadow-[0_1.375rem_4.375rem_rgb(var(--cali-rgb-red-inverse)/0.12)]">
      <div className="tw:mb-2.5 tw:text-xs tw:font-extrabold tw:tracking-[.16em] tw:text-cali-brand">CALI WORKSPACE</div>
      <h1 className="tw:mx-0 tw:mt-0 tw:mb-2.5 tw:text-cali-title-lg">{label}</h1>
      <p className="tw:m-0 tw:text-base tw:leading-[1.55] tw:text-cali-neutral-accent" role="status">{message}</p>
    </section>
  </main>;
}
