import type { PostgrestError } from '@supabase/supabase-js';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { supabase } from '../../supabase';

type Company = {
  id: string;
  name: string;
  service: string;
  contracted: number;
  mark: string;
  logoUrl?: string;
};
type Project = {
  id: string;
  companyId: string;
  name: string;
  planningStatus?: string | null;
  status?: string | null;
};
type Deliverable = {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  status: string;
  dueAt?: string | null;
};
type AgendaEvent = {
  id: string;
  companyId: string;
  title: string;
  startsAt: string;
  type: "meeting" | "validation" | "deadline";
};
export type Satisfaction = {
  average: number | null;
  total: number;
  distribution: Record<string, number>;
  monthly: Array<{ month: string; average: number | null; count: number }>;
  recent: Array<{
    score: number;
    company?: string | null;
    protocol?: string | null;
    title?: string | null;
    createdAt: string;
  }>;
};
export type DashboardData = {
  companies: Company[];
  projects: Project[];
  deliverables: Deliverable[];
  entries: Array<{
    companyId: string;
    minutes: number;
    workDate?: string | null;
  }>;
  events: AgendaEvent[];
  satisfaction: Satisfaction;
};

async function readDashboardPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const pageSize = 250;
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await read(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function readAdminOverview(now = new Date()) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const db = supabase;
  const current = startOfMonth(now);
  const next = format(addMonths(current, 1), 'yyyy-MM-dd');
  const historyStart = subMonths(current, 11);
  return await Promise.allSettled([
    readDashboardPages((from, to) => db
      .from("companies")
      .select(
        "id,display_name,logo_url,service_type,service_plan,monthly_hours_contracted",
      )
      .neq("status", "closed")
      .order("display_name")
      .order("id")
      .range(from, to)).then((rows) => Promise.all(rows.map(async (row) => ({
        id: row.id,
        name: row.display_name || "Cliente",
        service: row.service_plan || row.service_type || "Serviço CALI",
        contracted: Number(row.monthly_hours_contracted || 0),
        mark: String(row.display_name || "C").trim().slice(0, 1).toUpperCase(),
        logoUrl: await resolveWorkspaceMedia(row.logo_url),
      })))),
    readDashboardPages((from, to) => db
      .from("projects")
      .select("id,company_id,name,planning_status,status")
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .order("id")
      .range(from, to)).then((rows) => rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        name: row.name || "Projeto",
        planningStatus: row.planning_status,
        status: row.status,
      }))),
    readDashboardPages((from, to) => db
      .from("deliverables")
      .select("id,company_id,project_id,title,status,due_at")
      .neq("status", "cancelled")
      .order("due_at", { ascending: true })
      .order("id")
      .range(from, to)).then((rows) => rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        projectId: row.project_id,
        title: row.title || "Entregável",
        status: row.status,
        dueAt: row.due_at,
      }))),
    readDashboardPages((from, to) => db
      .from("hour_entries")
      .select("company_id,minutes,work_date")
      .gte("work_date", format(historyStart, "yyyy-MM-dd"))
      .lt("work_date", next)
      .order("id")
      .range(from, to)).then((rows) => rows.map((row) => ({
        companyId: row.company_id,
        minutes: Number(row.minutes || 0),
        workDate: row.work_date,
      }))),
    readDashboardPages((from, to) => db
      .from("events")
      .select("id,company_id,title,starts_at,event_type")
      .gte("starts_at", historyStart.toISOString())
      .lt(
        "starts_at",
        new Date(now.getTime() + 15 * 86400000).toISOString(),
      )
      .is("cancelled_at", null)
      .order("starts_at")
      .order("id")
      .range(from, to)).then((rows): AgendaEvent[] => rows.map((row) => ({
        id: row.id,
        companyId: row.company_id,
        title: row.title || "Compromisso",
        startsAt: row.starts_at,
        type: row.event_type === "meeting" || row.event_type === "deadline" ? row.event_type : "validation",
      }))),
    db.rpc("get_admin_satisfaction_overview").then(({ data, error }) => {
      if (error) throw error;
      return data as Satisfaction | null;
    }),
  ] as const);
}

const overviewTables = ['companies', 'projects', 'deliverables', 'hour_entries', 'events', 'nps_responses', 'account_record_feedback'];

export function subscribeAdminOverview(refresh: () => void) {
  if (!supabase) return () => undefined;
  const db = supabase;
  const channel = db.channel('admin-dashboard-live');
  for (const table of overviewTables) {
    channel.on('postgres_changes', { event: '*', schema: 'cali_workspace', table }, refresh);
  }
  channel.subscribe();
  return () => { void db.removeChannel(channel); };
}
