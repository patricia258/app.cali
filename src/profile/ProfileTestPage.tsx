/* Perfil Comportamental CALI — teste público (/perfil/:slug), no formato do CALI Forms (uma tela por vez).
   Abertura + consentimento → identificação → 18 blocos (dia comum) → 6 blocos (semana difícil) → revisão sem prévia
   do perfil → envio. Depois do envio, a pessoa só vê o agradecimento; o relatório chega por e-mail.
   Com convite (?c=token): nome e e-mail vêm do convite, o prazo aparece em data, o progresso é registrado (bloco de
   parada) e as respostas ficam guardadas no aparelho para retomar de onde parou. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock3, Handshake, LayoutList, Mail } from 'lucide-react';
import { anonPublicRpc } from '../lib/supabase';
import { blockItems, computeScores, NATURAL_BLOCKS, PRESSURE_BLOCKS, profileOf, type BlockAnswer, type Style } from './profileMethod';
import { richTextHtml } from '../forms/formModel';
import { RespondentReport, type ProfileResultView } from './ProfileReports';
import { CONSENT_TEXT, NATURAL_INSTRUCTION, PRESSURE_INSTRUCTION } from './profileContent';
import '../forms/public-form.css';
import './profile-test.css';

type LinkInfo = { title: string; purpose: string; status: 'open' | 'closed'; company_name: string | null; has_company: boolean };
type Step = { kind: 'welcome' } | { kind: 'identify' } | { kind: 'intro'; key: 'natural' | 'pressure' } | { kind: 'block'; key: 'natural' | 'pressure'; block: number; index: number; of: number } | { kind: 'review' };
type Partial2 = { mais?: Style; menos?: Style };
type InviteInfo = { state: 'created' | 'sent' | 'opened' | 'started' | 'completed' | 'expired' | 'declined'; person_name: string; email: string; slug: string; deadline_at: string | null; last_block: number | null };
type Draft = { stepIndex: number; consent: boolean; person: { name: string; email: string; job: string; company: string }; natural: Record<number, Partial2>; pressure: Record<number, Partial2> };
const deadlineLabel = (iso: string) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(date).replace(':', 'h');
  return `${day}, às ${time}`;
};
const readDraft = (key: string): Draft | null => { try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; } };
const writeDraft = (key: string, draft: Draft | null) => { try { if (draft) window.localStorage.setItem(key, JSON.stringify(draft)); else window.localStorage.removeItem(key); } catch { /* aparelho sem armazenamento: segue sem retomada */ } };

const STEPS: Step[] = [
  { kind: 'welcome' }, { kind: 'identify' }, { kind: 'intro', key: 'natural' },
  ...Array.from({ length: NATURAL_BLOCKS }, (_, i) => ({ kind: 'block' as const, key: 'natural' as const, block: i + 1, index: i + 1, of: NATURAL_BLOCKS })),
  { kind: 'intro', key: 'pressure' },
  ...PRESSURE_BLOCKS.map((block, i) => ({ kind: 'block' as const, key: 'pressure' as const, block, index: i + 1, of: PRESSURE_BLOCKS.length })),
  { kind: 'review' },
];

