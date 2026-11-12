import { requireRecordsClient } from './client';

export type RecordClosureView = {
  id: string;
  protocol: string | null;
  workflow_status: string | null;
  created_at: string | null;
  closed_at: string | null;
};
export type RecordFeedback = { score: number; comment?: string | null; created_at: string };
type ClosureRow = { id: string; answered_at: string | null; closed_unanswered_at: string | null };
type ReopenRow = { id: string; reason?: string | null; requested_at: string; status: string; decision_note?: string | null };

export async function readRecordClosureView(protocol: string) {
  const { data, error } = await requireRecordsClient().from('account_records')
    .select('id,protocol,workflow_status,created_at,closed_at')
    .eq('protocol', protocol).maybeSingle();
  return error ? null : data as RecordClosureView | null;
}

export async function readLatestRecordFeedback(recordId: string): Promise<RecordFeedback | null> {
  const { data, error } = await requireRecordsClient().from('account_record_feedback').select('score,comment,created_at')
    .eq('record_id', recordId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return error ? null : data;
}

export async function readRecordClosureContext(protocol: string, role: 'admin' | 'client') {
  const client = requireRecordsClient();
  const record = await readRecordClosureView(protocol);
  if (!record) return null;
  const [closure, feedback, reopen] = await Promise.all([
    role === 'client' && record.workflow_status === 'completed'
      ? client.from('account_record_closures').select('id,answered_at,closed_unanswered_at')
        .eq('record_id', record.id).is('superseded_at', null).maybeSingle()
      : null,
    readLatestRecordFeedback(record.id),
    client.from('account_record_reopen_requests').select('id,reason,requested_at,status,decision_note')
      .eq('record_id', record.id).eq('status', 'pending').order('requested_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    record,
    closure: (closure?.data ?? null) as ClosureRow | null,
    feedback,
    reopen: reopen.error ? null : reopen.data as ReopenRow | null,
  };
}

export type RecordClosureContext = NonNullable<Awaited<ReturnType<typeof readRecordClosureContext>>>;

export async function submitRecordFeedback(recordId: string, closureId: string, score: number, comment: string | null) {
  return await requireRecordsClient().rpc('submit_account_record_closure_feedback', {
    p_record_id: recordId, p_closure_id: closureId, p_score: score, p_comment: comment,
  });
}

export async function requestRecordReopen(recordId: string, reason: string) {
  return await requireRecordsClient().rpc('request_account_record_reopen', { p_record_id: recordId, p_reason: reason });
}

export async function decideRecordReopen(requestId: string, decision: 'approved' | 'rejected', note: string | null) {
  return await requireRecordsClient().rpc('decide_account_record_reopen', { p_request_id: requestId, p_decision: decision, p_note: note });
}
