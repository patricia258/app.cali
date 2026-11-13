import type { JsonObject } from '../../domain/json';
import { supabase } from '../supabase';

function requireSchedulingClient() {
  if (!supabase) throw new Error('Supabase indisponível.');
  return supabase;
}

type SchedulingCommand =
  | 'admin_classify_calendar_event_v66' | 'admin_confirm_extra_visit_v1' | 'admin_decide_extra_visit_change_v2'
  | 'admin_mark_calendar_event_outcome_v66' | 'admin_mark_scheduling_event_outcome_v1' | 'admin_quote_online_extra_v1'
  | 'admin_respond_scheduling_request_v1' | 'admin_set_extra_visit_cancellation_v1' | 'admin_set_scheduling_urgency_v66'
  | 'client_accept_extra_visit_proposal_v1' | 'client_accept_online_extra_quote_v1' | 'client_accept_scheduling_proposal_v1'
  | 'client_accept_scheduling_proposal_v2' | 'client_counter_extra_visit_v1' | 'client_request_new_scheduling_options_v1'
  | 'client_request_online_extra_v1' | 'create_scheduling_request_v1' | 'create_scheduling_request_v2';

export async function runSchedulingCommand(name: SchedulingCommand, args: JsonObject) {
  const { data, error } = await requireSchedulingClient().rpc(name, args);
  if (error) throw error;
  return data;
}

const companyColumns = 'id,display_name,logo_url,onsite_visits_included_per_month';

export async function readClientSchedulingCompany() {
  const client = requireSchedulingClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user?.id) throw new Error('Sessão do cliente não encontrada.');
  const { data: profile, error } = await client.from('profiles').select('company_id').eq('id', auth.user.id).maybeSingle();
  if (error) throw error;
  return String(profile?.company_id || '');
}

export async function readClientSchedulingRequests(companyId: string) {
  const client = requireSchedulingClient();
  return await Promise.all([
    client.from('companies').select(companyColumns).eq('id', companyId).maybeSingle(),
    client.from('scheduling_requests').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
    client.from('extra_visit_expenses').select('request_id,expense_kind,amount_cents,receipt_path,protocol,hours_quantity')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(100),
  ]);
}

export async function readAdminSchedulingRequests() {
  const client = requireSchedulingClient();
  return await Promise.all([
    client.from('companies').select(`${companyColumns},logo_workspace_url`).neq('status', 'archived').order('display_name'),
    client.from('scheduling_requests').select('*').order('created_at', { ascending: false }).limit(50),
  ]);
}

export async function readSchedulingRequestDetails(userIds: string[], requestIds: string[]) {
  const client = requireSchedulingClient();
  return await Promise.all([
    client.from('profiles').select('id,full_name').in('id', userIds),
    client.from('extra_visit_request_attachments').select('request_id,storage_path,file_name').in('request_id', requestIds),
  ]);
}

export async function signSchedulingAttachment(path: string) {
  return await requireSchedulingClient().storage.from('cali-workspace-private').createSignedUrl(path, 120);
}

export async function syncScheduledEvent(eventId: string) {
  return await requireSchedulingClient().functions.invoke('workspace-sync-scheduled-event', { body: { eventId } });
}

export async function readAgendaCompliance(start: string, end: string) {
  return await requireSchedulingClient().rpc('my_agenda_compliance_v66', { p_period_start: start, p_period_end: end });
}

export async function previewSchedulingPolicy(mode: string, start: string, urgency: string) {
  return await requireSchedulingClient().rpc('preview_my_scheduling_policy_v66', { p_mode: mode, p_start: start, p_urgency: urgency });
}

export async function readSchedulingRequestPolicies(client: boolean) {
  const columns = 'id,company_id,status,request_mode,meeting_entitlement,contract_session_number,included_sessions_snapshot,cadence_days_snapshot,urgency_level,urgency_fee_applies,billable_extra,billing_acknowledged_at,billing_notice,service_plan_snapshot';
  const requests = requireSchedulingClient().from('scheduling_requests');
  if (client) return await requests.select(`${columns},extra_visit`).order('created_at', { ascending: false }).limit(30);
  return await requests.select(columns).order('created_at', { ascending: false }).limit(60);
}
