import { z } from 'zod';
import { supabase } from '../supabase';

const plan = z.enum(['partner', 'full', 'build_essential', 'build_complete']);
const frontSchema = z.object({
  code: z.string(), title: z.string(), description: z.string().default(''),
  category: z.enum(['recurring', 'vacancy', 'addon', 'project']),
  partner_core: z.boolean().default(false), full_core: z.boolean().default(false), partner_slot: z.boolean().default(false), full_slot: z.boolean().default(false),
  build_allowed: z.boolean().default(false), display_order: z.number().default(0),
});
const contractedFront = z.object({
  id: z.string(), company_id: z.string(), front_code: z.string(),
  mode: z.enum(['slot_included', 'slot_paid', 'addon', 'build_assisted']),
  scope_label: z.string().nullish().transform((value) => value ?? null), started_at: z.string().default(''), ends_at: z.string().nullable(),
  status: z.enum(['active', 'ended']),
});
const companyPlan = z.object({
  id: z.string(), display_name: z.string(), service_plan: plan.nullable(), service_type: z.string().nullish().transform((value) => value ?? null),
});

export type Plan = z.infer<typeof plan>;
export type Front = z.infer<typeof frontSchema>;
export type ContractedFront = z.infer<typeof contractedFront>;
export type CompanyPlan = z.infer<typeof companyPlan>;

export const clientFrontsKey = (actorId: string) => ['client', 'fronts', actorId] as const;

export async function loadContractFronts(companyId: string, signal?: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const catalogQuery = supabase.from('front_catalog').select('code,title,description,category,partner_core,full_core,partner_slot,full_slot,build_allowed,display_order')
    .eq('active', true).order('display_order');
  const contractsQuery = supabase.from('company_fronts').select('id,company_id,front_code,mode,scope_label,started_at,ends_at,status')
    .eq('company_id', companyId).order('created_at', { ascending: false });
  if (signal) {
    catalogQuery.abortSignal(signal);
    contractsQuery.abortSignal(signal);
  }
  const [catalog, contracts] = await Promise.all([catalogQuery, contractsQuery]);
  if (catalog.error || contracts.error) throw catalog.error || contracts.error;
  return { catalog: z.array(frontSchema).parse(catalog.data ?? []), contracts: z.array(contractedFront).parse(contracts.data ?? []) };
}

export async function readClientFronts(actorId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const profile = await supabase.from('profiles').select('company_id').eq('id', actorId).abortSignal(signal).maybeSingle();
  if (profile.error || !profile.data?.company_id) throw new Error('Seu acesso ainda não está vinculado a uma empresa.');
  const info = await supabase.from('companies').select('id,display_name,service_plan,service_type')
    .eq('id', profile.data.company_id).abortSignal(signal).maybeSingle();
  if (info.error || !info.data) throw info.error || new Error('Empresa não encontrada.');
  const company = companyPlan.parse(info.data);
  return { company, ...await loadContractFronts(company.id, signal) };
}

export async function addContractFront(
  companyId: string, code: string, mode: ContractedFront['mode'], scope: string, end: string,
) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('company_fronts').insert({
    company_id: companyId, front_code: code, mode, scope_label: scope.trim() || null, ends_at: end || null,
  });
  if (result.error) throw result.error;
}

export async function closeContractFront(id: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('company_fronts').update({ status: 'ended' }).eq('id', id);
  if (result.error) throw result.error;
}
