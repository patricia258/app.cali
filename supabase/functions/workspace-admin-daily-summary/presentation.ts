import { emailColors } from '../_shared/email-colors.ts';
import type { JsonValue } from '../_shared/json.ts';
import type { SummaryBlock, SummaryItem } from "./summary.ts";

const esc = (value: JsonValue | undefined) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const hoursLabel = (minutes: number) => { const h = Math.floor(minutes / 60), m = minutes % 60; return h ? `${h}h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`; };
const clock = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function list(label: string, color: string, items: SummaryItem[]) {
  if (!items.length) return "";
  const rows = items.slice(0, 12).map((item) => `<tr><td valign="top" style="padding:7px 10px 7px 0;font-size:11px;color:${emailColors.textMuted};white-space:nowrap">${esc(clock(item.at))}</td><td style="padding:7px 0;font-size:13px;line-height:1.5;color:${emailColors.text}"><a href="${esc(item.url)}" style="color:${emailColors.text};text-decoration:none;font-weight:700">${esc(item.title)}</a>${item.body ? `<br><span style="color:${emailColors.textMuted}">${esc([...item.body].slice(0, 180).join(''))}</span>` : ""}</td></tr>`).join("");
  const more = items.length > 12 ? `<tr><td></td><td style="padding:4px 0;font-size:12px;color:${emailColors.textMuted}">e mais ${items.length - 12}.</td></tr>` : "";
  return `<div style="font-size:10px;letter-spacing:.1em;font-weight:700;color:${color};text-transform:uppercase;margin:14px 0 4px">${label} (${items.length})</div><table width="100%" cellpadding="0" cellspacing="0">${rows}${more}</table>`;
}

export function summaryHtml(appOrigin: string, dateLabel: string, blocks: SummaryBlock[], totals: { client: number; cali: number; minutes: number }) {
  const sections = blocks.map((block) => `<tr><td style="padding:18px 0;border-top:1px solid ${emailColors.lineSoft}">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:16px;font-weight:700;color:${emailColors.brand}">${esc(block.name)}</td><td align="right" style="font-size:12px;color:${emailColors.textMuted}">${block.minutes ? `${hoursLabel(block.minutes)} registradas` : ""}</td></tr></table>
      ${list("O cliente fez", emailColors.success, block.fromClient)}${list("A CALI fez", emailColors.accentText, block.fromCali)}
    </td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:${emailColors.page};font-family:Arial,Helvetica,sans-serif;color:${emailColors.text}">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${emailColors.surface};border:1px solid ${emailColors.line};border-radius:18px;overflow:hidden">
      <tr><td style="padding:20px 26px;background:${emailColors.brand}"><img src="${appOrigin}/brand/cali-workspace-transparent.svg" alt="CALI Workspace" width="122" style="display:block;width:122px;height:auto"></td></tr>
      <tr><td style="padding:28px 30px 26px">
        <div style="font-size:10px;letter-spacing:.12em;color:${emailColors.accentText};font-weight:700;margin-bottom:8px">RESUMO DO DIA</div>
        <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;font-weight:400;color:${emailColors.brand};margin:0 0 16px">${esc(dateLabel)}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr>
          <td width="33%" style="padding:12px 14px;border:1px solid ${emailColors.line};border-radius:10px;background:${emailColors.surfaceSoft}"><div style="font-size:11px;color:${emailColors.textMuted}">Ações dos clientes</div><div style="font-size:20px;font-weight:700;color:${emailColors.text}">${totals.client}</div></td>
          <td width="8"></td>
          <td width="33%" style="padding:12px 14px;border:1px solid ${emailColors.line};border-radius:10px;background:${emailColors.surfaceSoft}"><div style="font-size:11px;color:${emailColors.textMuted}">Ações da CALI</div><div style="font-size:20px;font-weight:700;color:${emailColors.text}">${totals.cali}</div></td>
          <td width="8"></td>
          <td width="33%" style="padding:12px 14px;border:1px solid ${emailColors.line};border-radius:10px;background:${emailColors.surfaceSoft}"><div style="font-size:11px;color:${emailColors.textMuted}">Horas registradas</div><div style="font-size:20px;font-weight:700;color:${emailColors.text}">${hoursLabel(totals.minutes)}</div></td>
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${sections}</table>
        <div style="text-align:center;margin:22px 0 18px"><a href="${appOrigin}/admin" style="display:inline-block;background:${emailColors.brand};color:${emailColors.onBrand};text-decoration:none;font-size:14px;font-weight:700;padding:13px 22px;border-radius:999px">Abrir o Workspace</a></div>
        <div style="height:1px;background:${emailColors.line};margin-bottom:16px"></div>
        <p style="font-size:12px;line-height:1.6;color:${emailColors.textMuted};margin:0">E-mail automático. Não responda a esta mensagem. Para falar com a CALI, acesse o <a href="${appOrigin}/admin" style="color:${emailColors.brand};text-decoration:underline">Workspace</a>.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
