import { requireHoursClient } from './client';

type EntryDraft = {
  company_id: string;
  project_id: string | null;
  deliverable_id: string | null;
  work_date: string;
  minutes: number;
  description: string;
  category: string;
};

type EntryEdit = {
  work_date: string;
  minutes: number;
  description: string;
  started_at?: string;
  ended_at?: string;
};

type PriorEntry = { id: string; companyId: string; minutes: number; startedAt?: string | null; endedAt?: string | null };

export async function submitPartnerHours(input: EntryDraft & { justification: string }) {
  const client = requireHoursClient();
  const actor = await client.auth.getUser();
  return await client.from('staff_hour_submissions').insert({ ...input, staff_user_id: actor.data.user?.id });
}

export async function editPartnerSubmission(input: {
  p_id: string; p_work_date: string; p_minutes: number; p_description: string; p_reason: string;
}) {
  return await requireHoursClient().rpc('partner_edit_hour_submission', input);
}

export async function editPartnerHourEntry(input: {
  p_id: string; p_started_at: string; p_ended_at: string; p_description: string; p_reason: string;
}) {
  return await requireHoursClient().rpc('partner_edit_hour_entry', input);
}

export async function editAdminHourEntry(id: string, input: EntryEdit, before: PriorEntry | undefined, reason: string) {
  const client = requireHoursClient();
  const actor = await client.auth.getUser();
  const result = await client.from('hour_entries').update(input).eq('id', id);
  if (!result.error && before) {
    await client.from('activity_log').insert({
      company_id: before.companyId, actor_user_id: actor.data.user?.id || null,
      event_type: 'hour_entry_edited', entity_type: 'hour_entry', entity_id: before.id,
      metadata: {
        from_minutes: before.minutes, minutes: input.minutes, reason: reason.trim() || null,
        from_started_at: before.startedAt || null, from_ended_at: before.endedAt || null,
      },
    });
  }
  return result;
}

export async function addManualHourEntry(input: {
  p_company_id: string; p_project_id: string; p_deliverable_id: string; p_task_id: string | null;
  p_work_date: string; p_minutes: number; p_description: string; p_category: string;
  p_internal_note: string; p_client_visible: boolean; p_started_at: string; p_ended_at: string;
}) {
  return await requireHoursClient().rpc('add_manual_hour_entry', input);
}

export async function addExternalInteraction(input: EntryDraft & { client_visible: boolean }) {
  const client = requireHoursClient();
  const actor = await client.auth.getUser();
  if (actor.error) throw actor.error;
  return await client.from('hour_entries').insert({ ...input, source_type: 'interaction', created_by: actor.data.user?.id });
}

export async function setHoursVisibility(companyId: string, periodStart: string, enabled: boolean) {
  const client = requireHoursClient();
  const month = await client.from('company_hours_visibility').upsert({
    company_id: companyId, period_start: periodStart, enabled, changed_at: new Date().toISOString(),
  }, { onConflict: 'company_id,period_start' });
  if (month.error) throw month.error;
  const company = await client.from('companies').update({ show_hours_to_client: enabled }).eq('id', companyId);
  if (company.error) throw company.error;
}
