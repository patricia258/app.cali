// Perfil Comportamental CALI: envia ao respondente o relatório em PDF (anexo) e o link do relatório online.
// Chamado só pelo banco (public.cali_profile_report_ready), com o segredo x-workspace-hook.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5/base64";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = "https://app.calirh.com";
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_URL}/brand/cali-oak-mark-light.svg`;
const headers = { "Content-Type": "application/json" };
const NAMES: Record<string, { name: string; line: string }> = {
  D: { name: "Executor", line: "Resolve. Decide com pouca informação e gosta de desafio." },
  I: { name: "Comunicador", line: "Conecta. Convence pela energia e pela relação." },
  S: { name: "Planejador", line: "Sustenta. Mantém o time de pé e cumpre o combinado." },
  C: { name: "Analista", line: "Confere. Quer critério, dado e padrão antes de concordar." },
};
const esc = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const slug = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "perfil";

function html(name: string, primary: string, secondary: string, mixed: boolean, url: string) {
  const p = NAMES[primary], s = NAMES[secondary];
  const profile = mixed ? `Perfil misto ${esc(p.name)} e ${esc(s.name)}` : `${esc(p.name)}, com traço ${esc(s.name)}`;
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;background:#5A1E2D"><table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left"><img src="${LOGO_URL}" alt="CALI RH" width="122" style="display:block;width:122px;height:auto"></td>
        <td align="right"><img src="${MARK_URL}" alt="" width="44" height="44" style="display:block;width:44px;height:44px"></td></tr></table></td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">PERFIL COMPORTAMENTAL CALI</div>
        <h1 style="font-size:24px;line-height:1.25;color:#5A1E2D;margin:0 0 14px">Olá, ${esc(name.split(" ")[0])}. Seu relatório está pronto.</h1>
        <p style="font-size:15px;line-height:1.65;margin:0 0 18px">Obrigada por responder. Seu perfil predominante é <strong>${profile}</strong>.</p>
        <div style="margin:0 0 22px;padding:16px 18px;border:1px solid #E8DDD4;border-left:4px solid #5A1E2D;border-radius:12px;background:#FBF7F3;font-size:14px;line-height:1.6">${esc(p.line)}</div>
        <p style="font-size:14px;line-height:1.65;margin:0 0 22px">O relatório completo está em anexo, em PDF. Você também pode abri-lo pelo botão abaixo.</p>
        <div style="text-align:center;margin:0 0 24px"><a href="${esc(url)}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir meu relatório</a></div>
        <p style="font-size:12px;line-height:1.6;color:#8C807A;margin:0">Leitura comportamental de triagem. Não é diagnóstico psicológico e não mede competência. Você pode pedir explicações sobre o método a qualquer momento: privacidade@calirh.com.</p>
      </td></tr>
      <tr><td style="padding:16px 30px;border-top:1px solid #EFE6DF;font-size:11px;color:#8C807A">E-mail automático da CALI RH. Não responda esta mensagem.</td></tr>
    </table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers });
  const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "cali_workspace" }, auth: { persistSession: false } });
  try {
    const provided = req.headers.get("x-workspace-hook") ?? "";
    const { data: secretRow } = await ws.from("runtime_secrets").select("secret_value").eq("secret_key", "notification_email_hook").maybeSingle();
    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });
    const { result_id } = await req.json().catch(() => ({}));
    if (!result_id) return new Response(JSON.stringify({ ok: false, error: "missing result_id" }), { status: 400, headers });
    const { data: row } = await ws.from("profile_results").select("id,person_name,email,primary_style,secondary_style,mixed,access_token,report_path,report_emailed_at").eq("id", result_id).maybeSingle();
    if (!row || !row.report_path) return new Response(JSON.stringify({ ok: false, error: "not ready" }), { status: 404, headers });
    if (row.report_emailed_at) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
    const file = await ws.storage.from("cali-profiles").download(row.report_path);
    if (file.error || !file.data) return new Response(JSON.stringify({ ok: false, error: "pdf" }), { status: 500, headers });
    const content = encodeBase64(new Uint8Array(await file.data.arrayBuffer()));
    const url = `${APP_URL}/perfil/relatorio/${row.access_token}`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [row.email], reply_to: REPLY_TO,
        subject: "Seu Perfil Comportamental CALI",
        html: html(row.person_name, row.primary_style, row.secondary_style, row.mixed, url),
        attachments: [{ filename: `perfil-comportamental-cali-${slug(row.person_name)}.pdf`, content }],
      }),
    });
    if (!sent.ok) return new Response(JSON.stringify({ ok: false, error: `resend ${sent.status}` }), { status: 502, headers });
    await ws.from("profile_results").update({ report_emailed_at: new Date().toISOString() }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "error" }), { status: 500, headers });
  }
});
