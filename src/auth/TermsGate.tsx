/* Aceite dos termos de uso e da política de privacidade no primeiro acesso (LGPD), para cliente e Equipe CALI.
   DESLIGADO enquanto TERMS_VERSION estiver vazio: os textos aguardam a revisão do advogado.
   Para ligar: colar os textos aprovados em TERMS_SECTIONS e preencher TERMS_VERSION (ex.: '2026-11').
   Cada nova versão pede um novo aceite; o registro fica em cali_workspace.terms_acceptances. */
import { ReactNode, useEffect, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const TERMS_VERSION = '';
const TERMS_SECTIONS: { title: string; body: string[] }[] = [];

type Stage = 'checking' | 'ok' | 'ask';
const QA = String(import.meta.env.VITE_SUPABASE_URL || '').includes('qa-isolated');

export function TermsGate({ children }: { children: ReactNode }) {
  const enabled = Boolean(TERMS_VERSION) && TERMS_SECTIONS.length > 0 && !QA;
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
      <div className="v2-terms-text" tabIndex={0}>{TERMS_SECTIONS.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>)}</div>
      <label className="v2-terms-check"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>Li e aceito os termos de uso e a política de privacidade.</span></label>
      {message && <p className="v2-mfa-error" role="alert">{message}</p>}
      <button type="button" className="v2-mfa-primary" disabled={busy || !agreed} onClick={() => void accept()}>{busy ? 'Registrando…' : 'Continuar'}</button>
      <button type="button" className="v2-mfa-leave" onClick={() => void leave()}>Sair</button>
    </section>
  </main>;
}
