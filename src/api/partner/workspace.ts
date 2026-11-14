import { z } from 'zod';
import { supabase } from '../supabase';

const memberSchema = z.object({
  full_name: z.string(),
  modules: z.array(z.string()).nullish(),
});

const companiesSchema = z.array(z.object({
  id: z.string(),
  display_name: z.string(),
  service_plan: z.string().nullish(),
  service_type: z.string().nullish(),
  monthly_hours_contracted: z.number().nullish(),
  logo_workspace_url: z.string().nullish(),
  logo_url: z.string().nullish(),
}));

export async function readPartnerWorkspace(userId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Supabase não configurado.');

  const [staff, companies] = await Promise.all([
    supabase.from('staff_members').select('full_name,modules').eq('user_id', userId).limit(1).abortSignal(signal),
    supabase.rpc('partner_companies').abortSignal(signal),
  ]);
  if (staff.error || companies.error) throw staff.error ?? companies.error;

  const member = memberSchema.parse(staff.data?.[0]);
  return {
    id: userId,
    name: member.full_name,
    modules: member.modules ?? [],
    companies: companiesSchema.parse(companies.data ?? []).map((company) => ({
      ...company,
      service_plan: company.service_plan ?? null,
      monthly_hours_contracted: company.monthly_hours_contracted ?? null,
      logo_workspace_url: company.logo_workspace_url ?? null,
      logo_url: company.logo_url ?? null,
    })),
  };
}

export type PartnerWorkspace = Awaited<ReturnType<typeof readPartnerWorkspace>>;
