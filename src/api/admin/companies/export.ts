import { z } from 'zod';
import { supabase } from '../../supabase';

const documentRow = z.looseObject({
  title: z.string().nullish(), original_filename: z.string().nullish(), protocol: z.string().nullish(),
  storage_path: z.string().nullish(), created_at: z.string().nullish(), document_date: z.string().nullish(),
  drive_url: z.string().nullish(), external_url: z.string().nullish(),
});
const exportPayload = z.looseObject({
  exported_at: z.string(),
  data: z.object({ files: z.array(documentRow).optional(), account_documents: z.array(documentRow).optional() }).catchall(z.array(z.json())),
});

export async function readCompanyExport(companyId: string, recipient: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('admin_export_company_data', { p_company_id: companyId, p_recipient: recipient });
  if (result.error) throw new Error(result.error.message || 'Não foi possível gerar a exportação.');
  return exportPayload.parse(result.data);
}

export async function signCompanyExportDocuments(paths: string[], validSeconds: number) {
  if (!supabase || !paths.length) return {};
  const result = await supabase.storage.from('cali-workspace-private').createSignedUrls(paths, validSeconds);
  return Object.fromEntries((result.data ?? []).flatMap((item) =>
    item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [],
  ));
}
