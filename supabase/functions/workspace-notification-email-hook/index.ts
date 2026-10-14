import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { renderApprovedClientEmail } from "./approved-client-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "APP CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = "https://app.calirh.com";
const LOGO_URL = `${APP_URL}/brand/cali-workspace-transparent.svg`;
const MARK_URL = `${APP_URL}/brand/cali-oak-mark-light.svg`;
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

function html(title: string, body: string, url: string, company: string, context?: { protocol?: string; type?: string; subject?: string }) {
  const contextBlock = context ? `<div style="margin:0 0 22px;padding:14px 16px;border:1px solid #E8DDD4;border-radius:12px;background:#FBF7F3">
    <div style="font-size:10px;color:#8C807A;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">${esc(company)}${context.type ? ` · ${esc(context.type)}` : ""}</div>
    ${context.protocol ? `<div style="font-size:11px;color:#B58C52;font-weight:700;margin-bottom:4px">${esc(context.protocol)}</div>` : ""}
    ${context.subject ? `<div style="font-size:14px;color:#2B2B2B;font-weight:700;line-height:1.4">${esc(context.subject)}</div>` : ""}
  </div>` : "";
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;border-bottom:1px solid #6A2838;background:#5A1E2D">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" valign="middle"><img src="${LOGO_URL}" alt="CALI Workspace" width="122" style="display:block;width:122px;max-width:122px;height:auto"></td>
          <td align="right" valign="middle"><img src="${MARK_URL}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain"></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">ATUALIZAÇÃO DO WORKSPACE</div>
        <h1 style="font-family:Georgia,serif;font-size:25px;line-height:1.25;font-weight:400;color:#5A1E2D;margin:0 0 14px">${esc(title)}</h1>
        ${contextBlock}
        ${body ? `<p style="font-size:15px;line-height:1.65;margin:0 0 24px">${esc(body)}</p>` : ""}
        <div style="text-align:center;margin:0 0 24px"><a href="${esc(url)}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir no Workspace</a></div>
        <div style="height:1px;background:#EAE1D8;margin-bottom:18px"></div>
        <p style="font-size:12px;color:#8C807A;margin:0">CALI Workspace · Patrícia Lima · People Advisory Executive</p>
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

    const payload = await req.json().catch(() => ({}));
    const notificationId = String(payload?.notification_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(notificationId)) return new Response(JSON.stringify({ ok: false, error: "invalid_notification" }), { status: 400, headers });

    const { data: notification, error: notificationError } = await ws.from("notifications")
      .select("id,user_id,company_id,title,body,action_url,relevance,email_required,emailed_at,entity_type,entity_id,notification_type")
      .eq("id", notificationId).maybeSingle();
    if (notificationError) throw notificationError;
    if (!notification) return new Response(JSON.stringify({ ok: false, error: "notification_not_found" }), { status: 404, headers });
    if (!notification.email_required || notification.emailed_at) return new Response(JSON.stringify({ ok: true, skipped: notification.emailed_at ? "already_sent" : "not_required" }), { headers });

    const [{ data: profile, error: profileError }, { data: company }] = await Promise.all([
      ws.from("profiles").select("email,full_name,role,active").eq("id", notification.user_id).maybeSingle(),
      ws.from("companies").select("display_name").eq("id", notification.company_id).maybeSingle(),
    ]);
    if (profileError) throw profileError;
    if (!profile?.active || !profile.email) return new Response(JSON.stringify({ ok: true, skipped: "recipient_unavailable" }), { headers });

    let context: { protocol?: string; type?: string; subject?: string } | undefined;
    if (notification.entity_type === "account_record" && notification.entity_id) {
      const { data: record } = await ws.from("account_records").select("protocol,title,record_type").eq("id", notification.entity_id).maybeSingle();
      if (record) context = { protocol: record.protocol || undefined, type: typeLabel[record.record_type] || "Solicitação", subject: record.title || undefined };
    }
    const companyName = company?.display_name || "Conta CALI";
    const url = notification.action_url && String(notification.action_url).startsWith("/") ? `${APP_URL}${notification.action_url}` : APP_URL;
    const subjectParts = ["CALI Workspace", companyName];
    if (context?.type) subjectParts.push(context.type);
    subjectParts.push(notification.title);
    const subject = subjectParts.join(" · ");
    // Somente eventos com correspondência CONFIRMADA usam HTML aprovado.
    // Outros eventos, especialmente os administrativos, preservam integralmente o envio anterior.
    let outgoingSubject = subject;
    let outgoingHtml = html(notification.title, notification.body || "", url, companyName, context);
    if (profile.role === "client") {
      const type = String(notification.notification_type || "");
      const notificationTitle = String(notification.title || "");
      let template: "schedule" | "schedule_reminder" | "project_complete" | "project_cancel" | "deliverable_review" | "task_review" | "client_dependency" | null = null;
      if (type === "project_schedule_review" || (type === "project" && notificationTitle === "Planejamento para sua validação")) template = "schedule";
      else if (type === "project_schedule_reminder") template = "schedule_reminder";
      else if ((type === "project_lifecycle" && notificationTitle === "Execução cancelada" && String(notification.body || "").startsWith("Projeto ")) || (type === "project" && notificationTitle === "Projeto cancelado")) template = "project_cancel";
      else if ((type === "project" || type === "project_status") && notificationTitle === "Projeto concluído") template = "project_complete";
      else if (type === "deliverable_status" && notificationTitle === "Sua validação é necessária") template = "deliverable_review";
      else if (type === "task_client_review" && notificationTitle === "Uma parte da entrega aguarda a sua aprovação") template = "task_review";
      else if (type === "client_dependency" && notificationTitle === "A CALI precisa de um retorno seu") template = "client_dependency";

      if (template && notification.entity_id) {
        try {
          const firstname = String(profile.full_name || "").trim().split(/\s+/)[0] || "você";
          const fields: Record<string, string> = {
            nome_do_cliente: firstname,
            empresa: companyName,
            link: url,
            logo_workspace_url: LOGO_URL,
            carvalho_url: MARK_URL,
          };
          // Os dois eventos guardam o ID do ENTREGÁVEL, não da subtarefa/dependência.
          // Só usar o HTML personalizado quando os detalhes baterem EXATAMENTE com
          // um único registro real; nunca adivinhar qual item originou o aviso.
          if (template === "task_review") {
            const { data: tasks, error: taskError } = await ws.from("deliverable_tasks")
              .select("id,title").eq("deliverable_id", notification.entity_id)
              .eq("company_id", notification.company_id)
              .eq("status", "client_review").eq("client_visible", true);
            if (taskError) throw taskError;
            const matching = (tasks || []).filter((t) =>
              (`“${t.title}” está pronta para você aprovar ou pedir ajuste.`).slice(0, 420) === notification.body
            );
            if (matching.length !== 1) throw new Error("Não foi possível identificar uma única subtarefa para o aviso.");
            fields.subtarefa = String(matching[0].title);
          } else if (template === "client_dependency") {
            const [{ data: dependencies, error: dependencyError }, { data: delivery, error: deliveryError }] = await Promise.all([
              ws.from("deliverable_client_dependencies").select("id,title,due_date")
                .eq("deliverable_id", notification.entity_id).eq("company_id", notification.company_id)
                .eq("status", "pending"),
              ws.from("deliverables").select("title")
                .eq("id", notification.entity_id).eq("company_id", notification.company_id).maybeSingle(),
            ]);
            if (dependencyError) throw dependencyError;
            if (deliveryError) throw deliveryError;
            if (!delivery?.title) throw new Error("Entregável da dependência não encontrado.");
            const dueBR = (iso: string) => {
              const parts = String(iso).split("-");
              if (parts.length !== 3) throw new Error("Data da dependência inválida.");
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            };
            const matching = (dependencies || []).filter((d) =>
              (`“${d.title}” até ${dueBR(d.due_date)}, para a entrega “${delivery.title}”.`).slice(0, 420) === notification.body
            );
            if (matching.length !== 1) throw new Error("Não foi possível identificar uma única dependência para o aviso.");
            fields.pendencia = String(matching[0].title);
            fields.entregavel = String(delivery.title);
            fields.prazo = dueBR(matching[0].due_date);
          } else if (template === "deliverable_review") {
            const { data: item, error: itemError } = await ws.from("deliverables").select("title").eq("id", notification.entity_id).eq("company_id", notification.company_id).maybeSingle();
            if (itemError) throw itemError;
            if (!item?.title) throw new Error("Entregável ausente para modelo de validação.");
            fields.entregavel = String(item.title);
          } else {
            const { data: project, error: projectError } = await ws.from("projects").select("name").eq("id", notification.entity_id).eq("company_id", notification.company_id).maybeSingle();
            if (projectError) throw projectError;
            if (!project?.name) throw new Error("Projeto ausente para modelo aprovado.");
            fields.projeto = String(project.name);
            fields.titulo_cronograma = "Cronograma de " + String(project.name);
          }
          outgoingHtml = renderApprovedClientEmail(template, fields);
          const titles: Record<string, string> = {
            schedule: "Cronograma para validação",
            schedule_reminder: "Cronograma aguardando validação",
            project_complete: "Projeto concluído!",
            project_cancel: "Atualização no planejamento",
            deliverable_review: "Entrega para validação",
            task_review: "Etapa para sua aprovação",
            client_dependency: "Precisamos de um retorno seu",
          };
          outgoingSubject = ["APP CALI RH", companyName, titles[template]].join(" · ");
        } catch (templateError) {
          // O envio original permanece disponível mesmo em caso de falha de dados do modelo.
          console.error("workspace-notification-email-hook approved template fallback", templateError);
        }
      }
    }


    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-notification-${notification.id}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [String(profile.email).trim().toLowerCase()], reply_to: REPLY_TO, subject: outgoingSubject, html: outgoingHtml }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Resend ${response.status}: ${text}`);
    await ws.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", notification.id).is("emailed_at", null);
    return new Response(JSON.stringify({ ok: true, to: profile.email, subject: outgoingSubject }), { headers });
  } catch (error) {
    console.error("workspace-notification-email-hook", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers });
  }
});