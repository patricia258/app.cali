import { z } from 'zod';
import { requireHoursClient } from './client';

const partnerStopResult = z.object({ discarded: z.boolean().optional(), minutes: z.coerce.number().optional() });

export type TimerScope = {
  p_company_id: string;
  p_project_id: string | null;
  p_deliverable_id: string | null;
  p_task_id: string | null;
  p_category: string;
  p_description: string;
};

export async function startAdminTimer(input: TimerScope & { p_client_visible: boolean }) {
  return await requireHoursClient().rpc('start_work_timer_v2', input);
}

export async function startPartnerTimer(input: TimerScope) {
  return await requireHoursClient().rpc('partner_start_timer', input);
}

export async function pauseWorkTimer(timerId: string) {
  return await requireHoursClient().rpc('pause_work_timer', { p_timer_id: timerId });
}

export async function readActiveTimersBeforeExit() {
  const client = requireHoursClient();
  const { data: auth } = await client.auth.getUser();
  const { data, error } = await client.from('work_timers').select('id,description,started_at')
    .eq('user_id', auth.user?.id || '').eq('status', 'active');
  return error ? [] : data || [];
}

export async function resumeWorkTimer(timerId: string) {
  return await requireHoursClient().rpc('resume_work_timer', { p_timer_id: timerId });
}

export async function stopWorkTimer(timerId: string, description: string | null) {
  return await requireHoursClient().rpc('stop_work_timer', { p_timer_id: timerId, p_description: description });
}

export async function stopPartnerTimer(timerId: string, description: string | null) {
  const { data, error } = await requireHoursClient().rpc('partner_stop_timer', { p_timer_id: timerId, p_description: description });
  return { data: partnerStopResult.safeParse(data).data ?? null, error };
}

export async function touchActiveTimers() {
  return await requireHoursClient().rpc('touch_my_timers');
}
