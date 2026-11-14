import { z } from 'zod';
import { supabase } from '../supabase';

const timer = z.object({
  id: z.string(), companyId: z.string(), description: z.string().nullable(), status: z.enum(['active', 'paused']),
  startedAt: z.string(), pausedSeconds: z.number(), warningAt: z.string(), pauseAt: z.string(),
});
const recovery = z.object({
  id: z.string(), companyId: z.string(), description: z.string().nullable(), startedAt: z.string(),
  countedUntil: z.string(), seconds: z.number(), minutes: z.number(),
});
const state = z.object({ active: timer.nullable(), recoveries: z.array(recovery) });
const stopReceipt = z.object({ recovery_required: z.boolean().optional(), discarded: z.boolean().optional() });

export type ActivePartnerTimer = z.infer<typeof timer>;
export type TimerRecovery = z.infer<typeof recovery>;
export type PartnerTimerState = z.infer<typeof state>;

const unavailable = 'Conexão indisponível.';

export async function readPartnerTimer() {
  if (!supabase) return null;
  const result = await supabase.rpc('read_partner_timer_state_v2');
  return result.error ? null : state.safeParse(result.data).data ?? null;
}

export async function touchPartnerTimer(id: string, confirmPresence: boolean) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('touch_partner_timer_v2', { p_timer_id: id, p_confirm_presence: confirmPresence });
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}

export async function stopPartnerTimer(id: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('partner_stop_timer', { p_timer_id: id });
  if (result.error) throw new Error(result.error.message);
  return stopReceipt.safeParse(result.data).data ?? null;
}

export async function submitPartnerTimerRecovery(id: string, reason: string, minutes: number) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('submit_partner_timer_recovery_v2', {
    p_timer_id: id, p_justification: reason.trim(), p_minutes: minutes,
  });
  if (result.error) throw new Error(result.error.message);
}
