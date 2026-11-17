import { supabase } from '../supabase';

export async function readClientCalendar(userId: string, email?: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const profile = await supabase.from('profiles').select('company_id,email').eq('id', userId).maybeSingle();
  if (profile.error) throw profile.error;
  const companyId = profile.data?.company_id;
  const clientEmail = String(profile.data?.email || email || '').trim().toLowerCase();
  if (!companyId) throw new Error('Este acesso ainda não está vinculado a uma empresa.');

  const [eventResult, deliverableResult, requestResult, recordResult, changeResult, projectResult] = await Promise.all([
    supabase
      .from('events')
      .select('id,title,starts_at,ends_at,mode,location,meeting_url,description,event_type,sync_status,google_event_id,schedule_class,billing_applies,source_type,cancelled_at')
      .eq('company_id', companyId)
      .eq('visibility', 'client')
      .order('starts_at'),
    supabase
      .from('deliverables')
      .select('id,title,status,due_at,project_id')
      .eq('company_id', companyId)
      .eq('client_visible', true)
      .not('due_at', 'is', null)
      .neq('status', 'cancelled')
      .order('due_at'),
    supabase
      .from('scheduling_requests')
      .select('id,title,status,request_mode,requested_slots,admin_proposed_slots,selected_slot,billable_extra,urgency_level,created_at,extra_visit,online_extra_requested,purpose,location,admin_note,client_note,confirmed_event_id,extra_visit_change_reason,extra_visit_previous_slot,extra_visit_cancellation_fee_cents,extra_visit_cancellation_note')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }).limit(100),
    supabase.rpc('client_meeting_records_v1'),
    supabase.from('agenda_change_requests').select('id,event_id,action,reason,slots,status,decision_note,created_at').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100),
    supabase.from('projects').select('id,name').eq('company_id',companyId),
  ]);

  if (eventResult.error) throw eventResult.error;
  if (deliverableResult.error) throw deliverableResult.error;
  if (requestResult.error) throw requestResult.error;
  if (recordResult.error) throw recordResult.error;
  if (changeResult.error) throw changeResult.error;
  if (projectResult.error) throw projectResult.error;
  return { eventResult, deliverableResult, requestResult, recordResult, changeResult, projectResult, clientEmail };
}

export async function readClientCalendarAttendees(eventIds: string[], email: string) {
  if (!supabase) return { data: null, error: { message: 'Conexão indisponível.' } };
  return await supabase
            .from('event_attendees')
            .select('event_id,email,status')
            .in('event_id', eventIds)
            .eq('email', email);
}
