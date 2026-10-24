/* Perfil Comportamental CALI — área da administradora (/admin/perfil-comportamental): respostas e links.
   Respostas agrupadas por empresa (pensado para muitas pessoas), com filtros por perfil, data, validade e empresa.
   Clicar na pessoa abre a ficha: histórico de respostas, convites, se é cliente da CALI e "Reenviar teste".
   Link livre (qualquer pessoa informa a empresa) ou link de uma empresa (vincula à ficha pelo e-mail corporativo). */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ChevronDown, ChevronRight, Copy, Download, ExternalLink, FileDown, Mail, Pencil, Plus, QrCode, RefreshCw, Search, Send, Share2, Trash2, X } from 'lucide-react';
import { Shell } from '../components/WorkspaceShell';
import { supabase } from '../lib/supabase';
import { downloadQrPng, downloadShareCard, qrDataUrl } from '../forms/formExports';
import { slugify } from '../forms/formModel';
import { adaptationOf, STYLES, type Scores, type Style } from './profileMethod';
import { STYLE_CONTENT } from './profileContent';
import '../forms/admin-forms.css';
import './profile-admin.css';

type LinkRow = { id: string; slug: string; title: string; company_id: string | null; company_label: string | null; purpose: string; status: 'open' | 'closed'; created_at: string };
type LinkDraft = { id?: string; title: string; slug: string; mode: 'free' | 'company' | 'other'; company_id: string; company_label: string; purpose: string; status: 'open' | 'closed'; busy: boolean; error: string };
const LINK_FIELDS = 'id,slug,title,company_id,company_label,purpose,status,created_at';
type ResultRow = { id: string; link_id: string | null; invite_id: string | null; company_id: string | null; company_name: string | null; team_member_id: string | null; person_name: string; email: string; job_title: string | null; primary_style: Style; secondary_style: Style; mixed: boolean; scores: Scores; created_at: string; report_path: string | null; report_emailed_at: string | null };
type InviteLite = { id: string; link_id: string; cycle: number; state: string; sent_at: string | null; deadline_at: string | null; completed_at: string | null };
const PURPOSE: Record<string, string> = { selecao: 'Seleção', desenvolvimento: 'Desenvolvimento', diagnostico: 'Diagnóstico' };
const INVITE_STATE: Record<string, string> = { created: 'Na fila', sent: 'Aguardando resposta', opened: 'Visualizado', started: 'Parcial', completed: 'Respondido', expired: 'Expirado', declined: 'Recusou' };
const BASE = 'https://app.calirh.com/perfil/';
const day = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
const validUntil = (iso: string) => { const date = new Date(iso); date.setMonth(date.getMonth() + 6); return date; };
const isValid = (iso: string) => validUntil(iso).getTime() > Date.now();

