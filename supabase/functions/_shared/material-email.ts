import { createClient } from "npm:@supabase/supabase-js@2.112.3";

import { deliveryAppOrigin, emailDestinationsAllowed } from "./delivery-environment.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
export const appOrigin = deliveryAppOrigin;
const configuredOrigins = new Set([appOrigin, ...(Deno.env.get("CALI_DELIVERY_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim())].filter(Boolean));

export class DeliveryError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    ...(configuredOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

export function emailResponse(request: Request, data: object, status = 200) {
  return Response.json(data, { status, headers: corsHeaders(request) });
}

export function deliveryPreflight(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !configuredOrigins.has(origin)) return emailResponse(request, { error: "Origem indisponível." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return emailResponse(request, { error: "Método indisponível." }, 405);
  return null;
}

export function failureResponse(request: Request, error: unknown) {
  return error instanceof DeliveryError
    ? emailResponse(request, { ok: false, error: error.message }, error.status)
    : emailResponse(request, { ok: false, error: "Não foi possível confirmar o envio. Tente novamente." }, 500);
}

export function approvedRecipients(values: string[]) {
  const list = [...new Set(values.map((email) => email.trim().toLowerCase()).filter(Boolean))].sort();
  if (!list.length || list.length > 8 || list.some((email) => email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))) {
    throw new DeliveryError(400, "Informe até oito endereços válidos.");
  }
  if (!emailDestinationsAllowed(list)) throw new DeliveryError(403, "Os destinatários precisam estar autorizados neste ambiente.");
  return list;
}

export function emailUuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new DeliveryError(400, "Identificador inválido.");
  }
  return value;
}

export async function deliveryAdmin(request: Request) {
  if (!url || !anonKey || !serviceKey || !resendKey) throw new DeliveryError(503, "Serviço de envio indisponível.");
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new DeliveryError(401, "Sessão ausente.");
  const auth = { persistSession: false, autoRefreshToken: false };
  const actor = createClient(url, anonKey, { auth, global: { headers: { Authorization: authorization } } });
  const { data: { user }, error } = await actor.auth.getUser();
  if (error || !user) throw new DeliveryError(401, "Sessão inválida.");
  const db = createClient(url, serviceKey, { auth });
  const workspace = db.schema("cali_workspace");
  const [{ data: access }, { data: profile }] = await Promise.all([
    actor.schema("cali_workspace").rpc("workspace_private_access_v2"),
    workspace.from("profiles").select("role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (access !== true || profile?.role !== "admin" || !profile.active) throw new DeliveryError(403, "Envio restrito à administradora.");
  return { db, workspace, user };
}

type Transport = ReturnType<typeof createClient>;
type Kind = "report" | "proposal" | "mapa";
type Attachment = { filename: string; content: string };

export async function sendMaterialEmail(
  db: Transport,
  input: {
    kind: Kind; entityId: string; requestId: string; userId: string; recipients: string[];
    subject: string; html?: string; text?: string; attachment?: Attachment; pdfPath?: string; companyId?: string; version?: number;
  },
) {
  const content = JSON.stringify({
    recipients: input.recipients, subject: input.subject, html: input.html, text: input.text,
    attachment: input.attachment, pdfPath: input.pdfPath, version: input.version,
  });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const workspace = db.schema("cali_workspace");
  const { data: job, error } = await workspace.rpc("reserve_material_email", {
    p_request_id: input.requestId, p_kind: input.kind, p_entity_id: input.entityId,
    p_actor_id: input.userId, p_hash: hash, p_company_id: input.companyId ?? null, p_version: input.version ?? null,
  });
  if (error || !job?.id) throw new DeliveryError(409, "Já há um envio em andamento ou a confirmação mudou. Atualize o material e tente novamente.");
  if (job.provider_id) return String(job.provider_id);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `cali-material-${job.id}`,
    },
    body: JSON.stringify({
      from: "APP CALI RH <workspace@calirh.com>", to: input.recipients,
      reply_to: "nao-responda@calirh.com", subject: input.subject, html: input.html, text: input.text,
      attachments: input.attachment ? [input.attachment] : undefined,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.id !== "string" || !result.id) {
    if (response.status >= 400 && response.status < 500 && ![408, 409, 425, 429].includes(response.status)) {
      await workspace.rpc("reject_material_email", { p_job_id: job.id });
    }
    throw new DeliveryError(502, "O serviço de e-mail ainda não confirmou o envio.");
  }
  const { error: completionError } = await workspace.rpc("complete_material_email", {
    p_job_id: job.id, p_provider_id: result.id, p_recipients: input.recipients,
    p_pdf_path: input.pdfPath ?? null, p_version: input.version ?? null,
  });
  if (completionError) throw new DeliveryError(503, "A entrega está pendente de confirmação. Tente novamente com os mesmos dados.");
  return result.id as string;
}

export function checkedPdf(value: unknown) {
  if (typeof value !== "string" || value.length > 11_184_812 || !/^JVBERi0[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new DeliveryError(400, "Selecione um PDF de até 8 MB.");
  }
  let binary: string;
  try { binary = atob(value); } catch { throw new DeliveryError(400, "Arquivo PDF inválido."); }
  if (!binary.startsWith("%PDF-") || !binary.slice(-1024).includes("%%EOF") || binary.length > 8 * 1024 * 1024) {
    throw new DeliveryError(400, "Arquivo PDF inválido.");
  }
  return { content: value, bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)) };
}
