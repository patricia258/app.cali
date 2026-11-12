import { homeOf } from '../../../auth/workspaceAuthContext';
import { useForm, useStore } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { useNavigate } from '../../../hooks/useNavigate';
import { z } from 'zod';
import { accessSupportLink } from '../../../domain/caliContacts';
import {
  CalendarDays,
  LifeBuoy,
  CheckCircle2,
  FileText,
  FolderKanban,
  KeyRound,
  Leaf,
  Mail,
  MessageCircle,
  Send,
} from 'lucide-react';
import { requestAccessCode, verifyAccessCode } from '../../../api/access/codes';
import { endWorkspaceSession, isSupabaseConfigured, readAuthenticatedWorkspaceProfile, readExistingWorkspaceRole } from '../../../api/access/session';
import './sign-in.css';

const emailSchema = z.string().refine((email) => email.includes('@') && email.includes('.'));
const codeSchema = z.string().regex(/^\d{6}$/);

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState('');
  const form = useForm({
    defaultValues: { email: '', code: '' },
    onSubmit: async ({ value }) => {
      if (step === 'email') {
        await requestCode(value.email);
      } else {
        await verifyCode(value.email, value.code);
      }
    },
  });
  const { email, code } = useStore(form.store, (state) => state.values);
  const validInput = step === 'email' ? emailSchema.safeParse(email).success : codeSchema.safeParse(code).success;

  useEffect(() => {
    let active = true;
    void readExistingWorkspaceRole().then((role) => {
      if (active && role) navigate(homeOf(role), { replace: true });
    }, () => undefined);
    return () => { active = false; };
  }, [navigate]);

  async function requestCode(email: string): Promise<void> {
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
      form.setFieldValue('code', '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar o código de acesso.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(email: string, code: string): Promise<void> {
    setError('');
    try {
      setLoading(true);
      const { data, error: authError } = await verifyAccessCode(email.trim(), code);
      if (authError) throw authError;
      // Acesso desativado (empresa encerrada, bloqueada ou arquivada, ou pessoa removida): explica em vez de voltar ao login sem aviso.
      const profile = await readAuthenticatedWorkspaceProfile();
      if (profile && !profile.active) {
        await endWorkspaceSession();
        form.setFieldValue('code', '');
        throw new Error('Seu acesso ao CALI Workspace está desativado. Se acha que é um engano, fale com a CALI RH.');
      }
      navigate(homeOf(data?.role), { replace: true });
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
            <h1>O trabalho<br />continua aqui<span className="login-v2-dot">.</span></h1>
            <span className="login-v2-rule" aria-hidden="true" />
            <p>Acompanhe o ciclo, valide o que importa e decida com contexto, sem depender de e-mails e planilhas.</p>
            <ul className="login-v2-modules" aria-label="O que está no Workspace">
              <li><FolderKanban size={16} aria-hidden="true" />Projetos, entregas e aprovações</li>
              <li><CalendarDays size={16} aria-hidden="true" />Agenda, horas e capacidade</li>
              <li><FileText size={16} aria-hidden="true" />Documentos e relatórios do ciclo</li>
            </ul>
          </div>
          <div className="login-v2-signature">
            <span className="login-v2-gold-mark" aria-hidden="true"><Leaf size={30} /></span>
            <p>Pessoas como estratégia.<br />Negócios que evoluem.</p>
          </div>
        </div>
      </section>

      <section className="login-v2-access">
        <form className="login-v2-card" onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}>
          <div className="login-v2-steps" aria-hidden="true"><span className="on" /><span className={step === 'code' ? 'on' : ''} /></div>
          <span className="login-v2-kicker">{step === 'email' ? 'ACESSO SEGURO · ETAPA 1 DE 2' : 'ACESSO SEGURO · ETAPA 2 DE 2'}</span>
          <h2>{step === 'email' ? 'Entre no seu Workspace.' : 'Digite seu código.'}</h2>
          <p className="login-v2-card-copy">
            {step === 'email'
              ? 'Informe o e-mail cadastrado. Você receberá um código numérico de uso único, sem senha para memorizar.'
              : <>Se <strong>{email}</strong> estiver cadastrado, enviamos um código de 6 dígitos. Ele expira em 10 minutos e pode ser usado uma única vez.</>}
          </p>

          {step === 'email' ? (
            <label className="login-v2-field">
              <span>E-mail</span>
              <div className="login-v2-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input value={email} onChange={(event) => form.setFieldValue('email', event.target.value)} placeholder="voce@empresa.com.br" type="email" autoComplete="email" />
              </div>
            </label>
          ) : (
            <label className="login-v2-field">
              <span>Código de acesso</span>
              <div className="login-v2-input-wrap">
                <KeyRound size={18} aria-hidden="true" />
                <input
                  value={code}
                  onChange={(event) => form.setFieldValue('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
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

          <button disabled={!validInput || loading} className="login-v2-submit" type="submit">
            {step === 'email' ? <Send size={18} /> : <KeyRound size={18} />}
            {loading ? 'Aguarde…' : step === 'email' ? 'Enviar código de acesso' : 'Entrar no Workspace'}
          </button>

          {step === 'code' && (
            <div className="login-v2-code-actions">
              <button type="button" onClick={() => { setStep('email'); setError(''); setSent(false); form.setFieldValue('code', ''); }}>Trocar e-mail</button>
              <button type="button" onClick={() => void requestCode(email)}>Reenviar código</button>
            </div>
          )}

          {sent && step === 'code' && (
            <div className="login-v2-message login-v2-message-success"><CheckCircle2 size={18} />O código costuma chegar em até 1 minuto. Não chegou? Veja o spam ou toque em “Não consigo acessar”.</div>
          )}
          {error && <div className="login-v2-message">{error}</div>}

          <button type="button" className="login-v2-help-toggle" aria-expanded={helpOpen} onClick={() => setHelpOpen((open) => !open)}>
            <LifeBuoy size={15} aria-hidden="true" />Não consigo acessar
          </button>
          {helpOpen && <div className="login-v2-help" role="region" aria-label="Ajuda para acessar">
            <ol>
              <li>Confira se o e-mail é o mesmo cadastrado pela sua empresa no Workspace.</li>
              <li>Procure o código na caixa de spam ou promoções. O remetente é <strong>APP CALI RH</strong> (workspace@calirh.com).</li>
              <li>O código vale 10 minutos. Para pedir outro, aguarde 2 minutos.</li>
            </ol>
            <p>Por segurança, o Workspace não informa se um e-mail está ou não cadastrado. Se continuar sem acesso, fale com a CALI:</p>
            <div className="login-v2-help-actions">
              <a href={`https://wa.me/5541987791933?text=${encodeURIComponent(`Olá, Patrícia. Não consigo acessar o CALI Workspace${email.trim() ? ` com o e-mail ${email.trim()}` : ''}.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>
              <a href={accessSupportLink(`Não consigo acessar o CALI Workspace${email.trim() ? ` com o e-mail ${email.trim()}` : ''}.`)}><Mail size={15} aria-hidden="true" />E-mail</a>
            </div>
          </div>}
        </form>
      </section>

      <footer className="login-v2-footer-compact">
        <span>© 2026 CALI RH</span>
        <nav aria-label="Políticas e contato">
          <Link to="/termos">Termos</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/politica-do-site">Site, Mapa e Portal</Link>
          <a href="https://calirh.com" target="_blank" rel="noreferrer">calirh.com</a>
        </nav>
      </footer>
    </main>
  );
}
