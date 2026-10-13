import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, AlertTriangle, CheckCircle2, ChevronRight, Cloud, ExternalLink, Eye, FileCheck2, FileText, MessageSquare, Search, Send, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';
import { resolveWorkspaceMedia } from '../../lib/workspaceMedia';
import { DocumentAutoCover } from '../../components/DocumentAutoCover';

type CategorySlug = 'policy' | 'manual' | 'flow' | 'guide' | 'report' | 'onboarding' | 'deliverable' | 'schedule' | 'contract' | 'reference' | 'other';
type ClientDoc = {
  id: string;
  companyId: string;
  title: string;
  category: CategorySlug;
  kind: string;
  date: string;
  version: string;
  protocol: string;
  storagePath?: string;
  driveUrl?: string;
  coverUrl?: string;
  requiresAcknowledgement: boolean;
  description?: string | null;
  validUntil?: string | null;
};

type CommentRow = { id: string; body: string; createdAt: string; mine: boolean };
type DriveConnection = { id: string; accountEmail?: string | null; rootFolderName?: string | null; status: string };
type SyncState = { status: 'pending' | 'processing' | 'synced' | 'error'; url?: string | null };

const categoryOptions: Array<{ value: CategorySlug; label: string }> = [
  { value: 'deliverable', label: 'Entregável' }, { value: 'report', label: 'Relatório' }, { value: 'policy', label: 'Política' },
  { value: 'manual', label: 'Manual' }, { value: 'flow', label: 'Fluxo' }, { value: 'guide', label: 'Guia' }, { value: 'onboarding', label: 'Onboarding' },
  { value: 'schedule', label: 'Cronograma' }, { value: 'contract', label: 'Contrato' }, { value: 'reference', label: 'Referência' }, { value: 'other', label: 'Outro' },
];

