import { supabase } from './supabase';
import '../dashboard-satisfaction-v28.css';

type Monthly = { month: string; average: number | null; count: number };
type Recent = { score: number; comment?: string | null; createdAt: string; sourceType: 'record' | 'deliverable'; entityId?: string | null; protocol?: string | null; title?: string | null; company?: string | null };
type Overview = { average: number | null; total: number; distribution: Record<string, number>; monthly: Monthly[]; recent: Recent[] };

let installed = false;
let loading = false;
let timer = 0;

function isDashboard() { return location.pathname === '/admin'; }
function fmt(value: number | null | undefined) { return value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1).replace('.', ','); }
function monthLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').replace(/^./, (x) => x.toUpperCase());
}
function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}
function emoji(score: number) { return score <= 2 ? '😞' : score === 3 ? '😐' : score === 4 ? '😊' : '🤩'; }
function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function updateSignal(data: Overview) {
  const card = Array.from(document.querySelectorAll<HTMLElement>('.signal-card')).find((item) => item.querySelector('span')?.textContent?.trim() === 'NPS atual');
  if (!card) return;
  const strong = card.querySelector('strong');
  const small = card.querySelector('small');
  const trend = card.querySelector<HTMLElement>('.signal-trend');
  if (strong) strong.textContent = fmt(data.average);
  if (small) small.textContent = data.total === 1 ? '1 avaliação real registrada' : `${data.total} avaliações reais registradas`;
  if (trend) {
    trend.className = 'signal-trend neutral satisfaction-live-badge';
    trend.textContent = 'base 1–5 do Workspace';
  }
}
function renderPanel(data: Overview) {
  const panel = document.querySelector<HTMLElement>('.nps-chart-panel');
  if (!panel) return;
  panel.classList.add('satisfaction-live-panel');
  const monthly = Array.isArray(data.monthly) ? data.monthly : [];
  const recent = Array.isArray(data.recent) ? data.recent : [];
  const maxCount = Math.max(1, ...Object.values(data.distribution || {}).map((v) => Number(v) || 0));
  const monthlyHtml = monthly.map((item) => {
    const average = item.average == null ? null : Number(item.average);
    const height = average == null ? 4 : Math.max(8, Math.round((average / 5) * 100));
    return `<div class="satisfaction-month"><div class="satisfaction-month-bar"><i style="height:${height}%"></i></div><strong>${average == null ? '—' : fmt(average)}</strong><span>${monthLabel(item.month)}</span><small>${item.count || 0}</small></div>`;
  }).join('');
  const distributionHtml = [1,2,3,4,5].map((score) => {
    const count = Number(data.distribution?.[String(score)] || 0);
    const width = Math.max(count ? 12 : 2, Math.round((count / maxCount) * 100));
    return `<div class="satisfaction-dist-row"><span>${score}</span><div><i style="width:${width}%"></i></div><strong>${count}</strong></div>`;
  }).join('');
  const recentHtml = recent.length ? recent.slice(0, 5).map((item) => {
    const href = item.sourceType === 'record' && item.entityId ? `/admin/registros?record=${encodeURIComponent(item.entityId)}` : '/admin/projetos';
    return `<a class="satisfaction-recent-row" href="${href}"><span class="satisfaction-recent-score">${emoji(item.score)} <strong>${item.score}/5</strong></span><span class="satisfaction-recent-copy"><strong>${escapeHtml(item.company || 'Cliente')}</strong><small>${escapeHtml(item.protocol || item.title || 'Avaliação')}</small>${item.comment ? `<p>${escapeHtml(item.comment)}</p>` : '<p>Sem comentário adicional.</p>'}</span><em>${dateLabel(item.createdAt)}</em></a>`;
  }).join('') : '<div class="satisfaction-empty">As avaliações reais aparecerão aqui conforme forem registradas.</div>';

  panel.innerHTML = `<div class="panel-title chart-panel-title satisfaction-live-head"><div><span class="section-kicker">NPS / SATISFAÇÃO</span><h2>Avaliações reais dos clientes</h2></div><div class="satisfaction-main-metric"><span>Média geral</span><strong>${fmt(data.average)}</strong><small>${data.total} ${data.total === 1 ? 'resposta' : 'respostas'}</small></div></div><div class="satisfaction-live-grid"><section><div class="satisfaction-subhead"><strong>Evolução dos últimos 6 meses</strong><span>média mensal · escala 1–5</span></div><div class="satisfaction-months">${monthlyHtml}</div></section><section><div class="satisfaction-subhead"><strong>Distribuição das notas</strong><span>quantidade por nota</span></div><div class="satisfaction-distribution">${distributionHtml}</div></section></div><div class="satisfaction-recent"><div class="satisfaction-subhead"><strong>Últimas avaliações</strong><span>clique para abrir a origem</span></div>${recentHtml}</div>`;
}
async function refresh() {
  if (loading || !supabase || !isDashboard()) return;
  loading = true;
  try {
    const result = await supabase.rpc('get_admin_satisfaction_overview');
    if (result.error || !result.data) return;
    const data = result.data as Overview;
    updateSignal(data);
    renderPanel(data);
  } finally { loading = false; }
}
function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void refresh(), 140);
}

export function installDashboardSatisfactionRuntimeV28() {
  if (installed) return;
  installed = true;
  const start = () => {
    schedule();
    const observer = new MutationObserver(() => { if (isDashboard()) schedule(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('focus', schedule);
    window.addEventListener('popstate', schedule);
    window.setInterval(() => { if (isDashboard()) void refresh(); }, 30000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
