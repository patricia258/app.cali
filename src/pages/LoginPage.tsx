import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  Instagram,
  Leaf,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import { isSupabaseConfigured, sendMagicLink, supabase } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const valid = useMemo(() => email.includes('@') && email.includes('.'), [email]);
  const previewEnabled = window.location.hostname.endsWith('.vercel.app');

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function resumeExistingSession() {
      const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
      const user = sessionData.session?.user;
      if (!active || sessionError || !user) return;

      const { data: profile, error: profileError } = await supabase!
        .from('profiles')
        .select('role, active')
        .eq('id', user.id)
        .maybeSingle();

      if (!active || profileError || !profile?.active) return;
      navigate(profile.role === 'admin' ? '/admin' : '/cliente', { replace: true });
    }

    resumeExistingSession();
    return () => { active = false; };
  }, [navigate]);

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
    <main className="login-v2">
      <section className="login-v2-brand" aria-label="CALI Workspace">
        <img className="login-v2-brand-art oak-top" src="/brand/cali-oak-mark.svg" alt="" aria-hidden="true" />
        <img className="login-v2-brand-art lime-mid" src="/brand/cali-lime-mark.svg" alt="" aria-hidden="true" />
        <img className="login-v2-brand-art oak-bottom" src="/brand/cali-oak-mark.svg" alt="" aria-hidden="true" />

        <div className="login-v2-brand-inner">
          <img
            className="login-v2-logo"
            src="/brand/cali-workspace-transparent.svg"
            alt="CALI Workspace"
          />

          <div className="login-v2-copy">
            <h1>O trabalho<br />continua aqui.</h1>
            <span className="login-v2-rule" aria-hidden="true" />
            <p>
              Projetos, decisões, entregas, horas e documentos organizados no mesmo espaço entre a CALI e sua empresa.
            </p>
          </div>

          <div className="login-v2-signature">
            <span className="login-v2-gold-mark" aria-hidden="true"><Leaf size={30} /></span>
            <p>Pessoas como estratégia.<br />Negócios que evoluem.</p>
          </div>
        </div>
      </section>

      <section className="login-v2-access">
        <form className="login-v2-card" onSubmit={handleSubmit}>
          <span className="login-v2-kicker">ACESSO SEGURO</span>
          <h2>Entre no seu Workspace.</h2>
          <p className="login-v2-card-copy">
            Informe o e-mail cadastrado. O acesso chega por um link seguro, sem senha para memorizar.
          </p>

          <label className="login-v2-field">
            <span>E-mail</span>
            <div className="login-v2-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com.br"
                type="email"
                autoComplete="email"
              />
            </div>
          </label>

          <button disabled={!valid || loading} className="login-v2-submit" type="submit">
            <Send size={18} />
            {loading ? 'Enviando…' : 'Enviar link de acesso'}
          </button>

          {sent && (
            <div className="login-v2-message login-v2-message-success">
              <CheckCircle2 size={18} />Link enviado. Confira seu e-mail.
            </div>
          )}
          {error && <div className="login-v2-message">{error}</div>}

          {previewEnabled && (
            <div className="demo-links login-v2-demo-links">
              <span>Prévia de desenvolvimento</span>
              <Link to="/admin" onClick={() => enterPreview('admin')}>Patrícia</Link>
              <Link to="/cliente" onClick={() => enterPreview('client')}>Cliente</Link>
            </div>
          )}
        </form>
      </section>

      <footer className="login-v2-footer-brand">
        <span>© 2026 CALI RH — HR FOR BUSINESS. Todos os direitos reservados.</span>
      </footer>

      <footer className="login-v2-footer-access">
        <div className="login-v2-footer-links">
          <a href="mailto:patricia@calirh.com"><Mail size={15} />patricia@calirh.com</a>
          <span><MessageCircle size={15} />WhatsApp</span>
          <span><Linkedin size={15} />LinkedIn</span>
          <span><Instagram size={15} />Instagram</span>
        </div>
        <div className="login-v2-site-link">
          <span>Visite nosso site</span>
          <a href="https://calirh.com" target="_blank" rel="noreferrer">
            calirh.com <ExternalLink size={15} />
          </a>
        </div>
      </footer>
    </main>
  );
}
