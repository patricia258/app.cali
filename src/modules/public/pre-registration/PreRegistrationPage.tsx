import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { readPreRegistration, submitPreRegistration } from '../../../api/public/pre-registration';
import { useParams } from '../../../hooks/useParams';
import './pre-registration.css';

type State = 'loading' | 'open' | 'submitted' | 'missing' | 'error';

function Registration({ token }: { token: string }) {
  const [state, setState] = useState<State>('loading');
  const [retry, setRetry] = useState(0);
  const [sending, setSending] = useState(false);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const fields = new FormData(event.currentTarget);
    setSending(true);
    setError('');
    try {
      await submitPreRegistration(token, {
        name: String(fields.get('name') ?? ''),
        legalName: String(fields.get('legalName') ?? ''),
        city: String(fields.get('city') ?? ''),
        state: String(fields.get('state') ?? ''),
        contact: String(fields.get('contact') ?? ''),
        email: String(fields.get('email') ?? '').trim(),
      });
      setState('submitted');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
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
      {state === 'open' && <form onSubmit={(event) => void submit(event)}>
        <p>Preencha os dados da empresa e da pessoa de contato. A CALI completa a ficha.</p>
        <label>Nome da empresa<input name="name" required maxLength={200} autoComplete="organization" /></label>
        <label>Razão social<input name="legalName" required maxLength={200} /></label>
        <div className="pre-registration-locality">
          <label>Cidade<input name="city" required maxLength={200} autoComplete="address-level2" /></label>
          <label>UF<input name="state" required maxLength={2} pattern="[A-Za-z]{2}" autoComplete="address-level1" /></label>
        </div>
        <label>Pessoa de contato<input name="contact" required maxLength={200} autoComplete="name" /></label>
        <label>E-mail de trabalho<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        {error && <p className="pre-registration-error" role="alert">{error}</p>}
        <button type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar dados'}</button>
      </form>}
    </section>
  </main>;
}

export function PreRegistrationPage() {
  const { token = '' } = useParams();
  return <Registration key={token} token={token} />;
}