const categoryLabel = (value: CategorySlug) => categoryOptions.find((item) => item.value === value)?.label || 'Outro';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const target = new Date(`${value}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

export function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<ClientDoc[]>([]);
  const [folders, setFolders] = useState<{ id: string; title: string; protocol: string | null; items: { id: string; title: string; status: string }[] }[]>([]);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [companyBrand, setCompanyBrand] = useState({ name: 'sua empresa', logoUrl: '' });
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'covers' | 'list'>('covers');
  const [detailDoc, setDetailDoc] = useState<ClientDoc | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [syncByFile, setSyncByFile] = useState<Record<string, SyncState>>({});
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [commentDoc, setCommentDoc] = useState<ClientDoc | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const categories = useMemo(() => Array.from(new Set(documents.map((doc) => doc.category))), [documents]);
  const folderIds = useMemo(() => new Set(folders.map((folder) => folder.id)), [folders]);
  const filtered = useMemo(() => documents.filter((doc) => !(doc as any).taskId && !folderIds.has((doc as any).deliverableId)).filter((doc) => {
    const matchQuery = `${doc.title} ${categoryLabel(doc.category)} ${doc.kind} ${doc.protocol}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    const matchCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchQuery && matchCategory;
  }), [folderIds, documents, query, categoryFilter]);

  useEffect(() => {
    if (!supabase) return;
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!commentDoc) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [commentDoc]);

  async function loadDocuments() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const [filesResult, ackResult, driveStatusResult] = await Promise.all([
      supabase.from('files').select('deliverable_id,task_id,id,company_id,title,category,document_kind,version_label,protocol,storage_path,drive_url,requires_acknowledgement,description,updated_at,status,client_visible,valid_until').eq('client_visible', true).eq('status', 'published').order('updated_at', { ascending: false }),
      supabase.from('document_acknowledgements').select('file_id,acknowledged_at'),
      supabase.functions.invoke('google-drive-oauth', { body: { action: 'status' } }),
    ]);
    if (filesResult.error) {
      setError(filesResult.error.message);
      setLoading(false);
      return;
    }
    if (filesResult.data?.[0]?.company_id) {
      const companyResult = await supabase.from('companies').select('display_name,logo_url').eq('id', filesResult.data[0].company_id).maybeSingle();
      if (companyResult.data) setCompanyBrand({ name: companyResult.data.display_name || 'sua empresa', logoUrl: (await resolveWorkspaceMedia(companyResult.data.logo_url, 86400)) || '' });
    }
    const rows = await Promise.all((filesResult.data ?? []).map(async (item) => ({
      id: item.id,
      companyId: item.company_id,
      title: item.title,
      category: (item.category || 'other') as CategorySlug,
      kind: item.document_kind || 'Outro',
      date: formatDate(item.updated_at),
      version: item.version_label || 'final',
      protocol: item.protocol || '—',
      storagePath: item.storage_path || undefined,
      driveUrl: item.drive_url || undefined,
      requiresAcknowledgement: Boolean(item.requires_acknowledgement),
      description: item.description,
      validUntil: item.valid_until,
      deliverableId: (item as any).deliverable_id || null,
      taskId: (item as any).task_id || null,
    })));
    const [taskResult, deliverableResult] = await Promise.all([
      supabase.from('deliverable_tasks').select('id,deliverable_id,title,status,sort_order').eq('client_visible', true).order('sort_order'),
      supabase.from('deliverables').select('id,title,protocol'),
    ]);
    const folderTasks = (taskResult.data || []) as any[]; const names = new Map(((deliverableResult.data || []) as any[]).map((row) => [row.id, row]));
    setFolders([...new Set(folderTasks.map((row) => row.deliverable_id))].filter((id) => names.has(id)).map((id) => ({ id, title: names.get(id).title, protocol: names.get(id).protocol || null, items: folderTasks.filter((row) => row.deliverable_id === id).map((row) => ({ id: row.id, title: row.title, status: row.status })) })));
    setDocuments(rows);
    setAcknowledged((ackResult.data ?? []).filter((item) => item.acknowledged_at).map((item) => item.file_id));

    const driveData = driveStatusResult.data;
    setDriveConnection(!driveStatusResult.error && driveData?.connected && driveData?.connection ? driveData.connection as DriveConnection : null);
    const nextSync: Record<string, SyncState> = {};
    if (!driveStatusResult.error) {
      (driveData?.jobs || []).forEach((item: any) => {
        if (!nextSync[item.file_id]) nextSync[item.file_id] = { status: item.status as SyncState['status'], url: item.external_url };
      });
    }
    setSyncByFile(nextSync);
    setLoading(false);
  }

  async function markViewed(doc: ClientDoc) {
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { data: existing } = await supabase.from('document_acknowledgements').select('id,viewed_at,status').eq('file_id', doc.id).eq('user_id', userId).maybeSingle();
    if (existing?.id) {
      if (!existing.viewed_at) await supabase.from('document_acknowledgements').update({ viewed_at: new Date().toISOString(), status: existing.status === 'acknowledged' ? 'acknowledged' : 'viewed' }).eq('id', existing.id);
    } else {
      await supabase.from('document_acknowledgements').insert({ company_id: doc.companyId, file_id: doc.id, user_id: userId, status: 'viewed', viewed_at: new Date().toISOString() });
    }
  }

  async function openDocument(doc: ClientDoc) {
    await markViewed(doc);
    if (!supabase) return;
    if (doc.storagePath) {
      const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(doc.storagePath, 300);
      if (signedError) { setError(signedError.message); return; }
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (doc.driveUrl) window.open(doc.driveUrl, '_blank', 'noopener,noreferrer');
  }

  async function acknowledgeDocument(doc: ClientDoc) {
    if (acknowledged.includes(doc.id)) return;
    if (!supabase) { setError('Serviço indisponível. Tente novamente em instantes.'); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const now = new Date().toISOString();
    const { data: existing } = await supabase.from('document_acknowledgements').select('id').eq('file_id', doc.id).eq('user_id', userId).maybeSingle();
    const result = existing?.id
      ? await supabase.from('document_acknowledgements').update({ status: 'acknowledged', viewed_at: now, acknowledged_at: now }).eq('id', existing.id)
      : await supabase.from('document_acknowledgements').insert({ company_id: doc.companyId, file_id: doc.id, user_id: userId, status: 'acknowledged', viewed_at: now, acknowledged_at: now });
    if (result.error) { setError(result.error.message); return; }
    setAcknowledged((current) => [...current, doc.id]);
    setNotice(`Ciência registrada em ${doc.title}.`);
  }

  async function openComments(doc: ClientDoc) {
    setCommentDoc(doc);
    setComment('');
    if (!supabase) { setComments([]); setError('Serviço indisponível. Tente novamente em instantes.'); return; }
    setCommentLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    const { data, error: commentsError } = await supabase.from('comments').select('id,body,created_at,author_user_id').eq('target_type', 'file').eq('target_id', doc.id).order('created_at');
    if (commentsError) setError(commentsError.message);
    setComments((data ?? []).map((item) => ({ id: item.id, body: item.body, createdAt: formatDate(item.created_at), mine: item.author_user_id === userId })));
    setCommentLoading(false);
  }

  async function sendComment() {
    if (!commentDoc || !comment.trim()) return;
    if (!supabase) { setError('Serviço indisponível. Tente novamente em instantes.'); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { error: insertError } = await supabase.from('comments').insert({ company_id: commentDoc.companyId, target_type: 'file', target_id: commentDoc.id, author_user_id: userId, body: comment.trim(), client_visible: true });
    if (insertError) { setError(insertError.message); return; }
    setComment('');
    await openComments(commentDoc);
  }

  async function connectDrive() {
    if (!supabase || driveConnecting) return;
    setDriveConnecting(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('google-drive-oauth', { body: { action: 'authorize' } });
      if (invokeError || data?.error || !data?.url) throw new Error(data?.detail || data?.error || invokeError?.message || 'Não foi possível iniciar a conexão com o Google Drive.');
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar a conexão com o Google Drive.');
      setDriveConnecting(false);
    }
  }

  async function requestDriveCopy(doc: ClientDoc) {
    if (!driveConnection || !supabase || !doc.storagePath) return;
    const existing = syncByFile[doc.id];
    if (existing?.status === 'synced' && existing.url) {
      window.open(existing.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (existing?.status === 'pending' || existing?.status === 'processing') return;
    setError('');
    setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'processing' } }));
    const { data, error: syncError } = await supabase.functions.invoke('google-drive-oauth', { body: { action: 'copy_file', fileId: doc.id } });
    if (syncError || data?.error) {
      setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'error' } }));
      setError(data?.detail || data?.error || syncError?.message || 'Não foi possível salvar este arquivo no Google Drive.');
      return;
    }
    setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'synced', url: data?.url || null } }));
    setNotice(`${doc.title} foi salvo no seu Google Drive.`);
  }

  function driveActionLabel(state?: SyncState) {
    if (!state) return 'Salvar no meu Drive';
    if (state.status === 'synced') return 'Abrir no Drive';
    if (state.status === 'error') return 'Tentar novamente';
    return 'Salvando no Drive…';
  }

  if (loading) return <Shell role="client"><section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">Carregando biblioteca…</section></Shell>;

  // Situação exibida na lista e na ficha: validade primeiro, depois ciência.
  const docState = (doc: ClientDoc) => {
    const left = daysUntil(doc.validUntil);
    if (left != null && left < 0) return { tone: 'red', label: 'Validade vencida' };
    if (left != null && left <= 60) return { tone: 'yellow', label: left === 0 ? 'Vence hoje' : `Vence em ${left} ${left === 1 ? 'dia' : 'dias'}` };
    if (doc.requiresAcknowledgement && !acknowledged.includes(doc.id)) return { tone: 'yellow', label: 'Aguardando ciência' };
    if (doc.requiresAcknowledgement) return { tone: 'green', label: 'Ciente' };
    return { tone: 'green', label: 'Disponível' };
  };
  const overdue = documents.filter((doc) => { const left = daysUntil(doc.validUntil); return left != null && left < 0; });
  const expiring = documents.filter((doc) => { const left = daysUntil(doc.validUntil); return left != null && left >= 0 && left <= 60; });
  return <Shell role="client"><section className="v2-client-module v2-client-docs"><div className="wf">
    <div className="wf-head"><div><small>ÁREA DA EMPRESA / ACERVO</small><h1>Documentos</h1><p>Entregáveis com capa, versões, protocolo e acompanhamento.</p></div></div>
    {notice && <div className="inline-notice success" role="status"><CheckCircle2 size={18}/>{notice}</div>}
    {error && <div className="inline-notice" role="alert">{error}</div>}
    <section className="wf-doc-drive"><Cloud size={23}/><div><strong>{driveConnection ? 'Drive da sua empresa conectado' : 'Leve suas versões aprovadas para o Drive da sua empresa'}</strong><p>{driveConnection ? `${driveConnection.accountEmail || 'Conta Google conectada'}. Você escolhe quais versões copiar para o Drive da empresa.` : 'Conecte a conta Google da sua empresa para salvar as versões aprovadas.'}</p></div><button type="button" className="wf-outline" disabled={driveConnecting} onClick={() => void connectDrive()}>{driveConnecting ? 'Abrindo Google…' : driveConnection ? 'Trocar conta' : 'Conectar meu Drive'}</button></section>
    {folders.length > 0 && <section className="v2-folders" aria-label="Pastas de entregáveis"><h2>Pastas de entregáveis</h2><p>Cada pasta reúne os documentos de um entregável, por parte entregue.</p>
      <div className="v2-folder-grid">{folders.map((folder) => { const done = folder.items.filter((item) => documents.some((doc) => (doc as any).taskId === item.id)).length; const open = openFolder === folder.id; return <article key={folder.id} className={`v2-folder ${open ? 'open' : ''}`}>
        <button type="button" className="v2-folder-head" aria-expanded={open} onClick={() => setOpenFolder(open ? null : folder.id)}><FolderOpen size={22} /><span><strong>{folder.title}</strong><small>{folder.protocol || 'ENTREGÁVEL'}</small></span><em>{done} de {folder.items.length} {folder.items.length === 1 ? 'entregue' : 'entregues'}</em></button>
        {open && <ul className="v2-folder-items">{documents.filter((doc) => !(doc as any).taskId && (doc as any).deliverableId === folder.id).map((doc) => <li key={doc.id}><span className="v2-folder-item-name"><strong>{doc.title}</strong><small>Documento do entregável</small></span><span className="v2-folder-docs"><span className="v2-folder-doc"><button type="button" className="workspace-chat-attachment" onClick={() => void openDocument(doc)}><span>📎</span><span><strong>{doc.title}</strong><small>{doc.date}</small></span></button>{acknowledged.includes(doc.id) ? <em className="v2-folder-ok">Recebimento confirmado</em> : <button type="button" className="v2-folder-ack" onClick={() => void acknowledgeDocument(doc)}>Confirmar recebimento</button>}</span></span></li>)}{folder.items.map((item) => { const docs = documents.filter((doc) => (doc as any).taskId === item.id); return <li key={item.id}><span className="v2-folder-item-name"><strong>{item.title}</strong><small>{docs.length ? `${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}` : 'Em produção'}</small></span>{docs.length ? <span className="v2-folder-docs">{docs.map((doc) => <span key={doc.id} className="v2-folder-doc"><button type="button" className="workspace-chat-attachment" onClick={() => void openDocument(doc)}><span>📎</span><span><strong>{doc.title}</strong><small>{doc.date}</small></span></button>{acknowledged.includes(doc.id) ? <em className="v2-folder-ok">Recebimento confirmado</em> : <button type="button" className="v2-folder-ack" onClick={() => void acknowledgeDocument(doc)}>Confirmar recebimento</button>}</span>)}</span> : <span className="v2-folder-wait">Ainda sem documento</span>}</li>; })}</ul>}
      </article>; })}</div></section>}
    <div className="wf-doc-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'documento' : 'documentos'}</strong><label><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, tipo ou protocolo" aria-label="Buscar documentos"/></label><select className="wf-doc-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar documentos por categoria"><option value="all">Todas as categorias</option>{categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select><div className="wf-segments" aria-label="Exibição do acervo"><button type="button" className={layout === 'covers' ? 'on' : ''} onClick={()=>setLayout('covers')}>Capas</button><button type="button" className={layout === 'list' ? 'on' : ''} onClick={()=>setLayout('list')}>Lista</button></div></div>
    {filtered.length === 0 && <div className="wf-empty"><strong>Nenhum documento encontrado.</strong><p>{documents.length ? 'Ajuste a busca ou o filtro.' : 'Assim que a CALI publicar uma versão final para você, ela aparecerá aqui.'}</p></div>}
    {(expiring.length > 0 || overdue.length > 0) && <div className={`v2-hours-notice ${overdue.length ? 'critical' : 'warning'}`} role="status"><AlertTriangle size={16}/><span>{[overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'documento está com a validade vencida' : 'documentos estão com a validade vencida'}` : '', expiring.length ? `${expiring.length} ${expiring.length === 1 ? 'documento tem' : 'documentos têm'} validade ou revisão prevista nos próximos 60 dias` : ''].filter(Boolean).join(' · ')}.</span></div>}
    {layout === 'list' && filtered.length > 0 && <div className="wf-records v2-doc-list">{filtered.map((doc) => { const tone = doc.category === 'deliverable' ? 'doc-deliverable' : doc.category === 'report' ? 'doc-executive' : 'doc-work'; const state = docState(doc); return <button type="button" className={`wf-record-row ${tone}`} key={doc.id} onClick={() => setDetailDoc(doc)}><strong>{doc.title}</strong><span>{categoryLabel(doc.category)}</span><span>{doc.date}</span><span className={`wf-tag ${state.tone}`}>{state.label}</span><ChevronRight size={14}/></button>; })}</div>}
    {layout === 'covers' && <section className="wf-doc-gallery">
      {filtered.map((doc) => {
        const isAcknowledged = acknowledged.includes(doc.id);
        const syncState = syncByFile[doc.id];
        const syncLocked = syncState?.status === 'pending' || syncState?.status === 'processing';
        const tone = doc.category === 'deliverable' ? 'doc-deliverable' : doc.category === 'report' ? 'doc-executive' : 'doc-work';
        const left = daysUntil(doc.validUntil);
        const review = !doc.validUntil ? { date: 'Não definida', note: '', tone: 'muted' } : { date: formatDate(doc.validUntil), note: left == null ? '' : left < 0 ? `vencida há ${-left} ${-left === 1 ? 'dia' : 'dias'}` : left === 0 ? 'vence hoje' : `faltam ${left} ${left === 1 ? 'dia' : 'dias'}`, tone: left != null && left < 0 ? 'late' : left != null && left <= 60 ? 'soon' : '' };
        const kindLabel = doc.kind.trim().toLowerCase() === categoryLabel(doc.category).trim().toLowerCase() ? '' : doc.kind;
        return <article className={`wf-doc-cover v2-doc-card ${tone}`} key={doc.id}>
          <div className="v2-doc-art-wrap">
            <button type="button" className={`wf-doc-art ${doc.coverUrl ? 'has-cover' : ''}`} aria-label={`Ver informações de ${doc.title}`} onClick={() => setDetailDoc(doc)}>{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : companyBrand.logoUrl ? <DocumentAutoCover logo={companyBrand.logoUrl} name={companyBrand.name} /> : <span><FileText size={30}/><b>CALI</b></span>}</button>
            <div className="v2-doc-tags"><span className={`wf-doc-label ${tone}`}>{categoryLabel(doc.category)}</span>{isAcknowledged && <span className="wf-tag green">Ciente</span>}</div>
          </div>
          <div className="wf-doc-content"><h2>{doc.title}</h2>{doc.description && <p>{doc.description}</p>}
            <dl className="v2-doc-facts">
              <div><dt>Versão</dt><dd>{String(doc.version).replace(/^v/i, '')}</dd></div>
              <div><dt>{kindLabel ? 'Tipo' : 'Categoria'}</dt><dd>{kindLabel || categoryLabel(doc.category)}</dd></div>
              <div><dt>Publicado em</dt><dd>{doc.date}</dd></div>
              <div className={review.tone}><dt>Validade / revisão</dt><dd>{review.date}{review.note && <small>{review.note}</small>}</dd></div>
            </dl>
            <div className="v2-doc-foot"><strong className="wf-doc-protocol">{doc.protocol || 'Sem protocolo'}</strong></div>
            <div className="wf-doc-actions"><button type="button" onClick={() => void openDocument(doc)}><Eye size={14}/> Abrir</button><button type="button" onClick={() => void openComments(doc)}><MessageSquare size={14}/> Comentar</button>
              {doc.requiresAcknowledgement && <button type="button" disabled={isAcknowledged} onClick={() => void acknowledgeDocument(doc)}>{isAcknowledged ? <><CheckCircle2 size={14}/>Ciente</> : <><FileCheck2 size={14}/>Registrar ciência</>}</button>}
              {driveConnection && doc.storagePath && <button type="button" disabled={Boolean(syncLocked)} onClick={() => void requestDriveCopy(doc)}>{syncState?.status === 'synced' ? <ExternalLink size={14}/> : <Cloud size={14}/>} {driveActionLabel(syncState)}</button>}
            </div>
          </div>
        </article>;
      })}
    </section>}
    {detailDoc && (() => { const doc = detailDoc; const state = docState(doc); const left = daysUntil(doc.validUntil); const isAcknowledged = acknowledged.includes(doc.id); return <div className="wf-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailDoc(null); }}><section className="wf-modal v2-doc-sheet" role="dialog" aria-modal="true" aria-label={`Informações de ${doc.title}`}>
      <div className="wf-modal-header"><span>DOCUMENTO{doc.protocol ? ` · ${doc.protocol}` : ''}</span><button type="button" onClick={() => setDetailDoc(null)} aria-label="Fechar"><X size={17}/></button></div>
      <h2>{doc.title}</h2>
      {doc.description && <p>{doc.description}</p>}
      <span className={`wf-tag ${state.tone}`}>{state.label}</span>
      <div className="wf-modal-grid">
        <span>Tipo <strong>{categoryLabel(doc.category)}{doc.kind ? ` · ${doc.kind}` : ''}</strong></span>
        <span>Versão <strong>{doc.version || '—'}</strong></span>
        <span>Publicado em <strong>{doc.date}</strong></span>
        <span>Validade / próxima revisão <strong>{doc.validUntil ? formatDate(doc.validUntil) : 'Não definida'}</strong></span>
        <span>Prazo <strong>{left == null ? '—' : left < 0 ? `Vencida há ${Math.abs(left)} ${Math.abs(left) === 1 ? 'dia' : 'dias'}` : left === 0 ? 'Vence hoje' : `${left} ${left === 1 ? 'dia restante' : 'dias restantes'}`}</strong></span>
        <span>Elaborado por <strong>CALI · Assessoria</strong></span>
        {doc.requiresAcknowledgement && <span>Ciência <strong>{isAcknowledged ? 'Registrada' : 'Pendente'}</strong></span>}
      </div>
      <div className="wf-modal-actions"><button type="button" onClick={() => setDetailDoc(null)}>Fechar</button><button type="button" className="wf-outline" onClick={() => { setDetailDoc(null); void openComments(doc); }}><MessageSquare size={14}/> Comentar</button>{doc.requiresAcknowledgement && !isAcknowledged && <button type="button" className="wf-outline" onClick={() => void acknowledgeDocument(doc)}><FileCheck2 size={14}/> Registrar ciência</button>}<button type="button" className="wf-primary" onClick={() => void openDocument(doc)}><ExternalLink size={14}/> Abrir documento</button></div>
    </section></div>; })()}
    {commentDoc && <div className="wf-overlay" role="presentation"><section className="wf-modal wf-create" role="dialog" aria-modal="true" aria-label={`Comentários de ${commentDoc.title}`}><div className="wf-modal-header"><span>COMENTÁRIOS DO DOCUMENTO</span><button type="button" onClick={() => setCommentDoc(null)} aria-label="Fechar"><X size={20}/></button></div><h2>{commentDoc.title}</h2><p>{commentDoc.protocol}</p><div className="wf-thread">{commentLoading ? <div className="data-loading" aria-live="polite" aria-busy="true">Carregando…</div> : comments.map((item) => <div className={item.mine ? 'wf-bubble sent' : 'wf-bubble received'} key={item.id}><p>{item.body}</p><small>{item.createdAt}</small></div>)}</div><div className="wf-compose"><textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva um comentário sobre este documento…" aria-label="Comentário"/><div><button className="wf-primary" disabled={!comment.trim()} onClick={() => void sendComment()}><Send size={16}/>Enviar comentário</button></div></div></section></div>}
  </div></section></Shell>;
}
