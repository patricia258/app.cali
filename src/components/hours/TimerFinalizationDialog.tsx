import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { InlineNotice } from '../ds/InlineNotice';
import { AlertTriangle, CheckCircle2, Square, X } from 'lucide-react';

export type TimerFinalizationTarget = {
  id: string;
  label: string;
  kind: 'deliverable' | 'task';
  clientApproved?: boolean;
};

function TimerWarning({ danger = false, children }: { danger?: boolean; children: string }) {
  return <div className={`tw:flex tw:items-start tw:gap-3 tw:rounded-[.7rem] tw:border tw:border-solid tw:px-[1.077rem] tw:py-[.923rem] tw:leading-[1.55] ${danger ? 'tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]' : 'tw:border-[#f0dfc0] tw:bg-[#fffaf1] tw:text-[#7a5a2c]'}`}>
    <AlertTriangle className="tw:mt-px tw:shrink-0" size={danger ? 18 : 17} aria-hidden="true" />
    <span>{children}</span>
  </div>;
}

export function TimerFinalizationDialog({ target, step, busy, error, onCancel, onAdvance, onConfirm }: {
  target: TimerFinalizationTarget | null;
  step: 1 | 2;
  busy?: boolean;
  error?: string;
  onCancel: () => void;
  onAdvance: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  const item = target.kind === 'task' ? 'esta subtarefa' : 'este entregável';
  return <div className="timer-finalize-backdrop tw:workspace-compact:motion-safe:animate-[v2-fade_.22s_ease-out_backwards] tw:workspace-compact:motion-safe:[&>*]:animate-[v2-pop_.34s_cubic-bezier(.2,.7,.2,1)_backwards] tw:fixed tw:inset-0 tw:z-1300 tw:grid tw:place-items-center tw:bg-[#171017a8] tw:p-5 tw:backdrop-blur-xs" role="presentation">
    <DialogFrame className="tw:relative tw:flex tw:w-[min(40rem,96vw)] tw:flex-col tw:gap-3.5 tw:rounded-[1.077rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:p-8 tw:font-cali-body tw:text-[.923rem]/[normal] tw:text-[#302b29] tw:shadow-[0_1.54rem_6.15rem_#1d111344]" aria-labelledby="timer-finalize-title">
      <button className="tw:absolute tw:top-5 tw:right-5 tw:grid tw:size-[2.615rem] tw:cursor-pointer tw:place-items-center tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#ecded5] tw:bg-white tw:text-[#322f2c]" type="button" disabled={busy} onClick={onCancel} aria-label="Fechar"><X size={19}/></button>
      <span className={`tw:grid tw:size-[3.23rem] tw:place-items-center tw:rounded-[.7rem] ${step === 2 ? 'tw:bg-[#fdf3f3] tw:text-[#b7495d]' : 'tw:bg-[#f8ecef] tw:text-cali-brand'}`} aria-hidden="true">{step === 1 ? <Square size={22}/> : <AlertTriangle size={23}/>}</span>
      <span className="tw:text-[.769rem] tw:font-extrabold tw:tracking-[.12em] tw:text-cali-gold">{step === 1 ? 'FINALIZAR EXECUÇÃO' : 'CONFIRMAÇÃO DEFINITIVA'}</span>
      <h2 className="tw:m-0 tw:text-[1.69rem] tw:text-cali-brand" id="timer-finalize-title">{step === 1 ? `Finalizar ${item}?` : 'Tem certeza mesmo?'}</h2>
      {step === 1 ? <>
        <p className="tw:m-0 tw:leading-relaxed tw:text-[#665751]">Você está encerrando definitivamente o trabalho em <strong>{target.label}</strong>.</p>
        <TimerWarning>{`O tempo atual será registrado no histórico e novos timers ou lançamentos de horas ficarão bloqueados para ${item}.`}</TimerWarning>
        <p className="tw:m-0 tw:text-[.846rem]/[1.6] tw:text-[#857870]">Se você apenas não vai trabalhar nisso agora, use <strong>Pausar</strong>. Pausar grava esta sessão e permite iniciar uma nova sessão depois.</p>
      </> : <>
        {!target.clientApproved && <TimerWarning danger>O cliente ainda não aprovou este entregável. Você estará encerrando a execução pela CALI antes da aprovação do cliente.</TimerWarning>}
        <p className="tw:m-0 tw:leading-relaxed tw:text-[#665751]">Depois desta confirmação, <strong>não será possível contabilizar novas horas</strong> neste item. A aprovação do cliente continuará registrada separadamente quando acontecer.</p>
        <p className="tw:m-0 tw:text-[.846rem]/[1.6] tw:text-[#857870]">Essa ação ficará no histórico com data e hora como finalização manual da execução.</p>
      </>}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}
      <footer className="tw:mt-2 tw:flex tw:flex-wrap tw:justify-end tw:gap-3 tw:[&_button]:inline-flex tw:[&_button]:cursor-pointer tw:[&_button]:items-center tw:[&_button]:justify-center tw:[&_button]:gap-2.5 tw:[&_button]:rounded-[.538rem] tw:[&_button]:border tw:[&_button]:border-solid tw:[&_button]:border-[#e7dcd4] tw:[&_button]:bg-white tw:[&_button]:px-[1.154rem] tw:[&_button]:py-[.846rem] tw:[&_button]:text-[.846rem]/[1.2] tw:[&_button]:font-bold tw:[&_button]:text-cali-brand tw:[&_button:last-child]:border-cali-brand tw:[&_button:last-child]:bg-cali-brand tw:[&_button:last-child]:text-white tw:[&_button:disabled]:cursor-not-allowed tw:[&_button:disabled]:opacity-45 tw:[&_svg]:shrink-0">
        <Button variant="unstyled" type="button" disabled={busy} onClick={onCancel}>Voltar</Button>
        {step === 1
          ? <Button variant="unstyled" type="button" disabled={busy} onClick={onAdvance}>Continuar</Button>
          : <Button variant="unstyled" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Finalizando…' : <><CheckCircle2 size={16}/>Sim, finalizar definitivamente</>}</Button>}
      </footer>
    </DialogFrame>
  </div>;
}
