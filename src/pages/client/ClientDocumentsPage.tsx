import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Eye, FileCheck2, FileText, Loader2, MessageSquare, Search, Send, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

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
};

type CommentRow = { id: string; body: string; createdAt: string; mine: boolean };
type DriveConnection = { id: string; accountEmail?: string | null; rootFolderName?: string | null; status: string };
type SyncState = { status: 'pending' | 'processing' | 'synced' | 'error'; url?: string | null };

const categoryOptions: Array<{ value: CategorySlug; label: string }> = [
  { value: 'deliverable', label: 'Entregável' }, { value: 'report', label: 'Relatório' }, { value: 'policy', label: 'Política' },
  { value: 'manual', label: 'Manual' }, { value: 'flow', label: 'Fluxo' }, { value: 'guide', label: 'Guia' }, { value: 'onboarding', label: 'Onboarding' },
  { value: 'schedule', label: 'Cronograma' }, { value: 'contract', label: 'Contrato' }, { value: 'reference', label: 'Referência' }, { value: 'other', label: 'Outro' },
];

const previewDocuments: ClientDoc[] = [
  { id: 'd1', companyId: 'preview-aurora', title: 'Estrutura de indicadores de People', category: 'deliverable', kind: 'Matriz', date: '28 ago 2026', version: 'v1.0', protocol: 'CALI-DOC-2026-000041', requiresAcknowledgement: true, description: 'Material consolidado para leitura e validação da liderança.' },
  { id: 'd2', companyId: 'preview-aurora', title: 'Relatório Executivo · Julho', category: 'report', kind: 'Relatório', date: '01 ago 2026', version: 'final', protocol: 'CALI-DOC-2026-000032', requiresAcknowledgement: false },
  { id: 'd3', companyId: 'preview-aurora', title: 'Cronograma aprovado · Ciclo 01', category: 'schedule', kind: 'Plano', date: '19 ago 2026', version: 'vigente', protocol: 'CALI-DOC-2026-000035', requiresAcknowledgement: true },
];

const categoryLabel = (value: CategorySlug) => categoryOptions.find((item) => item.value === value)?.label || 'Outro';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

