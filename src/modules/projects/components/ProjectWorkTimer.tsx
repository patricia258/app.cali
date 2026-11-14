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
      {notice && <span role={notice.error ? 'alert' : 'status'} className="tw:max-w-[29rem] tw:rounded-lg tw:border tw:border-solid tw:border-[#ecd9b0] tw:bg-[#fffaf1] tw:px-3 tw:py-2 tw:text-[0.8462rem] tw:leading-snug tw:font-semibold tw:text-[#7a5a2c]">{notice.message}</span>}
      {active ? (
        <span className="tw:inline-flex tw:h-[3.0769rem] tw:items-center tw:gap-2 tw:rounded-lg tw:bg-[#356448] tw:py-0 tw:pr-1.5 tw:pl-3 tw:text-white tw:shadow-[0_0.4615rem_1.3846rem_#35644833]">
          <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-[0.7692rem] tw:tracking-wide tw:whitespace-nowrap tw:text-[#e3f1e7]"><TimerReset size={15} aria-hidden />{active.taskId ? 'Subtarefa em execução' : 'Timer ativo'}</span>
          <span className="tw:font-mono tw:text-[1.0769rem] tw:font-bold tw:tracking-wide">{timerLabel(active.startedAt, active.pausedSeconds, now)}</span>
          <button type="button" disabled={state.busy} onClick={() => void state.pause(active)} title="Pausar: registra esta sessão e libera para continuar depois" aria-label="Pausar e registrar sessão" className="tw:grid! tw:size-[2.1538rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-white/35! tw:bg-white/15! tw:p-0! tw:text-white! tw:disabled:opacity-60">
            <Pause size={14} aria-hidden />
          </button>
          <button type="button" disabled={state.busy} onClick={() => state.requestStop(active, task)} title="Finalizar definitivamente" aria-label="Finalizar trabalho definitivamente" className="tw:grid! tw:size-[2.1538rem] tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-solid tw:border-white! tw:bg-white! tw:p-0! tw:text-[#24523a]! tw:disabled:opacity-60">
            <Square size={13} aria-hidden />
          </button>
        </span>
      ) : locked ? (
        <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:text-[0.8462rem] tw:opacity-60" title="Trabalho encerrado: não recebe novas horas"><Square size={13} aria-hidden />{task ? 'Encerrada' : 'Execução encerrada'}</span>
      ) : occupied ? (
        <button type="button" onClick={state.explainCompanyTimer} title="Só é possível um cronômetro por empresa" className="tw:inline-flex! tw:min-h-[2.9231rem] tw:cursor-help tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-[#ecd9b0]! tw:bg-[#fff6e3]! tw:px-3! tw:py-0! tw:text-[0.9231rem]! tw:font-bold tw:text-[#8a5a00]!">
          <AlertTriangle size={15} aria-hidden />Já há um cronômetro ligado nesta empresa
        </button>
      ) : (
        <button type="button" disabled={!state.canStart || state.busy} onClick={() => void state.start(task)} title={task ? 'Iniciar cronômetro nesta subtarefa' : undefined} className="tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-md tw:border tw:border-solid tw:border-cali-line! tw:bg-cali-surface! tw:px-2.5! tw:py-1.5! tw:text-[0.7692rem]! tw:font-bold tw:whitespace-nowrap tw:text-cali-accent! tw:disabled:cursor-default tw:disabled:opacity-50">
          <Play size={15} aria-hidden />{task ? 'Iniciar' : 'Iniciar timer'}
        </button>
      )}
    </div>
  );
}
