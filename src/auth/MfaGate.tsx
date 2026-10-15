/* Verificação em duas etapas da administradora e da Equipe CALI (15/10/2026).
   Depois do código enviado por e-mail, pede o código de 6 dígitos do aplicativo autenticador do celular.
   No primeiro acesso, mostra o QR code para cadastrar o aplicativo. O banco também exige este segundo passo
   (função session_meets_mfa): sem ele, os poderes de administradora/Partner não valem. */
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Stage = 'checking' | 'ok' | 'enroll' | 'verify' | 'error';
const QA = String(import.meta.env.VITE_SUPABASE_URL || '').includes('qa-isolated');

export function MfaGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>(QA ? 'ok' : 'checking');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function check() {
    if (!supabase || QA) { setStage('ok'); return; }
    const level = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    // Se a conferência falhar, a tela segue: quem garante a regra é o banco (sem o segundo passo, os poderes não valem).
    if (level.error) { console.warn('MFA: nível de acesso indisponível', level.error); setStage('ok'); return; }
    if (level.data.currentLevel === 'aal2') { setStage('ok'); return; }
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) { console.warn('MFA: lista de fatores indisponível', factors.error); setStage('ok'); return; }
    const verified = factors.data.totp.find((factor) => factor.status === 'verified');
    if (verified) { setFactorId(verified.id); setStage('verify'); return; }
    // Cadastro novo: descarta tentativas de cadastro que ficaram pela metade.
    for (const factor of factors.data.all.filter((item) => item.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CALI Workspace' });
    // Cadastro indisponível (por exemplo, recurso desligado no servidor): não bloqueia a entrada; tenta de novo no próximo acesso.
    if (enrolled.error || !enrolled.data) { console.warn('MFA: cadastro indisponível', enrolled.error); setStage('ok'); return; }
    setFactorId(enrolled.data.id); setQr(enrolled.data.totp.qr_code); setSecret(enrolled.data.totp.secret); setStage('enroll');
  }
  useEffect(() => { void check(); }, []);

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setMessage('');
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (result.error) { setMessage('Código incorreto ou expirado. Confira o aplicativo e tente de novo.'); setCode(''); return; }
    setStage('ok');
  }
  async function leave() { if (supabase) await supabase.auth.signOut(); window.location.assign('/login'); }

  if (stage === 'ok') return <>{children}</>;
  if (stage === 'checking') return <main className="v2-mfa"><p className="v2-mfa-wait" aria-busy="true">Conferindo a segurança do acesso…</p></main>;
  return <main className="v2-mfa">
    <section className="v2-mfa-card" aria-labelledby="v2-mfa-title">
      <span className="v2-mfa-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
      <h1 id="v2-mfa-title">{stage === 'enroll' ? 'Ative a verificação em duas etapas' : 'Verificação em duas etapas'}</h1>
      {stage === 'error' && <p className="v2-mfa-error" role="alert">{message}</p>}
      {stage === 'enroll' && <>
        <p>Proteção extra para o seu acesso. Você faz isso uma vez só.</p>
        <ol className="v2-mfa-steps">
          <li>Instale no celular o <strong>Google Authenticator</strong> ou o <strong>Microsoft Authenticator</strong>.</li>
          <li>No aplicativo, toque em adicionar e leia este QR code.</li>
          <li>Digite abaixo o código de 6 dígitos que aparecer.</li>
        </ol>
        {qr && <img className="v2-mfa-qr" src={qr} alt="QR code para cadastrar o CALI Workspace no aplicativo autenticador" />}
        {secret && <p className="v2-mfa-secret">Sem câmera? Digite esta chave no aplicativo: <code>{secret}</code></p>}
      </>}
      {stage === 'verify' && <p>Abra o aplicativo autenticador do seu celular e digite o código de 6 dígitos do CALI Workspace.</p>}
      {stage !== 'error' && <form onSubmit={(event) => void confirm(event)} className="v2-mfa-form">
        <label>Código do aplicativo<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /></label>
        {message && <p className="v2-mfa-error" role="alert">{message}</p>}
        <button type="submit" className="v2-mfa-primary" disabled={busy || code.length !== 6}>{busy ? 'Conferindo…' : 'Confirmar'}</button>
      </form>}
      <button type="button" className="v2-mfa-leave" onClick={() => void leave()}>Sair</button>
    </section>
  </main>;
}
