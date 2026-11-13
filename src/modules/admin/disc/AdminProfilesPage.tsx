import { WorkspaceConfirmDialog } from '../../../components/workspace/components/WorkspaceConfirmDialog';
import { WorkspaceDialogOverlay } from '../../../components/workspace/components/WorkspaceDialogOverlay';
import { FormFeedbackToast } from '../../../components/forms/FormFeedbackToast';
import { FormStatusBadge } from '../../../components/forms/FormStatusBadge';
import { FormResultsTable } from '../../../components/forms/FormResultsTable';
/* Perfil Comportamental CALI — área da administradora (/admin/perfil-comportamental): respostas e links.
   Respostas agrupadas por empresa (pensado para muitas pessoas), com filtros por perfil, data, validade e empresa.
   Clicar na pessoa abre a ficha: histórico de respostas, convites, se é cliente da CALI e "Reenviar teste".
   Link livre (qualquer pessoa informa a empresa) ou link de uma empresa (vincula à ficha pelo e-mail corporativo). */
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { LoadingState } from '../../../components/ds/LoadingState';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { BarChart3, ChevronDown, ChevronRight, Copy, Download, ExternalLink, FileDown, Mail, Pencil, Plus, QrCode, RefreshCw, Search, Send, Share2, Trash2, X } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import {
  addDiscInviteCycle, changeDiscLinkStatus, deliverDiscInvites, readDiscCatalog, readDiscInviteHistory,
  saveDiscLink, type DiscLink as LinkRow,
} from '../../../api/disc/campaigns';
import { deleteDiscResult, signRespondentReport } from '../../../api/disc/reports';
import { downloadQrPng, downloadShareCard, qrDataUrl } from '../forms/formExports';
import { slugify } from '../../forms/formModel';
import { adaptationOf, STYLES, type Scores, type Style } from '../../disc/profileMethod';
import { STYLE_CONTENT } from '../../disc/profileContent';

