import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { errorMessage } from '../../../../lib/errorMessage';
import type { RecordClosureExperience } from '../hooks/useRecordClosureExperience';
import { closureDate, closureStatus, feedbackCopy } from '../feedbackCopy';

type Props = { experience: RecordClosureExperience };
const action = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-[.5385rem] tw:border tw:border-solid tw:px-[1.1538rem] tw:py-[.7692rem] tw:text-[.8462rem] tw:font-bold tw:disabled:cursor-not-allowed tw:disabled:opacity-45 tw:max-[721px]:w-full';
const primary = `${action} tw:border-cali-brand tw:bg-cali-brand tw:text-white`;
const outlined = `${action} tw:border-[#dec9c3] tw:bg-white`;
const secondary = `${outlined} tw:text-cali-brand`;
const actions = 'tw:flex tw:justify-end tw:gap-[.6154rem] tw:max-[721px]:flex-col tw:max-[721px]:items-stretch';
const kickerStyle = 'tw:text-[.6923rem] tw:font-extrabold tw:tracking-[.14em] tw:text-cali-gold';
const inputStyle = 'tw:w-full tw:resize-y tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-cali-line tw:bg-[color:var(--theme-surface-soft)] tw:px-[.9231rem] tw:py-[.8462rem] tw:text-[.8846rem] tw:leading-[1.5] tw:text-cali-text tw:focus:border-cali-gold tw:focus:outline-none tw:focus:shadow-[0_0_0_3px_color-mix(in_srgb,#b58c52_12%,transparent)]';
const captionStyle = 'tw:mt-[1.0769rem] tw:grid tw:gap-[.5385rem] tw:text-[.8077rem] tw:font-[780] tw:text-cali-text';
const errorStyle = 'tw:mt-[.6154rem] tw:block tw:text-[.7692rem] tw:text-[#a44752]';

function ClosureDialog({ title, kicker, copy, kind, confirmed = false, children }: {
  title: string;
  kicker: string;
  copy: string;
  kind: 'feedback' | 'request' | 'review';
  confirmed?: boolean;
  children: ReactNode;
}) {
  const feedback = kind === 'feedback';
  const review = kind === 'review';
  const layout = feedback
    ? 'tw:inset-0 tw:z-6 tw:place-items-center tw:bg-[#fffdfbeb] tw:p-[1.8462rem] tw:backdrop-blur-[.2308rem]'
    : `tw:inset-[8.6154rem_0_0] tw:place-items-center tw:bg-[color:color-mix(in_srgb,var(--theme-surface)_73%,transparent)] tw:p-[2.1538rem] tw:backdrop-blur-[.6154rem] tw:max-[721px]:top-[8rem] tw:max-[721px]:items-start tw:max-[721px]:p-[1.2308rem] ${review ? 'tw:z-48' : 'tw:z-46'}`;
  const card = feedback
    ? `tw:flex tw:w-full tw:max-w-[33.0769rem] tw:flex-col tw:rounded-[1.0769rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:p-[1.8462rem] tw:font-[Inter,system-ui,sans-serif] tw:shadow-[0_20px_70px_#28172426] ${confirmed ? '' : 'tw:gap-[.7692rem]'}`
    : `tw:w-full tw:rounded-[1.3846rem] tw:border tw:border-solid tw:border-[color:color-mix(in_srgb,#b58c52_48%,var(--theme-line))] tw:bg-cali-surface tw:shadow-[0_24px_60px_rgba(43,43,43,.17)] tw:max-[721px]:mt-[1.2308rem] ${review ? 'tw:max-w-[39.2308rem] tw:p-[1.5385rem] tw:max-[721px]:p-[1.3846rem]' : 'tw:max-w-[36.9231rem] tw:p-8 tw:max-[721px]:p-[1.5385rem]'}`;

  const content = <>
    {confirmed && <span aria-hidden="true" className="tw:grid tw:size-[2.6154rem] tw:place-items-center tw:rounded-[.6154rem] tw:bg-[#e6f6ec] tw:text-[1.2308rem] tw:font-bold tw:text-[#31805a]">✓</span>}
    <span className={kickerStyle}>{kicker}</span>
    <h3 className={feedback ? 'tw:m-0 tw:text-[1.4615rem] tw:leading-[1.25] tw:font-bold tw:tracking-normal tw:text-cali-brand' : 'tw:mx-0 tw:my-[.5385rem] tw:font-[Georgia,serif] tw:leading-[1.18] tw:font-normal tw:text-cali-text ' + (review && !confirmed ? 'tw:text-[1.6154rem]' : 'tw:text-[1.8462rem] tw:max-[721px]:text-[1.6154rem]')}>{title}</h3>
    <p className={`tw:m-0 tw:leading-[1.55] ${feedback ? 'tw:text-[.8462rem] tw:text-[#857870]' : review && !confirmed ? 'tw:text-[.8308rem] tw:text-cali-muted' : 'tw:text-[.8846rem] tw:text-cali-muted'}`}>{copy}</p>
    {children}
  </>;

  return <div className={`tw:absolute tw:grid tw:overflow-auto ${layout}`}>
    <DialogFrame className={card} aria-label={title}>
      {confirmed ? <div className="tw:flex tw:flex-col tw:items-start tw:gap-[.6923rem] tw:text-center">{content}</div> : content}
    </DialogFrame>
  </div>;
}

