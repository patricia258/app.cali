/* Aceite dos termos de uso e da política de privacidade no primeiro acesso (LGPD), para cliente e Equipe CALI.
   Textos em src/legal/legalTexts.ts (revisados em 15/10/2026). DESLIGADO enquanto PRIVACY_EMAIL estiver vazio.
   Cada nova LEGAL_VERSION pede um novo aceite; o registro (versão, data e hora, navegador) fica em
   cali_workspace.terms_acceptances. */
import { ReactNode, useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LegalDocument } from '../legal/LegalDocument';
import { LEGAL_VERSION, legalEnabled, privacyPolicy, termsOfUse } from '../legal/legalTexts';
import '../legal/legal.css';

const TERMS_VERSION = LEGAL_VERSION;

type Stage = 'checking' | 'ok' | 'ask';
const QA = String(import.meta.env.VITE_SUPABASE_URL || '').includes('qa-isolated');

export function TermsGate({ children }: { children: ReactNode }) {
  const enabled = legalEnabled() && !QA;
  const [stage, setStage] = useState<Stage>(enabled ? 'checking' : 'ok');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!enabled || !supabase) return;
    void (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { setStage('ok'); return; }
      const found = await supabase.from('terms_acceptances').select('version').eq('user_id', user.id).eq('version', TERMS_VERSION).maybeSingle();
      // Falha na consulta não bloqueia o trabalho; pergunta de novo no próximo acesso.
      setStage(found.error || found.data ? 'ok' : 'ask');
    })();
  }, [enabled]);

  async function accept() {
    if (!supabase || busy || !agreed) return;
    setBusy(true); setMessage('');
    const user = (await supabase.auth.getUser()).data.user;
    const result = user ? await supabase.from('terms_acceptances').insert({ user_id: user.id, version: TERMS_VERSION, user_agent: navigator.userAgent.slice(0, 300) }) : { error: new Error('Sessão encerrada.') };
    setBusy(false);
    if (result.error && !String(result.error.message).includes('duplicate')) { setMessage('Não foi possível registrar o aceite. Tente de novo.'); return; }
    setStage('ok');
  }
  async function leave() { if (supabase) await supabase.auth.signOut(); window.location.assign('/login'); }

  if (stage === 'ok') return <>{children}</>;
  if (stage === 'checking') return <main className="v2-mfa"><p className="v2-mfa-wait" aria-busy="true">Carregando…</p></main>;
  return <main className="v2-mfa">
    <section className="v2-mfa-card v2-terms-card" aria-labelledby="v2-terms-title">
      <span className="v2-mfa-icon" aria-hidden="true"><FileCheck2 size={22} /></span>
      <h1 id="v2-terms-title">Termos de uso e privacidade</h1>
      <p>Antes de continuar, leia como o CALI Workspace funciona e como tratamos os seus dados.</p>
      <div className="v2-terms-text" tabIndex={0}><LegalDocument source={termsOfUse()} idPrefix="gate-terms" /><LegalDocument source={privacyPolicy()} idPrefix="gate-privacy" /></div>
      <p className="v2-terms-links">Também disponíveis em <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.</p>
      <label className="v2-terms-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Li e aceito os termos de uso e a política de privacidade.</span></label>
      {message && <p className="v2-mfa-error" role="alert">{message}</p>}
      <button type="button" className="v2-mfa-primary" disabled={busy || !agreed} onClick={() => void accept()}>{busy ? 'Registrando…' : 'Continuar'}</button>
      <button type="button" className="v2-mfa-leave" onClick={() => void leave()}>Sair</button>
    </section>
  </main>;
}
