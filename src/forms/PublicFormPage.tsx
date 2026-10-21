/* CALI Forms — página pública (/f/:slug): uma pergunta por tela, no estilo Typeform, com a identidade CALI.
   Sem login. Lê e envia pelas funções públicas cali_form_public e cali_form_submit. */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Check, CornerDownLeft } from 'lucide-react';
import { anonPublicRpc, supabase } from '../lib/supabase';
import { type FormAnswer, type FormQuestion, isAnswerable, scaleRange, validateAnswer } from './formModel';
import './public-form.css';

type PublicForm = { slug: string; title: string; description: string; thank_you: string; status: 'open' | 'closed'; confirm_email: boolean; questions: FormQuestion[] };
type Phase = 'loading' | 'missing' | 'closed' | 'welcome' | 'questions' | 'sending' | 'done';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function PublicFormPage() {
  const { slug = '' } = useParams();
  const preview = useSearchParams()[0].get('previa') === '1';
  const [form, setForm] = useState<PublicForm | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const advanceTimer = useRef<number>();

  useEffect(() => {
    document.title = 'CALI Forms';
    let alive = true;
    void anonPublicRpc<PublicForm | null>('cali_form_public', { p_slug: slug }).then(async ({ data: published }) => {
      let data = published;
      // Prévia da administradora: lê também rascunho e encerrado (só funciona com a sessão dela; RLS barra os demais).
      if (preview && supabase) {
        const own = await supabase.from('forms').select('slug,title,description,thank_you,status,confirm_email,questions').eq('slug', slug.toLowerCase()).maybeSingle();
        if (own.data) data = { ...(own.data as PublicForm), status: 'open' };
      }
      if (!alive) return;
      if (!data) { setPhase('missing'); return; }
      setForm(data); document.title = `${data.title} · CALI RH`;
      setPhase(data.status === 'open' ? 'welcome' : 'closed');
    });
    return () => { alive = false; };
  }, [slug, preview]);

  const questions = useMemo(() => form?.questions ?? [], [form]);
  const answerable = useMemo(() => questions.filter(isAnswerable), [questions]);
  const question = questions[index];
  const progress = phase === 'done' ? 100 : phase === 'questions' && questions.length ? Math.round((index / questions.length) * 100) : 0;
  const numberOf = (target: FormQuestion) => answerable.indexOf(target) + 1;

  useEffect(() => {
    if (phase !== 'questions') return;
    const timer = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 380);
    return () => window.clearTimeout(timer);
  }, [index, phase]);

  const submit = useCallback(async () => {
    if (!form) return;
    if (preview) { setConfirmation(false); setPhase('done'); return; }
    setPhase('sending'); setSendError('');
    const { data, error: rpcError } = await anonPublicRpc<{ ok: boolean; confirmation: boolean }>('cali_form_submit', { p_slug: form.slug, p_answers: answers });
    if (rpcError || !data?.ok) { setSendError(rpcError?.message || 'Não foi possível enviar agora.'); setPhase('questions'); return; }
    setConfirmation(Boolean(data.confirmation)); setPhase('done');
  }, [answers, form, preview]);

  const goNext = useCallback(() => {
    if (!question) return;
    const problem = validateAnswer(question, answers[question.id]);
    if (problem) { setError(problem); return; }
    setError('');
    if (index >= questions.length - 1) { void submit(); return; }
    setDirection('next'); setIndex((current) => current + 1);
  }, [answers, index, question, questions.length, submit]);

  const goBack = useCallback(() => {
    if (index === 0) return;
    setError(''); setDirection('back'); setIndex((current) => current - 1);
  }, [index]);

  function setAnswer(value: FormAnswer, autoAdvance = false) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: value }));
    setError('');
    if (autoAdvance) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => {
        if (index >= questions.length - 1) return;
        setDirection('next'); setIndex((current) => current + 1);
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

  function onTextKey(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && event.shiftKey) event.stopPropagation();
  }

  const isLast = index >= questions.length - 1;

  function renderInput(item: FormQuestion) {
    const value = answers[item.id];
    const text = typeof value === 'string' ? value : value === undefined ? '' : String(value);
    switch (item.kind) {
      case 'statement': return null;
      case 'long_text':
        return <textarea ref={(node) => { inputRef.current = node; }} className="cf-text cf-long" rows={3} value={text} maxLength={5000} placeholder="Digite sua resposta aqui…" onKeyDown={onTextKey} onChange={(event) => setAnswer(event.target.value)} />;
      case 'single_choice': case 'multi_choice': case 'yes_no': {
        const options = item.kind === 'yes_no' ? ['Sim', 'Não'] : item.options ?? [];
        const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
        return <div className={`cf-options${item.kind === 'yes_no' ? ' cf-options-row' : ''}`} role={item.kind === 'multi_choice' ? 'group' : 'radiogroup'}>
          {item.kind === 'multi_choice' && <p className="cf-hint">Escolha quantas quiser</p>}
          {options.map((option, position) => <button type="button" key={option} role={item.kind === 'multi_choice' ? 'checkbox' : 'radio'} aria-checked={selected.includes(option)} className={selected.includes(option) ? 'on' : ''} onClick={() => item.kind === 'multi_choice' ? toggleMulti(option) : setAnswer(option, true)}>
            <kbd>{LETTERS[position]}</kbd><span>{option}</span>{selected.includes(option) && <Check size={18} aria-hidden="true" />}
          </button>)}
        </div>;
      }
      case 'scale': {
        const range = scaleRange(item);
        return <div className="cf-scale-wrap"><div className="cf-scale" role="radiogroup" style={{ gridTemplateColumns: `repeat(${range.length}, minmax(0, 1fr))` }}>
          {range.map((number) => <button type="button" role="radio" aria-checked={value === number} key={number} className={value === number ? 'on' : ''} onClick={() => setAnswer(number, true)}>{number}</button>)}
        </div>{(item.minLabel || item.maxLabel) && <div className="cf-scale-labels"><span>{item.minLabel}</span><span>{item.maxLabel}</span></div>}</div>;
      }
      case 'date':
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" type="date" value={text} onChange={(event) => setAnswer(event.target.value)} />;
      case 'number':
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" inputMode="decimal" value={text} placeholder="Digite um número" onChange={(event) => { const raw = event.target.value.replace(',', '.'); setAnswer(raw === '' ? '' : Number.isFinite(Number(raw)) ? Number(raw) : event.target.value); }} />;
      default: {
        const type = item.kind === 'email' ? 'email' : item.kind === 'phone' ? 'tel' : 'text';
        const auto = item.kind === 'email' ? 'email' : item.kind === 'phone' ? 'tel' : item.kind === 'name' ? 'name' : 'off';
        return <input ref={(node) => { inputRef.current = node; }} className="cf-text" type={type} autoComplete={auto} value={text} maxLength={item.kind === 'short_text' || item.kind === 'name' ? 300 : 200} placeholder={item.kind === 'email' ? 'nome@empresa.com' : item.kind === 'phone' ? '(11) 90000-0000' : 'Digite sua resposta aqui…'} onChange={(event) => setAnswer(event.target.value)} />;
      }
    }
  }

  return <div className="cali-form-page">
    <div className="cf-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
    <header className="cf-top"><img src="/brand/cali-rh-bordo.png" alt="CALI RH" />{preview && <span className="cf-preview">Prévia · as respostas não são salvas</span>}</header>
    <main className="cf-stage">
      {phase === 'loading' && <div className="cf-screen cf-center"><span className="cf-spinner" aria-label="Carregando" /></div>}
      {phase === 'missing' && <div className="cf-screen cf-center cf-enter"><small>CALI FORMS</small><h1>Formulário não encontrado</h1><p>Confira o link que você recebeu ou fale com a CALI RH.</p></div>}
      {phase === 'closed' && form && <div className="cf-screen cf-center cf-enter"><small>CALI FORMS</small><h1>{form.title}</h1><p>Este formulário não está mais recebendo respostas. Obrigada pelo interesse.</p></div>}
      {phase === 'welcome' && form && <div className="cf-screen cf-enter">
        <small>CALI RH</small><h1>{form.title}</h1>
        {form.description && <p className="cf-desc">{form.description}</p>}
        <div className="cf-actions"><button type="button" className="cf-primary" onClick={() => setPhase('questions')}>Começar <ArrowRight size={18} /></button><span className="cf-enter-hint">ou pressione <b>Enter <CornerDownLeft size={13} /></b></span></div>
        <p className="cf-meta">{answerable.length} {answerable.length === 1 ? 'pergunta' : 'perguntas'} · cerca de {Math.max(1, Math.round(answerable.length * 0.4))} min</p>
      </div>}
      {(phase === 'questions' || phase === 'sending') && question && <div className={`cf-screen cf-q cf-${direction}`} key={question.id}>
        <div className="cf-label">
          {isAnswerable(question) && <span className="cf-num">{numberOf(question)}<ArrowRight size={14} /></span>}
          <h2>{question.label}{isAnswerable(question) && (question.required ? <em className="cf-req" aria-label="obrigatória">*</em> : <span className="cf-optional">Opcional</span>)}</h2>
        </div>
        {question.help && <p className="cf-help">{question.help}</p>}
        {renderInput(question)}
        {error && <p className="cf-error" role="alert">{error}</p>}
        {sendError && isLast && <p className="cf-error" role="alert">{sendError}</p>}
        <div className="cf-actions">
          <button type="button" className="cf-primary" disabled={phase === 'sending'} onClick={goNext}>{phase === 'sending' ? 'Enviando…' : isLast ? <>Enviar <Check size={18} /></> : question.kind === 'statement' ? <>Continuar <ArrowRight size={18} /></> : <>OK <Check size={18} /></>}</button>
          {phase !== 'sending' && <span className="cf-enter-hint">pressione <b>Enter <CornerDownLeft size={13} /></b>{question.kind === 'long_text' && <> · <b>Shift + Enter</b> quebra linha</>}</span>}
        </div>
      </div>}
      {phase === 'done' && form && <div className="cf-screen cf-center cf-enter cf-done">
        <span className="cf-done-mark"><img src="/brand/cali-oak-mark-light.svg" alt="" /></span>
        <h1>Muito obrigado!</h1>
        <p>Recebemos suas respostas e agradecemos a colaboração.</p>
      </div>}
    </main>
    {phase === 'questions' && <nav className="cf-nav" aria-label="Navegar entre perguntas">
      <span>{index + 1} de {questions.length}</span>
      <button type="button" aria-label="Pergunta anterior" disabled={index === 0} onClick={goBack}><ArrowUp size={18} /></button>
      <button type="button" aria-label="Próxima pergunta" disabled={isLast} onClick={goNext}><ArrowDown size={18} /></button>
    </nav>}
    <footer className="cf-foot"><a href="https://calirh.com" target="_blank" rel="noopener noreferrer">CALI RH</a><span>·</span><a href="/privacidade" target="_blank" rel="noopener noreferrer">Privacidade</a></footer>
  </div>;
}
