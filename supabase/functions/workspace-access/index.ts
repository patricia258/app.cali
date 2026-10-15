// CALI Workspace — acesso por código (cliente, administradora e, a partir desta versão, Partner da Equipe CALI).
// Publicada em 2026-10-12 com autorização da proprietária: versão 6 + os trechos marcados com "PARTNER".
// Nada muda para quem já entrava: os trechos novos só rodam quando o e-mail está em staff_members.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { renderApprovedClientEmail } from "./approved-client-templates.ts";
import { renderClientCodeV3 } from "./approved-code-v3.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const APP_URL = "https://app.calirh.com";
const ALLOWED_ORIGINS = new Set([
  APP_URL,
  "https://app-cali.vercel.app",
  "https://app-cali-cali11.vercel.app",
  "https://app-cali-git-main-cali11.vercel.app",
]);

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.has(origin)
    || /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin)
    || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
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
  return new Response(JSON.stringify(body), { status, headers: { ...cors(request), "Content-Type": "application/json; charset=utf-8" } });
}
function safeName(name: string | null | undefined) {
  const first = String(name || "").trim().split(/\s+/)[0];
  return first || "Olá";
}
function normalizeEmail(value: unknown) { return String(value || "").trim().toLowerCase(); }
function randomCode() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return String(buffer[0] % 1000000).padStart(6, "0");
}
async function hashCode(email: string, code: string) {
  const bytes = new TextEncoder().encode(`${email}:${code}:${SERVICE_KEY}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function safeEqual(a: string, b: string) {
  const aa = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0; for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
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
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors(request) });
  if (request.method !== "POST") return json(request, { error: "Método não permitido." }, 405);
  const origin = request.headers.get("origin") ?? "";
  if (!isAllowedOrigin(origin)) return json(request, { error: "Origem não autorizada." }, 403);

  try {
    const body = await request.json().catch(() => ({}));
    if (String(body.website ?? "").trim()) return json(request, { ok: true });
    const action = String(body.action || "request");
    const email = normalizeEmail(body.email);
    if (!email || !email.includes("@")) return json(request, { ok: true });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const workspace = admin.schema("cali_workspace");

    async function ensureAuthUser(fullName: string) {
      let userId: string | null = null;
      const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: fullName } });
      if (created.data?.user?.id) userId = created.data.user.id;
      if (!userId) {
        const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        userId = listed.data.users.find((u) => normalizeEmail(u.email) === email)?.id || null;
      }
      return userId;
    }

    async function resolveOrCreateProfile() {
      const { data: existingProfile, error: profileError } = await workspace.from("profiles").select("id,email,full_name,role,active,company_id").eq("email", email).maybeSingle();
      if (profileError) throw profileError;
      if (existingProfile?.active) {
        // PARTNER: cadastro desativado na Equipe CALI deixa de entrar. Demais perfis seguem como sempre.
        if (existingProfile.role === "partner") {
          const { data: staff } = await workspace.from("staff_members").select("active").eq("email", email).maybeSingle();
          if (!staff?.active) return null;
        }
        return existingProfile;
      }

      const { data: invite, error: inviteError } = await workspace.from("client_invites").select("id,company_id,email,full_name,is_primary,active,accepted_at").eq("email", email).eq("active", true).maybeSingle();
      if (inviteError) throw inviteError;
      if (invite) {
        const userId = await ensureAuthUser(invite.full_name);
        if (!userId) throw new Error("Não foi possível preparar o usuário convidado.");
        const profilePayload = { id: userId, company_id: invite.company_id, email, full_name: invite.full_name, role: "client", is_primary: Boolean(invite.is_primary), active: true, updated_at: new Date().toISOString() };
        const { error: upsertError } = await workspace.from("profiles").upsert(profilePayload, { onConflict: "id" });
        if (upsertError) throw upsertError;
        return { ...profilePayload };
      }

      // PARTNER: pessoa cadastrada pela administradora em Equipe CALI (sem empresa própria; as empresas vêm das atribuições).
      const { data: staff, error: staffError } = await workspace.from("staff_members").select("id,email,full_name,active").eq("email", email).eq("active", true).maybeSingle();
      if (staffError) throw staffError;
      if (!staff) return null;
      const staffUserId = await ensureAuthUser(staff.full_name);
      if (!staffUserId) throw new Error("Não foi possível preparar o usuário da equipe.");
      const staffProfile = { id: staffUserId, company_id: null, email, full_name: staff.full_name, role: "partner", is_primary: false, active: true, updated_at: new Date().toISOString() };
      const { error: staffUpsertError } = await workspace.from("profiles").upsert(staffProfile, { onConflict: "id" });
      if (staffUpsertError) throw staffUpsertError;
      const { error: linkError } = await workspace.from("staff_members").update({ user_id: staffUserId, updated_at: new Date().toISOString() }).eq("id", staff.id);
      if (linkError) throw linkError;
      return { ...staffProfile };
    }

    if (action === "request") {
      const profile = await resolveOrCreateProfile();
      // Não revela se o e-mail existe ou foi convidado.
      if (!profile) return json(request, { ok: true });

      const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count, error: countError } = await workspace.from("workspace_access_codes").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
      if (countError) throw countError;
      if ((count ?? 0) >= 1) return json(request, { error: "Um código já foi enviado. Aguarde 2 minutos antes de solicitar outro." }, 429);

      await workspace.from("workspace_access_codes").update({ used_at: new Date().toISOString() }).eq("email", email).is("used_at", null);
      const code = randomCode();
      const codeHash = await hashCode(email, code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const requestedIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || null;
      const { error: codeError } = await workspace.from("workspace_access_codes").insert({ email, code_hash: codeHash, expires_at: expiresAt, requested_ip: requestedIp });
      if (codeError) throw codeError;

      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada.");
      const resend = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-code-${crypto.randomUUID()}` },
        body: JSON.stringify({ from: "APP CALI RH <workspace@calirh.com>", to: [email], reply_to: "nao-responda@calirh.com", subject: profile.role === "client" ? "APP CALI RH · Seu código para entrar" : "Seu código de acesso ao CALI Workspace", html: profile.role === "client" ? renderClientCodeV3(code, profile.full_name, APP_URL) : emailHtml(code, profile.full_name) }),
      });
      const emailResult = await resend.json().catch(() => ({}));
      if (!resend.ok) throw new Error(`Resend ${resend.status}: ${JSON.stringify(emailResult)}`);

      await workspace.from("activity_log").insert({ actor_user_id: profile.id, company_id: profile.company_id || null, event_type: "workspace_access_code_requested", entity_type: "profile", entity_id: profile.id, metadata: { email, email_id: emailResult.id ?? null, origin } });
      return json(request, { ok: true, challenge: "code" });
    }

    if (action === "verify") {
      const code = String(body.code || "").replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) return json(request, { error: "Código inválido ou expirado." }, 400);
      const { data: row, error: rowError } = await workspace.from("workspace_access_codes").select("id,code_hash,expires_at,attempts,used_at").eq("email", email).is("used_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (rowError) throw rowError;
      if (!row || new Date(row.expires_at).getTime() < Date.now() || Number(row.attempts || 0) >= 5) return json(request, { error: "Código inválido ou expirado." }, 400);

      const nextAttempts = Number(row.attempts || 0) + 1;
      await workspace.from("workspace_access_codes").update({ attempts: nextAttempts }).eq("id", row.id);
      const candidate = await hashCode(email, code);
      if (!(await safeEqual(candidate, row.code_hash))) return json(request, { error: "Código inválido ou expirado." }, 400);

      await workspace.from("workspace_access_codes").update({ used_at: new Date().toISOString(), attempts: nextAttempts }).eq("id", row.id);
      const profile = await resolveOrCreateProfile();
      if (!profile?.active) return json(request, { error: "Acesso não disponível." }, 403);
      // O convite do CLIENTE será marcado aceito somente após gerar a sessão;
      // isso garante que as boas-vindas não saiam por uma tentativa incompleta.

      // PARTNER: primeiro acesso confirmado → marca a data e envia as boas-vindas (falha no e-mail não impede a entrada).
      if (profile.role === "partner") {
        try {
          const { data: firstAccess } = await workspace.from("staff_members").update({ accepted_at: new Date().toISOString() }).eq("email", email).is("accepted_at", null).select("id");
          if ((firstAccess || []).length && RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `workspace-staff-welcome-${profile.id}` },
              body: JSON.stringify({ from: "APP CALI RH <workspace@calirh.com>", to: [email], reply_to: "nao-responda@calirh.com", subject: "Boas-vindas à Equipe CALI", html: staffWelcomeHtml(profile.full_name) }),
            });
          }
        } catch (welcomeError) { console.error("workspace-access staff welcome", welcomeError); }
      }

      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error) throw error;
      const tokenHash = data.properties?.hashed_token;
      if (!tokenHash) throw new Error("Token de sessão ausente.");

      // CLIENTE: mensagem de boas-vindas APROVADA, uma só vez no primeiro acesso válido.
      // Não interfere no acesso se o serviço de e-mail estiver temporariamente indisponível.
      if (profile.role === "client") {
        try {
          const { data: firstAccess, error: acceptError } = await workspace.from("client_invites")
            .update({ accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("email", email).eq("active", true).is("accepted_at", null)
            .select("id");
          if (acceptError) throw acceptError;
          if ((firstAccess || []).length && RESEND_API_KEY) {
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
                html,
              }),
            });
            if (!sent.ok) console.error("workspace-access client welcome resend", sent.status, await sent.text());
          }
        } catch (welcomeError) { console.error("workspace-access client welcome", welcomeError); }
      }


      await workspace.from("activity_log").insert({ actor_user_id: profile.id, company_id: profile.company_id || null, event_type: "workspace_access_code_verified", entity_type: "profile", entity_id: profile.id, metadata: { email, origin } });
      return json(request, { ok: true, token_hash: tokenHash, role: profile.role });
    }

    return json(request, { error: "Ação inválida." }, 400);
  } catch (error) {
    console.error("workspace-access", error);
    return json(request, { error: "Não foi possível concluir o acesso agora. Tente novamente em instantes." }, 500);
  }
});
