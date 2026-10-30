/* Prévia de link dos formulários (WhatsApp, LinkedIn, Facebook, Telegram…). Esses robôs não rodam JavaScript e liam a
   capa geral do Workspace. O vercel.json manda só os robôs de /f/:slug para cá; pessoas continuam indo direto para o app.
   Devolve título e texto do próprio formulário com uma imagem quadrada pequena (200×200: abaixo de 300 px o WhatsApp mostra só a miniatura à esquerda). */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_rhIy864X0VSQ0B7m7gdmCQ_hX3sKFMg';
const APP_URL = 'https://app.calirh.com';
const IMAGE = `${APP_URL}/brand/cali-forms-thumb.png`;

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Mesmo texto que a pessoa vê na abertura, sem as marcações de negrito/itálico, numa linha só.
const plain = (value: string) => value.replace(/\*\*|__|~~|[*_]/g, '').replace(/\s+/g, ' ').trim();

export async function GET(request: Request) {
  const slug = (new URL(request.url).searchParams.get('slug') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  let title = 'CALI Forms';
  let description = 'Formulário da CALI RH.';
  if (slug) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cali_form_public`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_slug: slug }),
      });
      const form = response.ok ? await response.json() as { title?: string; description?: string; category?: string } | null : null;
      if (form?.title) {
        title = form.title;
        const text = plain(form.description || '');
        description = text ? (text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text) : `${form.category || 'Formulário'} · CALI RH`;
      }
    } catch { /* sem formulário: fica a prévia geral do CALI Forms */ }
  }
  const url = `${APP_URL}/f/${slug}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="CALI Forms">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${IMAGE}"><meta property="og:image:secure_url" content="${IMAGE}"><meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="200"><meta property="og:image:height" content="200"><meta property="og:image:alt" content="CALI Forms">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${IMAGE}">
<link rel="canonical" href="${esc(url)}"></head><body><a href="${esc(url)}">${esc(title)}</a></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300' } });
}
