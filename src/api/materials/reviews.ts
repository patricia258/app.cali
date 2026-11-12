import { z } from 'zod';
import { supabase } from '../supabase';

const kindSchema = z.enum(['report', 'proposal', 'mapa']);
const review = z.object({
  id: z.string(), kind: kindSchema, title: z.string(), company_id: z.string(), author_id: z.string(),
  context: z.string(), draft_text: z.string().nullable(),
  status: z.enum(['assigned', 'pending', 'returned', 'accepted']), revision: z.number(),
  decision_note: z.string().nullish().transform((value) => value ?? null),
});
export type MaterialKind = z.infer<typeof kindSchema>;
export type MaterialReview = z.infer<typeof review>;

const columns = 'id,kind,title,company_id,author_id,context,draft_text,status,revision,decision_note';
const materialModule = { report: 'reports', proposal: 'proposals', mapa: 'people_map' } as const;
const unavailable = 'Conexão indisponível.';

export async function readMaterialReview(kind: MaterialKind, entityId: string) {
  if (!supabase) return null;
  const result = await supabase.from('partner_material_reviews').select(columns)
    .eq('kind', kind).eq('entity_id', entityId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return review.nullable().parse(result.data);
}

export async function readAssignedMaterials() {
  if (!supabase) return [];
  const result = await supabase.from('partner_material_reviews').select(columns).order('updated_at', { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return z.array(review).parse(result.data ?? []);
}

export async function readMaterialCompanies() {
  if (!supabase) return [];
  const result = await supabase.from('companies').select('id,display_name').in('status', ['active', 'paused']).order('display_name');
  return result.data ?? [];
}

export async function readMaterialPartners(companyId: string, kind: MaterialKind) {
  if (!supabase) return [];
  const result = await supabase.from('staff_company_assignments').select('staff_members!inner(user_id,full_name,modules,active)')
    .eq('company_id', companyId);
  if (result.error) throw new Error('Não foi possível carregar os Partners.');
  const member = z.object({ user_id: z.string().nullable(), full_name: z.string(), modules: z.array(z.string()), active: z.boolean() });
  const assignments = z.array(z.object({ staff_members: member })).parse(result.data ?? []);
  return assignments.map((item) => item.staff_members)
    .filter((item) => item.active && item.user_id && item.modules.includes(materialModule[kind]));
}

export async function assignMaterialReview(kind: MaterialKind, entityId: string, companyId: string, authorId: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('assign_partner_material_review', {
    p_kind: kind, p_entity_id: entityId, p_company_id: companyId, p_author_id: authorId,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function decideMaterialReview(record: Pick<MaterialReview, 'id' | 'revision'>, accept: boolean, note: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('decide_partner_material_review', {
    p_id: record.id, p_revision: record.revision, p_accept: accept, p_note: accept ? null : note.trim(),
  });
  if (result.error) throw new Error(result.error.message);
}

export async function submitMaterialReview(record: Pick<MaterialReview, 'id' | 'revision'>, draft: string) {
  if (!supabase) throw new Error(unavailable);
  const result = await supabase.rpc('submit_partner_material_review', { p_id: record.id, p_revision: record.revision, p_text: draft.trim() });
  if (result.error) throw new Error(result.error.message);
}