export function ProfileTestPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('previa') === '1';
  const inviteToken = preview ? '' : (params.get('c') || '');
  const draftKey = `cali-perfil:${inviteToken || slug}`;
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const progressSent = useRef(-1);
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
  const [previewResult, setPreviewResult] = useState<ProfileResultView | null>(null);

  useEffect(() => {
    document.title = 'Perfil Comportamental · CALI RH';
    void (async () => {
      const [linkResult, inviteResult] = await Promise.all([
        anonPublicRpc<LinkInfo | null>('cali_profile_link', { p_slug: slug }),
        inviteToken ? anonPublicRpc<InviteInfo | null>('cali_profile_invite_open', { p_token: inviteToken }) : Promise.resolve({ data: null }),
      ]);
      if (!linkResult.data || (inviteToken && (!inviteResult.data || inviteResult.data.slug !== slug))) { setState('missing'); return; }
      const info = inviteResult.data as InviteInfo | null;
      setLink(linkResult.data);
      if (info) setInvite(info);
      const draft = preview ? null : readDraft(draftKey);
      if (draft && (!info || ['opened', 'started'].includes(info.state))) {
        setConsent(draft.consent); setPerson(draft.person); setNatural(draft.natural || {}); setPressure(draft.pressure || {});
        setStepIndex(Math.max(0, Math.min(STEPS.length - 1, draft.stepIndex || 0)));
      }
      if (info) setPerson((current) => ({ ...current, name: info.person_name, email: info.email }));
      setState('ready');
    })();
  }, [slug, inviteToken]);

  const step = STEPS[stepIndex];
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  const complete = (answer?: Partial2) => Boolean(answer?.mais && answer?.menos);
  const allDone = useMemo(() => Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1).every((block) => complete(natural[block])) && PRESSURE_BLOCKS.every((block) => complete(pressure[block])), [natural, pressure]);

  useEffect(() => { document.querySelector('.cali-form-page .cf-stage')?.scrollTo({ top: 0 }); }, [stepIndex]);

  const answered = useMemo(() => Object.values(natural).filter(complete).length + Object.values(pressure).filter(complete).length, [natural, pressure]);
  const inviteOpen = !invite || ['opened', 'started', 'sent'].includes(invite.state);
  // Retomada no mesmo aparelho: guarda o andamento a cada passo.
  useEffect(() => {
    if (state !== 'ready' || preview || !inviteOpen || stepIndex === 0) return;
    writeDraft(draftKey, { stepIndex, consent, person, natural, pressure });
  }, [state, stepIndex, consent, person, natural, pressure]);
  // Convite: registra início e bloco de parada (para o lembrete de retomada e o indicador de abandono).
  useEffect(() => {
    if (!inviteToken || !invite || !inviteOpen || stepIndex < 2) return;
    if (answered <= progressSent.current) return;
    progressSent.current = answered;
    void anonPublicRpc('cali_profile_invite_progress', { p_token: inviteToken, p_block: answered });
  }, [answered, stepIndex, invite]);

  function go(delta: number) {
    setError(''); setDirection(delta > 0 ? 'next' : 'back');
    setStepIndex((current) => Math.max(0, Math.min(STEPS.length - 1, current + delta)));
  }
  function jump(to: number) { setError(''); setDirection(to > stepIndex ? 'next' : 'back'); setStepIndex(to); }

  function next() {
    if (step.kind === 'welcome' && !consent) { setError('Para continuar, marque que você leu e concorda.'); return; }
    if (step.kind === 'identify') {
      if (!invite && person.name.trim().length < 2) { setError('Informe seu nome.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(person.email.trim())) { setError('Confira o e-mail: é para ele que vamos enviar o seu relatório.'); return; }
      if (!invite && !link?.has_company && !person.company.trim()) { setError('Informe a empresa onde você trabalha.'); return; }
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
    const pack = (source: Record<number, Partial2>, blocks: number[]): BlockAnswer[] => blocks.map((block) => ({ b: block, mais: source[block].mais!, menos: source[block].menos! }));
    if (preview) {
      // Prévia: calcula aqui mesmo e mostra o relatório da pessoa, sem gravar nada.
      const scores = computeScores({ natural: pack(natural, Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1)), pressure: pack(pressure, PRESSURE_BLOCKS) });
      const profile = profileOf(scores);
      setPreviewResult({ id: 'previa', person_name: person.name.trim() || 'Pessoa de teste', company_name: link?.company_name || person.company, job_title: person.job, created_at: new Date().toISOString(), scores, primary_style: profile.primary, secondary_style: profile.secondary, mixed: profile.mixed });
      return;
    }
    setSending(true); setError('');
    const answers = { natural: pack(natural, Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1)), pressure: pack(pressure, PRESSURE_BLOCKS) };
    const { data, error: rpcError } = inviteToken
      ? await anonPublicRpc<{ id: string; token: string }>('cali_profile_submit_invite', { p_token: inviteToken, p_job_title: person.job.trim(), p_answers: answers, p_consent: consent })
      : await anonPublicRpc<{ id: string; token: string }>('cali_profile_submit', {
        p_slug: slug, p_name: person.name.trim(), p_email: person.email.trim(), p_job_title: person.job.trim(), p_company_name: person.company.trim(), p_answers: answers, p_consent: consent,
      });
    if (rpcError || !data?.token) { setSending(false); setError(rpcError?.message || 'Não foi possível enviar agora. Tente de novo.'); return; }
    writeDraft(draftKey, null);
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

  return <>
  <div className="cali-form-page cali-profile-test">
    <div className="cf-leaf cf-leaf-intro" key={step.kind === 'block' ? 'b' : step.kind} aria-hidden="true" />
    <div className="cf-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
    <header className="cf-top"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" />{preview && <span className="cf-preview">Prévia · nada é enviado</span>}</header>
    <main className="cf-stage">
      {state === 'loading' && <div className="cf-screen cf-center"><span className="cf-spinner" aria-label="Carregando" /></div>}
      {state === 'missing' && <div className="cf-screen cf-center cf-enter"><small>PERFIL COMPORTAMENTAL</small><h1>Link não encontrado</h1><p>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {state === 'ready' && link?.status === 'closed' && <div className="cf-screen cf-center cf-enter"><small>PERFIL COMPORTAMENTAL</small><h1>{link.title}</h1><p>Este link não está mais recebendo respostas.</p></div>}
      {state === 'ready' && link?.status === 'open' && invite && !inviteOpen && <div className="cf-screen cf-center cf-enter"><small>PERFIL COMPORTAMENTAL</small>
        <h1>{invite.state === 'completed' ? 'Você já respondeu' : invite.state === 'expired' ? 'Este convite expirou' : invite.state === 'declined' ? 'Convite encerrado' : 'Convite ainda não liberado'}</h1>
        <p>{invite.state === 'completed' ? 'Suas respostas foram registradas e o relatório foi enviado para o seu e-mail.' : invite.state === 'expired' ? `O prazo terminou ${invite.deadline_at ? deadlineLabel(invite.deadline_at) : ''}. Se ainda quiser responder, fale com quem enviou o convite.` : invite.state === 'declined' ? 'Você pediu para não participar. Se mudou de ideia, fale com quem enviou o convite.' : 'Este convite ainda não foi enviado. Aguarde o e-mail.'}</p></div>}
      {state === 'ready' && link?.status === 'open' && inviteOpen && <>
        {step.kind === 'welcome' && <div className="cf-screen cf-enter cpt-welcome" key="welcome">
          <small>{link.title}{link.company_name ? ` · ${link.company_name}` : ''}</small>
          <h1>Boas-vindas ao nosso levantamento de perfil comportamental <span aria-hidden="true">🤍</span></h1>
          <p className="cf-desc">Queremos <b>conhecer mais sobre você</b>: como você <b>decide</b>, como se <b>comunica</b> e como <b>reage</b> em diferentes situações do trabalho.</p>
          <ul className="cpt-facts">
            <li><LayoutList size={18} /><span><b>24 blocos</b> de 4 frases curtas</span></li>
            <li><Clock3 size={18} /><span>Em média <b>12 a 20 minutos</b></span></li>
            <li><Mail size={18} /><span>Ao final, você recebe o <b>seu relatório por e-mail</b></span></li>
            {invite?.deadline_at && <li><CalendarClock size={18} /><span>Responda até <b>{deadlineLabel(invite.deadline_at)}</b></span></li>}
          </ul>
          <div className="cpt-consent-wrap">
            <span className="cpt-hands" aria-hidden="true"><Handshake size={26} /></span>
            <label className="cpt-consent"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(''); }} /><span><span dangerouslySetInnerHTML={{ __html: richTextHtml(CONSENT_TEXT) }} /><b className="cpt-agree">Li e concordo em participar.</b></span></label>
          </div>
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>Vamos começar? <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'identify' && <div className="cf-screen cf-enter cpt-identify" key="identify">
          <small>ANTES DE COMEÇAR</small>
          <h2>Quem está respondendo?</h2>
          {invite ? <p className="cpt-company">Convite para <b>{invite.person_name}</b> · o relatório chega em <b>{invite.email}</b></p> : <>
          <label><span>Seu nome completo</span><input className="cf-text" value={person.name} autoComplete="name" onChange={(event) => setPerson({ ...person, name: event.target.value })} /></label>
          <label><span>Seu e-mail <em>o relatório chega aqui</em></span><input className="cf-text" type="email" autoComplete="email" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label>
          </>}
          <label><span>Seu cargo <em>opcional</em></span><input className="cf-text" value={person.job} onChange={(event) => setPerson({ ...person, job: event.target.value })} /></label>
          {link.has_company ? <p className="cpt-company">Empresa: <b>{link.company_name}</b></p> : invite ? null : <label><span>Empresa onde você trabalha</span><input className="cf-text" value={person.company} autoComplete="organization" onChange={(event) => setPerson({ ...person, company: event.target.value })} /></label>}
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>Continuar <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'intro' && <div className="cf-screen cf-enter cpt-intro" key={`intro-${step.key}`}>
          <small>{step.key === 'natural' ? 'PARTE 1 DE 2' : 'PARTE 2 DE 2'}</small>
          <h2>{step.key === 'natural' ? <>Pense em um <em>dia comum</em> de trabalho</> : <>Agora, uma <em>semana mais puxada</em></>}</h2>
          <p className="cf-desc" dangerouslySetInnerHTML={{ __html: richTextHtml(step.key === 'natural' ? NATURAL_INSTRUCTION : PRESSURE_INSTRUCTION) }} />
          {step.key === 'natural' ? <div className="cpt-howto">
            <strong>Como responder</strong>
            <ol><li>Leia as <b>4 frases</b> do bloco.</li><li>Toque em <b className="tag mais">Mais</b> na frase que <b>mais combina</b> com você.</li><li>Toque em <b className="tag menos">Menos</b> na que <b>menos combina</b>.</li><li>As outras duas ficam <b>sem marcação</b>. Não existe resposta certa.</li></ol>
            <div className="cpt-example" aria-hidden="true"><span>Exemplo</span><div className="cpt-row is-mais"><span>Gosto de metas difíceis</span><i className="mais on">Mais</i><i className="menos">Menos</i></div><div className="cpt-row"><span>Trabalho bem em grupo</span><i className="mais">Mais</i><i className="menos">Menos</i></div><div className="cpt-row is-menos"><span>Prefiro rotina previsível</span><i className="mais">Mais</i><i className="menos on">Menos</i></div></div>
          </div> : <p className="cf-desc">É do mesmo jeito: <b>Mais</b> na que mais combina, <b>Menos</b> na que menos combina.</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" onClick={next}>{step.key === 'natural' ? 'Vamos começar?' : 'Continuar'} <ArrowRight size={18} /></button></div>
        </div>}
        {blockScreen}
        {step.kind === 'review' && !previewResult && <div className="cf-screen cf-center cf-enter cpt-review" key="review">
          {allDone ? <>
            <span className="cpt-done"><Check size={34} /></span>
            <h1>Tudo respondido!</h1>
            <p className="cf-desc">Pronto para enviar suas respostas? O seu relatório chega por e-mail, em PDF, logo depois do envio.</p>
          </> : <>
            <h1>Falta pouco</h1>
            <p className="cf-desc">Ainda há bloco sem resposta. Volte e marque <b>Mais</b> e <b>Menos</b> nele.</p>
            <button type="button" className="cpt-link" onClick={() => jump(STEPS.findIndex((item) => item.kind === 'block' && !complete((item.key === 'natural' ? natural : pressure)[item.block])))}>Ir para o bloco que falta</button>
          </>}
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-primary" disabled={!allDone || sending} onClick={() => void submit()}>{sending ? 'Enviando…' : preview ? <>Ver o relatório da prévia <Check size={18} /></> : <>Enviar respostas <Check size={18} /></>}</button></div>
        </div>}
      </>}
    </main>
    {state === 'ready' && link?.status === 'open' && inviteOpen && stepIndex > 0 && !previewResult && <nav className="cf-nav" aria-label="Navegar"><button type="button" aria-label="Voltar" onClick={() => go(-1)}><ArrowLeft size={18} /></button></nav>}
    <footer className="cf-foot"><a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>
    {previewResult && <div className="cpt-preview-report"><div className="cpt-preview-bar"><span>Prévia do relatório da pessoa · nada foi salvo nem enviado</span><button type="button" onClick={() => setPreviewResult(null)}>Fechar prévia</button></div><div className="cpt-preview-pages" style={{ zoom: Math.min(1, (window.innerWidth - 24) / 794) }}><RespondentReport result={previewResult} /></div></div>}
  </>;
}
