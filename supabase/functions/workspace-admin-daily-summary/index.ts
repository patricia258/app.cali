// Resumo diário da administradora: um e-mail por dia, às 19h de Brasília, com o que aconteceu no dia, por cliente.
// Fonte: os avisos gravados no dia (o que o cliente fez e o que a CALI fez/avisou) e as horas registradas no dia.
// Chamado só pela rotina do banco, com o segredo "notification_email_hook". Não altera nenhum dado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "APP CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = "https://app.calirh.com";
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const headers = { "Content-Type": "application/json" };

const esc = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const hoursLabel = (minutes: number) => { const h = Math.floor(minutes / 60), m = minutes % 60; return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`; };
const clock = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

type Item = { title: string; body: string; at: string; url: string };
type Block = { name: string; fromClient: Item[]; fromCali: Item[]; minutes: number };

function list(label: string, color: string, items: Item[]) {
  if (!items.length) return "";
  const rows = items.slice(0, 12).map((item) => `<tr><td valign="top" style="padding:7px 10px 7px 0;font-size:11px;color:#8C807A;white-space:nowrap">${esc(clock(item.at))}</td><td style="padding:7px 0;font-size:13px;line-height:1.5;color:#2B2B2B"><a href="${esc(item.url)}" style="color:#2B2B2B;text-decoration:none;font-weight:700">${esc(item.title)}</a>${item.body ? `<br><span style="color:#6F6863">${esc(item.body.slice(0, 180))}</span>` : ""}</td></tr>`).join("");
  const more = items.length > 12 ? `<tr><td></td><td style="padding:4px 0;font-size:12px;color:#8C807A">e mais ${items.length - 12}.</td></tr>` : "";
  return `<div style="font-size:10px;letter-spacing:.1em;font-weight:700;color:${color};text-transform:uppercase;margin:14px 0 4px">${label} (${items.length})</div><table width="100%" cellpadding="0" cellspacing="0">${rows}${more}</table>`;
}

function summaryHtml(dateLabel: string, blocks: Block[], totals: { client: number; cali: number; minutes: number }) {
  const sections = blocks.map((block) => `<tr><td style="padding:18px 0;border-top:1px solid #EEE4DD">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:16px;font-weight:700;color:#5A1E2D">${esc(block.name)}</td><td align="right" style="font-size:12px;color:#6F6863">${block.minutes ? `${hoursLabel(block.minutes)} registradas` : ""}</td></tr></table>
      ${list("O cliente fez", "#356448", block.fromClient)}${list("A CALI fez", "#B58C52", block.fromCali)}
    </td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;background:#5A1E2D"><img src="${LOGO_URL}" alt="CALI Workspace" width="122" style="display:block;width:122px;height:auto"></td></tr>
      <tr><td style="padding:28px 30px 26px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">RESUMO DO DIA</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 16px">${esc(dateLabel)}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr>
          <td width="33%" style="padding:12px 14px;border:1px solid #E8DDD4;border-radius:10px;background:#FBF7F3"><div style="font-size:11px;color:#8C807A">Ações dos clientes</div><div style="font-size:20px;font-weight:700;color:#2B2B2B">${totals.client}</div></td>
          <td width="8"></td>
          <td width="33%" style="padding:12px 14px;border:1px solid #E8DDD4;border-radius:10px;background:#FBF7F3"><div style="font-size:11px;color:#8C807A">Ações da CALI</div><div style="font-size:20px;font-weight:700;color:#2B2B2B">${totals.cali}</div></td>
          <td width="8"></td>
          <td width="33%" style="padding:12px 14px;border:1px solid #E8DDD4;border-radius:10px;background:#FBF7F3"><div style="font-size:11px;color:#8C807A">Horas registradas</div><div style="font-size:20px;font-weight:700;color:#2B2B2B">${hoursLabel(totals.minutes)}</div></td>
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${sections}</table>
        <div style="text-align:center;margin:22px 0 18px"><a href="${APP_URL}/admin" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir o Workspace</a></div>
        <div style="height:1px;background:#EAE1D8;margin-bottom:16px"></div>
        <p style="font-size:12px;line-height:1.6;color:#8C807A;margin:0">E-mail automático. Não responda a esta mensagem. Para falar com a CALI, acesse o <a href="${APP_URL}/admin" style="color:#5A1E2D;text-decoration:underline">Workspace</a>.</p>
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

    // Envio manual de teste não pode "gastar" a chave do dia, senão o envio automático das 19h seria descartado como repetido.
    const source = String((await req.json().catch(() => ({})))?.source || "daily_cron");
    const keySuffix = source === "daily_cron" ? "" : `-teste-${Date.now()}`;
    // Dia corrente no horário de Brasília (UTC-3, sem horário de verão).
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const from = `${day}T00:00:00-03:00`, to = `${day}T23:59:59-03:00`;
    const [noticeResult, profileResult, companyResult, hourResult] = await Promise.all([
      ws.from("notifications").select("user_id,company_id,notification_type,title,body,action_url,entity_id,created_at").gte("created_at", from).lte("created_at", to).order("created_at").limit(2000),
      ws.from("profiles").select("id,role,email,active"),
      ws.from("companies").select("id,display_name"),
      ws.from("hour_entries").select("company_id,minutes").eq("work_date", day),
    ]);
    const failure = noticeResult.error || profileResult.error || companyResult.error || hourResult.error;
    if (failure) throw failure;

    const roles = new Map(((profileResult.data || []) as any[]).map((row) => [row.id, row.role]));
    const names = new Map(((companyResult.data || []) as any[]).map((row) => [row.id, row.display_name]));
    const blocks = new Map<string, Block>();
    const blockOf = (companyId: string) => { if (!blocks.has(companyId)) blocks.set(companyId, { name: names.get(companyId) || "CALI", fromClient: [], fromCali: [], minutes: 0 }); return blocks.get(companyId)!; };
    const seen = new Set<string>();
    for (const row of (noticeResult.data || []) as any[]) {
      const role = roles.get(row.user_id);
      // Aviso recebido pela administradora = o cliente (ou o sistema) fez algo; recebido pelo cliente = a CALI fez algo.
      const side = role === "admin" ? "fromClient" : role === "client" ? "fromCali" : null;
      if (!side || String(row.notification_type || "").startsWith("staff_")) continue;
      const key = `${side}|${row.company_id}|${row.title}|${row.body}|${row.entity_id}`;
      if (seen.has(key)) continue; seen.add(key);
      const prefix = side === "fromClient" ? "/admin" : "/cliente";
      const path = String(row.action_url || "");
      blockOf(row.company_id || "none")[side].push({ title: row.title || "Atualização", body: row.body || "", at: row.created_at, url: side === "fromClient" && path.startsWith(prefix) ? `${APP_URL}${path}` : `${APP_URL}/admin` });
    }
    let minutes = 0;
    for (const row of (hourResult.data || []) as any[]) { const value = Number(row.minutes || 0); minutes += value; if (value) blockOf(row.company_id || "none").minutes += value; }

    const ordered = [...blocks.values()].filter((block) => block.fromClient.length || block.fromCali.length || block.minutes).sort((a, b) => (b.fromClient.length + b.fromCali.length) - (a.fromClient.length + a.fromCali.length));
    if (!ordered.length) return new Response(JSON.stringify({ ok: true, skipped: "no_activity" }), { headers });
    const totals = { client: ordered.reduce((sum, block) => sum + block.fromClient.length, 0), cali: ordered.reduce((sum, block) => sum + block.fromCali.length, 0), minutes };
    const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());
    const html = summaryHtml(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), ordered, totals);

    const admins = ((profileResult.data || []) as any[]).filter((row) => row.role === "admin" && row.active && row.email);
    let sent = 0;
    for (const admin of admins) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-admin-summary-${admin.id}-${day}${keySuffix}` },
        body: JSON.stringify({ from: FROM_EMAIL, to: [String(admin.email).trim().toLowerCase()], reply_to: REPLY_TO, subject: `CALI Workspace · Resumo do dia · ${day.split("-").reverse().join("/")}`, html }),
      });
      if (!response.ok) { console.error("admin summary resend", response.status, await response.text()); continue; }
      sent += 1;
    }
    return new Response(JSON.stringify({ ok: true, recipients: sent, companies: ordered.length, totals }), { headers });
  } catch (error) {
    console.error("workspace-admin-daily-summary", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers });
  }
});
