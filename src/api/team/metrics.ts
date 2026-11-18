import { z } from 'zod';
import { supabase } from '../supabase';

type TeamMetricsFields = {
  planned_hours: number | null;
  absence_medical_hours: number | null;
  absence_leave_hours: number | null;
  absence_unjustified_hours: number | null;
  absence_accident_hours: number | null;
  overtime_hours: number | null;
  hour_bank_balance: number | null;
  approved_headcount: Record<string, number>;
  enps_score: number | null;
  climate_score: number | null;
  climate_participation: number | null;
  notes: string | null;
};

export type TeamMetricsWrite = {
  companyId: string;
  month: string;
  expectedAt: string | null;
  fields: TeamMetricsFields;
  reason: string | null;
};

export async function writeTeamMetrics(input: TeamMetricsWrite, requestId: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('write_company_team_metrics', {
    p_company_id: input.companyId, p_month: input.month,
    p_expected_at: input.expectedAt, p_fields: input.fields,
    p_reason: input.reason, p_request_id: requestId,
  });
  if (result.error) throw new Error(result.error.message);
  return z.object({ updatedAt: z.string(), revision: z.number().int().positive() }).parse(result.data);
}
