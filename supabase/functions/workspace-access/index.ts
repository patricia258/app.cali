import { deliveryAppOrigin, emailDestinationsAllowed } from "../_shared/delivery-environment.ts";
// Acesso por código para Cliente, Admin e Partner.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { renderApprovedClientEmail } from "./approved-client-templates.ts";
import { renderClientCodeV3 } from "./client-access-code-email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = "https://app.calirh.com";
const emailHtmlForEnvironment = (html: string) => html.replaceAll(APP_URL, deliveryAppOrigin);
const ALLOWED_ORIGINS = new Set([
  APP_URL,
  "https://app-cali.vercel.app",
  "https://app-cali-cali11.vercel.app",
  "https://app-cali-git-main-cali11.vercel.app",
  "https://staging.calirh.com",
  ...(Deno.env.get("WORKSPACE_ACCESS_ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin);
}
function cors(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    ...cors(request), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
  } });
}
function safeName(name: string | null | undefined) {
  const first = String(name || "").trim().split(/\s+/)[0];
  return (first || "Olá").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function normalizeEmail(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function randomCode() {
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= 4_294_000_000);
  return String(buffer[0] % 1000000).padStart(6, "0");
}
function sessionIdOf(token: string) {
  try {
    const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    const { session_id } = JSON.parse(atob(payload));
    return typeof session_id === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(session_id)
      ? session_id : null;
  } catch { return null; }
}
async function hashCode(email: string, code: string) {
  const bytes = new TextEncoder().encode(`${email}:${code}:${SERVICE_KEY}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function shell(title: string, inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><title>${title}</title></head>
<body bgcolor="#F7F3EE" style="margin:0;background:#F7F3EE;font-family:Arial,sans-serif;color:#2B2B2B">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#F7F3EE"><tr><td style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #EDE4DE;border-radius:16px;overflow:hidden">
<tr><td bgcolor="#5A1E2D" style="padding:28px 32px;color:#F7F3EE;text-align:center"><div style="font-family:Georgia,serif;font-size:31px;letter-spacing:.16em">CALI</div><div style="font-size:10px;letter-spacing:.34em;margin-top:7px">WORKSPACE</div></td></tr>
<tr><td style="padding:36px 34px">${inner}</td></tr>
<tr><td bgcolor="#F7F3EE" style="padding:17px 28px;text-align:center;font-size:10px;color:#8D8184">CALI RH · HR for Business · calirh.com<br><span style="display:inline-block;padding-top:8px;font-size:11px;line-height:1.6">E-mail automático. Não responda a esta mensagem. Para falar com a CALI, acesse o <a href="${APP_URL}" style="color:#5A1E2D;text-decoration:underline">Workspace</a>.</span></td></tr>
</table></td></tr></table></body></html>`;
}
function emailHtml(code: string, name: string | null | undefined) {
  return shell("Seu código CALI Workspace", `<p style="margin:0 0 16px;font-size:17px"><strong>${safeName(name)}, seu código de acesso chegou.</strong></p>
<p style="line-height:1.7;margin:0 0 22px">Digite este código no CALI Workspace. Ele é pessoal, expira em 10 minutos e só pode ser usado uma vez.</p>
<div style="font-family:Arial,sans-serif;font-size:34px;letter-spacing:.24em;font-weight:800;color:#5A1E2D;background:#F7F3EE;border:1px solid #E8DDD6;border-radius:12px;padding:18px 20px;text-align:center">${code}</div>
<p style="font-size:11px;line-height:1.65;color:#7A6F72;margin:24px 0 0">Se você não solicitou este código, ignore esta mensagem.</p>`);
}
// PARTNER: boas-vindas à Equipe CALI, enviada uma única vez, no primeiro acesso confirmado.
function staffWelcomeHtml(name: string | null | undefined) {
  return shell("Boas-vindas à Equipe CALI", `<p style="margin:0 0 16px;font-size:17px"><strong>${safeName(name)}, boas-vindas à Equipe CALI.</strong></p>
<p style="line-height:1.7;margin:0 0 14px">O seu acesso ao CALI Workspace está ativo. É por lá que você acompanha as empresas atribuídas a você, responde ocorrências, registra horas e envia materiais para aprovação.</p>
<p style="line-height:1.7;margin:0 0 22px">Tudo que vai para o cliente passa pela Patricia antes. Na dúvida, fale com ela.</p>
<p style="margin:0"><a href="${APP_URL}/equipe" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:13px 20px;border-radius:8px">Abrir o Workspace</a></p>
<p style="font-size:11px;line-height:1.65;color:#7A6F72;margin:24px 0 0">Para entrar, informe este e-mail e use o código que enviamos a cada acesso.</p>`);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!isAllowedOrigin(origin)) return json(request, { error: "Origem não autorizada." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);

  const requested = { ok: true, challenge: "code" };
  const invalid = { error: "Código inválido ou expirado." };
  try {
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const email = normalizeEmail(body?.email);
    if (body?.website) return json(request, requested);
    if (action !== "request" && action !== "verify") return json(request, { error: "Ação inválida." }, 400);
    if (email.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(email)) {
      return action === "request" ? json(request, requested) : json(request, invalid, 400);
    }
    if (!SUPABASE_URL || !SERVICE_KEY || !PUBLIC_KEY) throw new Error("Auth indisponível.");

    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, clientOptions);
    const workspace = admin.schema("cali_workspace");

    async function findAuthUserId() {
      const { data, error } = await workspace.rpc("workspace_auth_identity_v2", { p_email: email });
      if (error) throw error;
      return typeof data === "string" ? data : null;
    }

    async function ensureAuthUser(fullName: string) {
      const existing = await findAuthUserId();
      if (existing) return existing;
      await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: fullName } });
      const userId = await findAuthUserId();
      if (!userId) throw new Error("Identidade Auth indisponível.");
      return userId;
    }

    async function readProfile(userId: string) {
      const { data, error } = await workspace.from("profiles")
        .select("id,email,full_name,role,active,company_id").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    }

    async function eligibleProfile(userId: string) {
      const profile = await readProfile(userId);
      if (!profile?.active || normalizeEmail(profile.email) !== email ||
          !["admin", "client", "partner"].includes(profile.role)) return null;
      const { data, error } = await workspace.rpc("workspace_login_eligible_v2", { p_user_id: userId });
      if (error) throw error;
      return data === true ? profile : null;
    }

    async function provisionInvitedProfile() {
      const { data: invite, error: inviteError } = await workspace.from("client_invites")
        .select("company_id,full_name,is_primary")
        .eq("email", email).eq("active", true).eq("platform_access", true).maybeSingle();
      if (inviteError) throw inviteError;
      if (invite) {
        const { data: company, error: companyError } = await workspace.from("companies")
          .select("id").eq("id", invite.company_id).in("status", ["active", "paused"]).maybeSingle();
        if (companyError) throw companyError;
        if (!company) return null;
        const userId = await ensureAuthUser(invite.full_name);
        const { error } = await workspace.from("profiles").upsert({
          id: userId, company_id: invite.company_id, email, full_name: invite.full_name,
          role: "client", is_primary: Boolean(invite.is_primary), active: true,
        }, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw error;
        return eligibleProfile(userId);
      }

      const { data: staff, error: staffError } = await workspace.from("staff_members")
        .select("id,full_name,user_id").eq("email", email).eq("active", true).maybeSingle();
      if (staffError) throw staffError;
      if (!staff) return null;

      const userId = await ensureAuthUser(staff.full_name);
      if (staff.user_id && staff.user_id !== userId) return null;
      if (!staff.user_id) {
        const { error } = await workspace.from("staff_members").update({ user_id: userId, updated_at: new Date().toISOString() })
          .eq("id", staff.id).eq("active", true).is("user_id", null);
        if (error) throw error;
      }
      const { error } = await workspace.from("profiles").upsert({
        id: userId, company_id: null, email, full_name: staff.full_name, role: "partner", is_primary: false, active: true,
      }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      return eligibleProfile(userId);
    }

    const identity = await findAuthUserId();
    // Um convite legado pode criar o primeiro perfil. Perfil desativado exige liberação explícita.
    const existingProfile = identity ? await readProfile(identity) : null;
    const profile = existingProfile && identity
      ? await eligibleProfile(identity)
      : action === "request" ? await provisionInvitedProfile() : null;
    if (action === "request") {
      if (!profile) return json(request, requested);

      if (!emailDestinationsAllowed([email])) return json(request, requested);
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada.");
      const code = randomCode();
      const codeHash = await hashCode(email, code);
      const requestedIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || null;
      const { data: codeId, error: codeError } = await workspace.rpc("reserve_workspace_access_code_v2", {
        p_email: email, p_code_hash: codeHash, p_requested_ip: requestedIp, p_actor_id: profile.id,
      });
      if (codeError) throw codeError;
      if (!codeId) return json(request, requested);

      const resend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-code-${codeId}` },
        body: JSON.stringify({ from: "APP CALI RH <workspace@calirh.com>", to: [email], reply_to: "nao-responda@calirh.com", subject: profile.role === "client" ? "APP CALI RH · Seu código para entrar" : "Seu código de acesso ao CALI Workspace", html: emailHtmlForEnvironment(profile.role === "client" ? renderClientCodeV3(code, profile.full_name, APP_URL) : emailHtml(code, profile.full_name)) }),
      });
      const emailResult = await resend.json().catch(() => ({}));
      if (!resend.ok) throw new Error(`Falha na entrega do código. HTTP ${resend.status}.`);
      const { data: delivered, error: deliveryError } = await workspace.rpc("confirm_workspace_access_code_delivery_v2", {
        p_code_id: codeId, p_actor_id: profile.id,
      });
      if (deliveryError || delivered !== true) throw new Error("Não foi possível confirmar a entrega do código.");

      await workspace.from("activity_log").insert({ actor_user_id: profile.id, company_id: profile.company_id || null, event_type: "workspace_access_code_requested", entity_type: "profile", entity_id: profile.id, metadata: { email, email_id: emailResult.id ?? null, origin } });
      return json(request, requested);
    }

    if (action === "verify") {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!profile || !/^\d{6}$/.test(code)) return json(request, invalid, 400);
      const candidate = await hashCode(email, code);
      const { data: proof, error: consumeError } = await workspace.rpc("consume_workspace_access_code_v2", {
        p_email: email, p_code_hash: candidate, p_actor_id: profile.id,
      });
      if (consumeError) throw consumeError;
      if (typeof proof !== "string") return json(request, invalid, 400);

      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      const tokenHash = link?.properties?.hashed_token;
      if (linkError || !tokenHash) throw new Error("Sessão Auth indisponível.");

      const authClient = createClient(SUPABASE_URL, PUBLIC_KEY, clientOptions);
      const { data: auth, error: authError } = await authClient.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      const session = auth.session;
      const sessionId = session ? sessionIdOf(session.access_token) : null;
      if (authError || !session || auth.user?.id !== profile.id || !sessionId) {
        if (session) await authClient.auth.signOut({ scope: "local" });
        return json(request, invalid, 400);
      }
      const { data: admitted, error: admissionError } = await workspace.rpc("admit_workspace_session_v2", {
        p_authorization_id: proof, p_session_id: sessionId,
      });
      if (admissionError || admitted !== true) {
        await authClient.auth.signOut({ scope: "local" });
        return json(request, invalid, 400);
      }

      // PARTNER: primeiro acesso confirmado → marca a data e envia as boas-vindas (falha no e-mail não impede a entrada).
      if (profile.role === "partner") {
        try {
          const { data: firstAccess } = await workspace.from("staff_members").update({ accepted_at: new Date().toISOString() }).eq("email", email).is("accepted_at", null).select("id");
          if ((firstAccess || []).length && RESEND_API_KEY && emailDestinationsAllowed([email])) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-staff-welcome-${profile.id}` },
              body: JSON.stringify({ from: "APP CALI RH <workspace@calirh.com>", to: [email], reply_to: "nao-responda@calirh.com", subject: "Boas-vindas à Equipe CALI", html: emailHtmlForEnvironment(staffWelcomeHtml(profile.full_name)) }),
            });
          }
        } catch (welcomeError) { console.error("workspace-access staff welcome", welcomeError); }
      }

      // CLIENTE: mensagem de boas-vindas APROVADA, uma só vez no primeiro acesso válido.
      // Não interfere no acesso se o serviço de e-mail estiver temporariamente indisponível.
      if (profile.role === "client") {
        try {
          const { data: firstAccess, error: acceptError } = await workspace.from("client_invites")
            .update({ accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("email", email).eq("company_id", profile.company_id).eq("active", true).is("accepted_at", null)
            .select("id");
          if (acceptError) throw acceptError;
          if ((firstAccess || []).length && RESEND_API_KEY && emailDestinationsAllowed([email])) {
            const { data: company } = await workspace.from("companies")
              .select("display_name").eq("id", profile.company_id).maybeSingle();
            const html = renderApprovedClientEmail("welcome", {
              nome_do_cliente: String(profile.full_name || "").trim().split(/\s+/)[0] || "você",
              empresa: String(company?.display_name || "sua empresa"),
              link: APP_URL + "/cliente",
              logo_workspace_url: APP_URL + "/brand/cali-workspace-transparent.svg",
              carvalho_url: APP_URL + "/brand/cali-oak-mark-light.svg",
            });
            const sent = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-client-welcome-${profile.id}` },
              body: JSON.stringify({
                from: "APP CALI RH <workspace@calirh.com>", to: [email],
                reply_to: "nao-responda@calirh.com",
                subject: "APP CALI RH · Bem-vindo ao seu Workspace! 👋",
                html: emailHtmlForEnvironment(html),
              }),
            });
            if (!sent.ok) console.error("workspace-access client welcome resend", sent.status);
          }
        } catch (welcomeError) { console.error("workspace-access client welcome", welcomeError); }
      }


      await workspace.from("activity_log").insert({ actor_user_id: profile.id, company_id: profile.company_id || null, event_type: "workspace_access_code_verified", entity_type: "profile", entity_id: profile.id, metadata: { email, origin } });
      return json(request, {
        ok: true, role: profile.role,
        session: { access_token: session.access_token, refresh_token: session.refresh_token },
      });
    }

    return json(request, { error: "Ação inválida." }, 400);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    console.error("workspace-access failed", /^[a-zA-Z0-9_]{1,50}$/.test(code) ? code : "internal_error");
    return json(request, { error: "Não foi possível concluir o acesso agora. Tente novamente em instantes." }, 500);
  }
});
