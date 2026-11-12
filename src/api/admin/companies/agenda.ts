import { z } from 'zod';
import { supabase } from '../../supabase';

const settingRow = z.object({
  service_plan: z.string().nullish(),
  meeting_sessions_included_per_month: z.coerce.number().nullish(),
  meeting_cadence_days: z.coerce.number().nullish(),
  onsite_visits_included_per_month: z.coerce.number().nullish(),
});

export type CompanyAgendaSettings = { plan: string; sessions: number; cadence: number; onsite: number };

export async function readCompanyAgendaSettings(companyId: string, signal: AbortSignal): Promise<CompanyAgendaSettings | null> {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('companies')
    .select('service_plan,meeting_sessions_included_per_month,meeting_cadence_days,onsite_visits_included_per_month')
    .eq('id', companyId).abortSignal(signal).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;
  const row = settingRow.parse(result.data);
  return {
    plan: row.service_plan === 'partner' || row.service_plan === 'full' ? row.service_plan : 'custom',
    sessions: row.meeting_sessions_included_per_month ?? 0,
    cadence: row.meeting_cadence_days ?? 0,
    onsite: row.onsite_visits_included_per_month ?? 0,
  };
}

export async function saveCompanyAgendaSettings(companyId: string, settings: CompanyAgendaSettings) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const { plan, sessions, cadence, onsite } = settings;
  const result = await supabase.from('companies').update({
    service_plan: plan === 'custom' ? null : plan,
    meeting_sessions_included_per_month: sessions,
    meeting_cadence_days: cadence,
    onsite_visits_included_per_month: onsite,
    fixed_meeting_required: sessions > 0,
    meeting_mode_policy: plan === 'partner' ? 'online_only' : plan === 'full' ? 'mixed_one_onsite' : 'custom',
  }).eq('id', companyId);
  if (result.error) throw new Error(result.error.message);
}
