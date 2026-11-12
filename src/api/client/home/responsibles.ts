import { z } from 'zod';
import { supabase } from '../../supabase';

const responsiblesSchema = z.object({
  executive: z.object({
    full_name: z.string(),
    job_title: z.string().nullable(),
    avatar_url: z.string().nullable(),
    avatar_position_x: z.number().nullable(),
    avatar_position_y: z.number().nullable(),
    avatar_zoom: z.number().nullable(),
  }).nullable(),
  supportPartner: z.object({ full_name: z.string() }).nullable(),
});

export type AccountResponsibles = z.infer<typeof responsiblesSchema>;

export async function readClientAccountResponsibles() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('read_client_account_responsibles');
  return error ? null : (responsiblesSchema.safeParse(data).data ?? null);
}
