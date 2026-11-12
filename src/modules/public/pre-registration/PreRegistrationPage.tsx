import { useEffect, useState, type ComponentProps } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { readPreRegistration, submitPreRegistration, type PreRegistrationFields } from '../../../api/public/pre-registration';
import { useParams } from '../../../hooks/useParams';
import './pre-registration.css';

type State = 'loading' | 'open' | 'submitted' | 'missing' | 'error';

function Registration({ token }: { token: string }) {
  const [state, setState] = useState<State>('loading');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!z.uuid().safeParse(token).success) {
      setState('missing');
      return;
    }
    let active = true;
    void readPreRegistration(token).then(
      (status) => { if (active) setState(status); },
      () => { if (active) setState('error'); },
    );
    return () => { active = false; };
  }, [token, retry]);

  const form = useForm({
    defaultValues: { name: '', legalName: '', city: '', state: '', contact: '', email: '' } satisfies PreRegistrationFields,
    onSubmit: async ({ value }) => {
      setError('');
      try {
        await submitPreRegistration(token, { ...value, email: value.email.trim() });
        setState('submitted');
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Não foi possível enviar. Tente novamente.');
      }
    },
  });

  function field(name: keyof PreRegistrationFields, label: string, props: ComponentProps<'input'> = {}) {
    return <form.Field name={name}>
      {(input) => <label>{label}<input {...props} name={input.name} required
        value={input.state.value} onBlur={input.handleBlur}
        onChange={(event) => input.handleChange(event.target.value)} /></label>}
    </form.Field>;
  }

  return <main className="company-pre-registration">
    <section aria-labelledby="pre-registration-heading">
      <img src="/brand/cali-rh-bordo.png" alt="CALI RH" width={118} />
      <h1 id="pre-registration-heading">Pré-cadastro da empresa</h1>
      {state === 'loading' && <p role="status">Conferindo o link…</p>}
      {state === 'missing' && <p>Link indisponível. Solicite um novo link à CALI.</p>}
      {state === 'submitted' && <p role="status">Dados recebidos. A CALI vai completar a ficha e conferir a liberação dos acessos.</p>}
      {state === 'error' && <>
        <p role="alert">Não foi possível conferir o link agora.</p>
        <button type="button" onClick={() => { setState('loading'); setRetry((count) => count + 1); }}>Tentar novamente</button>
      </>}
      {state === 'open' && <form onSubmit={(event) => { event.preventDefault(); void form.handleSubmit(); }}>
        <p>Preencha os dados da empresa e da pessoa de contato. A CALI completa a ficha.</p>
        {field('name', 'Nome da empresa', { maxLength: 200, autoComplete: 'organization' })}
        {field('legalName', 'Razão social', { maxLength: 200 })}
        <div className="pre-registration-locality">
          {field('city', 'Cidade', { maxLength: 200, autoComplete: 'address-level2' })}
          {field('state', 'UF', { maxLength: 2, pattern: '[A-Za-z]{2}', autoComplete: 'address-level1' })}
        </div>
        {field('contact', 'Pessoa de contato', { maxLength: 200, autoComplete: 'name' })}
        {field('email', 'E-mail de trabalho', { type: 'email', maxLength: 254, autoComplete: 'email' })}
        {error && <p className="pre-registration-error" role="alert">{error}</p>}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(sending) => <button type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar dados'}</button>}
        </form.Subscribe>
      </form>}
    </section>
  </main>;
}

export function PreRegistrationPage() {
  const { token = '' } = useParams();
  return <Registration key={token} token={token} />;
}
