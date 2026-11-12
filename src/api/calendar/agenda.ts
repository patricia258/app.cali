import { supabase } from '../supabase';

export type CalendarNoticeRow = {
  id: string;
  title: string;
  category: string;
  notice_date: string;
  time_label: string | null;
  coverage: string | null;
  body: string | null;
  protocol?: string | null;
};

export async function readCalendarNotices(includeProtocol: boolean) {
  if (!supabase) return { data: null, error: { message: 'Conexão indisponível.' } };
  const fields = 'id,category,title,body,notice_date,time_label,coverage';
  return await supabase.from('notices').select(includeProtocol ? `${fields},protocol` : fields)
    .eq('status', 'published').not('notice_date', 'is', null).overrideTypes<CalendarNoticeRow[], { merge: false }>();
}

export function observeSchedulingRequests(channelName: 'admin-calendar-scheduling-preview' | 'client-agenda-current' | 'scheduling-requests-v65', listener: () => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'cali_workspace', table: 'scheduling_requests' }, listener).subscribe();
  return () => { void client.removeChannel(channel); };
}
