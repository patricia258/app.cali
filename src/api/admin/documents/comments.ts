import { z } from 'zod';
import type { DocumentRow, FileComment } from '../../../domain/documents';
import { supabase } from '../../supabase';

const comment = z.object({
  id: z.string(), body: z.string(), client_visible: z.boolean().nullish(), created_at: z.string(),
});

export async function readAdminDocumentComments(fileId: string): Promise<FileComment[]> {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('comments').select('id,body,client_visible,created_at')
    .eq('target_type', 'file').eq('target_id', fileId).order('created_at');
  if (result.error) throw new Error(result.error.message);
  return z.array(comment).parse(result.data ?? []).map((row) => ({
    id: row.id, body: row.body, clientVisible: Boolean(row.client_visible), createdAt: row.created_at,
  }));
}

export async function addAdminDocumentComment(doc: Pick<DocumentRow, 'companyId' | 'id'>, body: string, visible: boolean) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const { data: session } = await supabase.auth.getSession();
  const result = await supabase.from('comments').insert({
    company_id: doc.companyId, target_type: 'file', target_id: doc.id,
    author_user_id: session.session?.user.id || null, body: body.trim(), client_visible: visible,
  });
  if (result.error) throw new Error(result.error.message);
}