/** Bolinha do estilo: inicial do nome do perfil (E, C, P, A) na cor DISC. */
function StyleDot({ style, mixed }: { style: Style; mixed?: boolean }) {
  const content = STYLE_CONTENT[style];
  return <span className={`cpa-dot${style === 'I' ? ' dark' : ''}`} style={{ background: content.color }} title={`${content.name}${mixed ? ' (perfil misto)' : ''}`} aria-label={content.name}>{content.name[0]}</span>;
}

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
  const [styleFilter, setStyleFilter] = useState<Style | ''>('');
  const [validityFilter, setValidityFilter] = useState<'' | 'valid' | 'expired'>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [editing, setEditing] = useState<LinkDraft | null>(null);
  const [sharing, setSharing] = useState<LinkRow | null>(null);
  const [qr, setQr] = useState('');
  const [removing, setRemoving] = useState<ResultRow | null>(null);
  const [person, setPerson] = useState<ResultRow | null>(null);
  const [personInvites, setPersonInvites] = useState<InviteLite[] | null>(null);
  const [resendLink, setResendLink] = useState('');
  const [resending, setResending] = useState(false);

  async function load() {
    if (!supabase) return;
    setLoading(true); setError('');
    const [linkRows, resultRows, companyRows] = await Promise.all([
      supabase.from('profile_links').select(LINK_FIELDS).order('created_at', { ascending: false }),
      supabase.from('profile_results').select('id,link_id,invite_id,company_id,company_name,team_member_id,person_name,email,job_title,primary_style,secondary_style,mixed,scores,created_at,report_path,report_emailed_at').order('created_at', { ascending: false }).limit(5000),
      supabase.from('companies').select('id,display_name,status').order('display_name'),
    ]);
    if (linkRows.error || resultRows.error) setError((linkRows.error || resultRows.error)!.message);
    setLinks((linkRows.data || []) as LinkRow[]);
    setResults((resultRows.data || []) as ResultRow[]);
    setCompanies(((companyRows.data || []) as Array<{ id: string; display_name: string; status: string }>).filter((row) => row.status !== 'archived').map((row) => ({ id: row.id, name: row.display_name })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const companyName = (id: string | null, fallback?: string | null) => (id && companies.find((company) => company.id === id)?.name) || fallback || 'Sem empresa informada';
  const linkCompany = (link: LinkRow) => link.company_id ? companyName(link.company_id) : link.company_label ? `${link.company_label} (não cadastrada)` : 'Link livre';
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast((current) => current === message ? '' : current), 2600); };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00-03:00`).getTime() : null;
    const end = to ? new Date(`${to}T23:59:59-03:00`).getTime() : null;
    return results.filter((row) => {
      const at = new Date(row.created_at).getTime();
      if (companyFilter && (companyFilter === 'livre' ? row.company_id : row.company_id !== companyFilter)) return false;
      if (styleFilter && row.primary_style !== styleFilter) return false;
      if (validityFilter && (validityFilter === 'valid') !== isValid(row.created_at)) return false;
      if (start !== null && at < start) return false;
      if (end !== null && at > end) return false;
      return !term || [row.person_name, row.email, row.job_title, row.company_name, companyName(row.company_id)].join(' ').toLowerCase().includes(term);
    });
  }, [results, query, companyFilter, styleFilter, validityFilter, from, to, companies]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; client: boolean; rows: ResultRow[] }>();
    for (const row of filtered) {
      const key = row.company_id || `livre:${(row.company_name || '').trim().toLowerCase()}`;
      const name = companyName(row.company_id, row.company_name);
      if (!map.has(key)) map.set(key, { key, name, client: Boolean(row.company_id), rows: [] });
      map.get(key)!.rows.push(row);
    }
    return [...map.values()].sort((a, b) => Number(b.client) - Number(a.client) || a.name.localeCompare(b.name, 'pt-BR'));
  }, [filtered, companies]);
  const filtersOn = Boolean(query || companyFilter || styleFilter || validityFilter || from || to);

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
    setResults((current) => current.filter((item) => item.id !== removing.id)); setRemoving(null); flash('Resposta excluída.');
  }

  async function openPerson(row: ResultRow) {
    setPerson(row); setPersonInvites(null);
    const openLinks = links.filter((link) => link.status === 'open');
    setResendLink(openLinks.some((link) => link.id === row.link_id) ? row.link_id! : openLinks[0]?.id || '');
    if (!supabase) return;
    const { data } = await supabase.from('profile_invite_status').select('id,link_id,cycle,state,sent_at,deadline_at,completed_at').ilike('email', row.email).order('created_at', { ascending: false });
    setPersonInvites((data || []) as InviteLite[]);
  }

  async function resend() {
    if (!supabase || !person || !resendLink) return;
    const pending = (personInvites || []).find((invite) => invite.link_id === resendLink && ['sent', 'opened', 'started'].includes(invite.state));
    if (pending) { flash(`Já existe um convite em aberto${pending.deadline_at ? ` até ${day(pending.deadline_at)}` : ''}.`); return; }
    setResending(true);
    const cycle = Math.max(0, ...(personInvites || []).filter((invite) => invite.link_id === resendLink).map((invite) => invite.cycle)) + 1;
    const { data: created, error: insertError } = await supabase.from('profile_invites').insert({ link_id: resendLink, person_name: person.person_name, email: person.email.toLowerCase(), team_member_id: person.team_member_id, cycle }).select('id').single();
    if (insertError || !created) { setResending(false); setError(insertError?.message || 'Não foi possível criar o convite.'); return; }
    const { data: sent, error: sendError } = await supabase.rpc('profile_send_invites', { p_link: resendLink, p_ids: [(created as { id: string }).id] });
    setResending(false);
    if (sendError) { setError(sendError.message); return; }
    flash(`Teste reenviado para ${person.email}. Prazo: ${day((sent as { deadline_at: string }).deadline_at)}.`);
    void openPerson(person);
  }

  const pressureOf = (row: ResultRow) => adaptationOf(row.scores).level;
  const history = person ? results.filter((row) => row.email.toLowerCase() === person.email.toLowerCase()) : [];
  const linkTitle = (id: string | null) => links.find((link) => link.id === id)?.title || 'Link removido';

  const resultRow = (row: ResultRow, showCompany: boolean) => <tr key={row.id}>
    <td><button type="button" className="cpa-person-btn" onClick={() => void openPerson(row)}>{row.person_name}</button></td>
    {showCompany && <td className="cpa-muted">{companyName(row.company_id, row.company_name)}</td>}
    <td><span className="cpa-dots"><StyleDot style={row.primary_style} mixed={row.mixed} /><StyleDot style={row.secondary_style} mixed={row.mixed} /></span></td>
    <td><span className="cpa-tag">{pressureOf(row)}</span></td>
    <td className="cpa-muted">{day(row.created_at)}</td>
    <td>{isValid(row.created_at) ? <span className="v2-forms-status open">{day(validUntil(row.created_at).toISOString())}</span> : <span className="v2-forms-status closed">Vencido</span>}</td>
    <td className="cpa-actions">
      <Link className="wf-secondary" to={`/admin/perfil-comportamental/${row.id}`} title="Relatório técnico para a CALI"><ExternalLink size={14} /> Relatório do avaliador</Link>
      {row.report_path && <button type="button" className="v2-forms-edit" title="PDF que a pessoa recebeu" aria-label="PDF que a pessoa recebeu" onClick={() => void openPdf(row)}><FileDown size={14} /></button>}
      <button type="button" className="v2-forms-edit" aria-label="Excluir resposta" title="Excluir resposta" onClick={() => setRemoving(row)}><Trash2 size={14} /></button>
    </td>
  </tr>;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Perfil comportamental</h1></div>
      <div className="v2-head-actions"><button className="wf-secondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</button><button className="wf-primary" type="button" onClick={() => setEditing(newDraft())}><Plus size={15} /> Novo link</button></div></div>
    <div className="wf-segments v2-forms-tabs" role="tablist"><button type="button" className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>Respostas ({results.length})</button><button type="button" className={tab === 'links' ? 'on' : ''} onClick={() => setTab('links')}>Links e convites ({links.length})</button></div>

    {tab === 'results' && <>
      <div className="wf-controls v2-forms-controls cpa-filters">
        <label className="v2-forms-search"><Search size={15} /><input value={query} placeholder="Buscar pessoa, e-mail ou empresa" onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="v2-forms-filter-select" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Empresa"><option value="">Todas as empresas</option><option value="livre">Sem empresa cadastrada</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <select className="v2-forms-filter-select" value={styleFilter} onChange={(event) => setStyleFilter(event.target.value as Style | '')} aria-label="Perfil predominante"><option value="">Todos os perfis</option>{STYLES.map((style) => <option key={style} value={style}>{STYLE_CONTENT[style].name}</option>)}</select>
        <select className="v2-forms-filter-select" value={validityFilter} onChange={(event) => setValidityFilter(event.target.value as typeof validityFilter)} aria-label="Validade"><option value="">Vigentes e vencidos</option><option value="valid">Só vigentes</option><option value="expired">Só vencidos</option></select>
        <label className="cpa-date">Respondido de<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="cpa-date">até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className="cpa-group-toggle"><input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} /> Agrupar por empresa</label>
        {filtersOn && <button type="button" className="cpa-clear" onClick={() => { setQuery(''); setCompanyFilter(''); setStyleFilter(''); setValidityFilter(''); setFrom(''); setTo(''); }}><X size={13} /> Limpar filtros</button>}
        <span className="v2-forms-total">{filtered.length} de {results.length}</span>
      </div>
      {loading ? <div className="data-loading">Carregando…</div> : !results.length ? <div className="wf-empty"><strong>Nenhuma resposta ainda.</strong><p>Crie um link em "Novo link" e envie os convites.</p></div>
        : !filtered.length ? <div className="wf-empty"><strong>Nada com esses filtros.</strong><p>Ajuste ou limpe os filtros.</p></div>
        : <div className="v2-forms-table-wrap"><table className="v2-forms-table cpa-table"><thead><tr><th>Pessoa</th>{!grouped && <th>Empresa</th>}<th>Perfil</th><th>Sob pressão</th><th>Respondido em</th><th>Válido até</th><th /></tr></thead><tbody>
          {grouped ? groups.map((group) => { const closed = collapsed.includes(group.key); const valid = group.rows.filter((row) => isValid(row.created_at)).length; return <Fragment key={group.key}>
            <tr className="cpa-group"><td colSpan={6}><button type="button" onClick={() => setCollapsed((current) => closed ? current.filter((key) => key !== group.key) : [...current, group.key])} aria-expanded={!closed}>
              {closed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}<strong>{group.name}</strong>
              <span className={`cpa-badge ${group.client ? 'client' : ''}`}>{group.client ? 'Cliente CALI' : 'Fora da carteira'}</span>
              <span className="cpa-group-count">{group.rows.length} {group.rows.length === 1 ? 'pessoa' : 'pessoas'} · {valid} {valid === 1 ? 'vigente' : 'vigentes'}</span>
            </button></td></tr>
            {!closed && group.rows.map((row) => resultRow(row, false))}
          </Fragment>; }) : filtered.map((row) => resultRow(row, true))}
        </tbody></table></div>}
    </>}

    {tab === 'links' && (loading ? <div className="data-loading">Carregando…</div> : !links.length ? <div className="wf-empty"><strong>Nenhum link ainda.</strong><p>"Novo link" cria um link livre ou de uma empresa.</p></div>
      : <div className="v2-forms-table-wrap"><table className="v2-forms-table cpa-table"><thead><tr><th>Link</th><th>Empresa</th><th>Contexto</th><th>Situação</th><th>Respostas</th><th /></tr></thead><tbody>
        {links.map((link) => <tr key={link.id}>
          <td><span className="cpa-person"><strong>{link.title}</strong><small>{BASE.replace('https://', '')}{link.slug}</small></span></td>
          <td>{linkCompany(link)}</td>
          <td>{PURPOSE[link.purpose]}</td>
          <td><button type="button" className={`v2-forms-status ${link.status === 'open' ? 'open' : 'closed'}`} onClick={() => void patchLink(link, link.status === 'open' ? 'closed' : 'open')} title="Clique para alternar">{link.status === 'open' ? 'Recebendo respostas' : 'Bloqueado'}</button></td>
          <td>{results.filter((row) => row.link_id === link.id).length}</td>
          <td className="cpa-actions">
            <Link className="wf-secondary" to={`/admin/perfil-comportamental/convites/${link.id}`}><Mail size={14} /> Convites</Link>
            <Link className="wf-secondary" to={`/admin/perfil-comportamental/gestao/${link.id}`}><BarChart3 size={14} /> Relatório de gestão</Link>
            <button type="button" className="wf-secondary" onClick={() => setSharing(link)}><Share2 size={14} /> Compartilhar</button>
            <button type="button" className="v2-forms-edit" aria-label="Editar link" title="Editar link" onClick={() => setEditing(editDraft(link))}><Pencil size={14} /></button>
            <a className="v2-forms-edit" href={`/perfil/${link.slug}?previa=1`} target="_blank" rel="noopener noreferrer" aria-label="Ver como respondente" title="Ver como respondente"><ExternalLink size={14} /></a>
          </td>
        </tr>)}
      </tbody></table></div>)}
    {error && <div className="inline-notice cpc-notice error" role="alert">{error}</div>}
  </div></div>
  {toast && <div className="v2-forms-toast" role="status">{toast}</div>}

  {person && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setPerson(null); }}><section className="ap-status-confirm cpa-person-card" role="dialog" aria-modal="true" aria-label={person.person_name}>
    <div><small>PESSOA</small><h2>{person.person_name}</h2><p>{[person.job_title, person.email].filter(Boolean).join(' · ')}</p></div>
    <dl className="cpa-facts">
      <div><dt>Empresa</dt><dd>{companyName(person.company_id, person.company_name)} <span className={`cpa-badge ${person.company_id ? 'client' : ''}`}>{person.company_id ? 'Cliente CALI' : 'Fora da carteira'}</span></dd></div>
      <div><dt>Respondeu</dt><dd>{history.length} {history.length === 1 ? 'vez' : 'vezes'}</dd></div>
      <div><dt>Convites</dt><dd>{personInvites === null ? 'Carregando…' : personInvites.length ? `${personInvites.length} (${personInvites.filter((invite) => invite.state === 'completed').length} respondidos)` : 'Nenhum: respondeu por link aberto'}</dd></div>
    </dl>
    <div className="cpa-history">{history.map((row) => <div key={row.id}>
      <span className="cpa-dots"><StyleDot style={row.primary_style} mixed={row.mixed} /><StyleDot style={row.secondary_style} mixed={row.mixed} /></span>
      <span><b>{day(row.created_at)}</b><small>{linkTitle(row.link_id)} · {isValid(row.created_at) ? `válido até ${day(validUntil(row.created_at).toISOString())}` : 'vencido'}</small></span>
      <Link className="wf-secondary" to={`/admin/perfil-comportamental/${row.id}`}>Relatório do avaliador</Link>
    </div>)}</div>
    {!!personInvites?.some((invite) => invite.state !== 'completed') && <ul className="cpa-invites">{personInvites.filter((invite) => invite.state !== 'completed').map((invite) => <li key={invite.id}>{linkTitle(invite.link_id)} · {INVITE_STATE[invite.state] || invite.state}{invite.deadline_at ? ` · prazo ${day(invite.deadline_at)}` : ''}</li>)}</ul>}
    <div className="cpa-resend">
      <label>Reenviar o teste pelo link<select value={resendLink} onChange={(event) => setResendLink(event.target.value)}>{!links.some((link) => link.status === 'open') && <option value="">Nenhum link recebendo respostas</option>}{links.filter((link) => link.status === 'open').map((link) => <option key={link.id} value={link.id}>{link.title} · {linkCompany(link)}</option>)}</select></label>
      <p className="cpa-muted">A pessoa recebe um convite novo por e-mail, com prazo e lembretes. As respostas anteriores continuam no histórico.</p>
    </div>
    <footer><button type="button" onClick={() => setPerson(null)}>Fechar</button><button type="button" disabled={!resendLink || resending} onClick={() => void resend()}><Send size={14} /> {resending ? 'Enviando…' : 'Reenviar teste'}</button></footer>
  </section></div>}

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
  {removing && <div className="ap-pd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}><section className="ap-status-confirm" role="dialog" aria-modal="true" aria-label="Excluir resposta">
    <div><small>PERFIL COMPORTAMENTAL</small><h2>Tem certeza que quer excluir?</h2><p><strong>{removing.person_name}</strong> · respondido em {day(removing.created_at)}. Apaga as respostas, os escores e o PDF. Não dá para desfazer.</p></div>
    <footer><button type="button" onClick={() => setRemoving(null)}>Cancelar</button><button type="button" className="danger" onClick={() => void remove()}>Excluir</button></footer>
  </section></div>}
  </div></Shell>;
}
