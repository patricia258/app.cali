import { AlertTriangle, Pause, Play, Square, TimerReset } from 'lucide-react';
import type { AdminProjectTimer } from '../hooks/useAdminProjectTimer';
import { useProjectTimerClock } from '../hooks/useProjectTimerClock';

type Props = {
  state: AdminProjectTimer;
  deliverableId: string;
  task?: Parameters<AdminProjectTimer['start']>[0];
};

function timerLabel(startedAt: string, pausedSeconds: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000) - pausedSeconds);
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
}

export function ProjectWorkTimer({ state, deliverableId, task }: Props) {
  const active = state.timer && (!task || state.timer.taskId === task.id) ? state.timer : undefined;
  const now = useProjectTimerClock(Boolean(active));
  if (!state.enabled) return null;

  const locked = state.workLocked || Boolean(task && state.taskLocked(task));
  const occupied = !active && Boolean(state.companyTimer);
  const notice = state.notice ?? (state.error ? { message: state.error, error: true } : undefined);

  return (
    <div
      className="tw:order-2 tw:inline-flex tw:min-w-0 tw:items-center tw:gap-2"
      data-timer-context-deliverable-id={deliverableId}
      data-timer-context-task-id={task?.id ?? active?.taskId ?? undefined}
    >
      {notice && <span role={notice.error ? 'alert' : 'status'} className="tw:max-w-116 tw:rounded-lg tw:border tw:border-solid tw:border-cali-warning-line tw:bg-cali-warning-surface tw:px-3 tw:py-2 tw:text-sm tw:leading-snug tw:font-semibold tw:text-cali-warning">{notice.message}</span>}
      {active ? (
        <span className="tw:inline-flex tw:h-12.5 tw:items-center tw:gap-2 tw:rounded-lg tw:bg-cali-success tw:py-0 tw:pr-1.5 tw:pl-3 tw:text-cali-neutral-surface tw:shadow-[0_0.4615rem_1.3846rem_rgb(var(--cali-rgb-green-text)/0.2)]">
          <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-xs tw:tracking-wide tw:whitespace-nowrap tw:text-cali-green-surface"><TimerReset size={15} aria-hidden />{active.taskId ? 'Subtarefa em execução' : 'Timer ativo'}</span>
          <span className="tw:font-mono tw:text-lg tw:font-bold tw:tracking-wide">{timerLabel(active.startedAt, active.pausedSeconds, now)}</span>
          <button type="button" disabled={state.busy} onClick={() => void state.pause(active)} title="Pausar: registra esta sessão e libera para continuar depois" aria-label="Pausar e registrar sessão" className="tw:grid! tw:size-8.5 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-cali-neutral-surface/35! tw:bg-cali-neutral-surface/15! tw:p-0! tw:text-cali-neutral-surface! tw:disabled:opacity-60">
            <Pause size={14} aria-hidden />
          </button>
          <button type="button" disabled={state.busy} onClick={() => state.requestStop(active, task)} title="Finalizar definitivamente" aria-label="Finalizar trabalho definitivamente" className="tw:grid! tw:size-8.5 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-cali-neutral-surface! tw:bg-cali-neutral-surface! tw:p-0! tw:text-cali-green-strong! tw:disabled:opacity-60">
            <Square size={13} aria-hidden />
          </button>
        </span>
      ) : locked ? (
        <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-sm tw:opacity-60" title="Trabalho encerrado: não recebe novas horas"><Square size={13} aria-hidden />{task ? 'Encerrada' : 'Execução encerrada'}</span>
      ) : occupied ? (
        <button type="button" onClick={state.explainCompanyTimer} title="Só é possível um cronômetro por empresa" className="tw:inline-flex! tw:min-h-[2.9231rem] tw:cursor-help tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-warning-line! tw:bg-cali-orange-surface! tw:px-3! tw:py-0! tw:text-cali-body! tw:font-bold tw:text-cali-gold-text!">
          <AlertTriangle size={15} aria-hidden />Já há um cronômetro ligado nesta empresa
        </button>
      ) : (
        <button type="button" disabled={!state.canStart || state.busy} onClick={() => void state.start(task)} title={task ? 'Iniciar cronômetro nesta subtarefa' : undefined} className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:border-solid tw:border-cali-line! tw:bg-cali-surface! tw:px-2.5! tw:py-1.5! tw:text-xs! tw:font-bold tw:whitespace-nowrap tw:text-cali-accent! tw:disabled:cursor-default tw:disabled:opacity-50">
          <Play size={15} aria-hidden />{task ? 'Iniciar' : 'Iniciar timer'}
        </button>
      )}
    </div>
  );
}
