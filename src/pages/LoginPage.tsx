import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  Instagram,
  KeyRound,
  Leaf,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import { isSupabaseConfigured, requestAccessCode, supabase, verifyAccessCode } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const validEmail = useMemo(() => email.includes('@') && email.includes('.'), [email]);
  const validCode = useMemo(() => /^\d{6}$/.test(code), [code]);
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

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setSent(false);
    if (!isSupabaseConfigured) {
      setError('O ambiente seguro do Workspace ainda não está conectado.');
      return;
    }
    try {
      setLoading(true);
      const { error: authError } = await requestAccessCode(email.trim());
      if (authError) throw authError;
      sessionStorage.removeItem('cali-preview-role');
      setStep('code');
      setSent(true);
      setCode('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o código de acesso.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      setLoading(true);
      const { data, error: authError } = await verifyAccessCode(email.trim(), code);
      if (authError) throw authError;
      navigate(data?.role === 'admin' ? '/admin' : '/cliente', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Código inválido ou expirado.');
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
          <img className="login-v2-logo" src="/brand/cali-workspace-transparent.svg" alt="CALI Workspace" />
          <div className="login-v2-copy">
            <h1>O trabalho<br />continua aqui.</h1>
            <span className="login-v2-rule" aria-hidden="true" />
            <p>Projetos, decisões, entregas, horas e documentos organizados no mesmo espaço entre a CALI e sua empresa.</p>
          </div>
          <div className="login-v2-signature">
            <span className="login-v2-gold-mark" aria-hidden="true"><Leaf size={30} /></span>
            <p>Pessoas como estratégia.<br />Negócios que evoluem.</p>
          </div>
        </div>
      </section>

      <section className="login-v2-access">
        <form className="login-v2-card" onSubmit={step === 'email' ? requestCode : verifyCode}>
          <span className="login-v2-kicker">ACESSO SEGURO</span>
          <h2>{step === 'email' ? 'Entre no seu Workspace.' : 'Digite seu código.'}</h2>
          <p className="login-v2-card-copy">
            {step === 'email'
              ? 'Informe o e-mail cadastrado. Você receberá um código numérico de uso único, sem senha para memorizar.'
              : <>Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele expira em 10 minutos e pode ser usado uma única vez.</>}
          </p>

          {step === 'email' ? (
            <label className="login-v2-field">
              <span>E-mail</span>
              <div className="login-v2-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" type="email" autoComplete="email" />
              </div>
            </label>
          ) : (
            <label className="login-v2-field">
              <span>Código de acesso</span>
              <div className="login-v2-input-wrap">
                <KeyRound size={18} aria-hidden="true" />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  style={{ letterSpacing: '.28em', fontWeight: 800 }}
                />
              </div>
            </label>
          )}

          <button disabled={(step === 'email' ? !validEmail : !validCode) || loading} className="login-v2-submit" type="submit">
            {step === 'email' ? <Send size={18} /> : <KeyRound size={18} />}
            {loading ? 'Aguarde…' : step === 'email' ? 'Enviar código de acesso' : 'Entrar no Workspace'}
          </button>

          {step === 'code' && (
            <div className="demo-links login-v2-demo-links">
              <button type="button" onClick={() => { setStep('email'); setError(''); setSent(false); setCode(''); }}>Trocar e-mail</button>
              <button type="button" onClick={() => void requestCode()}>Reenviar código</button>
            </div>
          )}

          {sent && step === 'code' && (
            <div className="login-v2-message login-v2-message-success"><CheckCircle2 size={18} />Código enviado. Confira seu e-mail.</div>
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

      <footer className="login-v2-footer-brand"><span>© 2026 CALI RH — HR FOR BUSINESS. Todos os direitos reservados.</span></footer>
      <footer className="login-v2-footer-access">
        <div className="login-v2-footer-links">
          <a href="mailto:patricia@calirh.com"><Mail size={15} />patricia@calirh.com</a>
          <span><MessageCircle size={15} />WhatsApp</span>
          <span><Linkedin size={15} />LinkedIn</span>
          <span><Instagram size={15} />Instagram</span>
        </div>
        <div className="login-v2-site-link"><span>Visite nosso site</span><a href="https://calirh.com" target="_blank" rel="noreferrer">calirh.com <ExternalLink size={15} /></a></div>
      </footer>
    </main>
  );
}
