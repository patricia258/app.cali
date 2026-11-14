/* Perfil Comportamental CALI — teste público (/perfil/:slug), no formato do CALI Forms (uma tela por vez).
   Abertura + consentimento → identificação → 18 blocos (dia comum) → 6 blocos (semana difícil) → revisão sem prévia
   do perfil → envio. Depois do envio, a pessoa só vê o agradecimento; o relatório chega por e-mail.
   Com convite (?c=token): nome e e-mail vêm do convite, o prazo aparece em data, o progresso é registrado (bloco de
   parada) e as respostas ficam guardadas no aparelho para retomar de onde parou. */
import { GuidedInput } from '../../../components/ds/GuidedField';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfileTestRoute } from './hooks/useProfileTestRoute';
import { useRespondentQuestionnaire } from './hooks/useRespondentQuestionnaire';
import { useRecordRespondentProgress } from './hooks/useRecordRespondentProgress';
import { useSubmitRespondentQuestionnaire } from './hooks/useSubmitRespondentQuestionnaire';
import { ArrowLeft, ArrowRight, CalendarClock, Check, Handshake, LayoutList, Mail } from 'lucide-react';
import { blockItems, computeScores, NATURAL_BLOCKS, PRESSURE_BLOCKS, profileOf, type BlockAnswer, type Style } from '../../disc/profileMethod';
import { RichText } from '../../../components/public/RichText';
import { RespondentReport, type ProfileResultView } from '../../disc/components/ProfileReports';
import { CONSENT_TEXT, NATURAL_INSTRUCTION, PRESSURE_INSTRUCTION } from '../../disc/profileContent';
import { questionnaire as ui } from '../forms/questionnaireStyles';
import '../forms/questionnaire-motion.css';
import './profile-motion.css';

type Step = { kind: 'welcome' } | { kind: 'identify' } | { kind: 'intro'; key: 'natural' | 'pressure' } | { kind: 'block'; key: 'natural' | 'pressure'; block: number; index: number; of: number } | { kind: 'review' };
type Partial2 = { mais?: Style; menos?: Style };
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

const screen = `${ui.screen} tw:max-w-[47.5rem]`;
const centered = `${screen} ${ui.center}`;
const description = `${ui.description} ${ui.richText} tw:[&_b]:font-bold tw:[&_b]:text-[#2b2024]! tw:[&_em]:italic`;
const company = 'tw:mt-[1.375rem] tw:text-[0.9375rem] tw:text-[#6b5d63]';
const row = 'tw:grid tw:grid-cols-[1fr_auto_auto] tw:items-center tw:rounded-xl tw:border tw:border-solid tw:[transition:border-color_.15s,background_.15s] tw:max-[641px]:grid-cols-2';
const rowTone = { more: 'tw:border-[#4f7a5b] tw:bg-[#eef5ef]', less: 'tw:border-[#b9897a] tw:bg-[#faf0ec]', default: 'tw:border-cali-brand/22 tw:bg-white/75' };
const choice = 'tw:h-[2.375rem] tw:min-w-[4.5rem] tw:rounded-[0.5625rem] tw:border tw:border-solid tw:font-cali-body tw:text-[0.875rem]! tw:leading-[normal] tw:font-semibold tw:cursor-pointer tw:max-[641px]:min-w-0 tw:max-[641px]:w-full';
const choiceTone = { more: 'tw:border-[#4f7a5b] tw:bg-[#4f7a5b] tw:text-white', less: 'tw:border-[#9e5b4a] tw:bg-[#9e5b4a] tw:text-white', default: 'tw:border-cali-brand/28 tw:bg-white tw:text-cali-brand' };
const formLabel = 'tw:mt-[1.375rem] tw:block';
const fieldCaption = 'tw:block tw:text-[0.8125rem] tw:font-semibold tw:text-[#2b2024]';
const optionalCaption = 'tw:ml-[0.375rem] tw:font-medium tw:text-[#6b5d63] tw:not-italic';
const introEmphasis = 'tw:bg-[linear-gradient(transparent_62%,#f3e3e8_62%)] tw:text-cali-brand tw:not-italic';
const inlineChoice = 'tw:inline-block tw:rounded-md tw:px-2 tw:text-[0.8125rem] tw:text-white!';
const sampleRow = `${row} tw:gap-[0.3125rem] tw:py-[0.375rem] tw:pr-[0.375rem] tw:pl-[0.625rem]`;
const sampleText = 'tw:text-[0.8125rem] tw:leading-[1.35] tw:text-[#2b2024] tw:max-[641px]:col-span-full';
const sampleChoice = 'tw:rounded-[0.4375rem] tw:border tw:border-solid tw:px-2 tw:py-1 tw:text-[0.6875rem] tw:font-semibold tw:not-italic';

