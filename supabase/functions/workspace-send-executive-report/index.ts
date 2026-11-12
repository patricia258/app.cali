import type { JsonValue } from '../_shared/json.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  appOrigin, approvedRecipients, deliveryAdmin, deliveryPreflight, DeliveryError,
  emailResponse, emailUuid, failureResponse, sendMaterialEmail,
} from "../_shared/material-email.ts";

const APP_BASE = appOrigin;
const APP_URL = `${APP_BASE}/cliente/relatorios`;
const LOGO_URL = `${APP_BASE}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_BASE}/brand/cali-oak-mark-light.svg`;

function esc(value: JsonValue | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function monthLabel(start: string) {
  const [year, month] = start.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateOnly(value: JsonValue | undefined) {
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

function html(period: string, message: string, reportId: string) {
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
        <p style="font-size:12px;color:#8C807A;margin:0"><strong>APP CALI Workspace</strong></p>
        <p style="font-size:12px;line-height:1.6;color:#8C807A;margin:8px 0 0">E-mail automático. Não responda a esta mensagem. Para falar com a CALI, acesse o <a href="${APP_BASE}" style="color:#5A1E2D;text-decoration:underline">Workspace</a>.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  const preflight = deliveryPreflight(req);
  if (preflight) return preflight;
  try {
    const { db, workspace, user } = await deliveryAdmin(req);
    const input = await req.json().catch(() => ({}));
    const reportId = emailUuid(input.report_id);
    const requestId = emailUuid(input.request_id);
    const { data: report, error } = await workspace.from("reports")
      .select("id,company_id,title,report_type,period_start,period_end,status,version")
      .eq("id", reportId).maybeSingle();
    if (error || !report) throw new DeliveryError(404, "Relatório indisponível.");
    if (!["approved", "sent", "published"].includes(report.status)) {
      throw new DeliveryError(409, "Apenas relatórios aprovados podem ser enviados.");
    }
    if (input.version !== report.version) throw new DeliveryError(409, "A versão do relatório mudou. Reabra o relatório antes de enviar.");
    const [{ data: company }, { data: profiles }, { data: existingOfficial }] = await Promise.all([
      workspace.from("companies").select("display_name,start_date,status").eq("id", report.company_id).maybeSingle(),
      workspace.from("profiles").select("email").eq("company_id", report.company_id).eq("role", "client").eq("active", true),
      workspace.from("reports").select("id").eq("company_id", report.company_id).eq("report_type", report.report_type)
        .eq("period_start", report.period_start).eq("period_end", report.period_end)
        .in("status", ["sent", "published"]).neq("id", report.id).limit(1).maybeSingle(),
    ]);
    if (!company || !["active", "paused"].includes(company.status)) throw new DeliveryError(409, "Empresa indisponível.");
    if (existingOfficial) throw new DeliveryError(409, "Já existe um fechamento oficial nesta competência.");
    if (report.report_type === "monthly" && company.display_name !== "CALI · Ambiente de Teste") {
      const start = dateOnly(report.period_start);
      const end = dateOnly(report.period_end);
      const companyStart = dateOnly(company.start_date);
      const today = new Date().toISOString().slice(0, 10);
      const collected = inclusiveDays(companyStart && companyStart > start ? companyStart : start, today < end ? today : end);
      if (collected < 20) throw new DeliveryError(409, `O fechamento ainda tem ${collected} de 20 dias mínimos de coleta.`);
    }
    const members = (profiles ?? []).map((row) => String(row.email).trim().toLowerCase());
    const supplied = Array.isArray(input.recipients) ? input.recipients.map(String) : [];
    const to = approvedRecipients(supplied.length ? supplied : members);
    if (!to.every((email) => members.includes(email))) {
      throw new DeliveryError(403, "Use endereços de acessos ativos da empresa.");
    }
    const message = String(input.message ?? "").trim().slice(0, 2000);
    const period = monthLabel(String(report.period_start));
    const provider = await sendMaterialEmail(db, {
      kind: "report", entityId: report.id, companyId: report.company_id, version: report.version,
      userId: user.id, requestId, recipients: to,
      subject: subject(company.display_name, period), html: html(period, message, report.id),
    });
    return emailResponse(req, { ok: true, email_id: provider, to, status: "sent" });
  } catch (error) {
    return failureResponse(req, error instanceof DeliveryError ? error : null);
  }
});