function FeedbackDialog({ experience }: Props) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const response = feedbackCopy(score);
  const busy = experience.submittingFeedback;
  const canSend = score > 0 && (score > 3 || comment.trim().length >= 3);
  useLayoutEffect(() => { if (score > 0 && score <= 3) noteRef.current?.focus(); }, [score]);

  async function send() {
    if (!canSend || busy) return;
    setError('');
    try { await experience.sendFeedback(score, comment.trim() || null); }
    catch (reason) { setError(errorMessage(reason, 'Não foi possível registrar sua avaliação.')); }
  }

  return <ClosureDialog kind="feedback" kicker="AVALIAÇÃO DO ATENDIMENTO" title="Como foi este atendimento?" copy="Escolha uma nota de 1 a 5. Você pode revisar antes de enviar.">
    <div className="tw:mt-[.6154rem] tw:grid tw:grid-cols-5 tw:gap-[.6154rem]">
      {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-pressed={score === value} disabled={busy}
        className={`tw:h-[3.5385rem] tw:cursor-pointer tw:rounded-[.6154rem] tw:border tw:border-solid tw:p-0 tw:text-[1.1538rem] tw:font-bold tw:[transition:background_.15s,color_.15s,border-color_.15s] ${score === value ? 'tw:border-cali-brand tw:bg-cali-brand tw:text-white' : 'tw:border-[#e5d9d0] tw:bg-white tw:text-cali-brand tw:hover:border-cali-brand tw:hover:bg-[#f6edf0]'}`}
        onClick={() => {
          setScore(value);
          setError('');
        }}>{value}</button>)}
    </div>
    {score > 0 && <div className="tw:mt-[.4615rem] tw:flex tw:flex-col tw:gap-[.7692rem] tw:border-0 tw:border-t tw:border-solid tw:border-[#f1e9e2] tw:pt-[1.0769rem]">
      <div className="tw:flex tw:items-center tw:gap-[.7692rem]">
        <span className="tw:text-[1.8462rem] tw:leading-none">{response.face}</span>
        <div className="tw:grid tw:gap-[.2308rem]"><strong className="tw:text-[.9231rem] tw:text-[#322f2c]">{response.title}</strong><p className="tw:m-0 tw:text-[.8462rem] tw:leading-[1.55] tw:text-[#857870]">{response.copy}</p></div>
      </div>
      <label className="tw:flex tw:flex-col tw:gap-[.4615rem] tw:text-[.7692rem] tw:font-bold tw:text-[#67574c]">
        {score <= 3 ? 'O que podemos melhorar?' : 'Quer contar mais alguma coisa?'}
        <textarea ref={noteRef} className="tw:box-border tw:min-h-[6.4615rem] tw:w-full tw:resize-y tw:rounded-[.5385rem] tw:border tw:border-solid tw:border-[#e5d8d0] tw:bg-white tw:px-[.9231rem] tw:py-[.7692rem] tw:text-[.9231rem] tw:font-normal tw:text-[#322f2c] tw:outline-none tw:focus:border-cali-brand" rows={4} maxLength={2000} value={comment}
          onChange={(event) => setComment(event.target.value)} placeholder={score <= 3 ? 'Sua justificativa é importante para entendermos o que pode melhorar.' : 'Opcional — escreva se quiser deixar um comentário.'} />
      </label>
      {error && <p className={errorStyle} role="alert">{error}</p>}
      <div className={actions}><button type="button" className={primary} disabled={!canSend || busy} onClick={() => void send()}>{busy ? 'Registrando…' : 'Enviar avaliação'}</button></div>
    </div>}
    <button type="button" data-dialog-close className={secondary} disabled={busy} onClick={experience.dismissFeedback}>Avaliar depois</button>
  </ClosureDialog>;
}