type LinkDraft = { id?: string; title: string; slug: string; mode: 'free' | 'company' | 'other'; company_id: string; company_label: string; purpose: string; status: 'open' | 'closed'; busy: boolean; error: string };
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
  return <span className={`cpa-dot tw:inline-grid tw:size-[1.85rem] tw:place-items-center tw:rounded-full tw:text-[0.85rem] tw:font-bold ${style === 'I' ? 'dark tw:text-[#5a4100]' : 'tw:text-white'}`} style={{ background: content.color }} title={`${content.name}${mixed ? ' (perfil misto)' : ''}`} aria-label={content.name}>{content.name[0]}</span>;
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
    setLoading(true); setError('');
    const catalog = await readDiscCatalog();
    if (catalog.error) setError(catalog.error.message);
    setLinks(catalog.links);
    setResults(catalog.results as ResultRow[]);
    setCompanies(catalog.companies);
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
    if (!editing) return;
    const title = editing.title.trim() || 'Perfil Comportamental CALI';
    if (editing.mode === 'company' && !editing.company_id) { setEditing({ ...editing, error: 'Escolha a empresa.' }); return; }
    if (editing.mode === 'other' && !editing.company_label.trim()) { setEditing({ ...editing, error: 'Digite o nome da empresa.' }); return; }
    const company = companies.find((item) => item.id === editing.company_id);
    const base = slugify(editing.mode === 'company' ? company?.name || 'perfil' : editing.mode === 'other' ? editing.company_label : 'perfil').slice(0, 40) || 'perfil';
    const slug = editing.slug.trim() ? slugify(editing.slug) : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (slug.length < 3) { setEditing({ ...editing, error: 'O endereço precisa de pelo menos 3 letras ou números.' }); return; }
    const payload = { title, slug, purpose: editing.purpose, status: editing.status, company_id: editing.mode === 'company' ? editing.company_id : null, company_label: editing.mode === 'other' ? editing.company_label.trim() : null };
    setEditing({ ...editing, busy: true, error: '' });
    const { data, error: saveError } = await saveDiscLink(editing.id, payload);
    if (saveError || !data) { setEditing({ ...editing, busy: false, error: /duplicate|unique/i.test(saveError?.message || '') ? 'Este endereço já está em uso. Escolha outro.' : saveError?.message || 'Não foi possível salvar.' }); return; }
    const saved = data as LinkRow;
    setLinks((current) => editing.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
    setEditing(null); setTab('links'); flash(editing.id ? 'Link atualizado.' : 'Link criado.');
  }

  useEffect(() => { if (sharing) void qrDataUrl(`${BASE}${sharing.slug}`, 480).then(setQr); else setQr(''); }, [sharing]);

  async function patchLink(link: LinkRow, status: LinkRow['status']) {
    setLinks((current) => current.map((item) => item.id === link.id ? { ...item, status } : item));
    const { error: updateError } = await changeDiscLinkStatus(link.id, status);
    if (updateError) { setError(updateError.message); setLinks((current) => current.map((item) => item.id === link.id ? link : item)); }
  }

  async function openPdf(row: ResultRow) {
    if (!row.report_path) return;
    const opened = window.open('', '_blank');
    const url = await signRespondentReport(row.report_path);
    if (url && opened) opened.location.href = url; else opened?.close();
  }

  async function remove() {
    if (!removing) return;
    const { error: deleteError } = await deleteDiscResult(removing.id, removing.report_path);
    if (deleteError) { setError(deleteError.message); setRemoving(null); return; }
    setResults((current) => current.filter((item) => item.id !== removing.id)); setRemoving(null); flash('Resposta excluída.');
  }

  async function openPerson(row: ResultRow) {
    setPerson(row); setPersonInvites(null);
    const openLinks = links.filter((link) => link.status === 'open');
    setResendLink(openLinks.some((link) => link.id === row.link_id) ? row.link_id! : openLinks[0]?.id || '');
    setPersonInvites(await readDiscInviteHistory(row.email) as InviteLite[]);
  }

  async function resend() {
    if (!person || !resendLink) return;
    const pending = (personInvites || []).find((invite) => invite.link_id === resendLink && ['sent', 'opened', 'started'].includes(invite.state));
    if (pending) { flash(`Já existe um convite em aberto${pending.deadline_at ? ` até ${day(pending.deadline_at)}` : ''}.`); return; }
    setResending(true);
    const cycle = Math.max(0, ...(personInvites || []).filter((invite) => invite.link_id === resendLink).map((invite) => invite.cycle)) + 1;
    const { data: created, error: insertError } = await addDiscInviteCycle(resendLink, {
      person_name: person.person_name, email: person.email.toLowerCase(), team_member_id: person.team_member_id,
    }, cycle);
    if (insertError || !created) { setResending(false); setError(insertError?.message || 'Não foi possível criar o convite.'); return; }
    const { data: sent, error: sendError } = await deliverDiscInvites(resendLink, [created.id]);
    setResending(false);
    if (sendError) { setError(sendError.message); return; }
    flash(`Teste reenviado para ${person.email}. Prazo: ${day((sent as { deadline_at: string }).deadline_at)}.`);
    void openPerson(person);
  }

  const pressureOf = (row: ResultRow) => adaptationOf(row.scores).level;
  const history = person ? results.filter((row) => row.email.toLowerCase() === person.email.toLowerCase()) : [];
  const linkTitle = (id: string | null) => links.find((link) => link.id === id)?.title || 'Link removido';

  const resultRow = (row: ResultRow, showCompany: boolean) => <tr key={row.id}>
    <td><button type="button" className="cpa-person-btn tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:text-[1rem]
      tw:font-semibold tw:text-[#3e3533] tw:hover:text-cali-brand tw:hover:underline" onClick={() => void openPerson(row)}>{row.person_name}</button></td>
    {showCompany && <td className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">{companyName(row.company_id, row.company_name)}</td>}
    <td><span className="cpa-dots tw:inline-flex tw:items-center tw:gap-[0.31rem]"><StyleDot style={row.primary_style} mixed={row.mixed} /><StyleDot style={row.secondary_style} mixed={row.mixed} /></span></td>
    <td><span className="cpa-tag tw:inline-flex tw:rounded-full tw:bg-[#f3ece6] tw:px-[0.77rem] tw:py-[0.23rem] tw:text-[0.85rem] tw:font-semibold tw:whitespace-nowrap tw:text-[#5a4e48]">{pressureOf(row)}</span></td>
    <td className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">{day(row.created_at)}</td>
    <td>{isValid(row.created_at) ? <FormStatusBadge status="open">{day(validUntil(row.created_at).toISOString())}</FormStatusBadge> : <FormStatusBadge status="closed">Vencido</FormStatusBadge>}</td>
    <td className="cpa-actions tw:table-cell tw:text-right tw:whitespace-nowrap tw:[&>*]:ml-[0.46rem] tw:[&>*]:inline-flex
      tw:[&>*]:align-middle tw:[&_a.wf-secondary]:no-underline tw:[&_a.v2-forms-edit]:inline-grid tw:[&_a.v2-forms-edit]:place-items-center
      tw:[&_a.v2-forms-edit]:no-underline">
      <Link className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
        tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
        tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
        tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/${row.id}`} title="Relatório técnico para a CALI"><ExternalLink size={14} /> Relatório do avaliador</Link>
      {row.report_path && <button type="button" className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
        tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
        tw:[&:hover]:bg-[#fbf7f3]" title="PDF que a pessoa recebeu" aria-label="PDF que a pessoa recebeu" onClick={() => void openPdf(row)}><FileDown size={14} /></button>}
      <button type="button" className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
        tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
        tw:[&:hover]:bg-[#fbf7f3]" aria-label="Excluir resposta" title="Excluir resposta" onClick={() => setRemoving(row)}><Trash2 size={14} /></button>
    </td>
  </tr>;

  return <Shell role="admin"><div className="ap-app v2-admin-page v2-forms v2-client-module tw:[--fm-wine:#5a1e2d] tw:[--fm-line:#eadfd6] tw:[--fm-muted:#8c7e74]
    tw:[--fm-ink:#3e3533] tw:[&_.wf-head_.v2-head-actions_a]:no-underline tw:[&_label>span]:block
    tw:[&_label>span]:text-[0.846rem] tw:[&_label>span]:font-semibold tw:[&_label>span]:text-[color:var(--fm-ink)]
    tw:[&_label>span]:mb-[0.462rem] tw:[&_label>span_em]:not-italic tw:[&_label>span_em]:font-medium
    tw:[&_label>span_em]:text-[color:var(--fm-muted)] tw:[&_label>span_em]:ml-[0.308rem]    tw:[&_textarea]:resize-y tw:[&_:is(input,select,textarea):focus]:outline-none tw:[&_:is(input,select,textarea):focus]:[border-color:var(--fm-wine)]
    tw:[&_:is(input,select,textarea):focus]:[box-shadow:0_0_0_0.231rem_rgba(90,30,45,.08)]"><div className="ap-content"><div className="wf">
    <div className="wf-head"><div><small>BACKOFFICE / CALI RH</small><h1>Perfil comportamental</h1></div>
      <div className="v2-head-actions"><Button variant="formSecondary" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Atualizar</Button><Button variant="workflowPrimary" type="button" onClick={() => setEditing(newDraft())}><Plus size={15} /> Novo link</Button></div></div>
    <div className="wf-segments v2-forms-tabs tw:[margin:0.308rem_0_1.231rem] tw:w-max tw:max-w-full" role="tablist"><button type="button" className={tab === 'results' ? 'on' : ''} onClick={() => setTab('results')}>Respostas ({results.length})</button><button type="button" className={tab === 'links' ? 'on' : ''} onClick={() => setTab('links')}>Links e convites ({links.length})</button></div>

    {tab === 'results' && <>
      <div className="wf-controls v2-forms-controls cpa-filters tw:flex-wrap tw:gap-[0.77rem] tw:flex tw:items-center tw:gap-[0.769rem] tw:flex-wrap tw:mb-[0.923rem]">
        <label className="v2-forms-search tw:flex tw:items-center tw:gap-[0.538rem] tw:flex-1 tw:min-w-[16.923rem] tw:max-w-[29.231rem]
          tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0_0.769rem] tw:bg-white tw:text-[color:var(--fm-muted)]
          tw:[&_input]:flex-1 tw:[&_input]:border-0 tw:[&_input]:outline-none tw:[&_input]:[padding:0.692rem_0]
          tw:[&_input]:[font:400_0.923rem_Inter,sans-serif] tw:[&_input]:bg-transparent"><Search size={15} /><input value={query} placeholder="Buscar pessoa, e-mail ou empresa" onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
          tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Empresa"><option value="">Todas as empresas</option><option value="livre">Sem empresa cadastrada</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
        <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
          tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" value={styleFilter} onChange={(event) => setStyleFilter(event.target.value as Style | '')} aria-label="Perfil predominante"><option value="">Todos os perfis</option>{STYLES.map((style) => <option key={style} value={style}>{STYLE_CONTENT[style].name}</option>)}</select>
        <select className="v2-forms-filter-select tw:[border:1px_solid_#e3d6cc] tw:rounded-[0.615rem] tw:[padding:0.615rem_0.769rem]
          tw:[font:500_0.923rem_Inter,sans-serif] tw:text-[color:var(--fm-ink)] tw:bg-white tw:max-w-[18.462rem]" value={validityFilter} onChange={(event) => setValidityFilter(event.target.value as typeof validityFilter)} aria-label="Validade"><option value="">Vigentes e vencidos</option><option value="valid">Só vigentes</option><option value="expired">Só vencidos</option></select>
        <label className="cpa-date tw:inline-flex tw:items-center tw:gap-[0.46rem] tw:text-[0.92rem] tw:font-medium tw:text-[#6b5d63]
          tw:[&_input]:rounded-[0.62rem] tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-[#e3d6cc]
          tw:[&_input]:bg-white tw:[&_input]:px-[0.62rem] tw:[&_input]:py-[0.54rem] tw:[&_input]:text-[0.96rem]
          tw:[&_input]:font-normal">Respondido de<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="cpa-date tw:inline-flex tw:items-center tw:gap-[0.46rem] tw:text-[0.92rem] tw:font-medium tw:text-[#6b5d63]
          tw:[&_input]:rounded-[0.62rem] tw:[&_input]:border tw:[&_input]:border-solid tw:[&_input]:border-[#e3d6cc]
          tw:[&_input]:bg-white tw:[&_input]:px-[0.62rem] tw:[&_input]:py-[0.54rem] tw:[&_input]:text-[0.96rem]
          tw:[&_input]:font-normal">até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className="cpa-group-toggle tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.46rem] tw:text-[0.96rem]
          tw:font-medium tw:text-[#3e3533] tw:[&_input]:size-[1.15rem] tw:[&_input]:accent-cali-brand"><input type="checkbox" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} /> Agrupar por empresa</label>
        {filtersOn && <button type="button" className="cpa-clear tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.31rem] tw:border-0 tw:bg-transparent tw:text-[0.92rem] tw:font-semibold tw:text-cali-brand" onClick={() => { setQuery(''); setCompanyFilter(''); setStyleFilter(''); setValidityFilter(''); setFrom(''); setTo(''); }}><X size={13} /> Limpar filtros</button>}
        <span className="v2-forms-total tw:text-[0.846rem] tw:text-[color:var(--fm-muted)] tw:mr-auto">{filtered.length} de {results.length}</span>
      </div>
      {loading ? <LoadingState>Carregando…</LoadingState> : !results.length ? <EmptyState variant="workflow"><strong>Nenhuma resposta ainda.</strong><p>Crie um link em &quot;Novo link&quot; e envie os convites.</p></EmptyState>
        : !filtered.length ? <EmptyState variant="workflow"><strong>Nada com esses filtros.</strong><p>Ajuste ou limpe os filtros.</p></EmptyState>
        : <FormResultsTable><thead><tr><th>Pessoa</th>{!grouped && <th>Empresa</th>}<th>Perfil</th><th>Sob pressão</th><th>Respondido em</th><th>Válido até</th><th /></tr></thead><tbody>
          {grouped ? groups.map((group) => { const closed = collapsed.includes(group.key); const valid = group.rows.filter((row) => isValid(row.created_at)).length; return <Fragment key={group.key}>
            <tr className="cpa-group tw:[&_td]:border-t tw:[&_td]:border-solid tw:[&_td]:border-[#eadfd6] tw:[&_td]:bg-[#faf6f2]
              tw:[&_td]:p-0 tw:[&_button]:flex tw:[&_button]:w-full tw:[&_button]:cursor-pointer tw:[&_button]:items-center
              tw:[&_button]:gap-[0.77rem] tw:[&_button]:border-0 tw:[&_button]:bg-transparent tw:[&_button]:px-[1.08rem]
              tw:[&_button]:py-[0.85rem] tw:[&_button]:text-left tw:[&_button]:text-[1rem] tw:[&_button]:font-normal
              tw:[&_button]:text-[#3e3533] tw:[&_strong]:text-[1.04rem] tw:[&_strong]:text-cali-brand"><td colSpan={6}><button type="button" onClick={() => setCollapsed((current) => closed ? current.filter((key) => key !== group.key) : [...current, group.key])} aria-expanded={!closed}>
              {closed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}<strong>{group.name}</strong>
              <span className={`cpa-badge tw:inline-flex tw:rounded-full tw:px-[0.62rem] tw:py-[0.15rem] tw:text-[0.81rem] tw:font-semibold ${group.client ? 'client tw:bg-[#f3e4e8] tw:text-cali-brand' : 'tw:bg-[#f1ece8] tw:text-[#8c7e74]'}`}>{group.client ? 'Cliente CALI' : 'Fora da carteira'}</span>
              <span className="cpa-group-count tw:ml-auto tw:text-[0.92rem] tw:text-[#8c7e74]">{group.rows.length} {group.rows.length === 1 ? 'pessoa' : 'pessoas'} · {valid} {valid === 1 ? 'vigente' : 'vigentes'}</span>
            </button></td></tr>
            {!closed && group.rows.map((row) => resultRow(row, false))}
          </Fragment>; }) : filtered.map((row) => resultRow(row, true))}
        </tbody></FormResultsTable>}
    </>}

    {tab === 'links' && (loading ? <LoadingState>Carregando…</LoadingState> : !links.length ? <EmptyState variant="workflow"><strong>Nenhum link ainda.</strong><p>&quot;Novo link&quot; cria um link livre ou de uma empresa.</p></EmptyState>
      : <FormResultsTable><thead><tr><th>Link</th><th>Empresa</th><th>Contexto</th><th>Situação</th><th>Respostas</th><th /></tr></thead><tbody>
        {links.map((link) => <tr key={link.id}>
          <td><span className="cpa-person tw:flex tw:flex-col tw:gap-[0.15rem] tw:text-inherit tw:no-underline tw:[&_strong]:text-[1rem]
            tw:[&_strong]:text-[#3e3533] tw:[&_small]:text-[0.85rem] tw:[&_small]:text-[#8c7e74]"><strong>{link.title}</strong><small>{BASE.replace('https://', '')}{link.slug}</small></span></td>
          <td>{linkCompany(link)}</td>
          <td>{PURPOSE[link.purpose]}</td>
          <td><FormStatusBadge status={link.status === 'open' ? 'open' : 'closed'} onClick={() => void patchLink(link, link.status === 'open' ? 'closed' : 'open')} title="Clique para alternar">{link.status === 'open' ? 'Recebendo respostas' : 'Bloqueado'}</FormStatusBadge></td>
          <td>{results.filter((row) => row.link_id === link.id).length}</td>
          <td className="cpa-actions tw:table-cell tw:text-right tw:whitespace-nowrap tw:[&>*]:ml-[0.46rem] tw:[&>*]:inline-flex
            tw:[&>*]:align-middle tw:[&_a.wf-secondary]:no-underline tw:[&_a.v2-forms-edit]:inline-grid tw:[&_a.v2-forms-edit]:place-items-center
            tw:[&_a.v2-forms-edit]:no-underline">
            <Link className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
              tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
              tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
              tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/convites/${link.id}`}><Mail size={14} /> Convites</Link>
            <Link className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
              tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
              tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
              tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/gestao/${link.id}`}><BarChart3 size={14} /> Relatório de gestão</Link>
            <Button type="button" variant="formSecondary" onClick={() => setSharing(link)}><Share2 size={14} /> Compartilhar</Button>
            <button type="button" className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
              tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
              tw:[&:hover]:bg-[#fbf7f3]" aria-label="Editar link" title="Editar link" onClick={() => setEditing(editDraft(link))}><Pencil size={14} /></button>
            <a className="v2-forms-edit tw:grid tw:place-items-center tw:w-[2.154rem] tw:h-[2.154rem] tw:[border:1px_solid_#eadfd6]
              tw:rounded-[0.538rem] tw:bg-white tw:text-cali-brand tw:cursor-pointer tw:[&:hover]:border-cali-brand
              tw:[&:hover]:bg-[#fbf7f3]" href={`/perfil/${link.slug}?previa=1`} target="_blank" rel="noopener noreferrer" aria-label="Ver como respondente" title="Ver como respondente"><ExternalLink size={14} /></a>
          </td>
        </tr>)}
      </tbody></FormResultsTable>)}
    {error && <InlineNotice className="cpc-notice error tw:m-0 tw:rounded-[0.77rem] tw:border tw:border-solid tw:border-[#f0c8c0] tw:bg-[#fdf1ee]
      tw:px-[1.23rem] tw:py-[0.92rem] tw:text-[1rem] tw:text-[#8d382a]" role="alert">{error}</InlineNotice>}
  </div></div>
  {toast && <FormFeedbackToast>{toast}</FormFeedbackToast>}

  {person && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) setPerson(null); }}><WorkspaceConfirmDialog className="cpa-person-card tw:max-h-[92vh] tw:w-[min(47.69rem,96vw)] tw:overflow-auto" aria-label={person.person_name}>
    <div><small>PESSOA</small><h2>{person.person_name}</h2><p>{[person.job_title, person.email].filter(Boolean).join(' · ')}</p></div>
    <dl className="cpa-facts tw:m-0 tw:grid tw:grid-cols-3 tw:gap-[0.77rem] tw:max-[640px]:grid-cols-1 tw:[&>div]:rounded-[0.77rem]
      tw:[&>div]:border tw:[&>div]:border-solid tw:[&>div]:border-[#eadfd6] tw:[&>div]:bg-[#fbf7f3]
      tw:[&>div]:px-[0.92rem] tw:[&>div]:py-[0.77rem] tw:[&_dt]:mb-[0.31rem] tw:[&_dt]:text-[0.77rem]
      tw:[&_dt]:font-bold tw:[&_dt]:tracking-[0.08em] tw:[&_dt]:text-[#8c7e74] tw:[&_dt]:uppercase tw:[&_dd]:m-0
      tw:[&_dd]:flex tw:[&_dd]:flex-wrap tw:[&_dd]:items-center tw:[&_dd]:gap-[0.46rem] tw:[&_dd]:text-[1rem]
      tw:[&_dd]:text-[#3e3533]">
      <div><dt>Empresa</dt><dd>{companyName(person.company_id, person.company_name)} <span className={`cpa-badge tw:inline-flex tw:rounded-full tw:px-[0.62rem] tw:py-[0.15rem] tw:text-[0.81rem] tw:font-semibold ${person.company_id ? 'client tw:bg-[#f3e4e8] tw:text-cali-brand' : 'tw:bg-[#f1ece8] tw:text-[#8c7e74]'}`}>{person.company_id ? 'Cliente CALI' : 'Fora da carteira'}</span></dd></div>
      <div><dt>Respondeu</dt><dd>{history.length} {history.length === 1 ? 'vez' : 'vezes'}</dd></div>
      <div><dt>Convites</dt><dd>{personInvites === null ? 'Carregando…' : personInvites.length ? `${personInvites.length} (${personInvites.filter((invite) => invite.state === 'completed').length} respondidos)` : 'Nenhum: respondeu por link aberto'}</dd></div>
    </dl>
    <div className="cpa-history tw:flex tw:flex-col tw:gap-[0.46rem]">{history.map((row) => <div key={row.id} className="tw:flex tw:items-center tw:gap-[0.92rem] tw:rounded-[0.77rem] tw:border tw:border-solid tw:border-[#eadfd6]
      tw:px-[0.92rem] tw:py-[0.77rem] tw:max-[640px]:flex-wrap">
      <span className="cpa-dots tw:inline-flex tw:items-center tw:gap-[0.31rem]"><StyleDot style={row.primary_style} mixed={row.mixed} /><StyleDot style={row.secondary_style} mixed={row.mixed} /></span>
      <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:text-[1rem] tw:max-[640px]:basis-[calc(100%-5rem)]"><b>{day(row.created_at)}</b><small className="tw:text-[0.88rem] tw:font-normal tw:tracking-normal tw:text-[#8c7e74] tw:normal-case">{linkTitle(row.link_id)} · {isValid(row.created_at) ? `válido até ${day(validUntil(row.created_at).toISOString())}` : 'vencido'}</small></span>
      <Link className="wf-secondary tw:whitespace-nowrap tw:no-underline tw:max-[640px]:ml-auto tw:inline-flex tw:items-center
        tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc] tw:bg-white tw:text-cali-brand
        tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif] tw:no-underline
        tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
        tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" to={`/admin/perfil-comportamental/${row.id}`}>Relatório do avaliador</Link>
    </div>)}</div>
    {!!personInvites?.some((invite) => invite.state !== 'completed') && <ul className="cpa-invites tw:m-0 tw:pl-[1.38rem] tw:text-[0.96rem] tw:leading-[1.6] tw:text-[#6b5d63]">{personInvites.filter((invite) => invite.state !== 'completed').map((invite) => <li key={invite.id}>{linkTitle(invite.link_id)} · {INVITE_STATE[invite.state] || invite.state}{invite.deadline_at ? ` · prazo ${day(invite.deadline_at)}` : ''}</li>)}</ul>}
    <div className="cpa-resend tw:flex tw:flex-col tw:gap-[0.46rem] tw:border-t tw:border-solid tw:border-[#f1e9e2] tw:pt-[0.92rem] tw:[&_p]:m-0">
      <label>Reenviar o teste pelo link<select value={resendLink} onChange={(event) => setResendLink(event.target.value)}>{!links.some((link) => link.status === 'open') && <option value="">Nenhum link recebendo respostas</option>}{links.filter((link) => link.status === 'open').map((link) => <option key={link.id} value={link.id}>{link.title} · {linkCompany(link)}</option>)}</select></label>
      <p className="cpa-muted tw:text-[0.92rem] tw:text-[#8c7e74]">A pessoa recebe um convite novo por e-mail, com prazo e lembretes. As respostas anteriores continuam no histórico.</p>
    </div>
    <footer><button type="button" onClick={() => setPerson(null)}>Fechar</button><button type="button" disabled={!resendLink || resending} onClick={() => void resend()}><Send size={14} /> {resending ? 'Enviando…' : 'Reenviar teste'}</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}

  {editing && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget && !editing.busy) setEditing(null); }}><WorkspaceConfirmDialog className="cpa-link-dialog tw:max-h-[92vh] tw:overflow-auto" aria-label={editing.id ? 'Editar link' : 'Novo link'}>
    <div><small>PERFIL COMPORTAMENTAL</small><h2>{editing.id ? 'Editar link' : 'Novo link'}</h2><p>Sem empresa, o link é livre e a pessoa informa onde trabalha. Com empresa cadastrada, o resultado entra na ficha do colaborador pelo e-mail corporativo.</p></div>
    <label>Nome do link (aparece para a pessoa)<input value={editing.title} maxLength={120} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
    <label>Empresa<select value={editing.mode === 'company' ? editing.company_id : editing.mode} onChange={(event) => { const value = event.target.value; setEditing({ ...editing, mode: value === 'free' ? 'free' : value === 'other' ? 'other' : 'company', company_id: value === 'free' || value === 'other' ? '' : value, error: '' }); }}><option value="free">Link livre (a pessoa informa a empresa)</option><option value="other">Outra empresa (digitar o nome)</option><optgroup label="Empresas cadastradas">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</optgroup></select></label>
    {editing.mode === 'other' && <label>Nome da empresa<input value={editing.company_label} maxLength={120} placeholder="Ex.: Padaria Bom Dia" onChange={(event) => setEditing({ ...editing, company_label: event.target.value, error: '' })} /></label>}
    <label>Contexto de uso<select value={editing.purpose} onChange={(event) => setEditing({ ...editing, purpose: event.target.value })}><option value="desenvolvimento">Desenvolvimento</option><option value="selecao">Seleção</option><option value="diagnostico">Diagnóstico</option></select></label>
    <label>Endereço do link<span className="cpa-slug tw:flex tw:items-center tw:overflow-hidden tw:rounded-[0.62rem] tw:border tw:border-solid
      tw:border-[#e3d6cc] tw:bg-[#fbf7f3] tw:font-normal tw:[&_b]:pr-[0.15rem] tw:[&_b]:pl-[0.77rem]
      tw:[&_b]:text-[0.92rem] tw:[&_b]:font-medium tw:[&_b]:whitespace-nowrap tw:[&_b]:text-[#8c7e74]
      tw:[&_input]:w-auto! tw:[&_input]:min-w-0 tw:[&_input]:flex-auto! tw:[&_input]:rounded-none! tw:[&_input]:border-0!
      tw:[&_input]:bg-white! tw:[&_input]:px-[0.62rem]! tw:[&_input]:py-[0.77rem]! tw:[&_input]:text-[1rem]!"><b>app.calirh.com/perfil/</b><input value={editing.slug} maxLength={60} placeholder="gerado automaticamente" onChange={(event) => setEditing({ ...editing, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-') })} /></span></label>
    <label>Situação<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as LinkDraft['status'] })}><option value="open">Recebendo respostas</option><option value="closed">Bloqueado (não recebe mais respostas)</option></select></label>
    {editing.id && editing.slug && links.find((item) => item.id === editing.id)?.slug !== slugify(editing.slug) && <p className="v2-forms-warn tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem]
      tw:font-semibold tw:bg-[#fff5e0] tw:text-[#967030] tw:[border:1px_solid_#f2dfb8]">Ao trocar o endereço, o link antigo para de funcionar.</p>}
    {editing.error && <p className="v2-forms-error tw:[margin:0_0_1.077rem] tw:[padding:0.769rem_1.077rem] tw:rounded-[0.692rem] tw:text-[0.923rem]
      tw:font-semibold tw:bg-[#fff6f4] tw:text-[#b42318] tw:[border:1px_solid_#f1c4bd]" role="alert">{editing.error}</p>}
    <footer><button type="button" disabled={editing.busy} onClick={() => setEditing(null)}>Cancelar</button><button type="button" disabled={editing.busy} onClick={() => void saveLink()}>{editing.busy ? 'Salvando…' : editing.id ? 'Salvar' : 'Criar link'}</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  {sharing && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) setSharing(null); }}><WorkspaceConfirmDialog className="cpa-share tw:w-[min(49.23rem,96vw)]" aria-label="Compartilhar link">
    <div><small>COMPARTILHAR</small><h2>{sharing.title}</h2><p>{linkCompany(sharing)}{sharing.status === 'closed' ? ' · bloqueado: quem abrir verá que não recebe mais respostas' : ''}</p></div>
    <div className="cpa-share-body tw:flex tw:items-center tw:gap-[1.38rem] tw:max-[640px]:flex-col tw:max-[640px]:items-stretch">
      <div className="cpa-qr tw:grid tw:h-[13.85rem] tw:flex-[0_0_13.85rem] tw:place-items-center tw:rounded-[0.92rem]
        tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:p-[0.62rem] tw:max-[640px]:mx-auto
        tw:max-[640px]:aspect-square tw:max-[640px]:h-auto tw:max-[640px]:max-w-[15.38rem] tw:max-[640px]:basis-auto
        tw:[&_img]:size-full tw:[&_img]:object-contain">{qr ? <img src={qr} alt="QR Code do link" /> : <span>Gerando…</span>}</div>
      <div className="cpa-share-actions tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-[0.62rem] tw:[&_a]:no-underline">
        <div className="v2-forms-link tw:flex tw:gap-[0.615rem] tw:[&_input]:flex-1 tw:[&_input]:min-w-0 tw:[&_input]:[border:1px_solid_#e3d6cc]
          tw:[&_input]:rounded-[0.615rem] tw:[&_input]:[padding:0.692rem_0.846rem] tw:[&_input]:[font:500_1rem_Inter,sans-serif]
          tw:[&_input]:text-[color:var(--fm-wine)] tw:[&_input]:bg-[#fbf7f3] tw:[@media(max-width:760px)]:flex-col"><input readOnly value={`${BASE}${sharing.slug}`} onFocus={(event) => event.target.select()} /><Button type="button" variant="workflowPrimary" onClick={() => { void navigator.clipboard.writeText(`${BASE}${sharing.slug}`).then(() => flash('Link copiado.')); }}><Copy size={14} /> Copiar</Button></div>
        <Button type="button" variant="formSecondary" onClick={() => void downloadQrPng(`${BASE}${sharing.slug}`, `perfil-${sharing.slug}-qrcode.png`)}><QrCode size={14} /> Baixar QR Code</Button>
        <Button type="button" variant="formSecondary" onClick={() => void downloadShareCard({ title: sharing.title, category: 'Perfil comportamental', intro: 'Queremos conhecer mais sobre você: como decide, se comunica e reage no trabalho. São 24 blocos de 4 frases curtas, em média 12 a 20 minutos, e você recebe o seu relatório por e-mail.' }, `${BASE}${sharing.slug}`, `perfil-${sharing.slug}-cartao.png`)}><Download size={14} /> Baixar cartão para divulgar</Button>
        <a className="wf-secondary tw:inline-flex tw:items-center tw:gap-[0.538rem] tw:justify-center tw:[border:1px_solid_#e3d6cc]
          tw:bg-white tw:text-cali-brand tw:rounded-[0.538rem] tw:[padding:0.692rem_1rem] tw:[font:600_0.846rem_Inter,sans-serif]
          tw:no-underline tw:cursor-pointer tw:[transition:border-color_.15s,background_.15s] tw:[&:hover:not(:disabled)]:border-cali-brand
          tw:[&:hover:not(:disabled)]:bg-[#fbf7f3] tw:[&:disabled]:opacity-[.45] tw:[&:disabled]:cursor-default" href={`https://wa.me/?text=${encodeURIComponent(`${sharing.title}: ${BASE}${sharing.slug}`)}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Enviar no WhatsApp</a>
      </div>
    </div>
    <footer><button type="button" onClick={() => setSharing(null)}>Fechar</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  {removing && <WorkspaceDialogOverlay onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}><WorkspaceConfirmDialog aria-label="Excluir resposta">
    <div><small>PERFIL COMPORTAMENTAL</small><h2>Tem certeza que quer excluir?</h2><p><strong>{removing.person_name}</strong> · respondido em {day(removing.created_at)}. Apaga as respostas, os escores e o PDF. Não dá para desfazer.</p></div>
    <footer><button type="button" onClick={() => setRemoving(null)}>Cancelar</button><button type="button" className="danger tw:border-[#b42318]! tw:bg-[#b42318]!" onClick={() => void remove()}>Excluir</button></footer>
  </WorkspaceConfirmDialog></WorkspaceDialogOverlay>}
  </div></Shell>;
}
