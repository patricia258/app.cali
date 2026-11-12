import { z } from 'zod';
import { supabase } from '../supabase';

const slot = z.object({ startsAt: z.string(), endsAt: z.string() });
const request = z.object({
  id: z.string(), event_id: z.string(), company_id: z.string(), action: z.string(), reason: z.string(),
  slots: z.array(slot).nullish().transform((value) => value ?? []), status: z.string(),
  original_starts_at: z.string(), created_at: z.string(), decision_note: z.string().nullish(),
});
export type AgendaChangeRequest = z.infer<typeof request>;

const unavailable = { message: 'Conexão indisponível.' };

export async function readAdminAgendaChanges() {
  const client = supabase;
  if (!client) return { requests: [], titles: {}, companies: {} };
  const { data } = await client.from('agenda_change_requests')
    .select('id,event_id,company_id,action,reason,slots,status,original_starts_at,created_at,decision_note')
    .order('created_at', { ascending: false }).limit(100);
  const requests = z.array(request).safeParse(data ?? []).data ?? [];
  const ids = [...new Set(requests.map((row) => row.event_id))];
  const companyIds = [...new Set(requests.map((row) => row.company_id))];
  const [events, companies] = await Promise.all([
    ids.length ? client.from('events').select('id,title').in('id', ids) : { data: [] },
    companyIds.length ? client.from('companies').select('id,display_name').in('id', companyIds) : { data: [] },
  ]);
  return {
    requests,
    titles: Object.fromEntries((events.data ?? []).map((row) => [row.id, row.title])),
    companies: Object.fromEntries((companies.data ?? []).map((row) => [row.id, row.display_name])),
  };
}

export function observeAdminAgendaChanges(listener: () => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client.channel('agenda-change-admin')
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'agenda_change_requests' }, listener).subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function decideAgendaChange(id: string, approve: boolean, note: string, index: number) {
  if (!supabase) return { error: unavailable, sync: null };
  const { data, error } = await supabase.rpc('admin_decide_agenda_change_v1', {
    p_change_id: id, p_approve: approve, p_note: note.trim(), p_slot_index: index,
  });
  if (error) return { error, sync: null };
  if (!approve || !data?.event_id) return { error: null, sync: null };

  let sync = await supabase.functions.invoke('google-calendar-oauth', {
    body: { action: data.action === 'cancel' ? 'cancel_event' : 'sync_event', eventId: data.event_id },
  });
  if (sync.data?.status === 'deferred_to_scheduling_sync') {
    sync = await supabase.functions.invoke('workspace-sync-scheduled-event', { body: { eventId: data.event_id } });
  }
  const outcome = sync.error ? 'pending' : ['no_google_connection', 'admin_google_not_connected'].includes(sync.data?.status) ? 'disconnected' : null;
  return { error: null, sync: outcome };
}

export async function requestAgendaChange(
  target: { kind: 'event' | 'extra'; id: string }, action: 'cancel' | 'reschedule', reason: string,
  slots: Array<z.infer<typeof slot>>,
) {
  if (!supabase) return { error: unavailable };
  const fields = { p_action: action, p_reason: reason.trim(), p_slots: slots };
  return target.kind === 'extra'
    ? await supabase.rpc('client_change_extra_visit_v2', { ...fields, p_request_id: target.id })
    : await supabase.rpc('client_request_agenda_change_v1', { ...fields, p_event_id: target.id });
}