function ReopenRequestDialog({ experience }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const busy = experience.requestingReopen;

  async function send() {
    if (reason.trim().length < 3 || busy) return;
    setError('');
    try { await experience.sendReopen(reason.trim()); }
    catch (problem) { setError(errorMessage(problem, 'Não foi possível solicitar a reabertura.')); }
  }

  return <ClosureDialog kind="request" kicker="SOLICITAR REABERTURA" title="Por que você precisa reabrir esta solicitação?" copy="Explique brevemente o motivo. A CALI vai analisar antes de liberar novas mensagens.">
    <div className="tw:mt-[1.2308rem] tw:grid tw:gap-[.2308rem] tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-[color:color-mix(in_srgb,#b58c52_30%,var(--theme-line))] tw:bg-[color:color-mix(in_srgb,#b58c52_7%,var(--theme-surface-soft))] tw:px-4 tw:py-[.9231rem]">
      <strong className="tw:text-[.6923rem] tw:tracking-[.08em] tw:text-cali-gold tw:uppercase">Importante</strong>
      <span className="tw:text-[.8077rem] tw:leading-[1.45] tw:text-cali-muted">O tempo já consumido continua contabilizado e não retorna ao saldo de horas.</span>
    </div>
    <label className={captionStyle}>Justificativa da reabertura
      <textarea autoFocus className={inputStyle} rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: surgiu uma nova informação e preciso retomar este assunto porque…" />
    </label>
    {error && <p className={errorStyle} role="alert">{error}</p>}
    <div className={`tw:mt-[1.2308rem] ${actions}`}>
      <button type="button" data-dialog-close className={secondary} disabled={busy} onClick={experience.dismissReopen}>Cancelar</button>
      <button type="button" className={primary} disabled={reason.trim().length < 3 || busy} onClick={() => void send()}>{busy ? 'Enviando…' : 'Enviar para análise'}</button>
    </div>
  </ClosureDialog>;
}

