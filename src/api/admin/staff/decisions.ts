import type { PostgrestError } from '@supabase/supabase-js';
import { isJsonObject, type JsonValue } from '../../../domain/json';
import { changeRecordStatus } from '../../records/workspace';
import { supabase } from '../../supabase';

type StaffDecision = {
  id: string;
  kind: 'hours' | 'review';
  reviewKind?: string;
  entityId?: string | null;
  payload?: JsonValue;
  approve: boolean;
  note: string;
};

/* Executa, com o acesso da administradora, a alteração que a Equipe CALI pediu. */
async function applyStaffChange(payload: JsonValue | undefined): Promise<string | null> {
  const missing = 'Pedido sem conteúdo para aplicar.';
  if (!supabase || !isJsonObject(payload) || !payload.action) return missing;
  const db = supabase;
  const { action, id, reason, row, event } = payload;
  let error: PostgrestError | null = null;

  if (action === 'project_create') {
    const { project, fronts: draftFronts } = payload;
    const fronts = draftFronts ?? [];
    if (!isJsonObject(project) || !Array.isArray(fronts) || !fronts.every(isJsonObject)) return missing;
    const created = await db.from('projects').insert(project).select('id').single();
    error = created.error;
    if (!error && created.data?.id && fronts.length) {
      error = (await db.from('project_workstreams').insert(fronts.map((front) => ({
        ...front, company_id: project.company_id, project_id: created.data.id,
      })))).error;
    }
  } else if (action === 'front_create' || action === 'deliverable_create' || action === 'task_create') {
    if (!isJsonObject(row)) return missing;
    const table = action === 'front_create' ? 'project_workstreams' : action === 'deliverable_create' ? 'deliverables' : 'deliverable_tasks';
    error = (await db.from(table).insert(row)).error;
  } else if (action === 'deliverable_update') {
    if (!isJsonObject(row) || typeof id !== 'string') return missing;
    error = (await db.from('deliverables').update(row).eq('id', id)).error;
  } else if (action === 'deliverable_delete') {
    if (typeof id !== 'string') return missing;
    error = (await db.from('deliverables').delete().eq('id', id)).error;
  } else if (action === 'deliverable_cancel') {
    if (typeof id !== 'string') return missing;
    error = (await db.rpc('change_deliverable_status', { p_deliverable_id: id, p_status: 'cancelled', p_note: reason })).error;
  } else if (action === 'task_complete') {
    if (typeof id !== 'string') return missing;
    error = (await db.from('deliverable_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)).error;
  } else if (action === 'event_create' || action === 'event_update') {
    const emails = payload.attendees ?? [];
    if (!isJsonObject(event) || !Array.isArray(emails) || !emails.every((email) => typeof email === 'string')) return missing;
    const { data: auth } = await db.auth.getUser();
    const saved = action === 'event_update' && typeof id === 'string' && id
      ? await db.from('events').update(event).eq('id', id).select('id').single()
      : await db.from('events').insert({ ...event, sync_status: 'local', created_by: auth.user?.id || null }).select('id').single();
    error = saved.error;
    if (!error && saved.data?.id && emails.length) {
      if (action === 'event_update') await db.from('event_attendees').delete().eq('event_id', saved.data.id);
      error = (await db.from('event_attendees').insert(emails.map((email) => ({
        event_id: saved.data.id, company_id: event.company_id || null, name: email.split('@')[0], email,
        attendee_type: event.visibility === 'client' ? 'client' : 'external', status: 'pending',
      })))).error;
    }
  } else if (action === 'event_cancel') {
    if (typeof id !== 'string') return missing;
    error = (await db.from('events').update({ cancelled_at: new Date().toISOString(), cancellation_reason: reason }).eq('id', id)).error;
  } else {
    return 'Tipo de alteração desconhecido.';
  }

  return error ? error.message || 'Não foi possível aplicar a alteração.' : null;
}

export async function decideStaffSubmission(decision: StaffDecision) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const db = supabase;
  const { data: session } = await db.auth.getUser();
  const { approve, entityId, reviewKind, id } = decision;
  const note = decision.note.trim();
  if (approve && reviewKind === 'record_close' && entityId) {
    const closing = await changeRecordStatus(entityId, 'completed', false);
    if (closing.error) throw new Error(closing.error.message || 'Não foi possível finalizar a ocorrência.');
  }
  if (approve && reviewKind === 'deliverable' && entityId) {
    const sending = await db.rpc('change_deliverable_status', {
      p_deliverable_id: entityId, p_status: 'client_review', p_note: note || 'Aprovado pela administradora e enviado ao cliente',
    });
    if (sending.error) throw new Error(sending.error.message || 'Não foi possível enviar o entregável ao cliente.');
  }
  if (approve && reviewKind === 'change') {
    const failure = await applyStaffChange(decision.payload);
    if (failure) throw new Error(failure);
  }
  const result = decision.kind === 'hours'
    ? await db.rpc('admin_decide_staff_hours', { p_submission_id: id, p_approve: approve, p_note: note || null })
    : await db.from('staff_review_requests').update({
      status: approve ? 'approved' : 'returned', decided_by: session.user?.id || null,
      decided_at: new Date().toISOString(), decision_note: note || null,
    }).eq('id', id);
  if (result.error) {
    const message = result.error.message;
    throw new Error(message && !/violates|policy|permission/i.test(message) ? message : 'Não foi possível registrar a decisão. Tente de novo.');
  }
}
