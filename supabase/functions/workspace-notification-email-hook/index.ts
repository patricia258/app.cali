import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { renderApprovedClientEmail } from "./approved-client-templates.ts";
import { extraEmailFields } from "./extra-email-fields.ts";
import { cancelledVisitFields } from "./extra-cancellation-fields.ts";
import { cancelledCalendarExtraFields, applyCancellationTerms } from "./calendar-extra-cancellation.ts";
import { approvedClientContext } from "./approved-client-context.ts";

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
        <p style="font-size:12px;color:#8C807A;margin:0"><strong>APP CALI Workspace</strong></p>
        <p style="font-size:12px;line-height:1.6;color:#8C807A;margin:8px 0 0">E-mail automático. Não responda a esta mensagem. Para falar com a CALI, acesse o <a href="${APP_URL}" style="color:#5A1E2D;text-decoration:underline">Workspace</a>.</p>
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
      .select("id,user_id,company_id,title,body,action_url,relevance,email_required,emailed_at,entity_type,entity_id,notification_type,created_at")
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
      let template: "schedule" | "schedule_reminder" | "project_complete" | "project_cancel" | "deliverable_review" | "task_review" | "client_dependency" | "document_ack" | "presential_extra_request_received" | "online_extra_request_received" | "presential_extra_confirmed" | "online_extra_confirmed" | "extra_new_dates" | "extra_reschedule_requested" | "presential_extra_cancelled" | "presential_extra_rescheduled" | "record_status" | "record_reopen_decision" | "team_month_update" | "chat_mention" | "deliverable_rebriefing" | "deliverable_cancelled" | null = null;
      if (type === "project_schedule_review" || (type === "project" && notificationTitle === "Planejamento para sua validação")) template = "schedule";
      else if (type === "project_schedule_reminder") template = "schedule_reminder";
      else if ((type === "project_lifecycle" && notificationTitle === "Execução cancelada" && String(notification.body || "").startsWith("Projeto ")) || (type === "project" && notificationTitle === "Projeto cancelado")) template = "project_cancel";
      else if ((type === "project" || type === "project_status") && notificationTitle === "Projeto concluído") template = "project_complete";
      else if (type === "deliverable_status" && notificationTitle === "Sua validação é necessária") template = "deliverable_review";
      else if (type === "deliverable_status" && notification.entity_type === "deliverable" &&
               notificationTitle === "Rebriefing necessário") template = "deliverable_rebriefing";
      else if (type === "deliverable_status" && notification.entity_type === "deliverable" &&
               notificationTitle === "Entregável cancelado") template = "deliverable_cancelled";
      else if (type === "task_client_review" && notificationTitle === "Uma parte da entrega aguarda a sua aprovação") template = "task_review";
      else if (type === "client_dependency" && notificationTitle === "A CALI precisa de um retorno seu") template = "client_dependency";
      else if (type === "document" && notificationTitle === "Documento final disponível" && notification.entity_type === "file") template = "document_ack";
      else if (type === "scheduling_extra_request_receipt" &&
               notification.entity_type === "scheduling_request" &&
               notificationTitle === "Pedido de visita presencial extra recebido") template = "presential_extra_request_received";
      else if (type === "scheduling_extra_request_receipt" &&
               notification.entity_type === "scheduling_request" &&
               notificationTitle === "Pedido de reunião online extra recebido") template = "online_extra_request_received";
      else if (type === "scheduling_extra_confirmed" && notification.entity_type === "scheduling_request" && notificationTitle === "Visita presencial extra confirmada") template = "presential_extra_confirmed";
      else if (type === "scheduling_extra_confirmed" && notification.entity_type === "scheduling_request" && notificationTitle === "Reunião online extra confirmada") template = "online_extra_confirmed";
      else if ((type === "scheduling_extra_new_dates" || (type === "scheduling_response" && ["A CALI respondeu sua solicitação","Novas datas para sua visita extra"].includes(notificationTitle))) && notification.entity_type === "scheduling_request") template = "extra_new_dates";
      else if (type === "scheduling_extra_reschedule_requested" && notification.entity_type === "scheduling_request") template = "extra_reschedule_requested";
      else if (type === "scheduling_extra_cancelled" && notification.entity_type === "scheduling_request" && notificationTitle === "Visita extra cancelada") template = "presential_extra_cancelled";
      else if (type === "calendar_update" && notification.entity_type === "event" && notificationTitle === "Evento cancelado") template = "presential_extra_cancelled";
      else if (type === "record_status" && notification.entity_type === "account_record" && notificationTitle === "Atualização na sua solicitação") template = "record_status";
      else if (type === "record_reopen_decision" && notification.entity_type === "account_record" &&
               ["Reabertura aprovada","Pedido de reabertura analisado"].includes(notificationTitle)) template = "record_reopen_decision";
      else if (type === "team_month_update" && notification.entity_type === "team_month" && notificationTitle === "Hora de atualizar a equipe") template = "team_month_update";
      else if (type === "chat_mention" && notificationTitle.endsWith(" mencionou você")) template = "chat_mention";

      if (template && (notification.entity_id || template === "team_month_update")) {
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
          let safeHtmlBlocks: { bloco_observacoes?: string } = {};
          let calendarExtraTimely: boolean | null = null;
          if (template === "deliverable_rebriefing" || template === "deliverable_cancelled") {
            const { data: item, error: itemError } = await ws.from("deliverables")
              .select("id,title,status,client_visible,cancellation_reason")
              .eq("id", notification.entity_id).eq("company_id", notification.company_id).maybeSingle();
            if (itemError) throw itemError;
            const required = template === "deliverable_rebriefing" ? "rebriefing" : "cancelled";
            if (!item?.title || !item.client_visible || item.status !== required) {
              throw new Error("Entregável não corresponde ao evento comunicado.");
            }
            const expectedPrefix = String(item.title) + " · ";
            if (!String(notification.body || "").startsWith(expectedPrefix)) {
              throw new Error("A notificação não corresponde ao título do entregável.");
            }
            fields.entregavel = String(item.title);
            if (template === "deliverable_cancelled") {
              const reason = String(item.cancellation_reason || "").trim();
              if (!reason) throw new Error("Motivo de cancelamento não registrado.");
              fields.motivo = reason;
            }
          } else if (template === "record_status" || template === "record_reopen_decision" || template === "team_month_update" || template === "chat_mention") {
            Object.assign(fields, await approvedClientContext(ws, notification, template));
          } else if (template === "presential_extra_cancelled") {
            if (notification.entity_type === "event") {
              const result = await cancelledCalendarExtraFields(ws, notification);
              Object.assign(fields, result.fields);
              calendarExtraTimely = result.timely;
            } else {
              Object.assign(fields, await cancelledVisitFields(ws, notification));
            }
          } else if (template === "extra_new_dates" || template === "extra_reschedule_requested") {
            const result = await extraEmailFields(ws, notification, template);
            Object.assign(fields, result.fields);
            Object.assign(safeHtmlBlocks, result.blocks);
          } else if (template === "presential_extra_confirmed" || template === "online_extra_confirmed") {
            const { data: request, error: requestError } = await ws.from("scheduling_requests")
              .select("id,company_id,requested_by,status,confirmed_event_id,selected_slot,request_mode,title,location,extra_visit,extra_visit_fee_cents,online_extra_requested,online_extra_quote_cents,online_extra_quote_accepted_at,extra_visit_change_kind,extra_visit_change_was_confirmed,extra_visit_previous_slot")
              .eq("id", notification.entity_id).eq("company_id", notification.company_id)
              .eq("requested_by", notification.user_id).maybeSingle();
            if (requestError) throw requestError;
            if (!request || request.status !== "confirmed" || !request.confirmed_event_id ||
                !request.selected_slot?.startsAt || !request.selected_slot?.endsAt) {
              throw new Error("Agendamento extra ainda não confirmado ou sem horário final.");
            }
            const onSite = template === "presential_extra_confirmed";
            if (onSite && (!request.extra_visit || request.request_mode !== "in_person" ||
                request.extra_visit_fee_cents !== 80000 || !String(request.location || "").trim())) {
              throw new Error("Visita presencial extra incompleta.");
            }
            if (!onSite && (!request.online_extra_requested || request.request_mode !== "remote" ||
                !request.online_extra_quote_accepted_at)) {
              throw new Error("Reunião extra sem valor aceito.");
            }
            const start = Date.parse(String(request.selected_slot.startsAt));
            const end = Date.parse(String(request.selected_slot.endsAt));
            const minutes = Math.round((end - start) / 60000);
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
                (onSite && minutes !== 240) || (!onSite && ![60, 90].includes(minutes))) {
              throw new Error("Duração ou horário confirmado incorreto.");
            }
            const { data: event, error: eventError } = await ws.from("events")
              .select("id,starts_at,ends_at,source_entity_id").eq("id", request.confirmed_event_id)
              .eq("company_id", notification.company_id).maybeSingle();
            if (eventError) throw eventError;
            if (!event || event.source_entity_id !== request.id ||
                Date.parse(String(event.starts_at)) !== start ||
                Date.parse(String(event.ends_at)) !== end) {
              throw new Error("Evento na agenda não corresponde ao horário confirmado.");
            }
            const zone = "America/Sao_Paulo";
            const dateFormatter = new Intl.DateTimeFormat("pt-BR",
              { timeZone: zone, weekday: "long", day: "2-digit", month: "long", year: "numeric" });
            const timeFormatter = new Intl.DateTimeFormat("pt-BR",
              { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false });
            fields.assunto = String(request.title);
            fields.data = dateFormatter.format(new Date(start));
            fields.horario_inicio = timeFormatter.format(new Date(start));
            fields.horario_fim = timeFormatter.format(new Date(end));
            if (onSite) {
              fields.endereco = String(request.location);
              // Uma visita reagendada que foi efetivamente reconfirmada usa
              // o modelo próprio, sem disparar um segundo aviso de confirmação.
              if (request.extra_visit_change_kind === "reschedule" &&
                  request.extra_visit_change_was_confirmed === true &&
                  request.extra_visit_previous_slot?.startsAt) {
                const prior = Date.parse(String(request.extra_visit_previous_slot.startsAt));
                if (!Number.isFinite(prior)) throw new Error("Data anterior do reagendamento inválida.");
                fields.data_anterior = dateFormatter.format(new Date(prior));
                fields.nova_data = fields.data;
                template = "presential_extra_rescheduled";
              }
            } else {
              const cents = minutes === 60 ? 20000 : 30000;
              if (request.online_extra_quote_cents !== cents) {
                throw new Error("Valor fixo do encontro não corresponde à duração.");
              }
              fields.duracao = minutes === 60 ? "1 hora" : "1h30";
              fields.valor = cents === 20000 ? "R$ 200,00" : "R$ 300,00";
            }
          } else if (template === "presential_extra_request_received" || template === "online_extra_request_received") {
            // A solicitação deve ser da mesma empresa e do próprio destinatário.
            // Nunca combinar dados de duas solicitações ou usar preços não gravados.
            const { data: request, error: requestError } = await ws.from("scheduling_requests")
              .select("company_id,requested_by,title,purpose,location,request_mode,requested_slots,extra_visit,extra_visit_fee_cents,extra_visit_ack_name,online_extra_requested,online_extra_quote_cents,online_extra_quote_accepted_at,online_extra_request_ack_name")
              .eq("id", notification.entity_id).eq("company_id", notification.company_id)
              .eq("requested_by", notification.user_id).maybeSingle();
            if (requestError) throw requestError;
            if (!request || !Array.isArray(request.requested_slots) ||
                request.requested_slots.length !== 2 || !request.title) {
              throw new Error("Pedido extra indisponível ou com datas incompletas.");
            }
            const onSite = template === "presential_extra_request_received";
            if (onSite && (!request.extra_visit || request.request_mode !== "in_person" ||
                request.extra_visit_fee_cents !== 80000 || !request.extra_visit_ack_name)) {
              throw new Error("Visita extra sem condições aceitas.");
            }
            if (!onSite && (!request.online_extra_requested || request.request_mode !== "remote" ||
                !request.online_extra_request_ack_name || !request.online_extra_quote_accepted_at)) {
              throw new Error("Reunião extra sem preço fixo aceito.");
            }
            const pairs = request.requested_slots.map((slot: {startsAt?:string;endsAt?:string}) => {
              const start = Date.parse(String(slot?.startsAt || ""));
              const end = Date.parse(String(slot?.endsAt || ""));
              if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
                throw new Error("Datas de reunião inválidas.");
              return {start,minutes:Math.round((end-start)/60000)};
            });
            if (pairs[0].minutes !== pairs[1].minutes) throw new Error("Durações inconsistentes.");
            const duration = pairs[0].minutes;
            if (onSite && duration !== 240) throw new Error("Visita extra com duração diferente de 4 horas.");
            if (!onSite && duration !== 60 && duration !== 90) throw new Error("Reunião extra sem duração tabelada.");
            const formatter = new Intl.DateTimeFormat("pt-BR", {
              timeZone:"America/Sao_Paulo", weekday:"long", day:"2-digit", month:"long",
              year:"numeric", hour:"2-digit",minute:"2-digit",
            });
            fields.data_opcao_1 = formatter.format(new Date(pairs[0].start));
            fields.data_opcao_2 = formatter.format(new Date(pairs[1].start));
            fields.duracao = duration === 240 ? "Até 4 horas" : duration === 60 ? "1 hora" : "1h30";
            fields.assunto = String(request.title);
            fields.objetivo = String(request.purpose || "").trim() || "Não informado";
            fields.nome_solicitante = String(onSite ? request.extra_visit_ack_name : request.online_extra_request_ack_name);
            if (!onSite) {
              const amount = duration === 60 ? 20000 : 30000;
              if (request.online_extra_quote_cents !== amount)
                throw new Error("Preço salvo não corresponde à duração escolhida.");
              fields.valor = amount === 20000 ? "R$ 200,00" : "R$ 300,00";
            }
            // O endereço é dado adicional do formulário presencial, mas o modelo
            // aprovado não possui um marcador próprio. Usar bloco opcional controlado.
            const location = String(onSite ? request.location || "" : "").trim();
            safeHtmlBlocks.bloco_observacoes = location
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="padding:10px 14px;background:#F7F3EE;border:1px solid #E8DDD4"><strong style="color:#5A1E2D;font:700 11px/18px Arial,Helvetica,sans-serif">ENDEREÇO INFORMADO</strong><p style="margin:5px 0 0;color:#2B2B2B;font:13px/20px Arial,Helvetica,sans-serif">${esc(location)}</p></td></tr></table>`
              : "";
          } else if (template === "document_ack") {
            // Somente arquivos que EXIGEM ciência recebem o modelo de confirmação.
            // A notificação e o requisito devem existir; não criamos novos disparos.
            const { data: file, error: fileError } = await ws.from("files")
              .select("title,requires_acknowledgement,client_visible,status")
              .eq("id", notification.entity_id).eq("company_id", notification.company_id).maybeSingle();
            if (fileError) throw fileError;
            if (!file?.requires_acknowledgement || !file.client_visible ||
                file.status !== "published" || !file.title) {
              throw new Error("Documento não elegível para solicitação de ciência.");
            }
            fields.documento = String(file.title);
          } else if (template === "task_review") {
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
          outgoingHtml = renderApprovedClientEmail(template, fields, safeHtmlBlocks);
          if (calendarExtraTimely !== null) outgoingHtml = applyCancellationTerms(outgoingHtml, calendarExtraTimely);
          const titles: Record<string, string> = {
            schedule: "Cronograma para validação",
            schedule_reminder: "Cronograma aguardando validação",
            project_complete: "Projeto concluído!",
            project_cancel: "Atualização no planejamento",
            deliverable_review: "Entrega para validação",
            deliverable_rebriefing: "Entrega em rebriefing",
            deliverable_cancelled: "Entrega cancelada",
            task_review: "Etapa para sua aprovação",
            client_dependency: "Precisamos de um retorno seu",
            document_ack: "Documento para sua ciência",
            presential_extra_request_received: "Pedido de visita extra recebido",
            online_extra_request_received: "Pedido de reunião online extra recebido",
            presential_extra_confirmed: "Visita extra confirmada",
            online_extra_confirmed: "Reunião online extra confirmada",
            presential_extra_cancelled: "Visita extra cancelada",
            presential_extra_rescheduled: "Nova data da visita extra confirmada",
            record_status: "Atualização na ocorrência",
            record_reopen_decision: "Resposta sobre reabertura",
            team_month_update: "Revisão mensal da equipe",
            chat_mention: fields.autor + " mencionou você",
            extra_new_dates: "Novos horários para seu atendimento extra",
            extra_reschedule_requested: "Pedido de reagendamento da visita extra",
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