import { Button } from '../ds/Button';
import { DialogFrame } from '../ds/DialogFrame';
import { AlertTriangle, CheckCircle2, Square, X } from 'lucide-react';

export type TimerFinalizationTarget = {
  id: string;
  label: string;
  kind: 'deliverable' | 'task';
  clientApproved?: boolean;
};

export function TimerFinalizationDialog({ target, step, busy, onCancel, onAdvance, onConfirm }: {
  target: TimerFinalizationTarget | null;
  step: 1 | 2;
  busy?: boolean;
  onCancel: () => void;
  onAdvance: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;
  const item = target.kind === 'task' ? 'esta subtarefa' : 'este entregável';
  return <div className="timer-finalize-backdrop" role="presentation">
    <DialogFrame className="timer-finalize-dialog" aria-labelledby="timer-finalize-title">
      <button className="timer-finalize-x" type="button" disabled={busy} onClick={onCancel} aria-label="Fechar"><X size={19}/></button>
      <span className={`timer-finalize-icon ${step === 2 ? 'danger' : ''}`}>{step === 1 ? <Square size={22}/> : <AlertTriangle size={23}/>}</span>
      <span className="section-kicker">{step === 1 ? 'FINALIZAR EXECUÇÃO' : 'CONFIRMAÇÃO DEFINITIVA'}</span>
      <h2 id="timer-finalize-title">{step === 1 ? `Finalizar ${item}?` : 'Tem certeza mesmo?'}</h2>
      {step === 1 ? <>
        <p>Você está encerrando definitivamente o trabalho em <strong>{target.label}</strong>.</p>
        <div className="timer-finalize-warning"><AlertTriangle size={17}/><span>O tempo atual será registrado no histórico e novos timers ou lançamentos de horas ficarão bloqueados para {item}.</span></div>
        <p className="timer-finalize-note">Se você apenas não vai trabalhar nisso agora, use <strong>Pausar</strong>. Pausar grava esta sessão e permite iniciar uma nova sessão depois.</p>
      </> : <>
        {!target.clientApproved && <div className="timer-finalize-warning danger"><AlertTriangle size={18}/><span>O cliente ainda não aprovou este entregável. Você estará encerrando a execução pela CALI antes da aprovação do cliente.</span></div>}
        <p>Depois desta confirmação, <strong>não será possível contabilizar novas horas</strong> neste item. A aprovação do cliente continuará registrada separadamente quando acontecer.</p>
        <p className="timer-finalize-note">Essa ação ficará no histórico com data e hora como finalização manual da execução.</p>
      </>}
      <footer>
        <Button variant="secondary" type="button" disabled={busy} onClick={onCancel}>Voltar</Button>
        {step === 1
          ? <Button variant="primary" type="button" disabled={busy} onClick={onAdvance}>Continuar</Button>
          : <Button variant="primary" className="timer-finalize-confirm" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Finalizando…' : <><CheckCircle2 size={16}/>Sim, finalizar definitivamente</>}</Button>}
      </footer>
    </DialogFrame>
  </div>;
}
