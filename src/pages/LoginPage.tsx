import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Send } from 'lucide-react';
import { Brand } from '../components/WorkspaceShell';
import { isSupabaseConfigured, sendMagicLink } from '../lib/supabase';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const valid = useMemo(() => email.includes('@') && email.includes('.'), [email]);
  const previewEnabled = searchParams.get('preview') === '1' || window.location.hostname.endsWith('.vercel.app');

  function enterPreview(role: 'admin' | 'client') {
    sessionStorage.setItem('cali-preview-role', role);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSent(false);

    if (!isSupabaseConfigured) {
      setError('O ambiente seguro do Workspace ainda não está conectado.');
      return;
    }

    try {
      setLoading(true);
      const { error: authError } = await sendMagicLink(email.trim());
      if (authError) throw authError;
      sessionStorage.removeItem('cali-preview-role');
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o link de acesso.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <Brand />
        <div>
          <span className="section-kicker light">CALI RH</span>
          <h1>O trabalho continua aqui.</h1>
          <p>Projetos, decisões, entregas, horas e documentos organizados no mesmo espaço entre a CALI e sua empresa.</p>
        </div>
        <small>Pessoas como estratégia. Negócios que evoluem.</small>
      </section>
      <section className="login-form">
        <form className="login-card" onSubmit={handleSubmit}>
          <span className="section-kicker">ACESSO SEGURO</span>
          <h2>Entre no seu Workspace.</h2>
          <p>Informe o e-mail cadastrado. O acesso chega por um link seguro, sem senha para memorizar.</p>
          <label>
            E-mail
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" type="email" autoComplete="email" />
          </label>
          <button disabled={!valid || loading} className="primary full" type="submit">
            <Send size={18} />
            {loading ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
          {sent && <div className="form-message success"><CheckCircle2 size={18} />Link enviado. Confira seu e-mail.</div>}
          {error && <div className="form-message">{error}</div>}
          {previewEnabled && (
            <div className="demo-links">
              <span>Prévia de desenvolvimento</span>
              <Link to="/admin" onClick={() => enterPreview('admin')}>Patrícia</Link>
              <Link to="/cliente" onClick={() => enterPreview('client')}>Cliente</Link>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
