import { z } from 'zod';
import { publicSupabase } from '../../supabase';

const record = z.looseObject({ id: z.string(), protocolo: z.string(), created_at: z.string() });
const journey = z.looseObject({ session_id: z.string(), accessed_at: z.string() });

export async function readMapaReviewCatalog() {
  if (!publicSupabase) throw new Error('Supabase não configurado.');
  const [records, journeys] = await Promise.all([
    publicSupabase.rpc('workspace_mapa_people_records'),
    publicSupabase.rpc('workspace_mapa_people_journeys'),
  ]);
  return {
    records: records.error ? null : z.array(record).parse(records.data ?? []),
    recordError: records.error?.message,
    journeys: journeys.error ? null : z.array(journey).parse(journeys.data ?? []),
    journeyError: journeys.error?.message,
  };
}

export async function readMapaReview(protocol: string) {
  if (!publicSupabase) throw new Error('Supabase não configurado.');
  const result = await publicSupabase.rpc('workspace_mapa_people_record', { p_protocolo: protocol });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? record.parse(row) : null;
}

export async function saveMapaReview(id: string, status: string, observations: Record<string, string>) {
  if (!publicSupabase) throw new Error('Supabase não configurado.');
  const result = await publicSupabase.rpc('workspace_update_mapa_people_record', {
    p_id: id, p_status: status, p_observacoes: observations,
  });
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}
