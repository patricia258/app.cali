import { z } from 'zod';
import { requireHoursClient } from './client';

export type HourAuditEntry = {
  id: string;
  workDate: string;
  minutes: number;
  description: string;
  category: string;
  clientVisible: boolean;
};

const auditSnapshot = z.object({ description: z.string().nullish(), minutes: z.number().nullish() });
const auditRows = z.array(z.object({
  id: z.union([z.number(), z.string()]),
  event_type: z.string(),
  metadata: z.object({ reason: z.string().nullish(), deleted_entry: auditSnapshot.nullish(), after: auditSnapshot.nullish() }).nullish(),
  created_at: z.string(),
}));

export async function readHourEntryAudit(signal: AbortSignal) {
  const { data, error } = await requireHoursClient().rpc('get_hour_entry_audit', { p_limit: 200 })
    .abortSignal(signal);
  if (error) throw new Error(error.message);
  return auditRows.parse(data ?? []);
}

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
