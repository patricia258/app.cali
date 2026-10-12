import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, ArrowRight, CalendarDays, Check, MessageCircle, Megaphone, Pencil, Plus, RotateCcw, Send, X } from 'lucide-react';
import { Shell, type Role } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';

/* Quadro de Avisos — composição aprovada na V2 (mural com capa, categoria, ciência e comentários).
   Só a administradora publica; o cliente lê os avisos da própria empresa, registra ciência e comenta.
   Tabelas: notices, notice_targets, notice_acknowledgements, notice_comments (migração 20261011220000). */

type Category = 'feriado' | 'atendimento' | 'comunicado';
type Notice = {
  id: string; protocol: string; category: Category; title: string; body: string; date: string | null; time: string | null;
  coverage: string | null; coverPath: string | null; coverUrl: string; audience: 'all' | 'selected'; status: 'published' | 'archived'; publishedAt: string;
};
type Company = { id: string; name: string };
type Ack = { noticeId: string; userId: string; companyId: string | null; at: string };
type Comment = { id: string; noticeId: string; companyId: string | null; authorId: string; authorRole: 'admin' | 'client'; body: string; createdAt: string };
type Draft = { id: string | null; category: Category; title: string; body: string; date: string; time: string; coverage: string; audience: 'all' | 'selected'; targets: string[]; coverPath: string | null };

const CATEGORIES: [Category, string][] = [['feriado', 'Feriado'], ['atendimento', 'Atendimento'], ['comunicado', 'Comunicado']];
const COVERAGES = ['Nacional', 'Estadual', 'Municipal', 'Equipe CALI', 'Cliente'];
const categoryLabel = (value: Category) => CATEGORIES.find(([key]) => key === value)?.[1] || 'Comunicado';
const formatDay = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '') : '';
const formatMoment = (value: string) => new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');
const today = () => new Date().toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ id: null, category: 'comunicado', title: '', body: '', date: today(), time: '', coverage: 'Nacional', audience: 'all', targets: [], coverPath: null });

