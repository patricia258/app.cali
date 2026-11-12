import { z } from 'zod';
import { supabase } from '../../supabase';

const record = z.looseObject({ id: z.string(), protocolo: z.string(), created_at: z.string() });
const journey = z.looseObject({ session_id: z.string(), accessed_at: z.string() });

function database() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase.schema('public');
}

export async function readMapaReviewCatalog() {
  const db = database();
  const [records, journeys] = await Promise.all([
    db.rpc('workspace_mapa_people_records'),
    db.rpc('workspace_mapa_people_journeys'),
  ]);
  return {
    records: records.error ? null : z.array(record).parse(records.data ?? []),
    recordError: records.error?.message,
    journeys: journeys.error ? null : z.array(journey).parse(journeys.data ?? []),
    journeyError: journeys.error?.message,
  };
}

export async function readMapaReview(protocol: string) {
  const result = await database().rpc('workspace_mapa_people_record', { p_protocolo: protocol });
  if (result.error) throw new Error(result.error.message);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row ? record.parse(row) : null;
}

export async function saveMapaReview(id: string, status: string, observations: Record<string, string>) {
  const result = await database().rpc('workspace_update_mapa_people_record', {
    p_id: id, p_status: status, p_observacoes: observations,
  });
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}
