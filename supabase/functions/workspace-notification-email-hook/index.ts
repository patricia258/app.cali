import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Patrícia Lima · CALI RH <patricia@calirh.com>";
const REPLY_TO = "patricia@calirh.com";
const headers = { "Content-Type": "application/json" };

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function html(title: string, body: string, url: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 14px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #E8DDD4;border-radius:16px;overflow:hidden"><tr><td style="background:#5A1E2D;padding:24px 30px;color:#fff"><div style="font-family:Georgia,serif;font-size:26px;letter-spacing:.08em">CALI</div><div style="font-size:9px;letter-spacing:.15em;opacity:.8">WORKSPACE · HR FOR BUSINESS</div></td></tr><tr><td style="padding:30px"><div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">ATUALIZAÇÃO IMPORTANTE</div><h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 16px">${esc(title)}</h1>${body ? `<p style="font-size:15px;line-height:1.65;margin:0 0 24px">${esc(body)}</p>` : ""}<div style="text-align:center;margin:0 0 24px"><a href="${url}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir no Workspace</a></div><div style="height:1px;background:#EAE1D8;margin-bottom:18px"></div><p style="font-size:12px;color:#8C807A;margin:0">CALI RH · Patrícia Lima</p></td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Configuração de envio incompleta.");
    }

    const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).schema("cali_workspace");

    const provided = req.headers.get("x-workspace-hook") || "";
    const { data: secretRow } = await ws
      .from("runtime_secrets")
      .select("secret_value")
      .eq("secret_key", "notification_email_hook")
      .maybeSingle();

    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });
    }

    const payload = await req.json().catch(() => ({}));
    const notificationId = String(payload?.notification_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_notification" }), { status: 400, headers });
    }

    const { data: notification, error: notificationError } = await ws
      .from("notifications")
      .select("id,user_id,title,body,action_url,relevance,email_required,emailed_at")
      .eq("id", notificationId)
      .maybeSingle();
    if (notificationError) throw notificationError;
    if (!notification) {
      return new Response(JSON.stringify({ ok: false, error: "notification_not_found" }), { status: 404, headers });
    }
    if (!notification.email_required || notification.emailed_at) {
      return new Response(JSON.stringify({ ok: true, skipped: notification.emailed_at ? "already_sent" : "not_required" }), { headers });
    }

    const { data: profile, error: profileError } = await ws
      .from("profiles")
      .select("email,full_name,active")
      .eq("id", notification.user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.active || !profile.email) {
      return new Response(JSON.stringify({ ok: true, skipped: "recipient_unavailable" }), { headers });
    }

    const url = notification.action_url && String(notification.action_url).startsWith("/")
      ? `https://app.calirh.com${notification.action_url}`
      : "https://app.calirh.com";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `workspace-notification-${notification.id}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [String(profile.email).trim().toLowerCase()],
        reply_to: REPLY_TO,
        subject: `CALI Workspace · ${notification.title}`,
        html: html(notification.title, notification.body || "", url),
      }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Resend ${response.status}: ${text}`);

    await ws.from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", notification.id)
      .is("emailed_at", null);

    return new Response(JSON.stringify({ ok: true, to: profile.email }), { headers });
  } catch (error) {
    console.error("workspace-notification-email-hook", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers });
  }
});