export function ClientDocumentsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const [documents, setDocuments] = useState<ClientDoc[]>(preview ? previewDocuments : []);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [syncByFile, setSyncByFile] = useState<Record<string, SyncState>>({});
  const [acknowledged, setAcknowledged] = useState<string[]>(preview ? ['d1'] : []);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [commentDoc, setCommentDoc] = useState<ClientDoc | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const categories = useMemo(() => Array.from(new Set(documents.map((doc) => doc.category))), [documents]);
  const filtered = useMemo(() => documents.filter((doc) => {
    const matchQuery = `${doc.title} ${categoryLabel(doc.category)} ${doc.kind} ${doc.protocol}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    const matchCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchQuery && matchCategory;
  }), [documents, query, categoryFilter]);

  useEffect(() => {
    if (preview || !supabase) return;
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!commentDoc) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [commentDoc]);

  async function resolveCover(path?: string | null) {
    if (!path || !supabase) return '';
    const { data } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }

  async function loadDocuments() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const [filesResult, ackResult, driveResult, syncResult] = await Promise.all([
      supabase.from('files').select('id,company_id,title,category,document_kind,version_label,protocol,storage_path,drive_url,cover_storage_path,requires_acknowledgement,description,updated_at,status,client_visible').eq('client_visible', true).eq('status', 'published').order('updated_at', { ascending: false }),
      supabase.from('document_acknowledgements').select('file_id,acknowledged_at'),
      supabase.from('drive_connections').select('id,account_email,root_folder_name,status').eq('owner_type', 'client').eq('status', 'connected').limit(1),
      supabase.from('file_sync_jobs').select('file_id,status,external_url,updated_at').order('updated_at', { ascending: false }),
    ]);
    if (filesResult.error) {
      setError(filesResult.error.message);
      setLoading(false);
      return;
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
      coverUrl: await resolveCover(item.cover_storage_path),
      requiresAcknowledgement: Boolean(item.requires_acknowledgement),
      description: item.description,
    })));
    setDocuments(rows);
    setAcknowledged((ackResult.data ?? []).filter((item) => item.acknowledged_at).map((item) => item.file_id));
    setDriveConnection((driveResult.data?.[0] as DriveConnection | undefined) || null);
    const nextSync: Record<string, SyncState> = {};
    (syncResult.data || []).forEach((item) => {
      if (!nextSync[item.file_id]) nextSync[item.file_id] = { status: item.status as SyncState['status'], url: item.external_url };
    });
    setSyncByFile(nextSync);
    setLoading(false);
  }

  async function markViewed(doc: ClientDoc) {
    if (preview || !supabase) return;
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
    if (preview || !supabase) return;
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
    if (preview || !supabase) {
      setAcknowledged((current) => [...current, doc.id]);
      return;
    }
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
    if (preview || !supabase) {
      setComments([{ id: 'p1', body: 'Documento disponibilizado para sua análise. Se surgir algum ponto, registre por aqui para mantermos o contexto junto ao arquivo.', createdAt: '28 ago · 09:12', mine: false }]);
      return;
    }
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
    if (preview || !supabase) {
      setComments((current) => [...current, { id: `c-${Date.now()}`, body: comment.trim(), createdAt: 'agora', mine: true }]);
      setComment('');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { error: insertError } = await supabase.from('comments').insert({ company_id: commentDoc.companyId, target_type: 'file', target_id: commentDoc.id, author_user_id: userId, body: comment.trim(), client_visible: true });
    if (insertError) { setError(insertError.message); return; }
    setComment('');
    await openComments(commentDoc);
  }

  async function requestDriveCopy(doc: ClientDoc) {
    if (!driveConnection || !supabase || preview) return;
    const existing = syncByFile[doc.id];
    if (existing?.status === 'pending' || existing?.status === 'processing' || existing?.status === 'synced') return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { error: syncError } = await supabase.from('file_sync_jobs').insert({
      file_id: doc.id,
      company_id: doc.companyId,
      connection_id: driveConnection.id,
      status: 'pending',
      requested_by: userId,
    });
    if (syncError) { setError(syncError.message); return; }
    setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'pending' } }));
    setNotice(`Cópia de ${doc.title} solicitada para o Drive conectado.`);
  }

  function driveActionLabel(state?: SyncState) {
    if (!state) return 'Salvar no Drive';
    if (state.status === 'synced') return 'Salvo no Drive';
    if (state.status === 'error') return 'Tentar novamente';
    return 'Cópia solicitada';
  }

  return (
    <Shell role="client">
      <section className="page client-documents-v2 client-documents-v3">
        <div className="eyebrow">BIBLIOTECA DO PROJETO</div>
        <div className="page-heading"><div><h1>Documentos</h1><p>Arquivos compartilhados pela CALI permanecem organizados pelo mesmo protocolo, com versão, contexto, comentários e registro de ciência quando necessário.</p></div></div>

        {notice && <div className="inline-notice success"><CheckCircle2 size={18} />{notice}</div>}
        {error && <div className="inline-notice">{error}</div>}

        <section className={`drive-banner ${driveConnection ? 'connected' : 'not-configured'}`}>
          <div className="drive-icon"><Cloud size={23} /></div>
          <div><strong>{driveConnection ? 'Google Drive da empresa conectado' : 'Google Drive não configurado para esta conta'}</strong><p>{driveConnection ? `${driveConnection.accountEmail || 'Conta conectada'}${driveConnection.rootFolderName ? ` · pasta ${driveConnection.rootFolderName}` : ''}. Você pode solicitar uma cópia sem retirar o arquivo do Workspace.` : 'Os documentos continuam seguros e disponíveis no Workspace. A opção de copiar para o Drive só é habilitada quando existe uma conexão real da empresa.'}</p></div>
          {driveConnection && <span className="client-drive-connected-v3"><CheckCircle2 size={15} />Conectado</span>}
        </section>

        <div className="client-doc-toolbar-v3">
          <label className="search-box client-doc-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, tipo ou protocolo" /></label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar documentos por categoria"><option value="all">Todas as categorias</option>{categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select>
        </div>

        {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando biblioteca…</div>}
        {!loading && filtered.length === 0 && <div className="panel data-empty"><strong>Nenhum documento encontrado.</strong><span>{documents.length ? 'Ajuste a busca ou o filtro.' : 'Os documentos publicados pela CALI aparecerão aqui.'}</span></div>}
        <section className="document-cards document-cards-v2">
          {filtered.map((doc) => {
            const isAcknowledged = acknowledged.includes(doc.id);
            const syncState = syncByFile[doc.id];
            const syncLocked = syncState?.status === 'pending' || syncState?.status === 'processing' || syncState?.status === 'synced';
            return (
              <article className="document-card document-card-v2" key={doc.id}>
                <div className="document-card-cover">{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : <div><FileText size={31} /><span>{doc.kind}</span></div>}</div>
                <div className="document-card-body">
                  <div className="document-card-tags"><span>{categoryLabel(doc.category)}</span><span>{doc.kind}</span>{isAcknowledged && <span className="ack-tag"><CheckCircle2 size={13} />Ciência registrada</span>}</div>
                  <h2>{doc.title}</h2>
                  {doc.description && <p className="client-document-context-v3">{doc.description}</p>}
                  <p>{doc.date} · {doc.version}</p>
                  <small className="document-protocol">{doc.protocol}</small>
                  <div className="document-card-actions document-card-actions-v2">
                    <button className="secondary" onClick={() => void openDocument(doc)}><Eye size={17} />Abrir</button>
                    <button className="secondary" onClick={() => void openComments(doc)}><MessageSquare size={17} />Comentar</button>
                    {doc.requiresAcknowledgement && <button className={`secondary ${isAcknowledged ? 'acknowledged' : ''}`} disabled={isAcknowledged} onClick={() => void acknowledgeDocument(doc)}>{isAcknowledged ? <><CheckCircle2 size={17} />Ciente</> : <><FileCheck2 size={17} />Registrar ciência</>}</button>}
                    {driveConnection && <button className={`secondary ${syncState?.status === 'synced' ? 'acknowledged' : ''}`} disabled={Boolean(syncLocked)} onClick={() => void requestDriveCopy(doc)}>{syncState?.status === 'synced' ? <CheckCircle2 size={17} /> : <Cloud size={17} />}{driveActionLabel(syncState)}</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </section>

      {commentDoc && <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
        <section className="modal-card document-comment-modal" role="dialog" aria-modal="true" aria-label={`Comentários de ${commentDoc.title}`}>
          <button type="button" className="modal-close" onClick={() => setCommentDoc(null)} aria-label="Fechar"><X size={20} /></button>
          <span className="section-kicker">COMENTÁRIOS DO DOCUMENTO</span><h2>{commentDoc.title}</h2><p className="comment-protocol">{commentDoc.protocol}</p>
          <div className="document-comment-list">{commentLoading ? <div className="data-loading"><Loader2 className="spin" size={18} />Carregando…</div> : comments.map((item) => <div className={item.mine ? 'mine' : ''} key={item.id}><p>{item.body}</p><small>{item.createdAt}</small></div>)}</div>
          <div className="document-comment-composer"><textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Escreva um comentário sobre este documento…" /><button className="primary" disabled={!comment.trim()} onClick={() => void sendComment()}><Send size={16} />Enviar comentário</button></div>
        </section>
      </div>}
    </Shell>
  );
}