function ReviewDialog({ experience }: Props) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const context = experience.ctx;
  const busy = experience.decidingReopen;
  if (!context?.reopen) return null;
  const { record, feedback, reopen } = context;
  const box = 'tw:grid tw:gap-[.1538rem] tw:rounded-[.8462rem] tw:border tw:border-solid tw:border-cali-line tw:bg-[color:var(--theme-surface-soft)] tw:px-[.7692rem] tw:py-[.6923rem]';
  const cardTitle = 'tw:text-[.6923rem] tw:tracking-[.07em] tw:text-cali-muted';
  const cardValue = 'tw:text-[.8462rem] tw:text-cali-text';

  async function decide(decision: 'approved' | 'rejected') {
    if (busy) return;
    if (decision === 'rejected' && note.trim().length < 3) {
      setError('Explique ao cliente por que a reabertura não foi aprovada.');
      noteRef.current?.focus();
      return;
    }
    setError('');
    try { await experience.decideReopen(decision, note.trim() || null); }
    catch (reason) { setError(errorMessage(reason, 'Não foi possível registrar a decisão.')); }
  }

  return <ClosureDialog kind="review" kicker="PEDIDO DE REABERTURA" title="O cliente quer retomar esta solicitação." copy="Analise o motivo e escolha se o atendimento deve ser reaberto.">
    <div className="tw:mt-[1.0769rem] tw:grid tw:grid-cols-[10.6154rem_minmax(0,1fr)] tw:gap-[.6154rem] tw:max-[721px]:grid-cols-1">
      <div className={box}><span className={cardTitle}>STATUS ATUAL</span><strong className={cardValue}>{closureStatus(record.workflow_status)}</strong></div>
      <div className={box}><span className={cardTitle}>PERÍODO</span>
        <div className="tw:mt-[.3077rem] tw:grid tw:grid-cols-2 tw:gap-[.7692rem]">
          {[['Abertura', record.created_at], ['Finalização', record.closed_at]].map(([label, date]) => <p key={label} className="tw:m-0 tw:grid tw:gap-[.1538rem]">
            <small className="tw:text-[.6538rem] tw:font-bold tw:text-cali-muted">{label}</small>
            <strong className="tw:text-[.8077rem] tw:whitespace-nowrap tw:text-cali-text">{closureDate(date)}</strong>
          </p>)}
        </div>
      </div>
    </div>
    <div className="tw:mt-[.7692rem] tw:rounded-r-[.9231rem] tw:border-0 tw:border-l-[3px] tw:border-solid tw:border-cali-gold tw:bg-[color:color-mix(in_srgb,#b58c52_8%,var(--theme-surface))] tw:px-[.9231rem] tw:py-[.8462rem]">
      <span className={kickerStyle}>JUSTIFICATIVA DO CLIENTE</span>
      <p className="tw:mx-0 tw:mt-[.3846rem] tw:mb-0 tw:text-[.8846rem] tw:leading-[1.55] tw:text-cali-text">{reopen.reason?.trim() || 'Motivo não informado — este pedido foi criado antes da nova regra de justificativa obrigatória.'}</p>
    </div>
    {feedback && <div className="tw:mt-[.6154rem] tw:flex tw:items-start tw:gap-[.7692rem] tw:rounded-[.9231rem] tw:border tw:border-solid tw:border-[color:color-mix(in_srgb,#4e7b63_24%,var(--theme-line))] tw:bg-[color:color-mix(in_srgb,#4e7b63_6%,var(--theme-surface))] tw:px-[.7692rem] tw:py-[.6923rem]">
      <span className="tw:text-[1.7692rem]">{feedbackCopy(feedback.score).face}</span>
      <div className="tw:grid tw:gap-[.1538rem]">
        <small className="tw:text-[.6538rem] tw:tracking-[.07em] tw:text-cali-muted">AVALIAÇÃO DESTA SOLICITAÇÃO</small>
        <strong className="tw:text-[1rem] tw:text-cali-text">{feedback.score}/5</strong>
        <p className="tw:m-0 tw:text-[.8077rem] tw:leading-[1.45] tw:text-cali-muted">{feedback.comment || 'Sem comentário adicional.'}</p>
      </div>
    </div>}
    <label className={captionStyle}>Mensagem ao cliente
      <textarea ref={noteRef} className={`${inputStyle} tw:max-h-[8.4615rem] tw:min-h-[5.6923rem]`} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional ao reabrir. Obrigatória se você recusar o pedido." />
    </label>
    {error && <p className={errorStyle} role="alert">{error}</p>}
    <div className="tw:mt-4 tw:grid tw:grid-cols-[minmax(0,1.45fr)_auto_auto] tw:items-center tw:gap-[.6154rem] tw:max-[721px]:flex tw:max-[721px]:flex-col tw:max-[721px]:items-stretch">
      <button type="button" data-dialog-close className={secondary} disabled={busy} onClick={experience.dismissAdminDecision}>Ver histórico antes de decidir</button>
      <button type="button" className={`${outlined} tw:text-[#9b4350]`} disabled={busy} onClick={() => void decide('rejected')}>Recusar</button>
      <button type="button" className={primary} disabled={busy} onClick={() => void decide('approved')}>Reabrir atendimento</button>
    </div>
  </ClosureDialog>;
}

const confirmation = {
  feedback: { title: 'Avaliação registrada', copy: 'A avaliação fica vinculada a este encerramento. O histórico continua disponível para consulta.', action: 'Voltar ao histórico' },
  requested: { title: 'Reabertura solicitada.', copy: 'A CALI recebeu sua justificativa e vai analisar o pedido. Você será notificado quando houver uma decisão.', action: 'Voltar ao histórico' },
  approved: { title: 'Atendimento reaberto.', copy: 'O cliente será notificado e receberá sua mensagem.', action: 'Fechar' },
  rejected: { title: 'Pedido de reabertura recusado.', copy: 'O cliente será notificado e receberá sua mensagem.', action: 'Fechar' },
};

export function RecordClosureDialogs({ experience }: Props) {
  if (experience.thanks) {
    const result = confirmation[experience.thanks];
    const kind = experience.thanks === 'feedback' ? 'feedback' : experience.thanks === 'requested' ? 'request' : 'review';
    return <ClosureDialog kind={kind} kicker="REGISTRADO" title={result.title} copy={result.copy} confirmed>
      <button type="button" className={`${primary} tw:mt-[.4615rem] tw:self-start`} data-dialog-close onClick={experience.dismissThanks}>{result.action}</button>
    </ClosureDialog>;
  }
  if (experience.adminDecisionOpen) return <ReviewDialog key={experience.pendingReopen?.id} experience={experience} />;
  if (experience.clientReopenOpen) return <ReopenRequestDialog key={experience.selection} experience={experience} />;
  if (experience.clientFeedbackOpen) return <FeedbackDialog key={experience.openClosure?.id} experience={experience} />;
  return null;
}
