import { supabase } from '../supabase';

export async function listOwnPrivacyRequests(userId: string) {
  return await supabase?.from('data_subject_requests').select('id,kind,status,answer,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).order('id');
}

export async function exportOwnWorkspaceData() {
  return await supabase?.rpc('export_my_data');
}

export async function requestWorkspaceDataRights(kind: string, details: string) {
  return await supabase?.rpc('request_data_subject_right', { p_kind: kind, p_details: details });
}
