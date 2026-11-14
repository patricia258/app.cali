import { z } from 'zod';
import { supabase } from '../../supabase';

const person = z.object({
  id: z.string(),
  full_name: z.string(),
  department: z.string().nullish(),
  admission_date: z.string().nullish(),
  status: z.string(),
  leave_reason: z.string().nullish(),
  archived_at: z.string().nullish(),
});
export type ClientHomePerson = z.infer<typeof person>;

export async function readClientHomeTeam(companyId: string, signal: AbortSignal) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const people: ClientHomePerson[] = [];
  for (let start = 0; ; start += 500) {
    const result = await supabase.from('team_members')
      .select('id,full_name,department,admission_date,status,leave_reason,archived_at')
      .eq('company_id', companyId).order('full_name').range(start, start + 499).abortSignal(signal);
    if (result.error) throw result.error;
    const page = z.array(person).parse(result.data ?? []);
    people.push(...page.filter((member) => !member.archived_at && member.status !== 'terminated'));
    if (page.length < 500) return people;
  }
}
