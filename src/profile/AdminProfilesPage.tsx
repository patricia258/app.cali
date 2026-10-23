/* Perfil Comportamental CALI — área da administradora (/admin/perfil-comportamental): resultados e links.
   Link livre (qualquer pessoa informa a empresa) ou link de uma empresa (vincula à ficha pelo e-mail corporativo). */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Download, ExternalLink, FileDown, Mail, Pencil, Plus, QrCode, RefreshCw, Search, Share2, Trash2 } from 'lucide-react';
import { Shell } from '../components/WorkspaceShell';
import { supabase } from '../lib/supabase';
import { downloadQrPng, downloadShareCard, qrDataUrl } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { adaptationOf, type Scores, type Style } from './profileMethod';
import { STYLE_CONTENT } from './profileContent';
import '../forms/admin-forms.css';
import './profile-admin.css';

type LinkRow = { id: string; slug: string; title: string; company_id: string | null; company_label: string | null; purpose: string; status: 'open' | 'closed'; created_at: string };
type LinkDraft = { id?: string; title: string; slug: string; mode: 'free' | 'company' | 'other'; company_id: string; company_label: string; purpose: string; status: 'open' | 'closed'; busy: boolean; error: string };
const LINK_FIELDS = 'id,slug,title,company_id,company_label,purpose,status,created_at';
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
  const [editing, setEditing] = useState<LinkDraft | null>(null);
  const [sharing, setSharing] = useState<LinkRow | null>(null);
  const [qr, setQr] = useState('');
  const [removing, setRemoving] = useState<ResultRow | null>(null);

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    const [linkRows, resultRows, companyRows] = await Promise.all([
      supabase.from('profile_links').select(LINK_FIELDS).order('created_at', { ascending: false }),
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
  const linkCompany = (link: LinkRow) => link.company_id ? companyName(link.company_id) : link.company_label ? `${link.company_label} (não cadastrada)` : 'Link livre';
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast((current) => current === message ? '' : current), 2200); };
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return results.filter((row) => (!companyFilter || (companyFilter === 'livre' ? !row.company_id : row.company_id === companyFilter)) && (!term || [row.person_name, row.email, row.job_title, row.company_name, companyName(row.company_id)].join(' ').toLowerCase().includes(term)));
  }, [results, query, companyFilter, companies]);

  function newDraft(): LinkDraft { return { title: 'Perfil Comportamental CALI', slug: '', mode: 'free', company_id: '', company_label: '', purpose: 'desenvolvimento', status: 'open', busy: false, error: '' }; }
  function editDraft(link: LinkRow): LinkDraft { return { id: link.id, title: link.title, slug: link.slug, mode: link.company_id ? 'company' : link.company_label ? 'other' : 'free', company_id: link.company_id || '', company_label: link.company_label || '', purpose: link.purpose, status: link.status, busy: false, error: '' }; }

  async function saveLink() {
    if (!supabase || !editing) return;
    const title = editing.title.trim() || 'Perfil Comportamental CALI';
    if (editing.mode === 'company' && !editing.company_id) { setEditing({ ...editing, error: 'Escolha a empresa.' }); return; }
    if (editing.mode === 'other' && !editing.company_label.trim()) { setEditing({ ...editing, error: 'Digite o nome da empresa.' }); return; }
    const company = companies.find((item) => item.id === editing.company_id);
    const base = slugify(editing.mode === 'company' ? company?.name || 'perfil' : editing.mode === 'other' ? editing.company_label : 'perfil').slice(0, 40) || 'perfil';
    const slug = editing.slug.trim() ? slugify(editing.slug) : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (slug.length < 3) { setEditing({ ...editing, error: 'O endereço precisa de pelo menos 3 letras ou números.' }); return; }
    const payload = { title, slug, purpose: editing.purpose, status: editing.status, company_id: editing.mode === 'company' ? editing.company_id : null, company_label: editing.mode === 'other' ? editing.company_label.trim() : null };
    setEditing({ ...editing, busy: true, error: '' });
    const request = editing.id ? supabase.from('profile_links').update(payload).eq('id', editing.id) : supabase.from('profile_links').insert(payload);
    const { data, error: saveError } = await request.select(LINK_FIELDS).single();
    if (saveError || !data) { setEditing({ ...editing, busy: false, error: /duplicate|unique/i.test(saveError?.message || '') ? 'Este endereço já está em uso. Escolha outro.' : saveError?.message || 'Não foi possível salvar.' }); return; }
    const saved = data as LinkRow;
    setLinks((current) => editing.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setEditing(null); setTab('links'); flash(editing.id ? 'Link atualizado.' : 'Link criado.');
  }

  useEffect(() => { if (sharing) void qrDataUrl(`${BASE}${sharing.slug}`, 480).then(setQr); else setQr(''); }, [sharing]);

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
    <span className="cpa-chip" style={{ background: STYLE_CONTENT[row.primary_style].soft, color: STYLE_CONTENT[row.primary_style].ink }}>{STYLE_CONTENT[row.primary_style].name}</span>
    <span className="cpa-chip ghost" style={{ color: STYLE_CONTENT[row.secondary_style].ink }}>{row.mixed ? '= ' : '+ '}{STYLE_CONTENT[row.secondary_style].name}</span>
  </span>;
  const pressureOf = (row: ResultRow) => { const { level, changed } = adaptationOf(row.scores); return changed.length ? `${level}: ${changed.map((item) => STYLE_CONTENT[item.style].name).join(', ')}` : level; };

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Perfil comportamental</h1><p>Levantamento de perfil (base DISC, método CALI v1.1): link livre ou por empresa, relatório da pessoa por e-mail e relatório do avaliador aqui e na ficha do colaborador.</p></div>
      <div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</button><button className="wf-primary" type="button" onClick={() => setEditing(newDraft())}><Plus size={15} /> Novo link</button></div></div>
    {error && <div className="inline-notice" role="alert">{error}</div>}
    <div className="wf-segments v2-forms-tabs" role="tablist"><button type="button" className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>Resultados ({results.length})</button><button type="button" className={tab === 'links' ? 'on' : ''} onClick={() => setTab('links')}>Links ({links.length})</button></div>

    {tab === 'results' && <>
      <div className="wf-controls v2-forms-controls">
        <label className="v2-forms-search"><Search size={15} /><input value={query} placeholder="Buscar pessoa, e-mail, cargo ou empresa" onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="v2-forms-filter-select" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="">Todas as empresas</option><option value="livre">Links livres</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <span className="v2-forms-total">{filtered.length} de {results.length}</span>
      </div>
      {loading ? <div className="data-loading">Carregando…</div> : !results.length ? <div className="wf-empty"><strong>Nenhum resultado ainda.</strong><p>Crie um link em “Novo link” e envie para a pessoa responder.</p></div>
        : <div className="v2-forms-table-wrap"><table className="v2-forms-table cpa-table"><thead><tr><th>Pessoa</th><th>Empresa</th><th>Perfil</th><th>Sob pressão</th><th>Data</th><th>Validade</th><th>Ficha</th><th>Cliente vê</th><th /></tr></thead><tbody>
          {filtered.map((row) => <tr key={row.id}>
            <td><Link className="cpa-person" to={`/admin/perfil-comportamental/${row.id}`}><strong>{row.person_name}</strong><small>{[row.job_title, row.email].filter(Boolean).join(' · ')}</small></Link></td>
            <td>{companyName(row.company_id, row.company_name)}</td>
            <td>{profileChip(row)}</td>
            <td className="cpa-muted">{pressureOf(row)}</td>
            <td className="cpa-muted">{shortDate(row.created_at)}</td>
            <td>{(() => { const until = new Date(row.created_at); until.setMonth(until.getMonth() + 6); return until.getTime() < Date.now() ? <span className="v2-forms-status closed">Vencido</span> : <span className="v2-forms-status open">Até {shortDate(until.toISOString())}</span>; })()}</td>
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
          <td>{linkCompany(link)}</td>
          <td>{PURPOSE[link.purpose]}</td>
          <td><button type="button" className={`v2-forms-status ${link.status === 'open' ? 'open' : 'closed'}`} onClick={() => void patchLink(link, link.status === 'open' ? 'closed' : 'open')} title="Clique para alternar">{link.status === 'open' ? 'Recebendo respostas' : 'Bloqueado'}</button></td>
          <td>{results.filter((row) => row.link_id === link.id).length}</td>
          <td className="cpa-actions">
            <Link className="wf-secondary" to={`/admin/perfil-comportamental/convites/${link.id}`}><Mail size={14} /> Convites</Link>
            <button type="button" className="wf-secondary" onClick={() => setSharing(link)}><Share2 size={14} /> Compartilhar</button>
            <button type="button" className="v2-forms-edit" aria-label="Editar link" title="Editar link" onClick={() => setEditing(editDraft(link))}><Pencil size={14} /></button>
            <a className="v2-forms-edit" href={`/perfil/${link.slug}?previa=1`} target="_blank" rel="noopener noreferrer" aria-label="Ver como respondente" title="Ver como respondente"><ExternalLink size={14} /></a>
          </td>
        </tr>)}
      </tbody></table></div>)}
  </div></div>
  {toast && <div className="v2-forms-toast" role="status">{toast}</div>}
  {editing && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !editing.busy) setEditing(null); }}><section className="ap-status-confirm cpa-link-dialog" role="dialog" aria-modal="true" aria-label={editing.id ? 'Editar link' : 'Novo link'}>
    <div><small>PERFIL COMPORTAMENTAL</small><h2>{editing.id ? 'Editar link' : 'Novo link'}</h2><p>Sem empresa, o link é livre e a pessoa informa onde trabalha. Com empresa cadastrada, o resultado entra na ficha do colaborador pelo e-mail corporativo.</p></div>
    <label>Nome do link (aparece para a pessoa)<input value={editing.title} maxLength={120} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
    <label>Empresa<select value={editing.mode === 'company' ? editing.company_id : editing.mode} onChange={(event) => { const value = event.target.value; setEditing({ ...editing, mode: value === 'free' ? 'free' : value === 'other' ? 'other' : 'company', company_id: value === 'free' || value === 'other' ? '' : value, error: '' }); }}><option value="free">Link livre (a pessoa informa a empresa)</option><option value="other">Outra empresa (digitar o nome)</option><optgroup label="Empresas cadastradas">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</optgroup></select></label>
    {editing.mode === 'other' && <label>Nome da empresa<input value={editing.company_label} maxLength={120} placeholder="Ex.: Padaria Bom Dia" onChange={(event) => setEditing({ ...editing, company_label: event.target.value, error: '' })} /></label>}
    <label>Contexto de uso<select value={editing.purpose} onChange={(event) => setEditing({ ...editing, purpose: event.target.value })}><option value="desenvolvimento">Desenvolvimento</option><option value="selecao">Seleção</option><option value="diagnostico">Diagnóstico</option></select></label>
    <label>Endereço do link<span className="cpa-slug"><b>app.calirh.com/perfil/</b><input value={editing.slug} maxLength={60} placeholder="gerado automaticamente" onChange={(event) => setEditing({ ...editing, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') })} /></span></label>
    <label>Situação<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as LinkDraft['status'] })}><option value="open">Recebendo respostas</option><option value="closed">Bloqueado (não recebe mais respostas)</option></select></label>
    {editing.id && editing.slug && links.find((item) => item.id === editing.id)?.slug !== slugify(editing.slug) && <p className="v2-forms-warn">Ao trocar o endereço, o link antigo para de funcionar.</p>}
    {editing.error && <p className="v2-forms-error" role="alert">{editing.error}</p>}
    <footer><button type="button" disabled={editing.busy} onClick={() => setEditing(null)}>Cancelar</button><button type="button" disabled={editing.busy} onClick={() => void saveLink()}>{editing.busy ? 'Salvando…' : editing.id ? 'Salvar' : 'Criar link'}</button></footer>
  </section></div>}
  {sharing && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSharing(null); }}><section className="ap-status-confirm cpa-share" role="dialog" aria-modal="true" aria-label="Compartilhar link">
    <div><small>COMPARTILHAR</small><h2>{sharing.title}</h2><p>{linkCompany(sharing)}{sharing.status === 'closed' ? ' · bloqueado: quem abrir verá que não recebe mais respostas' : ''}</p></div>
    <div className="cpa-share-body">
      <div className="cpa-qr">{qr ? <img src={qr} alt="QR Code do link" /> : <span>Gerando…</span>}</div>
      <div className="cpa-share-actions">
        <div className="v2-forms-link"><input readOnly value={`${BASE}${sharing.slug}`} onFocus={(event) => event.target.select()} /><button type="button" className="wf-primary" onClick={() => { void navigator.clipboard.writeText(`${BASE}${sharing.slug}`).then(() => flash('Link copiado.')); }}><Copy size={14} /> Copiar</button></div>
        <button type="button" className="wf-secondary" onClick={() => void downloadQrPng(`${BASE}${sharing.slug}`, `perfil-${sharing.slug}-qrcode.png`)}><QrCode size={14} /> Baixar QR Code</button>
        <button type="button" className="wf-secondary" onClick={() => void downloadShareCard({ title: sharing.title, category: 'Perfil comportamental', intro: 'Queremos conhecer mais sobre você: como decide, se comunica e reage no trabalho. São 24 blocos de 4 frases curtas, em média 12 a 20 minutos, e você recebe o seu relatório por e-mail.' }, `${BASE}${sharing.slug}`, `perfil-${sharing.slug}-cartao.png`)}><Download size={14} /> Baixar cartão para divulgar</button>
        <a className="wf-secondary" href={`https://wa.me/?text=${encodeURIComponent(`${sharing.title}: ${BASE}${sharing.slug}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Enviar no WhatsApp</a>
      </div>
    </div>
    <footer><button type="button" onClick={() => setSharing(null)}>Fechar</button></footer>
  </section></div>}
  {removing && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir resultado">
    <div><small>PERFIL COMPORTAMENTAL</small><h2>Excluir resultado?</h2><p><strong>{removing.person_name}</strong> · {shortDate(removing.created_at)}. Apaga as respostas, os escores e o PDF. Não dá para desfazer.</p></div>
    <footer><button type="button" onClick={() => setRemoving(null)}>Cancelar</button><button type="button" className="danger" onClick={() => void remove()}>Excluir</button></footer>
  </section></div>}
  </div></Shell>;
}
