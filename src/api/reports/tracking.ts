import { supabase } from '../supabase';

const trackingFields = 'id,company_id,report_type,period_start,version,status,sent_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count,acknowledged_at,acknowledgement_protocol';
const historyFields = 'id,report_type,period_start,version,status,sent_at,client_open_count,client_first_opened_at,client_last_opened_at,client_pdf_count,acknowledged_at,acknowledgement_protocol';
const clientEvents: Record<string, string> = { opened: 'Relatório aberto', pdf_opened: 'PDF aberto / baixado', acknowledged: 'Ciência registrada', drive_saved: 'Salvo no Drive', question_submitted: 'Dúvida enviada' };

export async function readOfficialTrackedReport(protocol: string) {
  if (!supabase) return null;
  const current = await supabase.from('reports').select(trackingFields).eq('protocol', protocol).maybeSingle();
  if (current.error || !current.data) return null;
  const row = current.data;
  if (['sent', 'published'].includes(row.status) || row.sent_at) return row;
  if (!row.company_id || !row.period_start) return null;
  const official = await supabase.from('reports').select(trackingFields)
    .eq('company_id', row.company_id).eq('report_type', row.report_type || 'monthly')
    .eq('period_start', String(row.period_start).slice(0, 10)).in('status', ['sent', 'published'])
    .order('version', { ascending: false }).limit(1).maybeSingle();
  return official.error ? null : official.data;
}

export type TrackedReport = NonNullable<Awaited<ReturnType<typeof readOfficialTrackedReport>>>;

export async function readClientReportHistory(companyId: string) {
  if (!supabase) return null;
  const [company, reports] = await Promise.all([
    supabase.from('companies').select('display_name').eq('id', companyId).maybeSingle(),
    supabase.from('reports').select(historyFields).eq('company_id', companyId).in('status', ['sent', 'published'])
      .order('period_start', { ascending: false }).order('version', { ascending: false }),
  ]);
  if (reports.error) return null;
  const seen = new Set<string>();
  const consolidated = (reports.data ?? []).filter((report) => {
    const key = `${report.report_type || 'monthly'}:${String(report.period_start || '').slice(0, 7)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ids = consolidated.map((item) => item.id);
  const events = ids.length ? await supabase.from('report_client_events').select('report_id,event_type,created_at,user_id,metadata')
    .in('report_id', ids).order('created_at', { ascending: false }) : null;
  if (events?.error) return null;
  const users = [...new Set((events?.data ?? []).flatMap((event) => event.user_id ? [event.user_id] : []))];
  const profiles = users.length ? await supabase.from('profiles').select('id,full_name').in('id', users) : null;
  const names = new Map((profiles?.data ?? []).map((profile) => [String(profile.id), String(profile.full_name || 'Cliente')]));
  const eventsByReport = new Map<string, { date: string; label: string; actor: string }[]>();
  for (const event of events?.data ?? []) {
    const id = String(event.report_id);
    const list = eventsByReport.get(id) ?? [];
    list.push({ date: event.created_at, label: clientEvents[event.event_type] || event.event_type, actor: names.get(String(event.user_id)) || 'Cliente' });
    eventsByReport.set(id, list);
  }
  return { companyName: company.data?.display_name || 'Cliente', consolidated, eventsByReport };
}
