import { changeRecordStatus } from '../../records/workspace';
import { supabase } from '../../supabase';

type StaffDecision = {
  id: string;
  kind: 'hours' | 'review';
  reviewKind?: string;
  entityId?: string | null;
  payload?: unknown;
  approve: boolean;
  note: string;
};

/* Executa, com o acesso da administradora, a alteração que a Equipe CALI pediu. */
async function applyStaffChange(payload: any): Promise<string | null> {
  if (!supabase || !payload?.action) return 'Pedido sem conteúdo para aplicar.';
  const db = supabase; let error: any = null;
  if (payload.action === 'project_create') { const created = await db.from('projects').insert(payload.project).select('id').single(); error = created.error; if (!error && created.data?.id && (payload.fronts || []).length) error = (await db.from('project_workstreams').insert((payload.fronts as any[]).map((front) => ({ ...front, company_id: payload.project.company_id, project_id: created.data.id })))).error; }
  else if (payload.action === 'front_create') error = (await db.from('project_workstreams').insert(payload.row)).error;
  else if (payload.action === 'deliverable_create') error = (await db.from('deliverables').insert(payload.row)).error;
  else if (payload.action === 'deliverable_update') error = (await db.from('deliverables').update(payload.row).eq('id', payload.id)).error;
  else if (payload.action === 'deliverable_delete') error = (await db.from('deliverables').delete().eq('id', payload.id)).error;
  else if (payload.action === 'deliverable_cancel') error = (await db.rpc('change_deliverable_status', { p_deliverable_id: payload.id, p_status: 'cancelled', p_note: payload.reason })).error;
  else if (payload.action === 'task_create') error = (await db.from('deliverable_tasks').insert(payload.row)).error;
  else if (payload.action === 'task_complete') error = (await db.from('deliverable_tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', payload.id)).error;
  else if (payload.action === 'event_create' || payload.action === 'event_update') {
    const { data: auth } = await db.auth.getUser();
    const saved = payload.action === 'event_update' && payload.id
      ? await db.from('events').update(payload.event).eq('id', payload.id).select('id').single()
      : await db.from('events').insert({ ...payload.event, sync_status: 'local', created_by: auth.user?.id || null }).select('id').single();
    error = saved.error;
    const emails = (payload.attendees || []) as string[];
    if (!error && saved.data?.id && emails.length) {
      if (payload.action === 'event_update') await db.from('event_attendees').delete().eq('event_id', saved.data.id);
      error = (await db.from('event_attendees').insert(emails.map((email) => ({ event_id: saved.data.id, company_id: payload.event.company_id || null, name: email.split('@')[0], email, attendee_type: payload.event.visibility === 'client' ? 'client' : 'external', status: 'pending' })))).error;
    }
  }
  else if (payload.action === 'event_cancel') error = (await db.from('events').update({ cancelled_at: new Date().toISOString(), cancellation_reason: payload.reason }).eq('id', payload.id)).error;
  else return 'Tipo de alteração desconhecido.';
  return error ? (error.message || 'Não foi possível aplicar a alteração.') : null;
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
