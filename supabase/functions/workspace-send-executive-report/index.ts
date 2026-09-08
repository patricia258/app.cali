import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "CALI Workspace <patricia@calirh.com>";
const REPLY_TO = "patricia@calirh.com";
const APP_BASE = "https://app.calirh.com";
const APP_URL = `${APP_BASE}/cliente/relatorios`;
const LOGO_URL = `${APP_BASE}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_BASE}/brand/cali-oak-mark-light.svg`;

const ALLOWED_ORIGINS = new Set(["https://app.calirh.com", "http://localhost:4173", "http://localhost:5173"]);

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://app.calirh.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: cors(req) });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uuid(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}

function recipients(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[;,]/) : [];
  const list = [...new Set(source.map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean))];
  if (list.length > 8) throw new Error("Use no máximo 8 destinatários.");
  const invalid = list.find((item) => !/^([^\s@])+@([^\s@])+\.([^\s@])+$/.test(item));
  if (invalid) throw new Error(`E-mail inválido: ${invalid}`);
  return list;
}

function monthLabel(start: string) {
  const [year, month] = start.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateOnly(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function inclusiveDays(from: string, to: string) {
  if (!from || !to || to < from) return 0;
  const start = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

function subject(company: string, period: string) {
  return `CALI Workspace · ${company} · Fechamento de ${period} disponível`;
}

function html(company: string, period: string, message: string, reportId: string) {
  const url = `${APP_URL}?report=${encodeURIComponent(reportId)}`;
  const personal = message
    ? `<div style="margin:0 0 22px;padding:14px 16px;border:1px solid #E8DDD4;border-radius:12px;background:#FBF7F3"><div style="font-size:10px;color:#B58C52;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:6px">Uma observação da Patrícia</div><div style="font-size:14px;color:#2B2B2B;line-height:1.55">${esc(message).replaceAll("\n", "<br>")}</div></div>`
    : "";

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent">O fechamento de ${esc(period)} está disponível no CALI Workspace.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;border-bottom:1px solid #6A2838;background:#5A1E2D">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" valign="middle"><img src="${LOGO_URL}" alt="CALI Workspace" width="122" style="display:block;width:122px;max-width:122px;height:auto;border:0"></td>
          <td align="right" valign="middle"><img src="${MARK_URL}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain;border:0"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px;text-transform:uppercase">FECHAMENTO EXECUTIVO · ${esc(period)}</div>
        <h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 14px">Seu fechamento está disponível</h1>
        ${personal}
        <p style="font-size:15px;line-height:1.65;margin:0 0 24px">A leitura do período já está no CALI Workspace.</p>
        <div style="text-align:center;margin:0 0 24px"><a href="${esc(url)}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir no Workspace</a></div>
        <div style="height:1px;background:#EAE1D8;margin-bottom:18px"></div>
        <p style="font-size:12px;color:#8C807A;margin:0">CALI Workspace · Patrícia Lima · People Advisory Executive</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Método não permitido." }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Configuração de envio incompleta.");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return json(req, { ok: false, error: "Sessão ausente." }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json(req, { ok: false, error: "Sessão inválida." }, 401);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ws = adminClient.schema("cali_workspace");

    const { data: profile } = await ws.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
    if (!profile || profile.role !== "admin" || profile.active === false) {
      return json(req, { ok: false, error: "Usuário sem permissão para enviar relatórios." }, 403);
    }

    const payload = await req.json();
    const reportId = uuid(payload?.report_id);
    if (!reportId) return json(req, { ok: false, error: "Relatório inválido." }, 400);

    const { data: report, error: reportError } = await ws.from("reports")
      .select("id,company_id,title,report_type,period_start,period_end,status,protocol,version")
      .eq("id", reportId)
      .single();
    if (reportError || !report) return json(req, { ok: false, error: "Relatório não encontrado." }, 404);
    if (report.status !== "approved") return json(req, { ok: false, error: "Apenas relatórios aprovados podem ser enviados." }, 409);

    const [{ data: company }, { data: clientProfiles }, { data: existingOfficial }] = await Promise.all([
      ws.from("companies").select("display_name,start_date").eq("id", report.company_id).maybeSingle(),
      ws.from("profiles").select("id,email,full_name,is_primary").eq("company_id", report.company_id).eq("role", "client").eq("active", true),
      ws.from("reports").select("id,protocol,version,status").eq("company_id", report.company_id).eq("report_type", report.report_type).eq("period_start", report.period_start).eq("period_end", report.period_end).in("status", ["sent", "published"]).neq("id", report.id).limit(1).maybeSingle(),
    ]);

    if (existingOfficial) {
      return json(req, { ok: false, error: "Já existe um fechamento oficial enviado para esta competência. Retire a versão ainda não visualizada ou use o fluxo de correção quando já houver leitura." }, 409);
    }

    const companyName = String(company?.display_name || "Conta CALI");
    const isTestEnvironment = companyName === "CALI · Ambiente de Teste";
    if (String(report.report_type || "monthly") === "monthly" && !isTestEnvironment) {
      const periodStart = dateOnly(report.period_start);
      const periodEnd = dateOnly(report.period_end);
      const companyStart = dateOnly(company?.start_date);
      const today = new Date().toISOString().slice(0, 10);
      const collectionStart = companyStart && companyStart > periodStart ? companyStart : periodStart;
      const collectionEnd = today < periodEnd ? today : periodEnd;
      const collected = inclusiveDays(collectionStart, collectionEnd);
      if (collected < 20) {
        return json(req, { ok: false, error: `Este fechamento ainda tem ${collected} de 20 dias mínimos de coleta. Continue usando a prévia interna até completar a base do período.` }, 409);
      }
    }

    let to = recipients(payload?.recipients);
    if (!to.length) to = recipients((clientProfiles ?? []).map((item: any) => item.email));
    if (!to.length) return json(req, { ok: false, error: "Nenhum destinatário foi informado." }, 400);

    const message = String(payload?.message ?? "").trim().slice(0, 2000);
    const period = monthLabel(String(report.period_start));
    const emailSubject = subject(companyName, period);
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `workspace-report-${report.id}-v${report.version}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        reply_to: REPLY_TO,
        subject: emailSubject,
        html: html(companyName, period, message, report.id),
      }),
    });

    const emailText = await emailRes.text();
    if (!emailRes.ok) throw new Error(`Falha no serviço de e-mail (${emailRes.status}): ${emailText}`);
    let email: any = {};
    try { email = JSON.parse(emailText); } catch { /* resposta sem JSON */ }

    const now = new Date().toISOString();
    const { error: updateError } = await ws.from("reports")
      .update({ status: "sent", sent_at: now, sent_by: user.id, sent_to: to, published_at: now })
      .eq("id", report.id);
    if (updateError) throw updateError;

    await ws.from("activity_log").insert({
      company_id: report.company_id,
      event_type: "report_sent",
      entity_type: "report",
      entity_id: report.id,
      metadata: { version: report.version, to, email_id: email?.id ?? null, subject: emailSubject, test_environment: isTestEnvironment },
    });

    const notificationRows = (clientProfiles ?? []).map((item: any) => ({
      company_id: report.company_id,
      user_id: item.id,
      notification_type: "report_available",
      title: "Novo relatório disponível",
      body: `O fechamento de ${period} está disponível no Workspace.`,
      entity_type: "report",
      entity_id: report.id,
      action_url: `/cliente/relatorios?report=${report.id}`,
      relevance: "high",
      email_required: false,
      emailed_at: now,
    }));
    if (notificationRows.length) await ws.from("notifications").insert(notificationRows);

    return json(req, {
      ok: true,
      email_id: email?.id ?? null,
      to,
      subject: emailSubject,
      status: "sent",
      notifications: notificationRows.length,
      test_environment: isTestEnvironment,
    });
  } catch (error) {
    console.error("workspace-send-executive-report", error);
    const message = error instanceof Error ? error.message : "Falha inesperada no envio.";
    return json(req, { ok: false, error: message }, /inválid|destinat|Apenas relatórios|competência|dias mínimos/i.test(message) ? 400 : 500);
  }
});
