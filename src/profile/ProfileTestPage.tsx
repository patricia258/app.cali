/* Perfil Comportamental CALI — teste público (/perfil/:slug), no formato do CALI Forms (uma tela por vez).
   Abertura + consentimento → identificação → 18 blocos (dia comum) → 6 blocos (semana difícil) → revisão sem prévia
   do perfil → envio. O resultado só aparece depois do envio, no relatório (/perfil/relatorio/:token). */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { anonPublicRpc } from '../lib/supabase';
import { blockItems, NATURAL_BLOCKS, PRESSURE_BLOCKS, type BlockAnswer, type Style } from './profileMethod';
import { CONSENT_TEXT, NATURAL_INSTRUCTION, PRESSURE_INSTRUCTION } from './profileContent';
import '../forms/public-form.css';
import './profile-test.css';

type LinkInfo = { title: string; purpose: string; status: 'open' | 'closed'; company_name: string | null; has_company: boolean };
type Step = { kind: 'welcome' } | { kind: 'identify' } | { kind: 'intro'; key: 'natural' | 'pressure' } | { kind: 'block'; key: 'natural' | 'pressure'; block: number; index: number; of: number } | { kind: 'review' };
type Partial2 = { mais?: Style; menos?: Style };

const STEPS: Step[] = [
  { kind: 'welcome' }, { kind: 'identify' }, { kind: 'intro', key: 'natural' },
  ...Array.from({ length: NATURAL_BLOCKS }, (_, i) => ({ kind: 'block' as const, key: 'natural' as const, block: i + 1, index: i + 1, of: NATURAL_BLOCKS })),
  { kind: 'intro', key: 'pressure' },
  ...PRESSURE_BLOCKS.map((block, i) => ({ kind: 'block' as const, key: 'pressure' as const, block, index: i + 1, of: PRESSURE_BLOCKS.length })),
  { kind: 'review' },
];

