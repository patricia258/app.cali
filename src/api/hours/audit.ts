import { requireHoursClient } from './client';

export type HourAuditEntry = {
  id: string;
  workDate: string;
  minutes: number;
  description: string;
  category: string;
  clientVisible: boolean;
};

type AuditRow = {
  id: number;
  event_type: string;
  metadata: {
    reason?: string;
    deleted_entry?: { description?: string; minutes?: number };
    after?: { description?: string; minutes?: number };
  } | null;
  created_at: string;
};

export async function readAuditableHours(start: string, next: string) {
  const client = requireHoursClient();
  const [entries, audit] = await Promise.all([
    client.from('hour_entries').select('id,company_id,work_date,minutes,description,category,source_type,client_visible,created_at')
      .gte('work_date', start).lt('work_date', next).order('work_date', { ascending: false }).order('created_at', { ascending: false }),
    client.rpc('get_hour_entry_audit', { p_limit: 200 }),
  ]);
  return {
    entries: entries.error ? null : (entries.data || []).map((row): HourAuditEntry => ({
      id: row.id,
      workDate: row.work_date,
      minutes: Number(row.minutes || 0),
      description: row.description || '',
      category: row.category || 'Outros',
      clientVisible: Boolean(row.client_visible),
    })),
    audit: audit.error ? null : (audit.data || []) as AuditRow[],
  };
}

export type { AuditRow };

export async function deleteAuditedHourEntry(entryId: string, reason: string) {
  return await requireHoursClient().rpc('delete_hour_entry_with_audit', {
    p_entry_id: entryId,
    p_reason: reason,
  });
}

export async function editAuditedHourEntry(entry: HourAuditEntry, reason: string) {
  return await requireHoursClient().rpc('edit_hour_entry_with_audit', {
    p_entry_id: entry.id,
    p_work_date: entry.workDate,
    p_minutes: entry.minutes,
    p_description: entry.description,
    p_category: entry.category,
    p_client_visible: entry.clientVisible,
    p_reason: reason,
  });
}
