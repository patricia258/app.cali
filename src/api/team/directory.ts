import type { JsonObject } from '../../domain/json';
import { z } from 'zod';
import { supabase } from '../supabase';
import type { Change, Company, Member, MonthMetric, Private, Snapshot, Vacancy } from '../../domain/team';

const companyColumns = 'id,display_name,logo_url,logo_workspace_url,service_plan';
const nullableText = z.string().nullish().transform((value) => value ?? null);
const company = z.object({
  id: z.string(), display_name: z.string(), logo_url: nullableText, logo_workspace_url: nullableText,
  service_plan: nullableText,
});
const month = z.object({ reference_month: z.string(), confirmed_at: nullableText, revision: z.number().nullish() });
const vacancy = z.object({
  id: z.string(), vacancy_code: z.string(), title: z.string(), department: nullableText,
  opened_on: z.string(), status: z.enum(['open', 'filled', 'cancelled']), closed_on: nullableText,
});
const review = z.object({ reference_month: z.string() });
const unavailable = 'Conexão indisponível.';

export const teamDirectoryKey = (actorId: string, companyId: string, staff: boolean) =>
  ['team', 'directory', actorId, companyId, staff] as const;

export async function readTeamCompanies(actorId: string, scope: 'admin' | 'client' | 'partner'): Promise<Company[]> {
  if (!supabase) throw new Error(unavailable);
  if (scope === 'partner') {
    const result = await supabase.rpc('partner_companies');
    if (result.error) throw new Error('Não foi possível carregar as suas empresas.');
    return z.array(company).parse(result.data ?? []);
  }
  if (scope === 'admin') {
    const result = await supabase.from('companies').select(companyColumns).order('display_name');
    if (result.error) throw new Error(result.error.message);
    return z.array(company).parse(result.data ?? []);
  }
  const profile = await supabase.from('profiles').select('company_id').eq('id', actorId).maybeSingle();
  if (profile.error || !profile.data?.company_id) throw new Error('Seu acesso não está vinculado a uma empresa.');
  const result = await supabase.from('companies').select(companyColumns).eq('id', profile.data.company_id).maybeSingle();
  if (result.error || !result.data) throw new Error(result.error?.message || 'Empresa indisponível.');
  return [company.parse(result.data)];
}

export async function readAnalyticsFront(companyId: string) {
  if (!supabase) return false;
  const today = new Date().toISOString().slice(0, 10);
  const result = await supabase.from('company_fronts').select('id,ends_at')
    .eq('company_id', companyId).eq('front_code', 'people_analytics').eq('status', 'active');
  return (result.data ?? []).some((item) => !item.ends_at || item.ends_at >= today);
}

export async function readTeamMetrics(companyId: string) {
  if (!supabase) return null;
  const result = await supabase.from('team_month_metrics')
    .select('reference_month,updated_at,planned_hours,absence_medical_hours,absence_leave_hours,absence_unjustified_hours,absence_accident_hours,overtime_hours,hour_bank_balance,approved_headcount,enps_score,climate_score,climate_participation,notes')
    .eq('company_id', companyId).order('reference_month');
  return result.error ? null : (result.data ?? []) as MonthMetric[];
}

async function readTeamRows<T>(
  table: 'team_members' | 'team_month_snapshots' | 'team_changes' | 'team_member_private',
  columns: string, companyId: string, order: string, ascending: boolean, signal: AbortSignal,
) {
  if (!supabase) throw new Error(unavailable);
  const rows: T[] = [];
  for (let start = 0; start < 100000; start += 500) {
    const result = await supabase.from(table).select(columns).eq('company_id', companyId)
      .order(order, { ascending }).range(start, start + 499).abortSignal(signal).overrideTypes<T[], { merge: false }>();
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if ((result.data ?? []).length < 500) return rows;
  }
  throw new Error('A equipe ultrapassou o limite de consulta; contate a CALI para ampliar a leitura.');
}

export async function readCompanyTeam(companyId: string, staff: boolean, signal: AbortSignal) {
  if (!supabase) throw new Error(unavailable);
  const [people, months, snapshots, changes, privateRows, vacancies, reviews] = await Promise.all([
    readTeamRows<Member>('team_members', '*', companyId, 'full_name', true, signal),
    supabase.from('team_months').select('reference_month,confirmed_at,revision')
      .eq('company_id', companyId).order('reference_month', { ascending: false }).abortSignal(signal),
    readTeamRows<Snapshot>('team_month_snapshots', 'reference_month,member_id,status,department,manager_code,job_title,admission_date,termination_date', companyId, 'reference_month', true, signal),
    readTeamRows<Change>('team_changes', 'id,member_id,reference_month,change_type,created_at,before_state,after_state', companyId, 'created_at', false, signal),
    staff ? [] : readTeamRows<Private>('team_member_private', 'member_id,salary,salary_review_date,gender,gender_detail,has_children', companyId, 'member_id', true, signal),
    supabase.from('team_vacancies').select('id,vacancy_code,title,department,opened_on,status,closed_on')
      .eq('company_id', companyId).order('opened_on', { ascending: false }).abortSignal(signal),
    supabase.from('team_month_reviews').select('reference_month').eq('company_id', companyId).abortSignal(signal),
  ]);
  if (months.error || vacancies.error || reviews.error) throw months.error || vacancies.error || reviews.error;
  return {
    people, snapshots, changes, privateRows,
    months: z.array(month).parse(months.data ?? []),
    vacancies: z.array(vacancy).parse(vacancies.data ?? []),
    reviews: z.array(review).parse(reviews.data ?? []),
  };
}

export async function saveTeamMembers(companyId: string, referenceMonth: string, rows: JsonObject[]) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('save_team_month_v1', {
    p_company_id: companyId, p_reference_month: referenceMonth, p_rows: rows,
  });
  if (result.error) throw result.error;
}

export async function archiveTeamMember(companyId: string, memberId: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('archive_team_member_v1', { p_company_id: companyId, p_member_id: memberId });
  if (result.error) throw result.error;
}

export async function confirmTeamMonth(
  companyId: string, referenceMonth: string, people: JsonObject[],
  vacancies: Array<Omit<Vacancy, 'id'>>,
  answers: { departures: number; admissions: number; changes: number; vacancies: number },
) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('confirm_team_month_v2', {
    p_company_id: companyId, p_reference_month: referenceMonth,
    p_people: people, p_vacancies: vacancies, p_answers: answers,
  });
  if (result.error) throw result.error;
}