export function ProfileTestPage() {
  const { slug = '' } = useParams();
  const preview = useSearchParams()[0].get('previa') === '1';
  const navigate = useNavigate();
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [consent, setConsent] = useState(false);
  const [person, setPerson] = useState({ name: '', email: '', job: '', company: '' });
  const [natural, setNatural] = useState<Record<number, Partial2>>({});
  const [pressure, setPressure] = useState<Record<number, Partial2>>({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = 'Perfil Comportamental · CALI RH';
    void anonPublicRpc<LinkInfo | null>('cali_profile_link', { p_slug: slug }).then(({ data }) => { if (data) { setLink(data); setState('ready'); } else setState('missing'); });
  }, [slug]);

  const step = STEPS[stepIndex];
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  const complete = (answer?: Partial2) => Boolean(answer?.mais && answer?.menos);
  const allDone = useMemo(() => Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1).every((block) => complete(natural[block])) && PRESSURE_BLOCKS.every((block) => complete(pressure[block])), [natural, pressure]);

  useEffect(() => { document.querySelector('.cali-form-page .cf-stage')?.scrollTo({ top: 0 }); }, [stepIndex]);

  function go(delta: number) {
    setError(''); setDirection(delta > 0 ? 'next' : 'back');
    setStepIndex((current) => Math.max(0, Math.min(STEPS.length - 1, current + delta)));
  }
  function jump(to: number) { setError(''); setDirection(to > stepIndex ? 'next' : 'back'); setStepIndex(to); }

  function next() {
    if (step.kind === 'welcome' && !consent) { setError('Para continuar, marque que você leu e concorda.'); return; }
    if (step.kind === 'identify') {
      if (person.name.trim().length < 2) { setError('Informe seu nome.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(person.email.trim())) { setError('Confira o e-mail: é para ele que vamos enviar o seu relatório.'); return; }
      if (!link?.has_company && !person.company.trim()) { setError('Informe a empresa onde você trabalha.'); return; }
    }
    if (step.kind === 'block') {
      const answer = (step.key === 'natural' ? natural : pressure)[step.block];
      if (!complete(answer)) { setError('Marque uma frase em "Mais" e outra em "Menos" para continuar.'); return; }
    }
    go(1);
  }

  function mark(kind: 'mais' | 'menos', style: Style) {
    if (step.kind !== 'block') return;
    const setter = step.key === 'natural' ? setNatural : setPressure;
    const block = step.block, at = stepIndex;
    setError('');
    setter((all) => {
      const current = all[block] || {};
      const updated: Partial2 = { ...current };
      if (kind === 'mais') { updated.mais = current.mais === style ? undefined : style; if (updated.menos === style) updated.menos = undefined; }
      else { updated.menos = current.menos === style ? undefined : style; if (updated.mais === style) updated.mais = undefined; }
      // Bloco completo agora: avança sozinho (só se a pessoa ainda estiver nesta tela).
      if (complete(updated) && !complete(current)) window.setTimeout(() => setStepIndex((now) => { if (now !== at) return now; setDirection('next'); return now + 1; }), 450);
      return { ...all, [block]: updated };
    });
  }

  async function submit() {
    if (!allDone || sending) return;
    if (preview) { setError('Prévia: nada é enviado. Para responder de verdade, abra o link sem "?previa=1".'); return; }
    setSending(true); setError('');
    const pack = (source: Record<number, Partial2>, blocks: number[]): BlockAnswer[] => blocks.map((block) => ({ b: block, mais: source[block].mais!, menos: source[block].menos! }));
    const { data, error: rpcError } = await anonPublicRpc<{ id: string; token: string }>('cali_profile_submit', {
      p_slug: slug, p_name: person.name.trim(), p_email: person.email.trim(), p_job_title: person.job.trim(), p_company_name: person.company.trim(),
      p_answers: { natural: pack(natural, Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1)), pressure: pack(pressure, PRESSURE_BLOCKS) }, p_consent: consent,
    });
    if (rpcError || !data?.token) { setSending(false); setError(rpcError?.message || 'Não foi possível enviar agora. Tente de novo.'); return; }
    navigate(`/perfil/relatorio/${data.token}?novo=1`, { replace: true });
  }

  const blockScreen = step.kind === 'block' ? (() => {
    const answer = (step.key === 'natural' ? natural : pressure)[step.block] || {};
    return <div className={`cf-screen cpt-block cf-${direction}`} key={`${step.key}-${step.block}`}>
      <small>{step.key === 'natural' ? 'Dia comum de trabalho' : 'Semana difícil'} · bloco {step.index} de {step.of}</small>
      <h2>Qual frase <em>mais</em> combina com você, e qual <em>menos</em> combina?</h2>
      <div className="cpt-rows" role="group" aria-label="Frases do bloco">
        {blockItems(step.block, step.key === 'pressure').map((item) => <div key={item.style} className={`cpt-row${answer.mais === item.style ? ' is-mais' : answer.menos === item.style ? ' is-menos' : ''}`}>
          <span>{item.text}</span>
          <button type="button" aria-pressed={answer.mais === item.style} className="mais" onClick={() => mark('mais', item.style)}>Mais</button>
          <button type="button" aria-pressed={answer.menos === item.style} className="menos" onClick={() => mark('menos', item.style)}>Menos</button>
        </div>)}
      </div>
      {error && <p className="cf-error" role="alert">{error}</p>}
      <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>Continuar <ArrowRight size={18} /></button></div>
    </div>;
  })() : null;

  return <div className="cali-form-page cali-profile-test">
    <div className="cf-leaf cf-leaf-intro" key={step.kind === 'block' ? 'b' : step.kind} aria-hidden="true" />
    <div className="cf-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
    <header className="cf-top"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" />{preview && <span className="cf-preview">Prévia · nada é enviado</span>}</header>
    <main className="cf-stage">
      {state === 'loading' && <div className="cf-screen cf-center"><span className="cf-spinner" aria-label="Carregando" /></div>}
      {state === 'missing' && <div className="cf-screen cf-center cf-enter"><small>PERFIL COMPORTAMENTAL</small><h1>Link não encontrado</h1><p>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {state === 'ready' && link?.status === 'closed' && <div className="cf-screen cf-center cf-enter"><small>PERFIL COMPORTAMENTAL</small><h1>{link.title}</h1><p>Este link não está mais recebendo respostas.</p></div>}
      {state === 'ready' && link?.status === 'open' && <>
        {step.kind === 'welcome' && <div className="cf-screen cf-enter" key="welcome">
          <small>PERFIL COMPORTAMENTAL{link.company_name ? ` · ${link.company_name}` : ''}</small>
          <h1>{link.title}</h1>
          <p className="cf-desc">Um levantamento rápido de como você costuma agir no trabalho: como decide, se comunica e reage quando a semana aperta. São 24 blocos de 4 frases curtas e leva de 8 a 10 minutos. Ao final, você recebe o seu relatório por e-mail.</p>
          <label className="cpt-consent"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(''); }} /><span>{CONSENT_TEXT}</span></label>
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>Começar <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'identify' && <div className="cf-screen cf-enter cpt-identify" key="identify">
          <small>ANTES DE COMEÇAR</small>
          <h2>Quem está respondendo?</h2>
          <label><span>Seu nome completo</span><input className="cf-text" value={person.name} autoComplete="name" onChange={(event) => setPerson({ ...person, name: event.target.value })} /></label>
          <label><span>Seu e-mail <em>o relatório chega aqui</em></span><input className="cf-text" type="email" autoComplete="email" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label>
          <label><span>Seu cargo <em>opcional</em></span><input className="cf-text" value={person.job} onChange={(event) => setPerson({ ...person, job: event.target.value })} /></label>
          {link.has_company ? <p className="cpt-company">Empresa: <b>{link.company_name}</b></p> : <label><span>Empresa onde você trabalha</span><input className="cf-text" value={person.company} autoComplete="organization" onChange={(event) => setPerson({ ...person, company: event.target.value })} /></label>}
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>Continuar <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'intro' && <div className="cf-screen cf-enter" key={`intro-${step.key}`}>
          <small>{step.key === 'natural' ? 'PARTE 1 DE 2 · DIA COMUM' : 'PARTE 2 DE 2 · SEMANA DIFÍCIL'}</small>
          <h2>{step.key === 'natural' ? 'Pense em um dia comum de trabalho' : 'Agora, pense em uma semana difícil'}</h2>
          <p className="cf-desc">{step.key === 'natural' ? NATURAL_INSTRUCTION : PRESSURE_INSTRUCTION}</p>
          <p className="cf-desc">Em cada bloco, marque <b>Mais</b> na frase que mais combina com você e <b>Menos</b> na que menos combina. As outras duas ficam sem marcação.</p>
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>{step.key === 'natural' ? 'Começar os blocos' : 'Continuar'} <ArrowRight size={18} /></button></div>
        </div>}
        {blockScreen}
        {step.kind === 'review' && <div className="cf-screen cf-enter cpt-review" key="review">
          <small>REVISÃO</small>
          <h2>{allDone ? 'Tudo respondido' : 'Faltam alguns blocos'}</h2>
          <p className="cf-desc">Se quiser, toque em um bloco para rever a resposta. O seu perfil aparece depois do envio, no relatório.</p>
          <div className="cpt-chips"><span>Dia comum</span>{Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1).map((block) => <button type="button" key={`n${block}`} className={complete(natural[block]) ? 'ok' : 'pending'} onClick={() => jump(STEPS.findIndex((item) => item.kind === 'block' && item.key === 'natural' && item.block === block))}>{block}</button>)}</div>
          <div className="cpt-chips"><span>Semana difícil</span>{PRESSURE_BLOCKS.map((block, i) => <button type="button" key={`p${block}`} className={complete(pressure[block]) ? 'ok' : 'pending'} onClick={() => jump(STEPS.findIndex((item) => item.kind === 'block' && item.key === 'pressure' && item.block === block))}>{i + 1}</button>)}</div>
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" disabled={!allDone || sending} onClick={() => void submit()}>{sending ? 'Enviando…' : <>Enviar respostas <Check size={18} /></>}</button></div>
        </div>}
      </>}
    </main>
    {state === 'ready' && link?.status === 'open' && stepIndex > 0 && <nav className="cf-nav" aria-label="Navegar"><button type="button" aria-label="Voltar" onClick={() => go(-1)}><ArrowLeft size={18} /></button></nav>}
    <footer className="cf-foot"><a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>;
}
