import { supabase } from './supabase';

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
  if (!supabase) throw new Error('Supabase não configurado.');
  const result = await supabase.rpc('pause_work_timer', { p_timer_id: timerId });
  if (result.error) throw result.error;
  window.dispatchEvent(new CustomEvent(TIMER_EVENT));
}

export async function finalizeTimerWork(timer: FinalizableTimer) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const result = await supabase.rpc('stop_work_timer', {
    p_timer_id: timer.id,
    p_description: timer.description || timer.taskName || timer.deliverableName || 'Atuação CALI',
  });
  if (result.error) throw result.error;
  window.dispatchEvent(new CustomEvent(TIMER_EVENT));
  return Number(result.data || 0);
}
