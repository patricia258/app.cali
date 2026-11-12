import type { JsonValue } from '../_shared/json.ts';
import { deliveryAppOrigin, emailDestinationsAllowed } from "../_shared/delivery-environment.ts";
// Gera, arquiva e envia o relatório individual a partir de um pedido privado de entrega.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { encodeBase64 } from "jsr:@std/encoding@1.0.5/base64";
import { createRespondentPdf, type RespondentPdfInput } from "./respondent-pdf.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = deliveryAppOrigin;
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_URL}/brand/cali-oak-mark-light.svg`;
const headers = { "Content-Type": "application/json" };
type Signer = NonNullable<RespondentPdfInput["signer"]> & { avatar_url?: string; signature_url?: string };
type Claim = { lease: string; signer: Signer | null };

type ProfileResult = {
  id: string;
  person_name: string;
  email: string;
  company_name: string | null;
  protocol: string | null;
  created_at: string;
  primary_style: RespondentPdfInput["primary"];
  secondary_style: RespondentPdfInput["secondary"];
  mixed: boolean;
  report_path: string | null;
  report_emailed_at: string | null;
  companies: { display_name: string } | null;
  profile_links: { title: string; company_label: string | null } | null;
};
const NAMES: Record<string, { name: string; line: string }> = {
  D: { name: "Executor", line: "Resolve. Decide com pouca informação e gosta de desafio." },
  I: { name: "Comunicador", line: "Conecta. Convence pela energia e pela relação." },
  S: { name: "Planejador", line: "Sustenta. Mantém o time de pé e cumpre o combinado." },
  C: { name: "Analista", line: "Confere. Quer critério, dado e padrão antes de concordar." },
};
const esc = (value: JsonValue | undefined) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const slug = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "perfil";

async function signerImage(value?: string) {
  if (!value) return undefined;
  try {
    const source = new URL(value, SUPABASE_URL);
    if (source.origin !== new URL(SUPABASE_URL).origin || !source.pathname.startsWith("/storage/v1/object/public/")) return undefined;
    const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok || Number(response.headers.get("content-length")) > 2_000_000) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length <= 2_000_000 ? bytes : undefined;
  } catch {
    return undefined;
  }
}

function html(name: string, primary: string, secondary: string, mixed: boolean) {
  const p = NAMES[primary], s = NAMES[secondary];
  const profile = mixed ? `perfil misto: ${esc(p.name)} e ${esc(s.name)}` : `${esc(p.name)}, com traço ${esc(s.name)}`;
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;background:#5A1E2D"><table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left"><img src="${LOGO_URL}" alt="CALI RH" width="122" style="display:block;width:122px;height:auto"></td>
        <td align="right"><img src="${MARK_URL}" alt="" width="44" height="44" style="display:block;width:44px;height:44px"></td></tr></table></td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">PERFIL COMPORTAMENTAL CALI</div>
        <h1 style="font-size:24px;line-height:1.25;color:#5A1E2D;margin:0 0 14px">Olá, ${esc(name.split(" ")[0])}. Seu relatório está pronto.</h1>
        <p style="font-size:15px;line-height:1.65;margin:0 0 18px">Obrigada por responder. Seu resultado: <strong>${profile}</strong>.</p>
        <div style="margin:0 0 22px;padding:16px 18px;border:1px solid #E8DDD4;border-left:4px solid #5A1E2D;border-radius:12px;background:#FBF7F3;font-size:14px;line-height:1.6">${esc(p.line)}</div>
        <p style="font-size:14px;line-height:1.65;margin:0 0 22px">O seu relatório completo está em anexo, em PDF. Guarde este e-mail: ele é a sua cópia.</p>
        <p style="font-size:12px;line-height:1.6;color:#8C807A;margin:0">Autoavaliação de preferências comportamentais de trabalho. Não é avaliação psicológica, não mede competência e não serve de base isolada para decisão de contratação. O resultado descreve como você se posiciona hoje e vale como leitura atual por 6 meses. Dúvidas, revisão ou exclusão dos seus dados: privacidade@calirh.com.</p>
      </td></tr>
      <tr><td style="padding:16px 30px;border-top:1px solid #EFE6DF;font-size:11px;color:#8C807A">E-mail automático da CALI RH. Não responda esta mensagem.</td></tr>
    </table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers });
  const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "cali_workspace" }, auth: { persistSession: false } });
  let activeDelivery: { resultId: string; lease: string } | null = null;
  let providerAccepted = false;
  try {
    const provided = req.headers.get("x-workspace-hook") ?? "";
    const { data: secretRow } = await ws.from("runtime_secrets").select("secret_value").eq("secret_key", "notification_email_hook").maybeSingle();
    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });
    const { result_id } = await req.json().catch(() => ({}));
    if (!result_id) return new Response(JSON.stringify({ ok: false, error: "missing result_id" }), { status: 400, headers });
    const { data: row } = await ws.from("profile_results")
      .select("id,person_name,email,company_name,protocol,created_at,primary_style,secondary_style,mixed,report_path,report_emailed_at,companies(display_name),profile_links(title,company_label)")
      .eq("id", result_id).maybeSingle().overrideTypes<ProfileResult, { merge: false }>();
    if (!row) return new Response(JSON.stringify({ ok: false, error: "not found" }), { status: 404, headers });
    if (row.report_emailed_at) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
    const { data: rawClaim, error: claimError } = await ws.rpc("cali_profile_claim_report", { p_result_id: row.id });
    if (claimError) return new Response(JSON.stringify({ ok: false, error: "claim unavailable" }), { status: 503, headers });
    if (!rawClaim) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
    const claim = rawClaim as Claim;
    activeDelivery = { resultId: row.id, lease: claim.lease };

    const bucket = ws.storage.from("cali-profiles");
    let reportPath = row.report_path;
    if (!reportPath) {
      const company = row.companies;
      const link = row.profile_links;
      const primary = row.primary_style;
      const secondary = row.secondary_style;
      if (!Object.hasOwn(NAMES, primary) || !Object.hasOwn(NAMES, secondary) || !row.protocol) {
        return new Response(JSON.stringify({ ok: false, error: "result unavailable" }), { status: 422, headers });
      }
      const [avatar, signature] = await Promise.all([
        signerImage(claim.signer?.avatar_url), signerImage(claim.signer?.signature_url),
      ]);
      const pdf = await createRespondentPdf({
        title: link?.title || "Perfil Comportamental CALI",
        organization: company?.display_name || row.company_name || link?.company_label || "CALI RH",
        protocol: row.protocol, createdAt: row.created_at, personName: row.person_name,
        primary, secondary, mixed: row.mixed, signer: claim.signer, avatar, signature,
      });
      reportPath = `${row.id}/perfil-comportamental.pdf`;
      const upload = await bucket.upload(reportPath, pdf, { contentType: "application/pdf", upsert: false });
      if (upload.error && !(await bucket.download(reportPath)).data) {
        return new Response(JSON.stringify({ ok: false, error: "archive unavailable" }), { status: 503, headers });
      }
      const { data: archived, error: archiveError } = await ws.from("profile_results")
        .update({ report_path: reportPath }).eq("id", row.id).is("report_path", null).select("id").maybeSingle();
      if (archiveError || !archived) return new Response(JSON.stringify({ ok: false, error: "archive unavailable" }), { status: 503, headers });
    }
    const file = await bucket.download(reportPath);
    if (file.error || !file.data) return new Response(JSON.stringify({ ok: false, error: "pdf" }), { status: 500, headers });
    const content = encodeBase64(new Uint8Array(await file.data.arrayBuffer()));
    if (!emailDestinationsAllowed([row.email])) return Response.json({ ok: false, error: "destination_not_allowed" }, { status: 403, headers });
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cali-profile-report/${row.id}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [row.email], reply_to: REPLY_TO,
        subject: "Seu Perfil Comportamental CALI",
        html: html(row.person_name, row.primary_style, row.secondary_style, row.mixed),
        attachments: [{ filename: `perfil-comportamental-cali-${slug(row.person_name)}.pdf`, content }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!sent.ok) return new Response(JSON.stringify({ ok: false, error: `resend ${sent.status}` }), { status: 502, headers });
    providerAccepted = true;
    const { data: finished, error: finishError } = await ws.rpc("cali_profile_finish_report", {
      p_result_id: row.id, p_lease: claim.lease, p_sent: true,
    });
    if (finishError || !finished) return new Response(JSON.stringify({ ok: false, error: "receipt unavailable" }), { status: 503, headers });
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "error" }), { status: 500, headers });
  } finally {
    if (activeDelivery && !providerAccepted) {
      await ws.rpc("cali_profile_finish_report", {
        p_result_id: activeDelivery.resultId, p_lease: activeDelivery.lease, p_sent: false,
      }).then(() => undefined, () => undefined);
    }
  }
});
