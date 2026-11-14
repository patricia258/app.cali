import { readRecordViewerId, requireRecordsClient } from './client';

export type RecordOperationsRow = {
  id: string;
  source_actor: string;
  created_by?: string | null;
  workflow_status?: string | null;
  first_admin_opened_at?: string | null;
};

type TimerRow = { id: string; started_at: string; paused_seconds?: number | null };

export async function readRecordOperations(protocol: string): Promise<RecordOperationsRow | null> {
  const { data, error } = await requireRecordsClient().from('account_records')
    .select('id,source_actor,created_by,workflow_status,first_admin_opened_at').eq('protocol', protocol).maybeSingle();
  return error ? null : data;
}

export async function markRecordOpened(recordId: string) {
  return await requireRecordsClient().rpc('mark_account_record_opened', { p_record_id: recordId });
}

export async function deleteUnopenedRecord(recordId: string) {
  return await requireRecordsClient().rpc('client_delete_unopened_account_record', { p_record_id: recordId });
}

export async function readRecordTimerData(recordId: string) {
  const client = requireRecordsClient();
  const viewer = await readRecordViewerId();
  const [timer, hours] = await Promise.all([
    client.from('work_timers').select('id,started_at,paused_seconds')
      .eq('account_record_id', recordId).eq('user_id', viewer).eq('status', 'active').maybeSingle(),
    client.from('hour_entries').select('minutes').eq('account_record_id', recordId),
  ]);
  const entries = hours.data ?? [];
  const total = entries.reduce((sum, row) => sum + Number(row.minutes || 0), 0);
  return { timer: timer.data as TimerRow | null, total, sessions: entries.length };
}

export async function startRecordTimer(recordId: string) {
  return await requireRecordsClient().rpc('start_account_record_timer', { p_record_id: recordId });
}

export async function pauseRecordTimer(timerId: string) {
  return await requireRecordsClient().rpc('pause_work_timer', { p_timer_id: timerId });
}

export function subscribeRecordOperations(recordId: string, refresh: () => void) {
  const client = requireRecordsClient();
  const channel = client.channel(`records-ops-${recordId}-${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'cali_workspace', table: 'account_records', filter: `id=eq.${recordId}` }, refresh)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
