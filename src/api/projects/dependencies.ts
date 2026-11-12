import { supabase } from '../supabase';

export type DeliverableDependency = {
  id: string;
  title: string;
  due_date: string;
  status: 'pending' | 'received' | 'cancelled';
  received_at: string | null;
};
export type DeliverableDueRevision = {
  id: string;
  previous_due: string | null;
  new_due: string;
  cause: string;
  reason: string;
  created_at: string;
};

export async function readDeliverableDependencies(deliverableId: string, signal?: AbortSignal) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const dependencies = supabase.from('deliverable_client_dependencies').select('id,title,due_date,status,received_at')
    .eq('deliverable_id', deliverableId).neq('status', 'cancelled').order('due_date').returns<DeliverableDependency[]>();
  const revisions = supabase.from('deliverable_due_revisions').select('id,previous_due,new_due,cause,reason,created_at')
    .eq('deliverable_id', deliverableId).order('created_at', { ascending: false }).returns<DeliverableDueRevision[]>();
  if (signal) {
    dependencies.abortSignal(signal);
    revisions.abortSignal(signal);
  }
  const [items, history] = await Promise.all([dependencies, revisions]);
  return { items: items.data, history: history.data };
}

export async function addDeliverableDependency(deliverableId: string, companyId: string, title: string, dueDate: string, partner: boolean) {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (partner) {
    return await supabase.rpc('partner_add_dependency', { p_deliverable_id: deliverableId, p_title: title, p_due_date: dueDate });
  }
  const { data } = await supabase.auth.getUser();
  return await supabase.from('deliverable_client_dependencies').insert({
    deliverable_id: deliverableId, company_id: companyId, title, due_date: dueDate, created_by: data.user?.id ?? null,
  });
}

export async function markDeliverableDependencyReceived(id: string, partner: boolean) {
  if (!supabase) throw new Error('Supabase não configurado.');
  if (partner) return await supabase.rpc('partner_receive_dependency', { p_dependency_id: id });
  return await supabase.from('deliverable_client_dependencies').update({ status: 'received', received_at: new Date().toISOString() }).eq('id', id);
}

export async function cancelDeliverableDependency(id: string) {
  if (!supabase) throw new Error('Supabase não configurado.');
  return await supabase.from('deliverable_client_dependencies').update({ status: 'cancelled' }).eq('id', id);
}

export async function writeDeliverableDeadlinePlan(companyId: string, cause: string, steps: {
  id: string; from: string | null; to: string; reason: string; keepOriginal: boolean;
}[]) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data: auth } = await supabase.auth.getUser();
  for (const step of steps) {
    const update = await supabase.from('deliverables')
      .update({ due_at: step.to, ...(step.keepOriginal ? { original_due_at: step.from } : {}) }).eq('id', step.id);
    if (update.error) return update.error.message || 'Não foi possível alterar o prazo.';
    const log = await supabase.from('deliverable_due_revisions').insert({
      deliverable_id: step.id, company_id: companyId, previous_due: step.from, new_due: step.to,
      cause, reason: step.reason, created_by: auth.user?.id ?? null,
    });
    if (log.error) return log.error.message || 'O prazo mudou, mas o histórico não foi gravado.';
  }
  return null;
}
