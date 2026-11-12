import type { JsonObject } from '../../domain/json';
import { requireProjectClient } from './client';

type ProjectFileRow = { id: string; storage_path: string | null; status: string; title: string | null };

export async function readFinalProjectFiles(owner: { deliverableId: string } | { taskId: string }) {
  const files = requireProjectClient().from('files').select('id,storage_path,status,title');
  const scoped = 'taskId' in owner ? files.eq('task_id', owner.taskId) : files.eq('deliverable_id', owner.deliverableId);
  return await scoped.returns<ProjectFileRow[]>();
}

export async function renameProjectFile(id: string, title: string) {
  return await requireProjectClient().from('files').update({ title }).eq('id', id);
}

export async function insertProjectFile(row: JsonObject) {
  return await requireProjectClient().from('files').insert(row);
}

export async function proposeFinalProjectFile(deliverableId: string, taskId: string | null, file: { path: string; name: string; mime?: string; size: number }) {
  return await requireProjectClient().rpc('partner_propose_final_file', {
    p_deliverable_id: deliverableId, p_task_id: taskId, p_storage_path: file.path, p_filename: file.name,
    p_file_type: file.mime || 'application/octet-stream', p_size: file.size,
  });
}

export async function releaseFinalProjectFile(id: string) {
  return await requireProjectClient().from('files').update({ status: 'published', client_visible: true, published_at: new Date().toISOString() }).eq('id', id);
}

export async function archiveProjectFile(id: string) {
  return await requireProjectClient().from('files').update({ status: 'archived', client_visible: false }).eq('id', id);
}

export async function removeProjectFile(id: string) {
  return await requireProjectClient().from('files').delete().eq('id', id);
}

export async function readDeliverableAttachmentSources(deliverableId: string) {
  const client = requireProjectClient();
  return await Promise.all([
    client.from('comments').select('body,created_at').eq('target_type', 'deliverable').eq('target_id', deliverableId).order('created_at'),
    client.from('task_messages').select('task_id,body,created_at').eq('deliverable_id', deliverableId).order('created_at'),
  ]);
}
