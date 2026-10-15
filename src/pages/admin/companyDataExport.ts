/* Fim de contrato (LGPD): baixa todos os dados de uma empresa para entregar ao cliente.
   Gera dois arquivos: os dados em JSON (função admin_export_company_data) e um índice dos documentos
   com links de download válidos por 7 dias, para enviar ao cliente junto. Os dados restritos de colaboradores
   (remuneração, gênero, filhos) saem separados em "dados_restritos"; quem recebe fica registrado na auditoria.
   Dentro dos 45 dias depois do encerramento, dá para gerar de novo (links novos). */
import { supabase } from '../../lib/supabase';

const LINK_DAYS = 7;
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const slug = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'empresa';

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

type DocRow = { title?: string; original_filename?: string; protocol?: string; storage_path?: string; created_at?: string; document_date?: string; drive_url?: string; external_url?: string };

export async function exportCompanyData(companyId: string, companyName: string, recipient: string) {
  if (!supabase) throw new Error('Conexão indisponível.');
  const result = await supabase.rpc('admin_export_company_data', { p_company_id: companyId, p_recipient: recipient });
  if (result.error) throw new Error(result.error.message || 'Não foi possível gerar a exportação.');
  const payload = result.data as { exported_at: string; data: Record<string, unknown[]> };
  const today = new Date().toISOString().slice(0, 10);
  const base = `cali-workspace-${slug(companyName)}-${today}`;
  download(JSON.stringify(payload, null, 2), 'application/json', `${base}-dados.json`);

  const docs = [...(payload.data.files || []), ...(payload.data.account_documents || [])] as DocRow[];
  const paths = docs.map((doc) => doc.storage_path).filter((path): path is string => Boolean(path));
  const links: Record<string, string> = {};
  if (paths.length) {
    const signed = await supabase.storage.from('cali-workspace-private').createSignedUrls(paths, LINK_DAYS * 86400);
    for (const item of signed.data || []) if (item.path && item.signedUrl) links[item.path] = item.signedUrl;
  }
  const until = new Date(Date.now() + LINK_DAYS * 86400000).toLocaleDateString('pt-BR');
  const rows = docs.map((doc) => {
    const href = (doc.storage_path && links[doc.storage_path]) || doc.drive_url || doc.external_url || '';
    const date = doc.document_date || doc.created_at;
    return `<tr><td>${escapeHtml(doc.protocol || '—')}</td><td>${escapeHtml(doc.title || doc.original_filename || 'Documento')}</td><td>${date ? new Date(date).toLocaleDateString('pt-BR') : '—'}</td><td>${href ? `<a href="${escapeHtml(href)}">Baixar</a>` : 'Sem arquivo'}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Documentos · ${escapeHtml(companyName)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#2b2024;margin:32px auto;max-width:860px;padding:0 16px}h1{font-size:20px;margin:0 0 6px}p{color:#6b5d63;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:18px}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #eee3dc}th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#8a7a80}a{color:#7a1f3d;font-weight:600}</style></head>
<body><h1>Documentos de ${escapeHtml(companyName)}</h1><p>Gerado pelo CALI Workspace em ${new Date().toLocaleDateString('pt-BR')}. Os links de download valem até ${until}; depois disso, peça um novo arquivo à CALI RH.</p>
<table><thead><tr><th>Protocolo</th><th>Documento</th><th>Data</th><th>Arquivo</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Nenhum documento cadastrado.</td></tr>'}</tbody></table></body></html>`;
  download(html, 'text/html', `${base}-documentos.html`);
  return { documents: docs.length, until };
}
