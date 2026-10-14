// CALI Workspace — convite por e-mail para a Equipe CALI (perfil Partner).
// Só a administradora pode chamar (confere com cali_workspace.is_admin() usando a sessão de quem chamou).
// Não cria usuário nem dá acesso: apenas envia o e-mail com o endereço do Workspace para quem já está em staff_members.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = "https://app.calirh.com";

function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowed = origin === APP_URL || /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  return { "Access-Control-Allow-Origin": allowed ? origin : APP_URL, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(request), "Content-Type": "application/json; charset=utf-8" } });
}
function firstName(name: string | null | undefined) { return String(name || "").trim().split(/\s+/)[0] || "Olá"; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)); }
function inviteHtml(name: string, email: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><title>Convite para a Equipe CALI</title></head>
<body bgcolor="#F7F3EE" style="margin:0;background:#F7F3EE;font-family:Arial,sans-serif;color:#2B2B2B">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#F7F3EE"><tr><td style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #EDE4DE;border-radius:16px;overflow:hidden">
<tr><td bgcolor="#5A1E2D" style="padding:28px 32px;color:#F7F3EE;text-align:center"><div style="font-family:Georgia,serif;font-size:31px;letter-spacing:.16em">CALI</div><div style="font-size:10px;letter-spacing:.34em;margin-top:7px">WORKSPACE</div></td></tr>
<tr><td style="padding:36px 34px"><p style="margin:0 0 16px;font-size:17px"><strong>${escapeHtml(firstName(name))}, boas-vindas à Equipe CALI.</strong></p>
<p style="line-height:1.7;margin:0 0 14px">A Patricia liberou o seu acesso ao CALI Workspace. É por lá que você acompanha as empresas atribuídas a você, responde ocorrências, registra horas e envia o seu trabalho para aprovação.</p>
<p style="line-height:1.7;margin:0 0 8px"><strong>Como entrar</strong></p>
<p style="line-height:1.7;margin:0 0 4px">1. Abra o Workspace pelo botão abaixo.</p>
<p style="line-height:1.7;margin:0 0 4px">2. Informe este e-mail: <strong>${escapeHtml(email)}</strong></p>
<p style="line-height:1.7;margin:0 0 22px">3. Digite o código de 6 números que chega em seguida na sua caixa de entrada. Não há senha.</p>
<p style="margin:0"><a href="${APP_URL}/login" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:13px 20px;border-radius:8px">Abrir o CALI Workspace</a></p>
<p style="font-size:11px;line-height:1.65;color:#7A6F72;margin:24px 0 0">Se você não esperava este convite, ignore esta mensagem.</p></td></tr>
<tr><td bgcolor="#F7F3EE" style="padding:17px 28px;text-align:center;font-size:10px;color:#8D8184">CALI RH · HR for Business · calirh.com</td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("authorization") ?? "";
    if (!authorization) return json(request, { error: "Sessão necessária." }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: isAdmin, error: adminError } = await caller.schema("cali_workspace").rpc("is_admin");
    if (adminError || isAdmin !== true) return json(request, { error: "Acesso restrito à administradora." }, 403);

    const body = await request.json().catch(() => ({}));
    const staffId = String(body.staffId || "");
    if (!/^[0-9a-f-]{36}$/i.test(staffId)) return json(request, { error: "Pessoa inválida." }, 400);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: staff, error: staffError } = await admin.schema("cali_workspace").from("staff_members").select("id,email,full_name,active").eq("id", staffId).maybeSingle();
    if (staffError) throw staffError;
    if (!staff || !staff.active) return json(request, { error: "Cadastro não encontrado ou desativado." }, 404);
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada.");
    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-staff-invite-${crypto.randomUUID()}` },
      body: JSON.stringify({ from: "APP CALI RH <workspace@calirh.com>", to: [staff.email], reply_to: "patricia@calirh.com", subject: "Você faz parte da Equipe CALI — seu acesso ao Workspace", html: inviteHtml(staff.full_name, staff.email) }),
    });
    const result = await resend.json().catch(() => ({}));
    if (!resend.ok) throw new Error(`Resend ${resend.status}: ${JSON.stringify(result)}`);
    return json(request, { ok: true });
  } catch (error) {
    console.error("workspace-staff-invite", error);
    return json(request, { error: "Não foi possível enviar o convite agora. Tente de novo em instantes." }, 500);
  }
});