function NoticesBoard({ role }: { role: Role }) {
  const admin = role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [targets, setTargets] = useState<Record<string, string[]>>({});
  const [acks, setAcks] = useState<Ack[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [me, setMe] = useState<{ id: string; companyId: string | null }>({ id: '', companyId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [view, setView] = useState<'mural' | 'manage'>('mural');
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  // A resposta da CALI vai para a empresa escolhida: comentários de empresas diferentes não se misturam.
  const [replyCompany, setReplyCompany] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!supabase) return;
    setError('');
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id || '';
      const profile = uid ? await supabase.from('profiles').select('company_id').eq('id', uid).maybeSingle() : { data: null };
      setMe({ id: uid, companyId: admin ? null : (profile.data as any)?.company_id || null });
      const [noticeResult, targetResult, ackResult, commentResult] = await Promise.all([
        supabase.from('notices').select('id,protocol,category,title,body,notice_date,time_label,coverage,cover_path,audience,status,published_at').order('published_at', { ascending: false }),
        supabase.from('notice_targets').select('notice_id,company_id'),
        supabase.from('notice_acknowledgements').select('notice_id,user_id,company_id,acknowledged_at'),
        supabase.from('notice_comments').select('id,notice_id,company_id,author_user_id,author_role,body,created_at').order('created_at'),
      ]);
      if (noticeResult.error) throw noticeResult.error;
      const rows = await Promise.all((noticeResult.data || []).map(async (row: any): Promise<Notice> => ({
        id: row.id, protocol: row.protocol, category: row.category, title: row.title, body: row.body || '', date: row.notice_date, time: row.time_label,
        coverage: row.coverage, coverPath: row.cover_path, coverUrl: row.cover_path ? (await resolveWorkspaceMedia(row.cover_path, 86400)) || '' : '',
        audience: row.audience, status: row.status, publishedAt: row.published_at,
      })));
      setNotices(rows);
      const targetMap: Record<string, string[]> = {};
      for (const row of targetResult.data || []) (targetMap[(row as any).notice_id] ||= []).push((row as any).company_id);
      setTargets(targetMap);
      setAcks((ackResult.data || []).map((row: any) => ({ noticeId: row.notice_id, userId: row.user_id, companyId: row.company_id, at: row.acknowledged_at })));
      setComments((commentResult.data || []).map((row: any) => ({ id: row.id, noticeId: row.notice_id, companyId: row.company_id, authorId: row.author_user_id, authorRole: row.author_role, body: row.body, createdAt: row.created_at })));
      const people = await supabase.from('profiles').select('id,full_name');
      if (!people.error) setNames(Object.fromEntries((people.data || []).map((row: any) => [row.id, row.full_name || ''])));
      if (admin) {
        const companyResult = await supabase.from('companies').select('id,display_name').neq('status', 'archived').order('display_name');
        if (!companyResult.error) setCompanies((companyResult.data || []).map((row: any) => ({ id: row.id, name: row.display_name })));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar os avisos.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { const wanted = searchParams.get('aviso'); if (wanted && notices.some((item) => item.id === wanted)) setActiveId(wanted); }, [searchParams, notices]);

  const companyName = useMemo(() => new Map(companies.map((item) => [item.id, item.name])), [companies]);
  const visible = useMemo(() => notices.filter((item) => (admin && view === 'manage' ? (showArchived ? item.status === 'archived' : item.status === 'published') : item.status === 'published') && (filter === 'all' || item.category === filter)), [notices, admin, view, showArchived, filter]);
  const active = notices.find((item) => item.id === activeId) || null;
  const iAcked = (id: string) => acks.some((item) => item.noticeId === id && item.userId === me.id);
  const acksOf = (id: string) => acks.filter((item) => item.noticeId === id);
  const commentsOf = (id: string) => comments.filter((item) => item.noticeId === id);
  const commentCompanies = (id: string) => Array.from(new Set(commentsOf(id).map((item) => item.companyId).filter((value): value is string => Boolean(value))));
  const audienceLabel = (item: Notice) => item.audience === 'all' ? 'Todas as empresas' : (targets[item.id] || []).map((id) => companyName.get(id) || 'Empresa').join(', ') || 'Nenhuma empresa escolhida';
  const authorLabel = (item: Comment) => item.authorRole === 'admin' ? 'CALI · Assessoria' : `${names[item.authorId] || 'Cliente'}${admin && item.companyId ? ` · ${companyName.get(item.companyId) || ''}` : ''}`;

  function closeDetail() { setActiveId(null); setCommentText(''); setReplyCompany(''); if (searchParams.get('aviso')) { const next = new URLSearchParams(searchParams); next.delete('aviso'); setSearchParams(next, { replace: true }); } }

  async function toggleAck(item: Notice) {
    if (!supabase || admin || !me.id) return;
    const done = iAcked(item.id);
    const result = done
      ? await supabase.from('notice_acknowledgements').delete().eq('notice_id', item.id).eq('user_id', me.id)
      : await supabase.from('notice_acknowledgements').insert({ notice_id: item.id, user_id: me.id, company_id: me.companyId });
    if (result.error) { setError(result.error.message); return; }
    setAcks((current) => done ? current.filter((ack) => !(ack.noticeId === item.id && ack.userId === me.id)) : [...current, { noticeId: item.id, userId: me.id, companyId: me.companyId, at: new Date().toISOString() }]);
  }

  async function sendComment(item: Notice) {
    if (!supabase || !commentText.trim() || !me.id) return;
    const replyTo = admin ? (replyCompany || commentCompanies(item.id)[0] || '') : '';
    if (admin && !replyTo) return;
    const result = await supabase.from('notice_comments').insert({ notice_id: item.id, company_id: admin ? replyTo : me.companyId, author_user_id: me.id, author_role: admin ? 'admin' : 'client', body: commentText.trim() }).select('id,notice_id,company_id,author_user_id,author_role,body,created_at').maybeSingle();
    if (result.error) { setError(result.error.message); return; }
    const row: any = result.data;
    if (row) setComments((current) => [...current, { id: row.id, noticeId: row.notice_id, companyId: row.company_id, authorId: row.author_user_id, authorRole: row.author_role, body: row.body, createdAt: row.created_at }]);
    setCommentText('');
  }

  function openCompose(item?: Notice) {
    setError(''); setCoverFile(null); setCoverPreview(item?.coverUrl || '');
    setDraft(item ? { id: item.id, category: item.category, title: item.title, body: item.body, date: item.date || '', time: item.time || '', coverage: item.coverage || 'Nacional', audience: item.audience, targets: targets[item.id] || [], coverPath: item.coverPath } : emptyDraft());
  }
  function pickCover(file: File | null) { setCoverFile(file); setCoverPreview(file ? URL.createObjectURL(file) : draft?.coverPath ? coverPreview : ''); }

  async function saveNotice(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !draft || !draft.title.trim() || !draft.body.trim()) return;
    if (draft.audience === 'selected' && !draft.targets.length) { setError('Escolha pelo menos uma empresa ou publique para todas.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { category: draft.category, title: draft.title.trim(), body: draft.body.trim(), notice_date: draft.date || null, time_label: draft.time.trim() || null, coverage: draft.coverage || null, audience: draft.audience };
      const saved = draft.id
        ? await supabase.from('notices').update(payload).eq('id', draft.id).select('id').maybeSingle()
        : await supabase.from('notices').insert(payload).select('id').maybeSingle();
      if (saved.error) throw saved.error;
      const id = (saved.data as any)?.id || draft.id;
      if (!id) throw new Error('O aviso não foi gravado.');
      if (coverFile) {
        const path = `notices/${id}/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60)}`;
        const upload = await supabase.storage.from('cali-workspace-private').upload(path, coverFile, { upsert: true, contentType: coverFile.type || undefined });
        if (upload.error) throw upload.error;
        const cover = await supabase.from('notices').update({ cover_path: `private:${path}` }).eq('id', id);
        if (cover.error) throw cover.error;
      }
      const clear = await supabase.from('notice_targets').delete().eq('notice_id', id);
      if (clear.error) throw clear.error;
      if (draft.audience === 'selected') {
        const insert = await supabase.from('notice_targets').insert(draft.targets.map((companyId) => ({ notice_id: id, company_id: companyId })));
        if (insert.error) throw insert.error;
      }
      // Sino dos clientes que recebem o aviso (a função ignora quem já foi avisado).
      await supabase.rpc('notify_notice', { p_notice_id: id });
      setDraft(null); setCoverFile(null);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível publicar o aviso.');
    } finally { setSaving(false); }
  }

  async function setStatus(item: Notice, status: Notice['status']) {
    if (!supabase) return;
    const result = await supabase.from('notices').update({ status }).eq('id', item.id);
    if (result.error) { setError(result.error.message); return; }
    setNotices((current) => current.map((notice) => notice.id === item.id ? { ...notice, status } : notice));
  }

  if (loading) return <Shell role={role}><section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">Carregando avisos…</section></Shell>;

  const head = <div className="notice-title"><div><small>{admin ? 'BACKOFFICE / COMUNICAÇÃO' : 'ÁREA DA EMPRESA / COMUNICAÇÃO'}</small><h1>Quadro de Avisos<span>.</span></h1><p>{admin ? 'Comunicados da CALI para as empresas clientes: feriados, atendimento e informações da parceria.' : 'Comunicados da parceria, datas importantes e informações de atendimento.'}</p></div>{admin && <button className="notice-main-button" type="button" onClick={() => openCompose()}><Plus size={16} /> Novo comunicado</button>}</div>;

  const toolbar = <div className="notice-toolbar"><div className="notice-filters">{admin && <><button type="button" className={view === 'mural' ? 'active' : ''} onClick={() => setView('mural')}>Mural</button><button type="button" className={view === 'manage' ? 'active' : ''} onClick={() => setView('manage')}>Gerenciar publicações</button><i className="v2-notice-sep" /></>}<button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>{CATEGORIES.map(([key, label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}{admin && view === 'manage' && <button type="button" className={showArchived ? 'active' : ''} onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Vendo arquivados' : 'Ver arquivados'}</button>}</div><span>{visible.length} {visible.length === 1 ? 'publicação' : 'publicações'}</span></div>;

  const feed = <div className="notice-list notice-feed">{visible.map((item) => <article key={item.id} className={`notice-item ${item.category}`} tabIndex={0} onClick={() => { setActiveId(item.id); setCommentText(''); }} onKeyDown={(event) => { if (event.key === 'Enter' && event.target === event.currentTarget) { setActiveId(item.id); setCommentText(''); } }}>
    {item.coverUrl && <div className="notice-cover"><img src={item.coverUrl} alt="" /><span className={`notice-cover-tag ${item.category}`}>{categoryLabel(item.category)}</span></div>}
    <div className="notice-item-main">
      <div className="notice-item-top"><span className="notice-author-mark">C</span><span><strong>CALI · Assessoria</strong><small>{formatDay(item.publishedAt)} · {item.protocol}</small></span><span className={`notice-category ${item.category}`}>{categoryLabel(item.category)}</span></div>
      <h2>{item.title}</h2><p>{item.body}</p>
      {item.date && <div className="notice-calendar-link"><CalendarDays size={14} /><strong>{formatDay(item.date)}</strong>{item.time && <span>· {item.time}</span>}{item.coverage && <span>· {item.coverage}</span>}</div>}
      <div className="notice-actions">{admin
        ? <button type="button" className="v2-notice-count" onClick={(event) => { event.stopPropagation(); setActiveId(item.id); }}><Check size={15} />{acksOf(item.id).length} {acksOf(item.id).length === 1 ? 'ciência' : 'ciências'}</button>
        : <button type="button" className={iAcked(item.id) ? 'acknowledged' : ''} onClick={(event) => { event.stopPropagation(); void toggleAck(item); }}><Check size={15} />{iAcked(item.id) ? 'Ciente registrado' : 'Estou ciente'}</button>}
        <button type="button" onClick={(event) => { event.stopPropagation(); setActiveId(item.id); setCommentText(''); }}><MessageCircle size={15} /> Comentar {commentsOf(item.id).length ? `(${commentsOf(item.id).length})` : ''}</button></div>
    </div>
  </article>)}</div>;

  const manage = <div className="wf-records v2-notice-manage"><div className="wf-record-row header"><span>Comunicado</span><span>Categoria</span><span>Data</span><span>Quem recebe</span><span>Ciências / Comentários</span><span /></div>{visible.map((item) => <div className="wf-record-row" key={item.id} role="button" tabIndex={0} onClick={() => setActiveId(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter') setActiveId(item.id); }}>
    <span><small>{item.protocol} · publicado em {formatDay(item.publishedAt)}</small><strong>{item.title}</strong></span>
    <span><span className={`notice-category ${item.category}`}>{categoryLabel(item.category)}</span></span>
    <span>{item.date ? `${formatDay(item.date)}${item.time ? ` · ${item.time}` : ''}` : '—'}</span>
    <span className="v2-notice-audience">{audienceLabel(item)}</span>
    <span>{acksOf(item.id).length} · {commentsOf(item.id).length}</span>
    <span className="v2-row-actions"><button type="button" title="Editar" aria-label="Editar" onClick={(event) => { event.stopPropagation(); openCompose(item); }}><Pencil size={15} /></button><button type="button" title={item.status === 'archived' ? 'Publicar de novo' : 'Arquivar'} aria-label={item.status === 'archived' ? 'Publicar de novo' : 'Arquivar'} onClick={(event) => { event.stopPropagation(); void setStatus(item, item.status === 'archived' ? 'published' : 'archived'); }}>{item.status === 'archived' ? <RotateCcw size={15} /> : <Archive size={15} />}</button></span>
  </div>)}</div>;

  const empty = <div className="empty notice-empty"><Megaphone size={22} /><strong>{admin ? (view === 'manage' && showArchived ? 'Nenhum comunicado arquivado.' : 'Nenhum comunicado publicado.') : 'Nenhum comunicado publicado.'}</strong><p>{admin ? 'Use “Novo comunicado” para avisar as empresas sobre feriados, atendimento e novidades.' : 'Quando a CALI publicar um aviso para a sua empresa, ele aparecerá aqui.'}</p></div>;

  const page = <div className={`notice-page ${admin ? 'v2-notice-admin' : ''}`}>
    {head}
    {error && !draft && <div className="inline-notice">{error}</div>}
    {toolbar}
    {visible.length ? (admin && view === 'manage' ? manage : feed) : empty}

    {active && <div className="notice-overlay" onMouseDown={closeDetail}><section className="notice-dialog" role="dialog" aria-modal="true" aria-label="Comunicado" onMouseDown={(event) => event.stopPropagation()}>
      <header><span>COMUNICADO · {active.protocol}</span><button type="button" onClick={closeDetail} aria-label="Fechar"><X size={19} /></button></header>
      <div className="notice-dialog-body">
        {active.coverUrl && <img className="notice-detail-cover" src={active.coverUrl} alt="" />}
        <span className={`notice-category ${active.category}`}>{categoryLabel(active.category)}</span><h2>{active.title}</h2><p>{active.body}</p>
        <dl>{active.date && <div><dt>Data</dt><dd>{formatDay(active.date)}</dd></div>}{active.time && <div><dt>Horário</dt><dd>{active.time}</dd></div>}{active.coverage && <div><dt>Abrangência</dt><dd>{active.coverage}</dd></div>}<div><dt>Publicado por</dt><dd>CALI · Assessoria</dd></div>{admin && <div><dt>Quem recebe</dt><dd>{audienceLabel(active)}</dd></div>}</dl>
        {admin && <><h3>Ciências registradas</h3>{acksOf(active.id).length ? <div className="v2-notice-acks">{acksOf(active.id).map((ack) => <span key={ack.userId}><Check size={12} />{names[ack.userId] || 'Cliente'}{ack.companyId ? ` · ${companyName.get(ack.companyId) || ''}` : ''}<small>{formatMoment(ack.at)}</small></span>)}</div> : <p className="notice-muted">Ninguém registrou ciência ainda.</p>}</>}
        <h3>Comentários</h3>
        {!commentsOf(active.id).length && <p className="notice-muted">Nenhum comentário ainda.</p>}
        {commentsOf(active.id).map((item) => <div className="notice-comment" key={item.id}><strong>{authorLabel(item)}</strong><p>{item.body}</p><small>{formatMoment(item.createdAt)}</small></div>)}
      </div>
      <footer>{admin
        ? <button type="button" className="notice-ack" onClick={() => { const item = active; closeDetail(); openCompose(item); }}><Pencil size={15} /> Editar</button>
        : <button type="button" onClick={() => void toggleAck(active)} className="notice-ack"><Check size={15} />{iAcked(active.id) ? 'Ciente registrado' : 'Estou ciente'}</button>}
        {admin && !commentCompanies(active.id).length ? <span className="notice-muted v2-notice-noreply">A resposta fica disponível quando uma empresa comentar.</span> : <div className="notice-write">{admin && commentCompanies(active.id).length > 1 && <select aria-label="Responder para" value={replyCompany || commentCompanies(active.id)[0]} onChange={(event) => setReplyCompany(event.target.value)}>{commentCompanies(active.id).map((id) => <option value={id} key={id}>{companyName.get(id) || 'Empresa'}</option>)}</select>}<input placeholder={admin ? `Responder para ${companyName.get(replyCompany || commentCompanies(active.id)[0]) || 'a empresa'}…` : 'Escrever comentário…'} value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendComment(active); }} /><button type="button" disabled={!commentText.trim()} aria-label="Enviar comentário" onClick={() => void sendComment(active)}><Send size={17} /></button></div>}
      </footer>
    </section></div>}

    {draft && <div className="notice-overlay" onMouseDown={() => setDraft(null)}><form className="notice-dialog notice-create" role="dialog" aria-modal="true" onSubmit={saveNotice} onMouseDown={(event) => event.stopPropagation()}>
      <header><span>{draft.id ? 'EDITAR COMUNICADO' : 'NOVO COMUNICADO'}</span><button type="button" onClick={() => setDraft(null)} aria-label="Fechar"><X size={19} /></button></header>
      <div className="notice-dialog-body">
        <h2>{draft.id ? 'Atualizar publicação' : 'Publicar no quadro de avisos'}</h2><p>O comunicado aparece no mural das empresas escolhidas e acende o sino de quem recebe.</p>
        {error && <div className="inline-notice">{error}</div>}
        <label>Categoria<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}>{CATEGORIES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
        <label>Título<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Feriado municipal" /></label>
        <div className="notice-fields"><label>Data<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label>Horário (opcional)<input value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} placeholder="09:00 às 13:00" /></label></div>
        <label>Abrangência<select value={draft.coverage} onChange={(event) => setDraft({ ...draft, coverage: event.target.value })}>{COVERAGES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Quem recebe<select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value as Draft['audience'] })}><option value="all">Todas as empresas</option><option value="selected">Só as empresas que eu escolher</option></select></label>
        {draft.audience === 'selected' && <div className="v2-notice-targets">{companies.map((company) => <label key={company.id} className="notice-check"><input type="checkbox" checked={draft.targets.includes(company.id)} onChange={(event) => setDraft({ ...draft, targets: event.target.checked ? [...draft.targets, company.id] : draft.targets.filter((id) => id !== company.id) })} /> {company.name}</label>)}</div>}
        <label>Imagem de capa (opcional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => pickCover(event.target.files?.[0] || null)} /></label>
        {coverPreview && <img className="notice-compose-cover" src={coverPreview} alt="Prévia da capa" />}
        <label>Mensagem<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="O que o cliente precisa saber?" /></label>
      </div>
      <footer><button type="button" onClick={() => setDraft(null)}>Cancelar</button><button className="notice-main-button" type="submit" disabled={saving || !draft.title.trim() || !draft.body.trim()}>{saving ? 'Publicando…' : draft.id ? 'Salvar alterações' : 'Publicar comunicado'} <ArrowRight size={15} /></button></footer>
    </form></div>}
  </div>;

  return <Shell role={role}>{admin ? <div className="ap-app v2-admin-page v2-admin-notices"><div className="ap-content">{page}</div></div> : page}</Shell>;
}

export function ClientNoticesPage() { return <NoticesBoard role="client" />; }
export function AdminNoticesPage() { return <NoticesBoard role="admin" />; }

/* Visão geral do cliente: os dois avisos mais recentes da empresa (bloco "Quadro de avisos" aprovado na V2). */
export function ClientHomeNotices() {
  const [items, setItems] = useState<{ id: string; category: Category; title: string; publishedAt: string; coverUrl: string; acked: boolean }[] | null>(null);
  useEffect(() => { let active = true; void (async () => {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id || '';
    const [noticeResult, ackResult] = await Promise.all([
      supabase.from('notices').select('id,category,title,cover_path,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(2),
      supabase.from('notice_acknowledgements').select('notice_id').eq('user_id', uid),
    ]);
    if (!active) return;
    if (noticeResult.error) { setItems([]); return; }
    const acked = new Set((ackResult.data || []).map((row: any) => row.notice_id));
    const rows = await Promise.all((noticeResult.data || []).map(async (row: any) => ({ id: row.id, category: row.category as Category, title: row.title, publishedAt: row.published_at, coverUrl: row.cover_path ? (await resolveWorkspaceMedia(row.cover_path, 86400)) || '' : '', acked: acked.has(row.id) })));
    if (active) setItems(rows);
  })(); return () => { active = false; }; }, []);
  if (!items?.length) return <div className="ch-bulletin-grid"><article className="ch-bulletin-item ch-bulletin-empty"><div className="ch-bulletin-meta"><span className="ch-bulletin-label">COMUNICADOS</span><strong>Nenhum comunicado disponível</strong><span className="ch-bulletin-author">{items ? 'Quando a CALI publicar um aviso para a sua empresa, ele aparece aqui.' : 'Carregando avisos…'}</span></div><div className="ch-bulletin-picture ch-empty-picture"><MessageCircle size={25} /></div><div className="ch-bulletin-foot"><span>Mural da parceria</span></div></article></div>;
  return <div className="ch-bulletin-grid">{items.map((item) => <Link key={item.id} className="ch-bulletin-item v2-bulletin-link" to={`/cliente/avisos?aviso=${item.id}`}><div className="ch-bulletin-meta"><span className="ch-bulletin-label">{categoryLabel(item.category).toUpperCase()}</span><strong>{item.title}</strong><span className="ch-bulletin-author">CALI · Assessoria · {formatDay(item.publishedAt)}</span></div><div className={`ch-bulletin-picture ${item.coverUrl ? '' : 'ch-empty-picture'}`} style={item.coverUrl ? { backgroundImage: `url("${item.coverUrl}")` } : undefined}>{!item.coverUrl && <Megaphone size={25} />}</div><div className="ch-bulletin-foot"><span><MessageCircle size={13} /> Ver comunicado</span><span><Check size={13} /> {item.acked ? 'Ciente registrado' : 'Dar ciência'}</span></div></Link>)}</div>;
}
