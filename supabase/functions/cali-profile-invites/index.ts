// Perfil Comportamental CALI: convites e lembretes por e-mail (especificação "Prazos-Lembretes-Painel_v1").
// Chamado só pelo banco (cali_workspace.profile_post_invite_email), com o segredo x-workspace-hook.
// Tipos: invite, reminder1 (não abriu), reminder2 (parou no meio), reminder3 (último toque), focal_eve (véspera, pendentes),
// focal_close (fechamento, taxa), renewal30/renewal0 (validade de 6 meses), gestao_released (aviso a quem tem conta na empresa)
// e gestao_pdf (PDF do relatório de gestão ao gestor, sem precisar de conta). Avisos à empresa trazem só estado, nunca respostas.
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
const TOTAL_BLOCKS = 24;
const headers = { "Content-Type": "application/json" };

const esc = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const first = (name: string) => esc(String(name || "").trim().split(/\s+/)[0]);
const when = (iso: string) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(date).replace(":", "h");
  return `${day}, às ${time}`;
};
const shortDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const addMonths = (iso: string, months: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + months); return d.toISOString(); };

function layout(eyebrow: string, title: string, body: string, footer = "E-mail automático da CALI RH. Não responda esta mensagem.") {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F3EE;font-family:Arial,Helvetica,sans-serif;color:#2B2B2B">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #E8DDD4;border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;background:#5A1E2D"><table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="left"><img src="${LOGO_URL}" alt="CALI RH" width="122" style="display:block;width:122px;height:auto"></td>
        <td align="right"><img src="${MARK_URL}" alt="" width="44" height="44" style="display:block;width:44px;height:44px"></td></tr></table></td></tr>
      <tr><td style="padding:30px">
        <div style="font-size:10px;letter-spacing:.12em;color:#B58C52;font-weight:700;margin-bottom:8px">${esc(eyebrow)}</div>
        <h1 style="font-size:23px;line-height:1.3;color:#5A1E2D;margin:0 0 16px">${title}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:16px 30px;border-top:1px solid #EFE6DF;font-size:11px;line-height:1.6;color:#8C807A">${footer}</td></tr>
    </table></td></tr></table></body></html>`;
}
const p = (html: string, size = 15) => `<p style="font-size:${size}px;line-height:1.65;margin:0 0 16px">${html}</p>`;
const button = (href: string, label: string) => `<div style="text-align:center;margin:8px 0 24px"><a href="${esc(href)}" style="display:inline-block;background:#5A1E2D;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 26px;border-radius:999px">${esc(label)}</a></div>`;
const box = (html: string) => `<div style="margin:0 0 20px;padding:14px 18px;border:1px solid #E8DDD4;border-left:4px solid #5A1E2D;border-radius:12px;background:#FBF7F3;font-size:14px;line-height:1.6">${html}</div>`;
const optOut = (token: string) => `Se não quiser participar, <a href="${APP_URL}/perfil/sair/${token}" style="color:#8C807A">clique aqui</a> e não enviaremos mais mensagens sobre este convite. E-mail automático da CALI RH.`;

async function send(to: string, subject: string, html: string, attachments?: Array<{ filename: string; content: string }>) {
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], reply_to: REPLY_TO, subject, html, ...(attachments ? { attachments } : {}) }),
  });
  if (!sent.ok) throw new Error(`resend ${sent.status}`);
}

const STATE_LABEL: Record<string, string> = { sent: "Ainda não abriu", opened: "Abriu, não começou", started: "Começou, não terminou" };
const state = (row: { completed_at: string | null; declined_at: string | null; deadline_at: string | null; started_at: string | null; opened_at: string | null }) =>
  row.completed_at ? "completed" : row.declined_at ? "declined" : row.deadline_at && new Date(row.deadline_at) < new Date() ? "expired" : row.started_at ? "started" : row.opened_at ? "opened" : "sent";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false }), { status: 405, headers });
  const ws = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "cali_workspace" }, auth: { persistSession: false } });
  try {
    const provided = req.headers.get("x-workspace-hook") ?? "";
    const { data: secretRow } = await ws.from("runtime_secrets").select("secret_value").eq("secret_key", "notification_email_hook").maybeSingle();
    if (!provided || !secretRow?.secret_value || provided !== secretRow.secret_value) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers });
    const payload = await req.json().catch(() => ({})) as { kind?: string; invite_id?: string; link_id?: string; deadline_at?: string; result_ids?: string[]; name?: string; email?: string; path?: string };
    const kind = payload.kind || "";

    const linkOf = async (id: string) => {
      const { data } = await ws.from("profile_links").select("id,slug,title,company_id,company_label,focal_name,focal_email").eq("id", id).maybeSingle();
      if (!data) return null;
      let company = data.company_label as string | null;
      if (data.company_id) { const { data: c } = await ws.from("companies").select("display_name").eq("id", data.company_id).maybeSingle(); company = c?.display_name || company; }
      return { ...data, company };
    };

    if (["invite", "reminder1", "reminder2", "reminder3"].includes(kind)) {
      const { data: inv } = await ws.from("profile_invites").select("id,link_id,person_name,email,token,deadline_at,last_block,completed_at,declined_at").eq("id", payload.invite_id).maybeSingle();
      if (!inv || inv.completed_at || inv.declined_at || !inv.deadline_at) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
      const link = await linkOf(inv.link_id);
      if (!link) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
      const url = `${APP_URL}/perfil/${link.slug}?c=${inv.token}`;
      const who = link.company ? esc(link.company) : "A CALI RH";
      const deadline = `<b>${esc(when(inv.deadline_at))}</b>`;
      let subject = "", title = "", body = "";
      if (kind === "invite") {
        subject = `Convite: Perfil Comportamental CALI${link.company ? ` · ${link.company}` : ""}`;
        title = `Olá, ${first(inv.person_name)}. Você recebeu um convite para o Perfil Comportamental CALI.`;
        body = p(`${who} quer conhecer melhor como você decide, se comunica e reage no trabalho. São 24 blocos de frases curtas, em média 12 a 20 minutos, e ao final você recebe o seu relatório em PDF por e-mail.`)
          + box(`Prazo para responder: ${deadline}.`) + button(url, "Responder agora")
          + p("Não existe resposta certa ou errada. Se precisar parar no meio, o link retoma de onde você parou, no mesmo aparelho, até o prazo.", 13);
      } else if (kind === "reminder1") {
        subject = "Lembrete: seu Perfil Comportamental CALI";
        title = `${first(inv.person_name)}, seu convite continua aberto.`;
        body = p(`O Perfil Comportamental CALI pode ser respondido até ${deadline}.`) + button(url, "Responder agora");
      } else if (kind === "reminder2") {
        const done = Math.max(0, Math.min(TOTAL_BLOCKS, Number(inv.last_block || 0)));
        const minutes = Math.max(3, Math.round(((TOTAL_BLOCKS - done) / TOTAL_BLOCKS) * 15));
        subject = "Falta pouco: retome o seu Perfil Comportamental";
        title = `${first(inv.person_name)}, você já começou.`;
        body = p(done ? `Você parou no bloco ${done} de ${TOTAL_BLOCKS}. Faltam cerca de ${minutes} minutos.` : `Faltam cerca de ${minutes} minutos.`)
          + box(`O link retoma de onde você parou, no mesmo aparelho, até ${deadline}.`) + button(url, "Continuar de onde parei");
      } else {
        subject = "Último lembrete: o seu Perfil Comportamental fecha em breve";
        title = `${first(inv.person_name)}, o prazo termina ${esc(when(inv.deadline_at))}.`;
        body = p("Este é o último lembrete que enviamos sobre este convite.") + button(url, "Responder agora");
      }
      await send(inv.email, subject, layout("PERFIL COMPORTAMENTAL CALI", title, body, optOut(inv.token)));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (kind === "focal_eve" || kind === "focal_close") {
      const link = await linkOf(payload.link_id || "");
      if (!link?.focal_email || !payload.deadline_at) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
      const { data: rows } = await ws.from("profile_invites").select("person_name,sent_at,opened_at,started_at,last_block,completed_at,declined_at,deadline_at")
        .eq("link_id", link.id).eq("deadline_at", payload.deadline_at).not("sent_at", "is", null).order("person_name");
      const list = rows || [];
      const total = list.length;
      const completed = list.filter((row) => row.completed_at).length;
      const declined = list.filter((row) => row.declined_at && !row.completed_at).length;
      const rate = total - declined > 0 ? Math.round((completed / (total - declined)) * 100) : 0;
      const hello = link.focal_name ? `Olá, ${first(link.focal_name)}.` : "Olá.";
      let subject = "", title = "", body = "";
      if (kind === "focal_eve") {
        const pending = list.filter((row) => ["sent", "opened", "started"].includes(state(row)));
        subject = `Perfil Comportamental: ${pending.length} ${pending.length === 1 ? "pessoa ainda não respondeu" : "pessoas ainda não responderam"}`;
        title = `${hello} O prazo fecha ${esc(when(payload.deadline_at))}.`;
        const table = pending.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #E8DDD4;border-radius:12px;font-size:14px">
          ${pending.map((row) => `<tr><td style="padding:10px 14px;border-top:1px solid #F1E9E2">${esc(row.person_name)}</td><td style="padding:10px 14px;border-top:1px solid #F1E9E2;color:#6B5D63">${STATE_LABEL[state(row)]}${state(row) === "started" && row.last_block ? ` (bloco ${row.last_block} de ${TOTAL_BLOCKS})` : ""}</td></tr>`).join("")}
        </table>` : "";
        body = p(`${esc(link.title)}${link.company ? ` · ${esc(link.company)}` : ""}: ${completed} de ${total - declined} já responderam.`) + table
          + p("Um lembrete curto do líder costuma fazer diferença. Esta lista mostra só a situação de cada convite, nunca o conteúdo das respostas.", 13);
      } else {
        const expired = list.filter((row) => state(row) === "expired").length;
        subject = `Perfil Comportamental encerrado: ${rate}% de resposta`;
        title = `${hello} O levantamento foi encerrado.`;
        body = p(`${esc(link.title)}${link.company ? ` · ${esc(link.company)}` : ""}`)
          + box(`<b>${completed}</b> de <b>${total - declined}</b> pessoas responderam (<b>${rate}%</b>).<br>${expired} ${expired === 1 ? "convite expirou" : "convites expiraram"} sem resposta${declined ? `; ${declined} ${declined === 1 ? "pessoa preferiu" : "pessoas preferiram"} não participar` : ""}.`)
          + p("A CALI RH entra em contato para a devolutiva dos resultados.", 13);
      }
      await send(link.focal_email, subject, layout("PERFIL COMPORTAMENTAL CALI", title, body));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (kind === "renewal30" || kind === "renewal0") {
      const link = await linkOf(payload.link_id || "");
      if (!link?.focal_email || !payload.result_ids?.length) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
      const { data: rows } = await ws.from("profile_results").select("person_name,created_at").in("id", payload.result_ids).order("person_name");
      const list = rows || [];
      const hello = link.focal_name ? `Olá, ${first(link.focal_name)}.` : "Olá.";
      const items = list.map((row) => `<li style="margin:0 0 6px">${esc(row.person_name)} · vigente até ${shortDate(addMonths(row.created_at, 6))}</li>`).join("");
      const subject = kind === "renewal30" ? "Perfil Comportamental: leituras vencem em 30 dias" : "Perfil Comportamental: leituras vencidas hoje";
      const title = kind === "renewal30" ? `${hello} Algumas leituras vencem em 30 dias.` : `${hello} Algumas leituras venceram hoje.`;
      const body = `<ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.6">${items}</ul>`
        + p("O resultado descreve como a pessoa se posiciona em um momento; contexto, papel e momento mudam a leitura. Por isso cada leitura vale 6 meses. Leituras vencidas continuam no histórico, mas não contam como leitura atual.", 13)
        + p("Para renovar, fale com a CALI RH: um novo ciclo mantém o histórico e permite comparar os dois momentos.", 13);
      await send(link.focal_email, subject, layout("PERFIL COMPORTAMENTAL CALI", title, body));
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (kind === "gestao_released" || kind === "gestao_pdf") {
      const { data: link } = await ws.from("profile_links").select("id,title,company_id,company_label,gestao_protocol").eq("id", payload.link_id).maybeSingle();
      if (!link) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers });
      let company = link.company_label as string | null;
      if (link.company_id) { const { data: c } = await ws.from("companies").select("display_name").eq("id", link.company_id).maybeSingle(); company = c?.display_name || company; }
      const name = company || link.title;
      const protocol = link.gestao_protocol ? `Protocolo ${esc(link.gestao_protocol)}.` : "";
      if (kind === "gestao_released") {
        const { data: people } = await ws.from("profiles").select("email,full_name,active").eq("company_id", link.company_id).eq("role", "client");
        const url = `${APP_URL}/cliente/perfil-comportamental/gestao/${link.id}`;
        for (const person of (people || []).filter((row) => row.email && row.active !== false)) {
          const body = p(`O relatório de gestão do Perfil Comportamental de ${esc(name)} está disponível no seu aplicativo CALI. Ele mostra o time como conjunto, sem expor ninguém, e termina em três decisões para a liderança.`)
            + button(url, "Abrir o relatório") + p(`${protocol} Recomendamos ler antes da nossa conversa de devolutiva.`, 13);
          await send(person.email, `Relatório de gestão disponível · ${name}`, layout("RELATÓRIO DE GESTÃO", `Olá${person.full_name ? `, ${first(person.full_name)}` : ""}.`, body));
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }
      const path = payload.path || "";
      const file = await ws.storage.from("cali-profiles").download(path);
      if (file.error || !file.data) return new Response(JSON.stringify({ ok: false, error: "pdf" }), { status: 500, headers });
      const content = encodeBase64(new Uint8Array(await file.data.arrayBuffer()));
      const to = payload.email || "";
      const who = payload.name || "";
      const body = p(`Segue, em anexo, o relatório de gestão do Perfil Comportamental de ${esc(name)}: o retrato do time como conjunto, sem expor ninguém, com três decisões para a liderança.`)
        + box(`${protocol} Documento assinado pela responsável técnica da CALI RH.`) + p("Recomendamos ler antes da nossa conversa de devolutiva. Qualquer dúvida, fale com a CALI RH pelos canais de sempre.", 13);
      const slugName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "empresa";
      await send(to, `Relatório de gestão · Perfil Comportamental · ${name}`, layout("RELATÓRIO DE GESTÃO", `Olá${who ? `, ${first(who)}` : ""}.`, body),
        [{ filename: `relatorio-gestao-${slugName}.pdf`, content }]);
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ ok: false, error: "unknown kind" }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "error" }), { status: 500, headers });
  }
});
