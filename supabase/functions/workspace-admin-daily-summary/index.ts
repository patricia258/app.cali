import { deliveryAppOrigin, emailDestinationsAllowed } from "../_shared/delivery-environment.ts";
// Resumo diário da administradora: um e-mail por dia, às 19h de Brasília, com o que aconteceu no dia, por cliente.
// Fonte: os avisos gravados no dia (o que o cliente fez e o que a CALI fez/avisou) e as horas registradas no dia.
// Chamado só pela rotina do banco, com o segredo "notification_email_hook". Não altera nenhum dado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { buildDailySummary, summaryIdempotencyKey, summaryWindow } from "./summary.ts";
import { summaryHtml } from "./presentation.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "APP CALI RH <workspace@calirh.com>";
const REPLY_TO = "nao-responda@calirh.com";
const APP_URL = deliveryAppOrigin;
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

async function readPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await read(offset, offset + size - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < size) return rows;
  }
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
    const scheduled = source === "daily_cron";
    const now = new Date();
    const manualRunId = scheduled ? undefined : crypto.randomUUID();
    const { day, startsAt, endsAt, tooEarly } = summaryWindow(now, scheduled);
    if (tooEarly) return Response.json({ ok: true, skipped: "before_cutoff" }, { headers });
    const [notices, profiles, companies, hours] = await Promise.all([
      readPages((first, last) => ws.from("notifications")
        .select("id,user_id,company_id,notification_type,title,body,action_url,entity_type,entity_id,created_at")
        .gte("created_at", startsAt).lte("created_at", endsAt)
        .order("created_at", { ascending: false }).order("id").range(first, last)),
      readPages((first, last) => ws.from("profiles").select("id,role,company_id,email,active").order("id").range(first, last)),
      readPages((first, last) => ws.from("companies").select("id,display_name").order("id").range(first, last)),
      readPages((first, last) => ws.from("hour_entries").select("id,company_id,minutes").eq("work_date", day)
        .lte("created_at", endsAt).order("id").range(first, last)),
    ]);
    const { ordered, totals, admins } = buildDailySummary(notices, profiles, companies, hours, APP_URL);
    if (!ordered.length) return new Response(JSON.stringify({ ok: true, skipped: "no_activity" }), { headers });
    const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(now);
    const html = summaryHtml(APP_URL, dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), ordered, totals);

    const destinations = admins.filter((admin) => emailDestinationsAllowed([String(admin.email)]));
    const deliveries = await Promise.allSettled(destinations.map(async (admin) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": summaryIdempotencyKey(admin.id, day, manualRunId),
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [String(admin.email).trim().toLowerCase()], reply_to: REPLY_TO, subject: `CALI Workspace · Resumo do dia · ${day.split("-").reverse().join("/")}`, html }),
      });
      const receipt = await response.json().catch(() => null);
      if (!response.ok || typeof receipt?.id !== "string" || !receipt.id) throw new Error(`E-mail sem confirmação (${response.status}).`);
    }));
    const failures = deliveries.filter((delivery) => delivery.status === "rejected");
    if (failures.length) {
      console.error("admin summary send failed", failures.length);
      return Response.json({ ok: false, recipients: deliveries.length - failures.length, failed: failures.length }, { status: 502, headers });
    }
    return Response.json({ ok: true, recipients: deliveries.length, companies: ordered.length, totals }, { headers });
  } catch (error) {
    console.error("workspace-admin-daily-summary", error);
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown_error" }), { status: 500, headers });
  }
});
