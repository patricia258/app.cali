/* Perfil Comportamental CALI — área da administradora (/admin/perfil-comportamental): resultados e links.
   Link livre (qualquer pessoa informa a empresa) ou link de uma empresa (vincula à ficha pelo e-mail corporativo). */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, FileDown, Plus, QrCode, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Shell } from '../components/WorkspaceShell';
import { supabase } from '../lib/supabase';
import { downloadQrPng } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { STYLES, adaptationLevel, type Scores, type Style } from './profileMethod';
import { STYLE_CONTENT } from './profileContent';
import '../forms/admin-forms.css';
import './profile-admin.css';

type LinkRow = { id: string; slug: string; title: string; company_id: string | null; purpose: string; status: 'open' | 'closed'; created_at: string };
type ResultRow = { id: string; link_id: string | null; company_id: string | null; company_name: string | null; team_member_id: string | null; person_name: string; email: string; job_title: string | null; primary_style: Style; secondary_style: Style; mixed: boolean; scores: Scores; created_at: string; client_visible: boolean; report_path: string | null; report_emailed_at: string | null };
const PURPOSE: Record<string, string> = { selecao: 'Seleção', desenvolvimento: 'Desenvolvimento', diagnostico: 'Diagnóstico' };
const BASE = 'https://app.calirh.com/perfil/';
const shortDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export function AdminProfilesPage() {
  const [tab, setTab] = useState<'results' | 'links'>('results');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [creating, setCreating] = useState<{ title: string; company_id: string; purpose: string; busy: boolean; error: string } | null>(null);
  const [removing, setRemoving] = useState<ResultRow | null>(null);

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    const [linkRows, resultRows, companyRows] = await Promise.all([
      supabase.from('profile_links').select('id,slug,title,company_id,purpose,status,created_at').order('created_at', { ascending: false }),
      supabase.from('profile_results').select('id,link_id,company_id,company_name,team_member_id,person_name,email,job_title,primary_style,secondary_style,mixed,scores,created_at,client_visible,report_path,report_emailed_at').order('created_at', { ascending: false }).limit(2000),
      supabase.from('companies').select('id,display_name,status').order('display_name'),
    ]);
    if (linkRows.error || resultRows.error) setError((linkRows.error || resultRows.error)!.message);
    setLinks((linkRows.data || []) as LinkRow[]);
    setResults((resultRows.data || []) as ResultRow[]);
    setCompanies(((companyRows.data || []) as Array<{ id: string; display_name: string; status: string }>).filter((row) => row.status !== 'archived').map((row) => ({ id: row.id, name: row.display_name })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const companyName = (id: string | null, fallback?: string | null) => (id && companies.find((company) => company.id === id)?.name) || fallback || 'Link livre';
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast((current) => current === message ? '' : current), 2200); };
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return results.filter((row) => (!companyFilter || (companyFilter === 'livre' ? !row.company_id : row.company_id === companyFilter)) && (!term || [row.person_name, row.email, row.job_title, row.company_name, companyName(row.company_id)].join(' ').toLowerCase().includes(term)));
  }, [results, query, companyFilter, companies]);

  async function createLink() {
    if (!supabase || !creating) return;
    const title = creating.title.trim() || 'Perfil Comportamental CALI';
    const company = companies.find((item) => item.id === creating.company_id);
    const slug = `${slugify(company?.name || 'perfil').slice(0, 40) || 'perfil'}-${Math.random().toString(36).slice(2, 6)}`;
    setCreating({ ...creating, busy: true, error: '' });
    const { data, error: insertError } = await supabase.from('profile_links').insert({ slug, title, company_id: creating.company_id || null, purpose: creating.purpose }).select('id,slug,title,company_id,purpose,status,created_at').single();
    if (insertError || !data) { setCreating({ ...creating, busy: false, error: insertError?.message || 'Não foi possível criar.' }); return; }
    setLinks((current) => [data as LinkRow, ...current]); setCreating(null); setTab('links'); flash('Link criado.');
  }

  async function patchLink(link: LinkRow, status: LinkRow['status']) {
    if (!supabase) return;
    setLinks((current) => current.map((item) => item.id === link.id ? { ...item, status } : item));
    const { error: updateError } = await supabase.from('profile_links').update({ status }).eq('id', link.id);
    if (updateError) { setError(updateError.message); setLinks((current) => current.map((item) => item.id === link.id ? link : item)); }
  }

  async function setVisible(row: ResultRow, visible: boolean) {
    if (!supabase) return;
    setResults((current) => current.map((item) => item.id === row.id ? { ...item, client_visible: visible } : item));
    const { error: updateError } = await supabase.from('profile_results').update({ client_visible: visible }).eq('id', row.id);
    if (updateError) { setError(updateError.message); setResults((current) => current.map((item) => item.id === row.id ? row : item)); return; }
    flash(visible ? 'Liberado para o cliente.' : 'Oculto para o cliente.');
  }

  async function openPdf(row: ResultRow) {
    if (!supabase || !row.report_path) return;
    const opened = window.open('', '_blank');
    const { data } = await supabase.storage.from('cali-profiles').createSignedUrl(row.report_path, 600);
    if (data?.signedUrl && opened) opened.location.href = data.signedUrl; else opened?.close();
  }

  async function remove() {
    if (!supabase || !removing) return;
    if (removing.report_path) await supabase.storage.from('cali-profiles').remove([removing.report_path]);
    const { error: deleteError } = await supabase.from('profile_results').delete().eq('id', removing.id);
    if (deleteError) { setError(deleteError.message); setRemoving(null); return; }
    setResults((current) => current.filter((item) => item.id !== removing.id)); setRemoving(null); flash('Resultado excluído.');
  }

  const profileChip = (row: ResultRow) => <span className="cpa-chips">
    <span className="cpa-chip" style={{ background: STYLE_CONTENT[row.primary_style].soft, color: STYLE_CONTENT[row.primary_style].color }}>{STYLE_CONTENT[row.primary_style].name}</span>
    <span className="cpa-chip ghost" style={{ color: STYLE_CONTENT[row.secondary_style].color }}>{row.mixed ? '= ' : '+ '}{STYLE_CONTENT[row.secondary_style].name}</span>
  </span>;
  const pressureOf = (row: ResultRow) => { const style = [...STYLES].sort((a, b) => Math.abs(row.scores.adaptation[b]) - Math.abs(row.scores.adaptation[a]))[0]; const delta = row.scores.adaptation[style]; return `${STYLE_CONTENT[style].name} ${delta > 0 ? '+' : ''}${delta} · ${adaptationLevel(delta)}`; };

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Perfil comportamental</h1><p>Levantamento de perfil (base DISC, método CALI v1): link livre ou por empresa, relatório da pessoa por e-mail e relatório do avaliador aqui e na ficha do colaborador.</p></div>
      <div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</button><button className="wf-primary" type="button" onClick={() => setCreating({ title: 'Perfil Comportamental CALI', company_id: '', purpose: 'desenvolvimento', busy: false, error: '' })}><Plus size={15} /> Novo link</button></div></div>
    {error && <div className="inline-notice" role="alert">{error}</div>}
    <div className="wf-segments v2-forms-tabs" role="tablist"><button type="button" className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>Resultados ({results.length})</button><button type="button" className={tab === 'links' ? 'on' : ''} onClick={() => setTab('links')}>Links ({links.length})</button></div>

    {tab === 'results' && <>
      <div className="wf-controls v2-forms-controls">
        <label className="v2-forms-search"><Search size={15} /><input value={query} placeholder="Buscar pessoa, e-mail, cargo ou empresa" onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="v2-forms-filter-select" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="">Todas as empresas</option><option value="livre">Links livres</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <span className="v2-forms-total">{filtered.length} de {results.length}</span>
      </div>
      {loading ? <div className="data-loading">Carregando…</div> : !results.length ? <div className="wf-empty"><strong>Nenhum resultado ainda.</strong><p>Crie um link em “Novo link” e envie para a pessoa responder.</p></div>
        : <div className="v2-forms-table-wrap"><table className="v2-forms-table cpa-table"><thead><tr><th>Pessoa</th><th>Empresa</th><th>Perfil</th><th>Sob pressão</th><th>Data</th><th>Ficha</th><th>Cliente vê</th><th /></tr></thead><tbody>
          {filtered.map((row) => <tr key={row.id}>
            <td><Link className="cpa-person" to={`/admin/perfil-comportamental/${row.id}`}><strong>{row.person_name}</strong><small>{[row.job_title, row.email].filter(Boolean).join(' · ')}</small></Link></td>
            <td>{companyName(row.company_id, row.company_name)}</td>
            <td>{profileChip(row)}</td>
            <td className="cpa-muted">{pressureOf(row)}</td>
            <td className="cpa-muted">{shortDate(row.created_at)}</td>
            <td>{row.company_id ? (row.team_member_id ? <span className="v2-forms-status open">Vinculada</span> : <span className="v2-forms-status draft">Sem vínculo</span>) : <span className="cpa-muted">—</span>}</td>
            <td>{row.company_id ? <input type="checkbox" className="cpa-toggle" aria-label="Disponibilizar para o cliente" checked={row.client_visible} onChange={(event) => void setVisible(row, event.target.checked)} /> : <span className="cpa-muted">—</span>}</td>
            <td className="cpa-actions">
              <Link className="wf-secondary" to={`/admin/perfil-comportamental/${row.id}`}><ExternalLink size={14} /> Relatório</Link>
              {row.report_path && <button type="button" className="v2-forms-edit" title={row.report_emailed_at ? 'PDF enviado por e-mail à pessoa' : 'PDF da pessoa'} aria-label="PDF da pessoa" onClick={() => void openPdf(row)}><FileDown size={14} /></button>}
              <button type="button" className="v2-forms-edit" aria-label="Excluir resultado" onClick={() => setRemoving(row)}><Trash2 size={14} /></button>
            </td>
          </tr>)}
        </tbody></table></div>}
    </>}

    {tab === 'links' && (loading ? <div className="data-loading">Carregando…</div> : !links.length ? <div className="wf-empty"><strong>Nenhum link ainda.</strong><p>“Novo link” cria um link livre ou de uma empresa.</p></div>
      : <div className="v2-forms-table-wrap"><table className="v2-forms-table cpa-table"><thead><tr><th>Link</th><th>Empresa</th><th>Contexto</th><th>Situação</th><th>Respostas</th><th /></tr></thead><tbody>
        {links.map((link) => <tr key={link.id}>
          <td><span className="cpa-person"><strong>{link.title}</strong><small>{BASE.replace('https://', '')}{link.slug}</small></span></td>
          <td>{companyName(link.company_id)}</td>
          <td>{PURPOSE[link.purpose]}</td>
          <td><button type="button" className={`v2-forms-status ${link.status === 'open' ? 'open' : 'closed'}`} onClick={() => void patchLink(link, link.status === 'open' ? 'closed' : 'open')} title="Clique para alternar">{link.status === 'open' ? 'Recebendo respostas' : 'Encerrado'}</button></td>
          <td>{results.filter((row) => row.link_id === link.id).length}</td>
          <td className="cpa-actions">
            <button type="button" className="wf-secondary" onClick={() => { void navigator.clipboard.writeText(`${BASE}${link.slug}`).then(() => flash('Link copiado.')); }}><Copy size={14} /> Copiar</button>
            <button type="button" className="v2-forms-edit" aria-label="Baixar QR Code" title="Baixar QR Code" onClick={() => void downloadQrPng(`${BASE}${link.slug}`, `perfil-${link.slug}-qrcode.png`)}><QrCode size={14} /></button>
            <a className="v2-forms-edit" href={`/perfil/${link.slug}?previa=1`} target="_blank" rel="noopener noreferrer" aria-label="Ver como respondente" title="Ver como respondente"><ExternalLink size={14} /></a>
          </td>
        </tr>)}
      </tbody></table></div>)}
  </div></div>
  {toast && <div className="v2-forms-toast" role="status">{toast}</div>}
  {creating && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating.busy) setCreating(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Novo link">
    <div><small>PERFIL COMPORTAMENTAL</small><h2>Novo link</h2><p>Sem empresa, o link é livre: a pessoa informa onde trabalha. Com empresa, o resultado entra na ficha do colaborador (pelo e-mail corporativo).</p></div>
    <label>Título que a pessoa vê<input value={creating.title} maxLength={120} onChange={(event) => setCreating({ ...creating, title: event.target.value })} /></label>
    <label>Empresa<select value={creating.company_id} onChange={(event) => setCreating({ ...creating, company_id: event.target.value })}><option value="">Link livre (sem empresa)</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
    <label>Contexto de uso<select value={creating.purpose} onChange={(event) => setCreating({ ...creating, purpose: event.target.value })}><option value="desenvolvimento">Desenvolvimento</option><option value="selecao">Seleção</option><option value="diagnostico">Diagnóstico</option></select></label>
    {creating.error && <p className="v2-forms-error" role="alert">{creating.error}</p>}
    <footer><button type="button" disabled={creating.busy} onClick={() => setCreating(null)}>Cancelar</button><button type="button" disabled={creating.busy} onClick={() => void createLink()}>{creating.busy ? 'Criando…' : 'Criar link'}</button></footer>
  </section></div>}
  {removing && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir resultado">
    <div><small>PERFIL COMPORTAMENTAL</small><h2>Excluir resultado?</h2><p><strong>{removing.person_name}</strong> · {shortDate(removing.created_at)}. Apaga as respostas, os escores e o PDF. Não dá para desfazer.</p></div>
    <footer><button type="button" onClick={() => setRemoving(null)}>Cancelar</button><button type="button" className="danger" onClick={() => void remove()}>Excluir</button></footer>
  </section></div>}
  </div></Shell>;
}
