const timeZone = "America/Sao_Paulo";
const localDate = new Intl.DateTimeFormat("en-CA", { timeZone });
const localOffset = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" });

export function summaryWindow(now: Date, scheduled: boolean) {
  const day = localDate.format(now);
  const offset = localOffset.formatToParts(now).find((part) => part.type === "timeZoneName")!.value.slice(3);
  const startsAt = `${day}T00:00:00${offset}`;
  const scheduledAt = `${day}T19:00:00${offset}`;
  return { day, startsAt, endsAt: scheduled ? scheduledAt : now.toISOString(), tooEarly: scheduled && now < new Date(scheduledAt) };
}

export function summaryIdempotencyKey(adminId: string, day: string, manualRunId?: string) {
  return `workspace-admin-summary-${adminId}-${day}${manualRunId ? `-teste-${manualRunId}` : ""}`;
}

export type SummaryItem = { title: string; body: string; at: string; url: string };
export type SummaryBlock = { name: string; fromClient: SummaryItem[]; fromCali: SummaryItem[]; minutes: number };

type Notice = {
  user_id: string;
  company_id: string | null;
  notification_type: string;
  title: string | null;
  body: string | null;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};
type Profile = { id: string; role: string; company_id: string | null; email: string | null; active: boolean };
type Company = { id: string; display_name: string };
type Hours = { company_id: string | null; minutes: number | null };

const clientActions = new Set([
  "client_task_adjustment_requested", "client_task_approved", "deliverable_status", "nps",
  "project_schedule_adjustment", "project_schedule_approved", "record_feedback", "record_reopen_request",
  "review_response", "scheduling_confirmed", "scheduling_request",
]);
const clientActionEntities: Record<string, string> = {
  document: "file", record_opened: "account_record", team_month_confirmed: "team_month_review",
};
const caliActions = new Set([
  "account_record_shared", "client_dependency", "deliverable_due_revision", "deliverable_status",
  "project_schedule_adjustment_resolution", "project_schedule_reminder", "project_schedule_review",
  "record_reopen_decision", "record_status", "report", "report_available", "review_request",
  "scheduling_response", "task_client_review", "team_month_update",
]);

const adminDestinations: Record<string, string> = {
  account_record: "/admin/registros?record=",
  deliverable: "/admin/projetos?deliverable=",
  file: "/admin/documentos?documento=",
  project: "/admin/projetos?project=",
  report: "/admin/relatorios/impressao/",
};
const adminModules: Record<string, string> = {
  event: "/admin/calendario",
  scheduling_request: "/admin/calendario",
  task: "/admin/projetos",
  team_month: "/admin/equipe",
  team_month_review: "/admin/equipe",
};

function actionUrl(notice: Notice, origin: string) {
  const entityType = notice.entity_type ?? "";
  if (notice.entity_id && Object.hasOwn(adminDestinations, entityType)) {
    return origin + adminDestinations[entityType] + encodeURIComponent(notice.entity_id);
  }
  if (notice.action_url && /^\/admin\/[a-z0-9/_?&=.%:-]+$/i.test(notice.action_url)) return origin + notice.action_url;
  return origin + (Object.hasOwn(adminModules, entityType) ? adminModules[entityType] : "/admin");
}

export function buildDailySummary(notices: Notice[], profiles: Profile[], companies: Company[], hours: Hours[], origin: string) {
  const recipients = new Map(profiles.map((profile) => [profile.id, profile]));
  const names = new Map(companies.map((company) => [company.id, company.display_name]));
  const blocks = new Map<string, SummaryBlock>();
  function blockFor(company: string) {
    const block = blocks.get(company) ?? { name: names.get(company) ?? "CALI", fromClient: [], fromCali: [], minutes: 0 };
    blocks.set(company, block);
    return block;
  }
  const seen = new Set<string>();
  for (const row of notices) {
    const profile = recipients.get(row.user_id);
    if (!profile || !row.company_id || !names.has(row.company_id)) continue;
    const type = row.notification_type;
    const fromClient = profile.role === "admin" && (clientActions.has(type)
      || Boolean(row.entity_id && Object.hasOwn(clientActionEntities, type) && row.entity_type === clientActionEntities[type]));
    const fromCali = profile.role === "client" && profile.company_id === row.company_id && caliActions.has(type);
    if (!fromClient && !fromCali) continue;
    const side = fromClient ? "fromClient" : "fromCali";
    // Uma ação cria avisos na mesma transação. A data distingue ações repetidas no mesmo assunto.
    const report = type === "report" || type === "report_available";
    const key = JSON.stringify([
      side, row.company_id, report ? "report" : type, row.entity_type, row.entity_id, row.created_at,
      report ? null : row.title, report ? null : row.body,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    blockFor(row.company_id)[side].push({
      title: row.title || "Atualização", body: row.body || "", at: row.created_at, url: actionUrl(row, origin),
    });
  }
  for (const row of hours) {
    const minutes = Number(row.minutes || 0);
    if (minutes) blockFor(row.company_id ?? "").minutes += minutes;
  }
  const ordered = [...blocks.values()].sort((a, b) =>
    (b.fromClient.length + b.fromCali.length) - (a.fromClient.length + a.fromCali.length)
    || a.name.localeCompare(b.name, "pt-BR")
  );
  const totals = ordered.reduce((result, block) => ({
    client: result.client + block.fromClient.length,
    cali: result.cali + block.fromCali.length,
    minutes: result.minutes + block.minutes,
  }), { client: 0, cali: 0, minutes: 0 });
  const admins = profiles.filter((row) => row.role === "admin" && row.active && row.email?.trim());
  return { ordered, totals, admins };
}
