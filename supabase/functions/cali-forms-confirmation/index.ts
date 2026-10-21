// CALI Forms: e-mail "Recebemos sua resposta" para quem respondeu um formulário. Chamado só pelo banco
// (public.cali_form_submit), com o segredo x-workspace-hook. Envia uma cópia das respostas e marca o envio.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = "https://app.calirh.com";
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_URL}/brand/cali-oak-mark-light.svg`;
const headers = { "Content-Type": "application/json" };

type Question = { id: string; kind: string; label: string };

const esc = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function answerText(question: Question, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (question.kind === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  return String(value);
}

function html(title: string, name: string, thankYou: string, rows: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;border-bottom:1px solid #6A2838;background:#5A1E2D">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" valign="middle"><img src="${LOGO_URL}" alt="CALI RH" width="122" style="display:block;width:122px;max-width:122px;height:auto"></td>
          <td align="right" valign="middle"><img src="${MARK_URL}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">CALI FORMS</div>
        <h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 14px">Recebemos sua resposta</h1>
        <p style="font-size:15px;line-height:1.65;margin:0 0 10px">${name ? `Olá, ${esc(name)}. ` : ""}Obrigada por responder <strong>${esc(title)}</strong>.</p>
        ${thankYou ? `<p style="font-size:15px;line-height:1.65;margin:0 0 10px">${esc(thankYou)}</p>` : ""}
        <p style="font-size:13px;line-height:1.6;color:#6B5D63;margin:18px 0 10px">Para sua referência, uma cópia do que você enviou:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8DDD4;border-radius:12px;border-collapse:separate;overflow:hidden">${rows}</table>
      </td></tr>
      <tr><td style="padding:18px 30px;border-top:1px solid #EFE6DF;font-size:11px;line-height:1.6;color:#8C807A">
        Este é um e-mail automático da CALI RH e não recebe respostas. Dúvidas sobre privacidade: privacidade@calirh.com.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers });
  const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "cali_workspace" }, auth: { persistSession: false } });
  try {
    const provided = req.headers.get("x-workspace-hook") ?? "";
    const { data: secretRow } = await ws.from("runtime_secrets").select("secret_value").eq("secret_key", "notification_email_hook").maybeSingle();
    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });

    const { response_id } = await req.json().catch(() => ({}));
    if (!response_id) return new Response(JSON.stringify({ ok: false, error: "missing response_id" }), { status: 400, headers });
    const { data: response, error } = await ws.from("form_responses").select("id,answers,respondent_name,respondent_email,confirmation_sent_at,forms(title,thank_you,questions,confirm_email)").eq("id", response_id).maybeSingle();
    if (error || !response) return new Response(JSON.stringify({ ok: false, error: "not found" }), { status: 404, headers });
    const form = response.forms as unknown as { title: string; thank_you: string; questions: Question[]; confirm_email: boolean };
    if (response.confirmation_sent_at || !response.respondent_email || !form?.confirm_email) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });

    const answers = (response.answers ?? {}) as Record<string, unknown>;
    const rows = (form.questions ?? []).filter((question) => question.kind !== "statement").map((question, index) => `<tr><td style="padding:11px 14px;${index ? "border-top:1px solid #EFE6DF;" : ""}font-size:12px;color:#8C807A;width:42%;vertical-align:top">${esc(question.label)}</td><td style="padding:11px 14px;${index ? "border-top:1px solid #EFE6DF;" : ""}font-size:14px;color:#2B2B2B;vertical-align:top;white-space:pre-wrap">${esc(answerText(question, answers[question.id]))}</td></tr>`).join("");

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [response.respondent_email], reply_to: REPLY_TO, subject: `Recebemos sua resposta · ${form.title}`, html: html(form.title, response.respondent_name ?? "", form.thank_you ?? "", rows) }),
    });
    if (!sent.ok) return new Response(JSON.stringify({ ok: false, error: `resend ${sent.status}` }), { status: 502, headers });
    await ws.from("form_responses").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", response.id);
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "error" }), { status: 500, headers });
  }
});
