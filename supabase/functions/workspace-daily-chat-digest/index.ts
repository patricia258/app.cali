import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "CALI Workspace <patricia@calirh.com>";
const REPLY_TO = "patricia@calirh.com";
const APP_URL = "https://app.calirh.com";
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_URL}/brand/cali-oak-mark.svg`;
const headers = { "Content-Type": "application/json" };

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const typeLabel: Record<string, string> = {
  meeting: "Reunião", occurrence: "Ocorrência", decision: "Decisão", request: "Solicitação",
  people_movement: "Movimentação de pessoas", leadership: "Liderança", risk: "Risco",
  context_change: "Mudança de contexto", client_input: "Informação do cliente",
  cali_perception: "Percepção CALI", milestone: "Marco", other: "Solicitação",
};

type NotificationRow = {
  id: string; user_id: string; company_id: string; entity_id?: string | null;
  action_url?: string | null; created_at: string;
};
type RecordRow = { id: string; protocol?: string | null; title: string; record_type: string; company_id: string };
type Thread = { recordId: string; protocol: string; title: string; type: string; count: number; url: string; companyId: string };

function digestHtml(name: string, companyLabel: string, totalMessages: number, threads: Thread[]) {
  const rows = threads.slice(0, 10).map((thread) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #EEE4DD">
      <div style="font-size:10px;letter-spacing:.08em;color:#B58C52;font-weight:700;text-transform:uppercase">${esc(thread.protocol)} · ${esc(thread.type)}</div>
      <div style="font-size:15px;line-height:1.4;color:#2B2B2B;font-weight:700;margin:4px 0">${esc(thread.title)}</div>
      <div style="font-size:12px;color:#7D716B">${thread.count} mensagem${thread.count === 1 ? "" : "s"} nova${thread.count === 1 ? "" : "s"}</div>
      <div style="margin-top:8px"><a href="${esc(thread.url)}" style="font-size:12px;color:#5A1E2D;font-weight:700;text-decoration:none">Abrir conversa →</a></div>
    </td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;border-bottom:1px solid #E8DDD4;background:#FFFDFB">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left"><img src="${LOGO_URL}" alt="CALI Workspace" width="150" style="display:block;max-width:150px;height:auto"></td>
          <td align="right"><img src="${MARK_URL}" alt="" width="34" height="34" style="display:block;width:34px;height:34px;object-fit:contain"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px 30px 26px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">RESUMO DO SEU CANAL COM A CALI</div>
        <h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 12px">Você tem mensagens novas no Workspace</h1>
        <p style="font-size:15px;line-height:1.65;margin:0 0 8px">Olá, ${esc(name || "tudo bem?")}. Há <strong>${totalMessages}</strong> mensagem${totalMessages === 1 ? "" : "s"} nova${totalMessages === 1 ? "" : "s"} em ${threads.length} conversa${threads.length === 1 ? "" : "s"} que ainda não foram lidas.</p>
        <p style="font-size:13px;line-height:1.55;color:#7D716B;margin:0 0 22px">${esc(companyLabel)}</p>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <div style="text-align:center;margin:26px 0 18px"><a href="${APP_URL}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir CALI Workspace</a></div>
        <div style="height:1px;background:#EAE1D8;margin-bottom:16px"></div>
        <p style="font-size:12px;color:#8C807A;margin:0">Este é o resumo diário das conversas. Novas mensagens continuam chegando em tempo real dentro da plataforma, sem gerar um e-mail a cada resposta.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) throw new Error("Configuração de envio incompleta.");
    const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).schema("cali_workspace");
    const provided = req.headers.get("x-workspace-hook") || "";
    const { data: secretRow } = await ws.from("runtime_secrets").select("secret_value").eq("secret_key", "notification_email_hook").maybeSingle();
    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });

    const { data: notifications, error: notificationError } = await ws.from("notifications")
      .select("id,user_id,company_id,entity_id,action_url,created_at")
      .eq("notification_type", "record_message")
      .is("read_at", null)
      .is("emailed_at", null)
      .order("created_at", { ascending: true })
      .limit(1000);
    if (notificationError) throw notificationError;
    const rows = (notifications || []) as NotificationRow[];
    if (!rows.length) return new Response(JSON.stringify({ ok: true, skipped: "no_unread_chat" }), { headers });

    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const companyIds = [...new Set(rows.map((row) => row.company_id).filter(Boolean))];
    const recordIds = [...new Set(rows.map((row) => row.entity_id).filter(Boolean))] as string[];
    const [profilesResult, companiesResult, recordsResult] = await Promise.all([
      ws.from("profiles").select("id,email,full_name,active").in("id", userIds),
      ws.from("companies").select("id,display_name").in("id", companyIds),
      recordIds.length ? ws.from("account_records").select("id,protocol,title,record_type,company_id").in("id", recordIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (companiesResult.error) throw companiesResult.error;
    if (recordsResult.error) throw recordsResult.error;

    const profiles = new Map((profilesResult.data || []).map((row: any) => [row.id, row]));
    const companies = new Map((companiesResult.data || []).map((row: any) => [row.id, row.display_name]));
    const records = new Map(((recordsResult.data || []) as RecordRow[]).map((row) => [row.id, row]));
    const grouped = new Map<string, NotificationRow[]>();
    rows.forEach((row) => grouped.set(row.user_id, [...(grouped.get(row.user_id) || []), row]));

    let sent = 0;
    for (const [userId, userRows] of grouped) {
      const profile: any = profiles.get(userId);
      if (!profile?.active || !profile.email) continue;
      const threadMap = new Map<string, Thread>();
      for (const notification of userRows) {
        const record = notification.entity_id ? records.get(notification.entity_id) : undefined;
        const key = notification.entity_id || notification.id;
        const existing = threadMap.get(key);
        if (existing) { existing.count += 1; continue; }
        threadMap.set(key, {
          recordId: record?.id || key,
          protocol: record?.protocol || "CALI Workspace",
          title: record?.title || "Conversa com a CALI",
          type: typeLabel[record?.record_type || "other"] || "Solicitação",
          count: 1,
          url: notification.action_url?.startsWith("/") ? `${APP_URL}${notification.action_url}` : APP_URL,
          companyId: record?.company_id || notification.company_id,
        });
      }
      const threads = [...threadMap.values()];
      const companyNames = [...new Set(threads.map((thread) => companies.get(thread.companyId)).filter(Boolean))] as string[];
      const companyLabel = companyNames.length === 1 ? companyNames[0] : companyNames.length > 1 ? companyNames.join(" · ") : "Sua conta CALI";
      const total = userRows.length;
      const subject = `CALI Workspace · ${companyLabel} · ${total} mensagem${total === 1 ? "" : "s"} pendente${total === 1 ? "" : "s"}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-chat-digest-${userId}-${new Date().toISOString().slice(0, 10)}` },
        body: JSON.stringify({ from: FROM_EMAIL, to: [String(profile.email).trim().toLowerCase()], reply_to: REPLY_TO, subject, html: digestHtml(profile.full_name || "", companyLabel, total, threads) }),
      });
      const text = await response.text();
      if (!response.ok) { console.error("digest resend", response.status, text); continue; }
      await ws.from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", userRows.map((row) => row.id)).is("emailed_at", null);
      sent += 1;
    }
    return new Response(JSON.stringify({ ok: true, recipients: sent, notifications: rows.length }), { headers });
  } catch (error) {
    console.error("workspace-daily-chat-digest", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers });
  }
});