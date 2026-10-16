/* Fim de contrato (LGPD): 45 dias depois do encerramento, elimina os dados da empresa.
   Primeiro apaga do armazenamento os arquivos listados por admin_company_storage_objects; depois chama
   admin_eliminate_company_data, que apaga as tabelas operacionais, anonimiza e bloqueia as pessoas do cliente e
   registra a eliminação. Ficam: cadastro sem textos livres, cobrança, auditoria e o registro da eliminação. */
import { supabase } from '../../lib/supabase';

export const ELIMINATION_DAYS = 45;

export function eliminationReleaseDate(closedAt: string) {
  const date = new Date(closedAt);
  date.setDate(date.getDate() + ELIMINATION_DAYS);
  return date;
}

export async function eliminateCompanyData(companyId: string, confirmName: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const listed = await supabase.rpc('admin_company_storage_objects', { p_company_id: companyId });
  if (listed.error) throw new Error(listed.error.message || 'Não foi possível listar os arquivos da empresa.');
  const byBucket = new Map<string, string[]>();
  for (const row of (listed.data || []) as Array<{ bucket: string; path: string }>) byBucket.set(row.bucket, [...(byBucket.get(row.bucket) || []), row.path]);
  let filesRemoved = 0;
  for (const [bucket, paths] of byBucket) {
    for (let index = 0; index < paths.length; index += 100) {
      const chunk = paths.slice(index, index + 100);
      const removed = await supabase.storage.from(bucket).remove(chunk);
      if (removed.error) throw new Error(`Não foi possível apagar os arquivos (${removed.error.message}). Nada foi eliminado no banco; tente de novo.`);
      filesRemoved += removed.data?.length ?? chunk.length;
    }
  }
  const result = await supabase.rpc('admin_eliminate_company_data', { p_company_id: companyId, p_confirm_name: confirmName, p_files_removed: filesRemoved });
  if (result.error) throw new Error(result.error.message || 'Não foi possível eliminar os dados.');
  const data = result.data as { rows_removed: Record<string, number>; people_anonymized: number; files_removed: number };
  const rows = Object.values(data.rows_removed || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  return { rows, people: data.people_anonymized || 0, files: data.files_removed || 0 };
}
