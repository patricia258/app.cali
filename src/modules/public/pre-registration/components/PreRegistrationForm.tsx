import { useForm } from '@tanstack/react-form';
import type { ComponentProps } from 'react';
import type { PreRegistrationFields } from '../../../../api/public/pre-registration';
import { useSubmitPreRegistration } from '../hooks/useSubmitPreRegistration';

const focus = 'tw:focus-visible:outline-2 tw:focus-visible:outline-cali-brand tw:focus-visible:outline-offset-2';
const action = `tw:min-h-[2.625rem] tw:justify-self-start tw:rounded-lg tw:border tw:border-solid tw:border-transparent tw:bg-cali-brand tw:px-4 tw:py-2 tw:[font:inherit] tw:font-semibold tw:text-white tw:cursor-pointer tw:disabled:cursor-wait tw:disabled:opacity-65 ${focus}`;

export function PreRegistrationForm({ token }: { token: string }) {
  const submit = useSubmitPreRegistration(token);
  const form = useForm({
    defaultValues: { name: '', legalName: '', city: '', state: '', contact: '', email: '' } satisfies PreRegistrationFields,
    onSubmit: async ({ value }) => { await submit.mutateAsync(value).catch(() => undefined); },
  });

  function field(name: keyof PreRegistrationFields, label: string, props: ComponentProps<'input'> = {}) {
    return <form.Field name={name}>
      {(input) => <label className="tw:grid tw:gap-2">{label}<input {...props} name={input.name} required
        className={`tw:w-full tw:min-h-[2.625rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#cbbab6] tw:bg-white tw:px-3 tw:py-2 tw:[font:inherit] tw:text-inherit ${focus}`}
        value={input.state.value} onBlur={input.handleBlur}
        onChange={(event) => input.handleChange(event.target.value)} /></label>}
    </form.Field>;
  }

  return <form className="tw:grid tw:gap-3.5" onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
    <p className="tw:m-0 tw:mb-2">Preencha os dados da empresa e da pessoa de contato. A CALI completa a ficha.</p>
    {field('name', 'Nome da empresa', { maxLength: 200, autoComplete: 'organization' })}
    {field('legalName', 'Razão social', { maxLength: 200 })}
    <div className="tw:grid tw:grid-cols-[minmax(0,1fr)_4.5rem] tw:gap-3">
      {field('city', 'Cidade', { maxLength: 200, autoComplete: 'address-level2' })}
      {field('state', 'UF', { maxLength: 2, pattern: '[A-Za-z]{2}', autoComplete: 'address-level1' })}
    </div>
    {field('contact', 'Pessoa de contato', { maxLength: 200, autoComplete: 'name' })}
    {field('email', 'E-mail de trabalho', { type: 'email', maxLength: 254, autoComplete: 'email' })}
    {submit.error && <p className="tw:m-0 tw:mb-2 tw:text-[#7e2537]" role="alert">{submit.error.message || 'Não foi possível enviar. Tente novamente.'}</p>}
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(sending) => <button type="submit" className={action} disabled={sending}>{sending ? 'Enviando…' : 'Enviar dados'}</button>}
    </form.Subscribe>
  </form>;
}
