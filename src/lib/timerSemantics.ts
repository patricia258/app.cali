import { pauseWorkTimer, stopWorkTimer } from '../api/hours/timers';

export const TIMER_EVENT = 'cali:timers-changed';

export type FinalizableTimer = {
  id: string;
  deliverableId?: string | null;
  taskId?: string | null;
  description?: string | null;
  deliverableName?: string | null;
  taskName?: string | null;
};

export async function pauseTimerSession(timerId: string) {
  const result = await pauseWorkTimer(timerId);
  if (result.error) throw result.error;
  window.dispatchEvent(new CustomEvent(TIMER_EVENT));
}

export async function finalizeTimerWork(timer: FinalizableTimer) {
  const result = await stopWorkTimer(timer.id, timer.description || timer.taskName || timer.deliverableName || 'Atuação CALI');
  if (result.error) throw result.error;
  window.dispatchEvent(new CustomEvent(TIMER_EVENT));
  return Number(result.data || 0);
}
