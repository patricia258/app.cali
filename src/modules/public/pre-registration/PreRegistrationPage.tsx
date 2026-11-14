import { PreRegistrationForm } from './components/PreRegistrationForm';
import { usePreRegistration } from './hooks/usePreRegistration';
import { usePreRegistrationToken } from './hooks/usePreRegistrationToken';

export function PreRegistrationPage() {
  const token = usePreRegistrationToken();
  const registration = usePreRegistration(token);
  const state = registration.isFetching || registration.isPending ? 'loading' : registration.isError ? 'error' : registration.data;
  return <main className="tw:grid tw:min-h-dvh tw:place-items-center tw:bg-cali-day-canvas tw:p-6 tw:text-[#321c23]">
    <section aria-labelledby="pre-registration-heading" className="tw:w-full tw:max-w-[32.5rem] tw:rounded-[1.125rem] tw:border tw:border-solid tw:border-[#e8ddd6] tw:bg-white tw:p-[clamp(1.25rem,5vw,2.25rem)]">
      <img src="/brand/cali-rh-bordo.png" alt="CALI RH" width={118} />
      <h1 id="pre-registration-heading" className="tw:mt-4 tw:mb-2.5 tw:text-[clamp(1.5rem,5vw,2rem)] tw:text-cali-brand">Pré-cadastro da empresa</h1>
      {state === 'loading' && <p className="tw:m-0 tw:mb-2" role="status">Conferindo o link…</p>}
      {state === 'missing' && <p className="tw:m-0 tw:mb-2">Link indisponível. Solicite um novo link à CALI.</p>}
      {state === 'submitted' && <p className="tw:m-0 tw:mb-2" role="status">Dados recebidos. A CALI vai completar a ficha e conferir a liberação dos acessos.</p>}
      {state === 'error' && <>
        <p className="tw:m-0 tw:mb-2" role="alert">Não foi possível conferir o link agora.</p>
        <button type="button" className="tw:min-h-[2.625rem] tw:justify-self-start tw:rounded-lg tw:border tw:border-solid tw:border-transparent tw:bg-cali-brand tw:px-4 tw:py-2 tw:[font:inherit] tw:font-semibold tw:text-white tw:focus-visible:outline-2 tw:focus-visible:outline-cali-brand tw:focus-visible:outline-offset-2" onClick={() => void registration.refetch()}>Tentar novamente</button>
      </>}
      {state === 'open' && <PreRegistrationForm key={token} token={token} />}
    </section>
  </main>;
}