export function ProfileTestPage() {
  const route = useProfileTestRoute();
  return <ProfileTest key={JSON.stringify([route.slug, route.preview, route.inviteToken])} {...route} />;
}

function ProfileTest({ slug, preview, inviteToken }: { slug: string; preview: boolean; inviteToken: string }) {
  const draftKey = `cali-perfil:${inviteToken || slug}`;
  const stageRef = useRef<HTMLElement>(null);
  const questionnaire = useRespondentQuestionnaire(slug, inviteToken);
  const { mutateAsync: sendAnswers, isPending: sending } = useSubmitRespondentQuestionnaire();
  const link = questionnaire.data?.link;
  const invite = questionnaire.data?.invite;
  const state = questionnaire.isPending ? 'loading' : link ? 'ready' : 'missing';
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [consent, setConsent] = useState(false);
  const [person, setPerson] = useState({ name: '', email: '', job: '', company: '' });
  const [natural, setNatural] = useState<Record<number, Partial2>>({});
  const [pressure, setPressure] = useState<Record<number, Partial2>>({});
  const [error, setError] = useState('');
  const [previewResult, setPreviewResult] = useState<ProfileResultView | null>(null);

  const restored = useRef(false);
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);
  useEffect(() => {
    if (!link || restored.current) return;
    restored.current = true;
    const draft = preview ? null : readDraft(draftKey);
    if (draft && (!invite || ['opened', 'started'].includes(invite.state))) {
      setConsent(draft.consent); setPerson(draft.person); setNatural(draft.natural || {}); setPressure(draft.pressure || {});
      setStepIndex(Math.max(0, Math.min(STEPS.length - 1, draft.stepIndex || 0)));
    }
    if (invite) setPerson((current) => ({ ...current, name: invite.person_name, email: invite.email }));
  }, [draftKey, invite, link, preview]);

  const step = STEPS[stepIndex];
  const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);
  const complete = (answer?: Partial2) => Boolean(answer?.mais && answer?.menos);
  const allDone = useMemo(() => Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1).every((block) => complete(natural[block])) && PRESSURE_BLOCKS.every((block) => complete(pressure[block])), [natural, pressure]);

  useEffect(() => { stageRef.current?.scrollTo({ top: 0 }); }, [stepIndex]);

  const answered = useMemo(() => Object.values(natural).filter(complete).length + Object.values(pressure).filter(complete).length, [natural, pressure]);
  const inviteOpen = !invite || ['opened', 'started', 'sent'].includes(invite.state);
  // Retomada no mesmo aparelho: guarda o andamento a cada passo.
  useEffect(() => {
    if (state !== 'ready' || preview || !inviteOpen || stepIndex === 0) return;
    writeDraft(draftKey, { stepIndex, consent, person, natural, pressure });
  }, [state, stepIndex, consent, person, natural, pressure]);
  useRecordRespondentProgress(inviteToken, answered, Boolean(invite && inviteOpen && stepIndex >= 2));

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
    setError('');
    const answers = { natural: pack(natural, Array.from({ length: NATURAL_BLOCKS }, (_, i) => i + 1)), pressure: pack(pressure, PRESSURE_BLOCKS) };
    try {
      const receipt = await sendAnswers({ submission: { slug, inviteToken, person, answers, consent }, draftKey });
      if (!receipt.token) {
        setError(receipt.error || 'Não foi possível enviar agora. Tente de novo.');
        return;
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar agora. Tente de novo.');
    }

  }

  const blockScreen = step.kind === 'block' ? (() => {
    const answer = (step.key === 'natural' ? natural : pressure)[step.block] || {};
    return <div className={`${screen} ${direction === 'next' ? ui.forward : ui.back}`} key={`${step.key}-${step.block}`}>
      <small className={ui.eyebrow}>{step.key === 'natural' ? 'Dia comum de trabalho' : 'Semana difícil'} · bloco {step.index} de {step.of}</small>
      <h2 className={ui.heading}>Qual frase <em className="tw:border-b-2 tw:border-solid tw:border-current tw:text-cali-brand tw:not-italic">mais</em> combina com você, e qual <em className="tw:border-b-2 tw:border-solid tw:border-current tw:text-cali-brand tw:not-italic">menos</em> combina?</h2>
      <div className="tw:mt-6 tw:flex tw:flex-col tw:gap-[0.625rem]" role="group" aria-label="Frases do bloco">
        {blockItems(step.block, step.key === 'pressure').map((item) => <div key={item.style} className={`${row} tw:gap-2 tw:py-[0.625rem] tw:pr-[0.625rem] tw:pl-4 tw:max-[641px]:p-3 ${rowTone[answer.mais === item.style ? 'more' : answer.menos === item.style ? 'less' : 'default']}`}>
          <span className="tw:text-[1.0625rem] tw:leading-[1.35] tw:text-[#2b2024] tw:max-[641px]:col-span-full tw:max-[641px]:text-base">{item.text}</span>
          <button type="button" aria-pressed={answer.mais === item.style} className={`${choice} ${choiceTone[answer.mais === item.style ? 'more' : 'default']}`} onClick={() => mark('mais', item.style)}>Mais</button>
          <button type="button" aria-pressed={answer.menos === item.style} className={`${choice} ${choiceTone[answer.menos === item.style ? 'less' : 'default']}`} onClick={() => mark('menos', item.style)}>Menos</button>
        </div>)}
      </div>
      {error && <p className={ui.error} role="alert">{error}</p>}
      <div className={ui.actions}><button type="button" className={ui.primary} onClick={next}>Continuar <ArrowRight size={18} /></button></div>
    </div>;
  })() : null;

  return <>
  <div className={ui.page}>
    <div className={`${ui.leaf} ${ui.leafAnimation}`} key={step.kind === 'block' ? 'b' : step.kind} aria-hidden="true" />
    <div className={ui.progress} aria-hidden="true"><i className={ui.progressFill} style={{ width: `${progress}%` }} /></div>
    <header className={ui.header}><img className={ui.logo} src="/brand/cali-rh-bordo.png" alt="CALI RH" />{preview && <span className={ui.preview}>Prévia · nada é enviado</span>}</header>
    <main className={ui.stage} ref={stageRef}>
      {state === 'loading' && <div className={centered}><span className={ui.spinner} aria-label="Carregando" /></div>}
      {state === 'missing' && <div className={`${centered} ${ui.enter}`}><small className={ui.eyebrow}>PERFIL COMPORTAMENTAL</small><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Link não encontrado</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {state === 'ready' && link?.status === 'closed' && <div className={`${centered} ${ui.enter}`}><small className={ui.eyebrow}>PERFIL COMPORTAMENTAL</small><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>{link.title}</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>Este link não está mais recebendo respostas.</p></div>}
      {state === 'ready' && link?.status === 'open' && invite && !inviteOpen && <div className={`${centered} ${ui.enter}`}><small className={ui.eyebrow}>PERFIL COMPORTAMENTAL</small>
        <h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>{invite.state === 'completed' ? 'Você já respondeu' : invite.state === 'expired' ? 'Este convite expirou' : invite.state === 'declined' ? 'Convite encerrado' : 'Convite ainda não liberado'}</h1>
        <p className={`${ui.description} tw:max-w-[38.75rem]`}>{invite.state === 'completed' ? 'Suas respostas foram registradas e o relatório foi enviado para o seu e-mail.' : invite.state === 'expired' ? `O prazo terminou ${invite.deadline_at ? deadlineLabel(invite.deadline_at) : ''}. Se ainda quiser responder, fale com quem enviou o convite.` : invite.state === 'declined' ? 'Você pediu para não participar. Se mudou de ideia, fale com quem enviou o convite.' : 'Este convite ainda não foi enviado. Aguarde o e-mail.'}</p></div>}
      {state === 'ready' && link?.status === 'open' && inviteOpen && <>
        {step.kind === 'welcome' && <div className={`${ui.screen} ${ui.enter} tw:max-w-[55rem]`} key="welcome">
          <small className={ui.eyebrow}>{link.title}{link.company_name ? ` · ${link.company_name}` : ''}</small>
          <h1 className={`${ui.title} tw:text-[clamp(1.75rem,4.2vw,2.625rem)]`}>Boas-vindas ao nosso levantamento de perfil comportamental <span className="tw:text-[.8em]" aria-hidden="true">🤍</span></h1>
          <p className={description}>Queremos <b>conhecer mais sobre você</b>: como você <b>decide</b>, como se <b>comunica</b> e como <b>reage</b> em diferentes situações do trabalho.</p>
          <ul className="tw:mx-0 tw:mt-[0.375rem] tw:mb-0 tw:flex tw:max-w-[45rem] tw:list-none tw:flex-col tw:gap-2 tw:p-0 tw:[&_b]:text-[#2b2024] tw:[&_li]:flex tw:[&_li]:items-center tw:[&_li]:gap-[0.625rem] tw:[&_li]:text-[0.9375rem] tw:[&_li]:leading-[1.5] tw:[&_li]:text-[#6b5d63] tw:[&_svg]:flex-none tw:[&_svg]:text-cali-brand">
            <li><LayoutList size={16} /><span><b>24 blocos</b> de 4 frases curtas, em média <b>12 a 20 minutos</b></span></li>
            <li><Mail size={16} /><span>Ao final, você recebe o <b>seu relatório por e-mail</b></span></li>
            {invite?.deadline_at && <li><CalendarClock size={16} /><span>Responda até <b>{deadlineLabel(invite.deadline_at)}</b></span></li>}
          </ul>
          <div className="tw:mt-[1.375rem] tw:flex tw:max-w-[45rem] tw:items-start tw:gap-[0.875rem] tw:max-[641px]:flex-col">
            <span className="tw:grid tw:size-[3.25rem] tw:flex-none tw:place-items-center tw:rounded-full tw:bg-[#f3e3e8] tw:text-cali-brand tw:max-[641px]:size-11" aria-hidden="true"><Handshake size={26} /></span>
            <label className="tw:flex tw:max-w-[42.5rem] tw:flex-1 tw:items-start tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-cali-brand/20 tw:bg-white/70 tw:px-4 tw:py-[0.875rem] tw:cursor-pointer"><input className="tw:mt-[0.1875rem] tw:size-[1.125rem] tw:flex-none tw:accent-cali-brand" type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(''); }} /><span className="tw:text-[0.84375rem]! tw:leading-[1.55] tw:text-[#6b5d63] tw:[&_b]:font-bold tw:[&_b]:text-[#2b2024]! tw:[&_em]:italic"><span><RichText value={CONSENT_TEXT} /></span><b className="tw:mt-2 tw:block tw:text-cali-brand!">Li e concordo em participar.</b></span></label>
          </div>
          {error && <p className={ui.error} role="alert">{error}</p>}
          <div className={ui.actions}><button type="button" className={ui.primary} onClick={next}>Vamos começar? <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'identify' && <div className={`${ui.screen} ${ui.enter} tw:max-w-[55rem]`} key="identify">
          <small className={ui.eyebrow}>ANTES DE COMEÇAR</small>
          <h2 className={ui.heading}>Quem está respondendo?</h2>
          {invite ? <p className={company}>Convite para <b>{invite.person_name}</b> · o relatório chega em <b>{invite.email}</b></p> : <>
          <label className={formLabel}><span className={fieldCaption}>Seu nome completo</span><GuidedInput layout="identity" value={person.name} autoComplete="name" onChange={(event) => setPerson({ ...person, name: event.target.value })} /></label>
          <label className={formLabel}><span className={fieldCaption}>Seu e-mail <em className={optionalCaption}>o relatório chega aqui</em></span><GuidedInput layout="identity" type="email" autoComplete="email" value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} /></label>
          </>}
          <label className={formLabel}><span className={fieldCaption}>Seu cargo <em className={optionalCaption}>opcional</em></span><GuidedInput layout="identity" value={person.job} onChange={(event) => setPerson({ ...person, job: event.target.value })} /></label>
          {link.has_company ? <p className={company}>Empresa: <b>{link.company_name}</b></p> : invite ? null : <label className={formLabel}><span className={fieldCaption}>Empresa onde você trabalha</span><GuidedInput layout="identity" value={person.company} autoComplete="organization" onChange={(event) => setPerson({ ...person, company: event.target.value })} /></label>}
          {error && <p className={ui.error} role="alert">{error}</p>}
          <div className={ui.actions}><button type="button" className={ui.primary} onClick={next}>Continuar <ArrowRight size={18} /></button></div>
        </div>}
        {step.kind === 'intro' && <div className={`${ui.screen} ${ui.enter} tw:max-w-[55rem]`} key={`intro-${step.key}`}>
          <small className={ui.eyebrow}>{step.key === 'natural' ? 'PARTE 1 DE 2' : 'PARTE 2 DE 2'}</small>
          <h2 className={ui.heading}>{step.key === 'natural' ? <>Pense em um <em className={introEmphasis}>dia comum</em> de trabalho</> : <>Agora, uma <em className={introEmphasis}>semana mais puxada</em></>}</h2>
          <p className={description}><RichText value={step.key === 'natural' ? NATURAL_INSTRUCTION : PRESSURE_INSTRUCTION} /></p>
          {step.key === 'natural' ? <div className="tw:mt-[1.125rem] tw:grid tw:max-w-[47.5rem] tw:grid-cols-2 tw:items-start tw:gap-[1.125rem] tw:rounded-[0.875rem] tw:border tw:border-solid tw:border-cali-brand/14 tw:bg-white/70 tw:px-[1.125rem] tw:py-4 tw:max-[641px]:grid-cols-1">
            <strong className="tw:col-span-full tw:text-[0.8125rem] tw:tracking-[.08em] tw:text-cali-gold tw:uppercase">Como responder</strong>
            <ol className="tw:m-0 tw:pl-5 tw:text-[0.9375rem] tw:leading-[1.75] tw:text-[#6b5d63] tw:[&_b]:text-[#2b2024]"><li>Leia as <b>4 frases</b> do bloco.</li><li>Toque em <b className={`${inlineChoice} tw:bg-[#4f7a5b]`}>Mais</b> na frase que <b>mais combina</b> com você.</li><li>Toque em <b className={`${inlineChoice} tw:bg-[#9e5b4a]`}>Menos</b> na que <b>menos combina</b>.</li><li>As outras duas ficam <b>sem marcação</b>. Não existe resposta certa.</li></ol>
            <div className="tw:flex tw:flex-col tw:gap-[0.375rem]" aria-hidden="true">
              <span className="tw:text-[0.6875rem] tw:font-bold tw:tracking-[.1em] tw:text-[#6b5d63] tw:uppercase">Exemplo</span>
              <div className={`${sampleRow} ${rowTone.more}`}><span className={sampleText}>Gosto de metas difíceis</span><i className={`${sampleChoice} ${choiceTone.more}`}>Mais</i><i className={`${sampleChoice} ${choiceTone.default}`}>Menos</i></div>
              <div className={`${sampleRow} ${rowTone.default}`}><span className={sampleText}>Trabalho bem em grupo</span><i className={`${sampleChoice} ${choiceTone.default}`}>Mais</i><i className={`${sampleChoice} ${choiceTone.default}`}>Menos</i></div>
              <div className={`${sampleRow} ${rowTone.less}`}><span className={sampleText}>Prefiro rotina previsível</span><i className={`${sampleChoice} ${choiceTone.default}`}>Mais</i><i className={`${sampleChoice} ${choiceTone.less}`}>Menos</i></div>
            </div>
          </div> : <p className={description}>É do mesmo jeito: <b>Mais</b> na que mais combina, <b>Menos</b> na que menos combina.</p>}
          <div className={ui.actions}><button type="button" className={ui.primary} onClick={next}>{step.key === 'natural' ? 'Vamos começar?' : 'Continuar'} <ArrowRight size={18} /></button></div>
        </div>}
        {blockScreen}
        {step.kind === 'review' && !previewResult && <div className={`${centered} ${ui.enter}`} key="review">
          {allDone ? <>
            <span className="tw:relative tw:mb-3 tw:grid tw:size-[5.25rem] tw:place-items-center tw:rounded-full tw:bg-cali-brand tw:text-white tw:shadow-[0_0.875rem_2.125rem_rgba(90,30,45,.22)] tw:after:absolute tw:after:inset-[-0.5rem] tw:after:rounded-full tw:after:border-2 tw:after:border-solid tw:after:border-cali-brand/35 tw:after:animate-[profile-review-pulse_1.8s_ease-out_infinite]"><Check size={34} /></span>
            <h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Tudo respondido!</h1>
            <p className={description}>Pronto para enviar suas respostas? O seu relatório chega por e-mail, em PDF, logo depois do envio.</p>
          </> : <>
            <h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Falta pouco</h1>
            <p className={description}>Ainda há bloco sem resposta. Volte e marque <b>Mais</b> e <b>Menos</b> nele.</p>
            <button type="button" className="tw:mt-2 tw:border-0 tw:bg-transparent tw:font-cali-body tw:text-[0.875rem]! tw:leading-[normal] tw:font-semibold tw:text-cali-brand tw:underline tw:cursor-pointer" onClick={() => jump(STEPS.findIndex((item) => item.kind === 'block' && !complete((item.key === 'natural' ? natural : pressure)[item.block])))}>Ir para o bloco que falta</button>
          </>}
          {error && <p className={ui.error} role="alert">{error}</p>}
          <div className={`${ui.actions} tw:justify-center`}><button type="button" className={`${ui.primary} tw:disabled:opacity-50! tw:disabled:cursor-not-allowed!`} disabled={!allDone || sending} onClick={() => void submit()}>{sending ? 'Enviando…' : preview ? <>Ver o relatório da prévia <Check size={18} /></> : <>Enviar respostas <Check size={18} /></>}</button></div>
        </div>}
      </>}
    </main>
    {state === 'ready' && link?.status === 'open' && inviteOpen && stepIndex > 0 && !previewResult && <nav className={ui.nav} aria-label="Navegar"><button type="button" aria-label="Voltar" className={ui.navButton} onClick={() => go(-1)}><ArrowLeft size={18} /></button></nav>}
    <footer className={`${ui.footer} tw:max-[641px]:hidden`}><a className={ui.footerLink} href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a className={ui.footerLink} href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>
    {previewResult && <div className="tw:fixed tw:inset-0 tw:z-20 tw:overflow-auto tw:bg-cali-day-canvas"><div className="tw:sticky tw:top-0 tw:z-2 tw:flex tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-solid tw:border-[#f2dfb8] tw:bg-[#fff5e0] tw:px-5 tw:py-3 tw:font-cali-body tw:text-[0.8125rem] tw:leading-[normal] tw:font-semibold tw:text-[#7a5418]"><span>Prévia do relatório da pessoa · nada foi salvo nem enviado</span><button type="button" className="tw:rounded-lg tw:border-0 tw:bg-cali-brand tw:px-3 tw:py-2 tw:font-cali-body tw:text-[0.875rem]! tw:leading-[normal] tw:font-semibold tw:text-white tw:cursor-pointer" onClick={() => setPreviewResult(null)}>Fechar prévia</button></div><div className="tw:flex tw:justify-center tw:px-3 tw:py-6" style={{ zoom: Math.min(1, (window.innerWidth - 24) / 794) }}><RespondentReport result={previewResult} /></div></div>}
  </>;
}
