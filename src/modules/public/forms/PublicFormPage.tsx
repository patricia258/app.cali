/* CALI Forms — página pública (/f/:slug): uma pergunta por tela, no estilo Typeform, com a identidade CALI.
   Sem login. Lê e envia pelas funções públicas de CALI Forms. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicFormRoute } from './hooks/usePublicFormRoute';
import { usePublicForm } from './hooks/usePublicForm';
import { useSubmitPublicForm } from './hooks/useSubmitPublicForm';
import { useUploadPublicFormAttachment } from './hooks/useUploadPublicFormAttachment';
import { ArrowDown, ArrowRight, ArrowUp, Check, CornerDownLeft } from 'lucide-react';
import { RichText } from '../../../components/public/RichText';
import { type FormAnswer, type FormQuestion, buildFormSubmission, isAnswerable, nextQuestionIndex, validateAnswer } from '../../forms/formModel';
import { PublicQuestionAnswer, type PublicQuestionUpload } from './components/PublicQuestionAnswer';
import { questionnaire as ui } from './questionnaireStyles';
import './questionnaire-motion.css';

type Phase = 'loading' | 'missing' | 'closed' | 'welcome' | 'questions' | 'sending' | 'done';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function PublicFormPage() {
  const { slug, preview } = usePublicFormRoute();
  return <PublicForm key={JSON.stringify([slug, preview])} slug={slug} preview={preview} />;
}

function PublicForm({ slug, preview }: { slug: string; preview: boolean }) {
  const lookup = usePublicForm(slug, preview);
  const form = lookup.data;
  const [responsePhase, setPhase] = useState<Phase | null>(null);
  const phase = responsePhase ?? (lookup.isPending ? 'loading' : !form ? 'missing' : form.status === 'open' ? 'welcome' : 'closed');
  const { mutateAsync: sendResponse } = useSubmitPublicForm();
  const { mutateAsync: upload, reset: resetUpload } = useUploadPublicFormAttachment();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [trail, setTrail] = useState<number[]>([]);
  const [uploads, setUploads] = useState<Record<string, PublicQuestionUpload>>({});
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const stageRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const advanceTimer = useRef<number>();
  const submitting = useRef(false);
  useEffect(() => { document.title = form ? `${form.title} · CALI RH` : 'CALI Forms'; }, [form]);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const questions: FormQuestion[] = useMemo(() => form?.questions ?? [], [form]);
  const answerable = useMemo(() => questions.filter(isAnswerable), [questions]);
  const question = questions[index];
  const progress = phase === 'done' ? 100 : phase === 'questions' && questions.length ? Math.round((index / questions.length) * 100) : 0;
  const numberOf = (target: FormQuestion) => answerable.indexOf(target) + 1;

  useEffect(() => {
    if (phase !== 'questions') return;
    stageRef.current?.scrollTo({ top: 0 });
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
    return () => window.clearTimeout(timer);
  }, [index, phase]);

  const submit = useCallback(async () => {
    if (!form || submitting.current) return;
    if (preview) { setUploads({}); setPhase('done'); return; }
    submitting.current = true;
    setPhase('sending'); setSendError('');
    const sent = buildFormSubmission(questions, [...trail, index], answers);
    try {
      await sendResponse({ form, answers: sent });
      setUploads({});
      setPhase('done');
    } catch (requestError) {
      setSendError(requestError instanceof Error ? requestError.message : 'Não foi possível enviar agora.');
      setPhase('questions');
    } finally {
      submitting.current = false;
    }
  }, [answers, form, preview, trail, index, questions, sendResponse]);

  const goNext = useCallback(() => {
    if (!question) return;
    const problem = validateAnswer(question, answers[question.id]);
    if (problem) { setError(problem); return; }
    if (uploads[question.id]?.busy) { setError('Aguarde terminar o envio do arquivo.'); return; }
    setError('');
    const next = nextQuestionIndex(questions, index, answers[question.id]);
    if (next < 0) { void submit(); return; }
    setTrail((current) => [...current, index]); setDirection('next'); setIndex(next);
  }, [answers, index, question, questions, submit, uploads]);

  const goBack = useCallback(() => {
    if (!trail.length) return;
    const previous = trail[trail.length - 1];
    setError(''); setDirection('back'); setTrail((current) => current.slice(0, -1)); setIndex(previous);
  }, [trail]);

  function setAnswer(value: FormAnswer, autoAdvance = false) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
    setError('');
    if (autoAdvance) {
      window.clearTimeout(advanceTimer.current);
      const next = nextQuestionIndex(questions, index, value);
      advanceTimer.current = window.setTimeout(() => {
        if (next < 0) return;
        setTrail((current) => [...current, index]); setDirection('next'); setIndex(next);
      }, 380);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase === 'welcome' && event.key === 'Enter') { event.preventDefault(); setPhase('questions'); return; }
      if (phase !== 'questions' || !question) return;
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'checkbox');
      if (event.key === 'Enter' && !(target.tagName === 'TEXTAREA' && event.shiftKey)) {
        if (target.tagName === 'TEXTAREA' && !event.metaKey && !event.ctrlKey && event.shiftKey) return;
        event.preventDefault(); goNext(); return;
      }
      if (typing) return;
      const options = question.kind === 'single_choice' || question.kind === 'multi_choice' ? question.options ?? [] : question.kind === 'yes_no' ? ['Sim', 'Não'] : [];
      const letter = LETTERS.indexOf(event.key.toUpperCase());
      if (letter >= 0 && letter < options.length) {
        event.preventDefault();
        if (question.kind === 'multi_choice') toggleMulti(options[letter]); else setAnswer(options[letter], true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function toggleMulti(option: string) {
    const current = Array.isArray(answers[question!.id]) ? (answers[question!.id] as string[]) : [];
    setAnswer(current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  }

  const isLast = question ? nextQuestionIndex(questions, index, answers[question.id]) < 0 : false;

  async function chooseFile(item: FormQuestion, file: File | undefined) {
    if (!file || !form) return;
    if (file.size > 25 * 1024 * 1024) { setError('O arquivo passa de 25 MB. Envie um arquivo menor.'); return; }
    if (item.accept === 'images_pdf' && !(file.type.startsWith('image/') || file.type === 'application/pdf')) { setError('Envie um PDF ou uma imagem.'); return; }
    const attachment = { name: file.name, image: file.type.startsWith('image/') ? file : undefined };
    setError(''); setUploads((current) => ({ ...current, [item.id]: { ...attachment, busy: true } }));
    const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'arquivo';
    const path = `${form.id}/${crypto.randomUUID()}/${Date.now()}-${safe}`;
    if (!preview) {
      const uploaded = await upload({ path, file }).catch(() => false);
      resetUpload();
      if (!uploaded) {
        setUploads((current) => ({ ...current, [item.id]: { name: file.name, busy: false, error: 'Não foi possível enviar o arquivo. Tente de novo.' } }));
        return;
      }
    }
    setUploads((current) => ({ ...current, [item.id]: { ...attachment, busy: false } }));
    setAnswers((current) => ({ ...current, [item.id]: path }));
  }

  const statement = question?.kind === 'statement';
  const questionIndent = statement ? '' : ui.indent;
  return <div className={ui.page}>
    <div className={`${ui.leaf} ${phase === 'questions' || phase === 'sending' ? ui.leafQuestionsAnimation : ui.leafAnimation}`} key={phase === 'sending' ? 'questions' : phase} aria-hidden="true" />
    <div className={ui.progress} aria-hidden="true"><i className={ui.progressFill} style={{ width: `${progress}%` }} /></div>
    <header className={ui.header}><img className={ui.logo} src="/brand/cali-rh-bordo.png" alt="CALI RH" />{preview && <span className={ui.preview}>Prévia · as respostas não são salvas</span>}</header>
    <main className={ui.stage} ref={stageRef}>
      {phase === 'loading' && <div className={`${ui.screen} ${ui.center} tw:max-w-[45rem]`}><span className={ui.spinner} aria-label="Carregando" /></div>}
      {phase === 'missing' && <div className={`${ui.screen} ${ui.center} ${ui.enter} tw:max-w-[45rem]`}><small className={ui.eyebrow}>CALI FORMS</small><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Formulário não encontrado</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {phase === 'closed' && form && <div className={`${ui.screen} ${ui.center} ${ui.enter} tw:max-w-[45rem]`}><small className={ui.eyebrow}>CALI FORMS</small><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>{form.title}</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>Este formulário não está mais recebendo respostas. Obrigada pelo interesse.</p></div>}
      {phase === 'welcome' && form && <div className={`${ui.screen} ${ui.enter} tw:max-w-[55rem]`}>
        <small className={ui.eyebrow}>{form.category || 'Formulário'}</small><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>{form.title}</h1>
        {form.description && <p className={`${ui.description} ${ui.richText}`}><RichText value={form.description} /></p>}
        <div className={ui.actions}><button type="button" className={ui.primary} onClick={() => setPhase('questions')}>Começar <ArrowRight size={18} /></button><span className="tw:text-[0.8125rem] tw:text-[#6b5d63]! tw:max-[641px]:hidden tw:[&_b]:inline-flex tw:[&_b]:items-center tw:[&_b]:gap-[0.1875rem] tw:[&_b]:font-bold tw:[&_b]:text-[#2b2024]!">ou pressione <b>Enter <CornerDownLeft size={13} /></b></span></div>
        <p className={ui.meta}>{answerable.length} {answerable.length === 1 ? 'pergunta' : 'perguntas'} · cerca de {Math.max(1, Math.round(answerable.length * 0.4))} min</p>
      </div>}
      {(phase === 'questions' || phase === 'sending') && question && <div className={`${ui.screen} tw:max-w-[45rem] ${direction === 'next' ? ui.forward : ui.back}`} key={question.id}>
        <div className="tw:flex tw:items-start tw:gap-3 tw:max-[641px]:gap-2">
          {isAnswerable(question) && <span className="tw:mt-[0.4375rem] tw:inline-flex tw:min-w-[1.625rem] tw:flex-none tw:items-center tw:gap-[0.1875rem] tw:text-[0.9375rem] tw:font-bold tw:text-cali-brand!">{numberOf(question)}<ArrowRight size={14} /></span>}
          <h2 className={ui.heading}>{question.label}{isAnswerable(question) && (question.required ? <em className="tw:ml-[0.375rem] tw:text-cali-brand! tw:not-italic" aria-label="obrigatória">*</em> : <span className="tw:ml-[0.625rem] tw:inline-block tw:rounded-full tw:bg-[#efe6df] tw:px-[0.5625rem] tw:py-[0.1875rem] tw:align-middle tw:text-xs tw:font-semibold tw:tracking-normal tw:text-[#6b5d63]">Opcional</span>)}</h2>
        </div>
        {question.help && <p className={`tw:mr-0 tw:mb-0 tw:leading-[1.55] tw:whitespace-pre-line tw:text-[#6b5d63]! ${ui.richText} ${statement ? 'tw:mt-[0.875rem] tw:text-[clamp(1rem,1.6vw,1.125rem)]' : `tw:mt-[0.625rem] tw:text-base ${questionIndent}`}`}><RichText value={question.help} /></p>}
        <PublicQuestionAnswer
          item={question}
          value={answers[question.id]}
          upload={uploads[question.id]}
          inputRef={inputRef}
          onAnswer={setAnswer}
          onToggle={toggleMulti}
          onChooseFile={(file) => void chooseFile(question, file)}
          onRemove={() => {
            setAnswers((current) => { const next = { ...current }; delete next[question.id]; return next; });
            setUploads((current) => { const next = { ...current }; delete next[question.id]; return next; });
          }}
        />
        {error && <p className={`${ui.error} ${questionIndent}`} role="alert">{error}</p>}
        {sendError && isLast && <p className={`${ui.error} ${questionIndent}`} role="alert">{sendError}</p>}
        <div className={`${ui.actions} ${questionIndent}`}>
          <button type="button" className={ui.primary} disabled={phase === 'sending'} onClick={goNext}>{phase === 'sending' ? 'Enviando…' : isLast ? <>{form?.submit_label || 'Enviar'} <Check size={18} /></> : question.kind === 'statement' ? <>Continuar <ArrowRight size={18} /></> : <>OK <Check size={18} /></>}</button>
          {phase !== 'sending' && <span className="tw:text-[0.8125rem] tw:text-[#6b5d63]! tw:max-[641px]:hidden tw:[&_b]:inline-flex tw:[&_b]:items-center tw:[&_b]:gap-[0.1875rem] tw:[&_b]:font-bold tw:[&_b]:text-[#2b2024]!">pressione <b>Enter <CornerDownLeft size={13} /></b>{question.kind === 'long_text' && <> · <b>Shift + Enter</b> quebra linha</>}</span>}
        </div>
      </div>}
      {phase === 'done' && form && <div className={`${ui.screen} ${ui.center} ${ui.enter} tw:max-w-[45rem]`}>
        <span className="tw:mb-[0.625rem] tw:grid tw:size-[5.25rem] tw:place-items-center tw:rounded-full tw:bg-cali-brand tw:shadow-[0_0.875rem_2.125rem_rgba(90,30,45,.22)]"><img src="/brand/cali-oak-mark-light.svg" alt="" className="tw:block tw:size-[3.125rem]" /></span>
        {(() => {
          // Mensagem própria do formulário: a primeira frase curta vira o título; o resto, o texto.
          const custom = form.success_text?.trim();
          if (!custom) return <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Muito obrigado!</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>Recebemos suas respostas e agradecemos a colaboração.</p></>;
          const match = custom.match(/^(.{4,70}?[!.?])\s+(.+)$/s);
          return match ? <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>{match[1]}</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>{match[2]}</p></> : <><h1 className={`${ui.title} tw:text-[clamp(1.875rem,5vw,2.875rem)]`}>Muito obrigado!</h1><p className={`${ui.description} tw:max-w-[38.75rem]`}>{custom}</p></>;
        })()}
      </div>}
    </main>
    {phase === 'questions' && <nav className={ui.nav} aria-label="Navegar entre perguntas">
      <span className={ui.navLabel}>{index + 1} de {questions.length}</span>
      <button type="button" aria-label="Pergunta anterior" className={ui.navButton} disabled={!trail.length} onClick={goBack}><ArrowUp size={18} /></button>
      <button type="button" aria-label="Próxima pergunta" className={ui.navButton} disabled={isLast} onClick={goNext}><ArrowDown size={18} /></button>
    </nav>}
    <footer className={ui.footer}><a className={ui.footerLink} href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a className={ui.footerLink} href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>;
}
