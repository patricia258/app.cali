import type { DocumentRow, EditorMode, FormState } from '../../../domain/documents';
import { optimizeImageForUpload } from '../../../lib/imageUpload';
import { supabase } from '../../supabase';

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

export async function saveAdminDocument({
  form, editorMode, editingDoc, file, cover,
}: {
  form: FormState;
  editorMode: EditorMode;
  editingDoc: DocumentRow | null;
  file: File | null;
  cover: File | null;
}) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const uploadedPaths: string[] = [];
  let persisted = false;
  let uploadedFilePath = '';
  let uploadedCoverPath = '';
  try {
    let protocol = editingDoc?.protocol || '';
    if (!protocol) {
      const { data: protocolValue, error: protocolError } = await supabase.rpc('generate_protocol', { p_entity_type: 'DOC' });
      if (protocolError) throw protocolError;
      protocol = String(protocolValue);
    }

    let uploadedImageSize = file?.size || null;
    let uploadedFileType = file?.type || file?.name.split('.').pop()?.toLowerCase() || editingDoc?.fileType || null;
    if (form.sourceMode === 'upload' && file) {
      const prepared = file.type.startsWith('image/') ? await optimizeImageForUpload(file, 'attachment') : { blob: file, contentType: file.type || 'application/octet-stream', extension: file.name.split('.').pop()?.toLowerCase() || 'bin' };
      uploadedImageSize = prepared.blob.size;
      uploadedFileType = prepared.contentType;
      const fileName = file.type.startsWith('image/') ? `${safeFileName(file.name).replace(/\\.[^.]+$/, '')}.webp` : safeFileName(file.name);
      uploadedFilePath = `documents/${form.companyId}/${protocol}/file-${Date.now()}-${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(uploadedFilePath, prepared.blob, { upsert: false, contentType: prepared.contentType, cacheControl: file.type.startsWith('image/') ? '31536000' : '3600' });
      if (uploadError) throw uploadError;
      uploadedPaths.push(uploadedFilePath);
    }
    if (cover) {
      const preparedCover = await optimizeImageForUpload(cover, 'attachment');
      uploadedCoverPath = `documents/${form.companyId}/${protocol}/cover-${Date.now()}-${safeFileName(cover.name).replace(/\\.[^.]+$/, '')}.webp`;
      const { error: coverError } = await supabase.storage.from('cali-workspace-private').upload(uploadedCoverPath, preparedCover.blob, { upsert: false, contentType: preparedCover.contentType, cacheControl: '31536000' });
      if (coverError) throw coverError;
      uploadedPaths.push(uploadedCoverPath);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const now = new Date().toISOString();
    const payload = {
      company_id: form.companyId, project_id: form.projectId || null, deliverable_id: form.deliverableId || null,
      title: form.title.trim(), category: form.category, document_kind: form.kind, description: form.description.trim() || null,
      storage_path: uploadedFilePath || (editorMode === 'complete' ? editingDoc?.storagePath || null : null),
      drive_url: form.sourceMode === 'drive' ? form.driveUrl.trim() : (editorMode === 'complete' ? editingDoc?.driveUrl || null : null),
      cover_storage_path: uploadedCoverPath || (editorMode === 'complete' ? editingDoc?.coverStoragePath || null : null),
      version_label: form.version.trim() || 'v1.0', is_final: form.publish, client_visible: form.publish,
      uploaded_by: sessionData.session?.user.id ?? null, file_type: uploadedFileType,
      file_size_bytes: uploadedImageSize || editingDoc?.fileSizeBytes || null, original_filename: file?.name || editingDoc?.originalFilename || null,
      status: form.publish ? 'published' : 'draft', requires_acknowledgement: form.requiresAcknowledgement,
      published_at: form.publish ? now : null, source_type: form.sourceMode === 'drive' ? 'google_drive' : 'workspace', valid_until: form.validUntil || null,
    };

    if (editorMode === 'complete' && editingDoc) {
      const { error: updateError } = await supabase.from('files').update(payload).eq('id', editingDoc.id);
      if (updateError) throw updateError;
      persisted = true;
      await supabase.from('activity_log').insert({ company_id: form.companyId, event_type: form.publish ? 'document_published' : 'document_final_file_added', entity_type: 'file', entity_id: editingDoc.id, metadata: { protocol: editingDoc.protocol, title: form.title.trim(), deliverable_id: form.deliverableId || null } });
      return { protocol, completed: true };
    } else {
      const { error: insertError } = await supabase.from('files').insert({ ...payload, revision_of_id: form.revisionOfId || null, protocol, workflow_origin: 'manual' });
      if (insertError) throw insertError;
      persisted = true;
      await supabase.from('activity_log').insert({ company_id: form.companyId, event_type: form.publish ? 'document_published' : form.revisionOfId ? 'document_revision_created' : 'document_created', entity_type: 'file', metadata: { protocol, title: form.title.trim(), revision_of_id: form.revisionOfId || null } });
      return { protocol, completed: false };
    }

  } catch (requestError) {
    if (!persisted && uploadedPaths.length) await supabase.storage.from('cali-workspace-private').remove(uploadedPaths);
    throw requestError;
  }
}

type DocumentTarget = Pick<DocumentRow, 'id' | 'companyId' | 'protocol' | 'title'>;

export async function setAdminDocumentPublication(doc: DocumentTarget, publish: boolean) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('files').update({
    status: publish ? 'published' : 'draft',
    client_visible: publish,
    is_final: publish,
    published_at: publish ? new Date().toISOString() : null,
  }).eq('id', doc.id);
  if (result.error) throw new Error(result.error.message);
  await supabase.from('activity_log').insert({
    company_id: doc.companyId,
    event_type: publish ? 'document_published' : 'document_unpublished',
    entity_type: 'file', entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title },
  });
}

export async function archiveAdminDocument(doc: DocumentTarget) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.from('files').update({ status: 'archived', client_visible: false }).eq('id', doc.id);
  if (result.error) throw new Error(result.error.message);
  await supabase.from('activity_log').insert({
    company_id: doc.companyId, event_type: 'document_archived', entity_type: 'file',
    entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title },
  });
}
