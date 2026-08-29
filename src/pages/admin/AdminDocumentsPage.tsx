import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  Cloud,
  Download,
  Ellipsis,
  Eye,
  FileCheck2,
  FileClock,
  FileText,
  History,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { DocumentCover } from '../../components/DocumentCover';
import {
  documentCategoryMeta,
  formatDocumentDate,
  formatFileSize,
  normalizeDocumentCategory,
  previewDocumentComments,
  previewDocuments,
  type DocumentCategory,
  type DocumentComment,
  type DocumentSource,
  type WorkspaceDocument,
} from '../../domain/documents';
import { supabase } from '../../lib/supabase';

type CompanyOption = { id: string; name: string; logoUrl?: string | null };
type ViewMode = 'cards' | 'list';
type DetailTab = 'summary' | 'comments' | 'acknowledgements';

type CreateForm = {
  title: string;
  companyId: string;
  category: DocumentCategory;
  version: string;
  source: DocumentSource;
  driveUrl: string;
  clientVisible: boolean;
  requiresAcknowledgement: boolean;
  project: string;
};

const fallbackCompanies: CompanyOption[] = [
  { id: 'aurora', name: 'Grupo Aurora' },
  { id: 'novatech', name: 'Novatech' },
  { id: 'studio-norte', name: 'Studio Norte' },
];

const emptyCreateForm: CreateForm = {
  title: '',
  companyId: 'aurora',
  category: 'deliverable',
  version: 'v1.0',
  source: 'workspace',
  driveUrl: '',
  clientVisible: true,
  requiresAcknowledgement: false,
  project: '',
};

function statusLabel(document: WorkspaceDocument) {
  if (document.status === 'archived') return 'Arquivado';
  if (!document.clientVisible || document.status === 'draft') return 'Interno';
  return 'Disponível ao cliente';
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function AdminDocumentsPage() {
  const [docs, setDocs] = useState<WorkspaceDocument[]>(previewDocuments);
  const [companies, setCompanies] = useState<CompanyOption[]>(fallbackCompanies);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocumentCategory>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'client' | 'internal' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyCreateForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revisionOfId, setRevisionOfId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<WorkspaceDocument | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('summary');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [commentsByDoc, setCommentsByDoc] = useState<Record<string, DocumentComment[]>>(previewDocumentComments);
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    const active = openCreate || Boolean(selectedDoc);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [openCreate, selectedDoc]);

  useEffect(() => {
    if (!selectedDoc) return;
    setDetailTab('summary');
    setNewComment('');
    void loadComments(selectedDoc);
  }, [selectedDoc?.id]);

  async function loadDocuments() {
    setLoading(true);
    if (!supabase) {
      setDocs(previewDocuments);
      setCompanies(fallbackCompanies);
      setLoading(false);
      return;
    }

    try {
      const [{ data: companyRows }, { data: fileRows, error: fileError }] = await Promise.all([
        supabase.from('companies').select('id, display_name, logo_url').order('display_name'),
        supabase.from('files').select('*').order('updated_at', { ascending: false }),
      ]);

      if (fileError) throw fileError;
      const companyOptions: CompanyOption[] = (companyRows || []).map((row: any) => ({ id: row.id, name: row.display_name, logoUrl: row.logo_url }));
      if (companyOptions.length) setCompanies(companyOptions);
      const companyMap = new Map(companyOptions.map((company) => [company.id, company]));

      const fileIds = (fileRows || []).map((row: any) => row.id);
      let acknowledgementCount = new Map<string, number>();
      if (fileIds.length) {
        const { data: ackRows } = await supabase.from('document_acknowledgements').select('file_id, status').in('file_id', fileIds);
        acknowledgementCount = new Map<string, number>();
        (ackRows || []).forEach((row: any) => {
          if (row.status !== 'acknowledged') return;
          acknowledgementCount.set(row.file_id, (acknowledgementCount.get(row.file_id) || 0) + 1);
        });
      }

      if (!fileRows?.length) {
        setDocs(previewDocuments);
      } else {
        setDocs(fileRows.map((row: any) => {
          const company = companyMap.get(row.company_id);
          return {
            id: row.id,
            title: row.title,
            companyId: row.company_id,
            company: company?.name || 'Cliente',
            companyLogo: company?.logoUrl,
            category: normalizeDocumentCategory(row.category),
            version: row.version_label || 'v1.0',
            updated: formatDocumentDate(row.updated_at),
            createdAt: row.created_at,
            source: (row.source_type || (row.drive_url ? 'google_drive' : 'workspace')) as DocumentSource,
            status: (row.status || (row.client_visible ? 'published' : 'draft')) as WorkspaceDocument['status'],
            clientVisible: Boolean(row.client_visible),
            requiresAcknowledgement: Boolean(row.requires_acknowledgement),
            acknowledgements: acknowledgementCount.get(row.id) || 0,
            views: 0,
            comments: 0,
            fileType: row.file_type ? String(row.file_type).split('/').pop()?.toUpperCase() || 'ARQUIVO' : 'ARQUIVO',
            sizeLabel: formatFileSize(row.file_size_bytes),
            storagePath: row.storage_path,
            driveUrl: row.drive_url,
            project: null,
            deliverable: null,
            revisionOfId: row.revision_of_id,
            isPreview: false,
          } satisfies WorkspaceDocument;
        }));
      }
    } catch (error) {
      console.error('Falha ao carregar documentos do Workspace', error);
      setDocs(previewDocuments);
      setCompanies(fallbackCompanies);
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(document: WorkspaceDocument) {
    if (!supabase || document.isPreview) return;
    const { data, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author_user_id')
      .eq('target_type', 'file')
      .eq('target_id', document.id)
      .order('created_at', { ascending: true });
    if (error) return;
    setCommentsByDoc((current) => ({
      ...current,
      [document.id]: (data || []).map((row: any) => ({
        id: row.id,
        author: 'CALI',
        body: row.body,
        createdAt: formatDocumentDate(row.created_at),
        mine: true,
      })),
    }));
  }

  const metrics = useMemo(() => ({
    total: docs.filter((doc) => doc.status !== 'archived').length,
    client: docs.filter((doc) => doc.clientVisible && doc.status === 'published').length,
    internal: docs.filter((doc) => !doc.clientVisible || doc.status === 'draft').length,
    drive: docs.filter((doc) => doc.source === 'google_drive').length,
  }), [docs]);

  const filtered = useMemo(() => docs.filter((doc) => {
    const haystack = `${doc.title} ${doc.company} ${documentCategoryMeta[doc.category].label} ${doc.version}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (companyFilter !== 'all' && doc.companyId !== companyFilter) return false;
    if (visibilityFilter === 'client' && !(doc.clientVisible && doc.status === 'published')) return false;
    if (visibilityFilter === 'internal' && !(!doc.clientVisible || doc.status === 'draft')) return false;
    if (visibilityFilter === 'archived' && doc.status !== 'archived') return false;
    if (visibilityFilter !== 'archived' && doc.status === 'archived') return false;
    return true;
  }), [docs, query, categoryFilter, companyFilter, visibilityFilter]);

  function resetCreateForm() {
    setForm({ ...emptyCreateForm, companyId: companies[0]?.id || 'aurora' });
    setSelectedFile(null);
    setRevisionOfId(null);
  }

  function openNewDocument() {
    resetCreateForm();
    setOpenCreate(true);
  }

  function openNewVersion(document: WorkspaceDocument) {
    setForm({
      title: document.title,
      companyId: document.companyId,
      category: document.category,
      version: document.version.startsWith('v') ? `v${Math.max(1, Number(document.version.replace(/[^0-9.]/g, '')) + 0.1).toFixed(1)}` : 'v2.0',
      source: 'workspace',
      driveUrl: '',
      clientVisible: document.clientVisible,
      requiresAcknowledgement: document.requiresAcknowledgement,
      project: document.project || '',
    });
    setRevisionOfId(document.id);
    setSelectedFile(null);
    setSelectedDoc(null);
    setOpenCreate(true);
  }

  async function saveDocument() {
    if (!form.title.trim() || !form.companyId) return;
    if (form.source === 'workspace' && !selectedFile) return;
    if (form.source === 'google_drive' && !form.driveUrl.trim()) return;
    setSaving(true);

    const company = companies.find((item) => item.id === form.companyId) || fallbackCompanies[0];
    const canPersist = Boolean(supabase && /^[0-9a-f-]{36}$/i.test(form.companyId));

    try {
      if (!canPersist || !supabase) {
        const local: WorkspaceDocument = {
          id: `local-${Date.now()}`,
          title: form.title.trim(), companyId: form.companyId, company: company?.name || 'Cliente', companyLogo: company?.logoUrl,
          category: form.category, version: form.version || 'v1.0', updated: 'agora', source: form.source,
          status: form.clientVisible ? 'published' : 'draft', clientVisible: form.clientVisible,
          requiresAcknowledgement: form.requiresAcknowledgement, acknowledgements: 0, views: 0, comments: 0,
          fileType: selectedFile?.name.split('.').pop()?.toUpperCase() || (form.source === 'google_drive' ? 'DRIVE' : 'ARQUIVO'),
          sizeLabel: selectedFile ? formatFileSize(selectedFile.size) : '—', driveUrl: form.driveUrl || null,
          project: form.project || null, revisionOfId, isPreview: true,
        };
        setDocs((current) => [local, ...current]);
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) throw new Error('Sessão administrativa não encontrada.');

        let storagePath: string | null = null;
        if (form.source === 'workspace' && selectedFile) {
          const cleanedName = safeFileName(selectedFile.name) || 'documento';
          storagePath = `documents/${form.companyId}/${crypto.randomUUID()}-${cleanedName}`;
          const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(storagePath, selectedFile, { upsert: false });
          if (uploadError) throw uploadError;
        }

        const { error: insertError } = await supabase.from('files').insert({
          company_id: form.companyId,
          title: form.title.trim(),
          category: form.category,
          storage_path: storagePath,
          drive_url: form.source === 'google_drive' ? form.driveUrl.trim() : null,
          version_label: form.version || 'v1.0',
          is_final: form.clientVisible,
          client_visible: form.clientVisible,
          uploaded_by: user.id,
          file_type: selectedFile?.type || (form.source === 'google_drive' ? 'application/vnd.google-apps.file' : null),
          file_size_bytes: selectedFile?.size || null,
          status: form.clientVisible ? 'published' : 'draft',
          requires_acknowledgement: form.requiresAcknowledgement,
          published_at: form.clientVisible ? new Date().toISOString() : null,
          source_type: form.source,
          revision_of_id: revisionOfId,
          original_filename: selectedFile?.name || null,
        });
        if (insertError) throw insertError;
        await loadDocuments();
      }
      setOpenCreate(false);
      resetCreateForm();
    } catch (error) {
      console.error('Falha ao salvar documento', error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(document: WorkspaceDocument) {
    const nextVisible = !(document.clientVisible && document.status === 'published');
    if (!supabase || document.isPreview) {
      setDocs((current) => current.map((item) => item.id === document.id ? { ...item, clientVisible: nextVisible, status: nextVisible ? 'published' : 'draft' } : item));
      setSelectedDoc((current) => current?.id === document.id ? { ...current, clientVisible: nextVisible, status: nextVisible ? 'published' : 'draft' } : current);
      return;
    }
    await supabase.from('files').update({ client_visible: nextVisible, status: nextVisible ? 'published' : 'draft', published_at: nextVisible ? new Date().toISOString() : null }).eq('id', document.id);
    await loadDocuments();
    setSelectedDoc(null);
  }

  async function archiveDocument(document: WorkspaceDocument) {
    if (!supabase || document.isPreview) {
      setDocs((current) => current.map((item) => item.id === document.id ? { ...item, status: 'archived', clientVisible: false } : item));
      setSelectedDoc(null);
      return;
    }
    await supabase.from('files').update({ status: 'archived', client_visible: false }).eq('id', document.id);
    await loadDocuments();
    setSelectedDoc(null);
  }

  async function openDocument(document: WorkspaceDocument) {
    if (document.driveUrl) {
      window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!supabase || !document.storagePath) return;
    const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(document.storagePath, 60);
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function sendComment() {
    if (!selectedDoc || !newComment.trim()) return;
    const body = newComment.trim();
    const localComment: DocumentComment = { id: `comment-${Date.now()}`, author: 'Patrícia Lima', body, createdAt: 'agora', mine: true };
    setCommentsByDoc((current) => ({ ...current, [selectedDoc.id]: [...(current[selectedDoc.id] || []), localComment] }));
    setNewComment('');

    if (!supabase || selectedDoc.isPreview) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('comments').insert({
      company_id: selectedDoc.companyId,
      target_type: 'file',
      target_id: selectedDoc.id,
      author_user_id: userData.user.id,
      body,
      client_visible: true,
    });
  }

  const selectedComments = selectedDoc ? commentsByDoc[selectedDoc.id] || [] : [];

  return (
    <Shell role="admin">
      <section className="page documents-page documents-admin-page">
        <div className="eyebrow">BIBLIOTECA CALI</div>
        <div className="page-heading documents-heading">
          <div>
            <h1>Documentos</h1>
            <p>Arquivos do trabalho organizados por cliente, versão e contexto. A versão final continua no Workspace mesmo quando houver cópia no Drive.</p>
          </div>
          <button className="primary compact-action" onClick={openNewDocument}><Plus size={17} />Adicionar documento</button>
        </div>

        <section className="document-metric-strip" aria-label="Resumo da biblioteca">
          <article><div><span>Total ativo</span><strong>{metrics.total}</strong></div><FileText size={20} /></article>
          <article><div><span>Com o cliente</span><strong>{metrics.client}</strong></div><Users size={20} /></article>
          <article><div><span>Internos / rascunhos</span><strong>{metrics.internal}</strong></div><FileClock size={20} /></article>
          <article><div><span>No Google Drive</span><strong>{metrics.drive}</strong></div><Cloud size={20} /></article>
        </section>

        <section className="document-control-bar">
          <label className="search-box document-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por documento, cliente ou versão" /></label>
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Filtrar por cliente">
            <option value="all">Todos os clientes</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | DocumentCategory)} aria-label="Filtrar por categoria">
            <option value="all">Todas as categorias</option>
            {Object.entries(documentCategoryMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
          <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)} aria-label="Filtrar por visibilidade">
            <option value="all">Ativos</option><option value="client">Com o cliente</option><option value="internal">Internos</option><option value="archived">Arquivados</option>
          </select>
          <div className="document-view-toggle" aria-label="Modo de visualização">
            <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} title="Cards"><LayoutGrid size={17} /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="Lista"><List size={17} /></button>
          </div>
        </section>

        {loading && <div className="document-inline-status"><RefreshCw className="spin" size={18} />Atualizando biblioteca…</div>}

        {viewMode === 'cards' ? (
          <section className="document-library-grid">
            {filtered.map((document) => (
              <article className="cali-document-card" key={document.id} onClick={() => setSelectedDoc(document)}>
                <DocumentCover document={document} />
                <div className="cali-document-card-body">
                  <div className="document-card-badges">
                    <span className={`doc-category-chip category-${document.category}`}>{documentCategoryMeta[document.category].label}</span>
                    <span className={`doc-visibility-chip ${document.clientVisible && document.status === 'published' ? 'published' : 'internal'}`}>{statusLabel(document)}</span>
                  </div>
                  <div className="document-client-line"><span className="document-company-logo">{document.company.slice(0, 1)}</span><span>{document.company}</span></div>
                  <h2>{document.title}</h2>
                  <p className="document-meta-line">{document.version} · {document.updated} · {document.fileType} · {document.sizeLabel}</p>
                  <div className="document-card-footer">
                    <div className="document-card-signals">
                      <span title="Comentários"><MessageSquare size={14} />{document.comments}</span>
                      {document.requiresAcknowledgement && <span title="Ciências"><FileCheck2 size={14} />{document.acknowledgements}</span>}
                    </div>
                    <div className="document-card-actions" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => setSelectedDoc(document)} title="Abrir ficha"><Eye size={16} /></button>
                      <button onClick={() => setOpenMenuId((current) => current === document.id ? null : document.id)} title="Mais ações"><Ellipsis size={18} /></button>
                      {openMenuId === document.id && (
                        <div className="document-action-menu">
                          <button onClick={() => { setOpenMenuId(null); void openDocument(document); }}><Download size={15} />Abrir arquivo</button>
                          <button onClick={() => { setOpenMenuId(null); openNewVersion(document); }}><History size={15} />Nova versão</button>
                          <button onClick={() => { setOpenMenuId(null); void toggleVisibility(document); }}><Users size={15} />{document.clientVisible ? 'Tornar interno' : 'Publicar ao cliente'}</button>
                          <button onClick={() => { setOpenMenuId(null); void archiveDocument(document); }}><Archive size={15} />Arquivar</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="document-list-view panel">
            <div className="document-list-head"><span>Documento</span><span>Cliente</span><span>Versão</span><span>Visibilidade</span><span>Atualização</span><span /></div>
            {filtered.map((document) => (
              <article className="document-list-row" key={document.id} onClick={() => setSelectedDoc(document)}>
                <div className="document-list-title"><DocumentCover document={document} compact /><div><strong>{document.title}</strong><small>{documentCategoryMeta[document.category].label} · {document.fileType}</small></div></div>
                <span>{document.company}</span><span>{document.version}</span><span className={`doc-visibility-chip ${document.clientVisible ? 'published' : 'internal'}`}>{statusLabel(document)}</span><span>{document.updated}</span>
                <button className="document-row-open" onClick={(event) => { event.stopPropagation(); setSelectedDoc(document); }}><Eye size={16} /></button>
              </article>
            ))}
          </section>
        )}

        {!filtered.length && <div className="panel document-empty"><FileText size={30} /><strong>Nenhum documento nesse recorte</strong><span>Ajuste os filtros ou adicione um novo arquivo.</span></div>}
      </section>

      {openCreate && (
        <div className="modal-backdrop full-screen-modal document-modal-backdrop">
          <section className="modal-card document-create-modal" role="dialog" aria-modal="true" aria-label={revisionOfId ? 'Adicionar nova versão' : 'Adicionar documento'}>
            <button className="modal-close" onClick={() => { setOpenCreate(false); resetCreateForm(); }} aria-label="Fechar"><X size={20} /></button>
            <div className="document-modal-heading"><span className="section-kicker">{revisionOfId ? 'NOVA VERSÃO' : 'NOVO DOCUMENTO'}</span><h2>{revisionOfId ? 'Atualizar documento sem perder o histórico' : 'Adicionar à biblioteca'}</h2><p>Organize o arquivo pelo contexto do trabalho. A publicação ao cliente pode acontecer agora ou depois.</p></div>
            <div className="document-create-layout">
              <div className="document-create-main">
                <label className="stacked-label">Nome do documento<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Nome que ficará visível" /></label>
                <div className="document-form-grid">
                  <label className="stacked-label">Cliente<select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value }))}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
                  <label className="stacked-label">Categoria<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as DocumentCategory }))}>{Object.entries(documentCategoryMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
                  <label className="stacked-label">Versão<input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} placeholder="v1.0" /></label>
                  <label className="stacked-label">Projeto / contexto<input value={form.project} onChange={(event) => setForm((current) => ({ ...current, project: event.target.value }))} placeholder="Opcional" /></label>
                </div>

                <div className="document-source-picker">
                  <button className={form.source === 'workspace' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, source: 'workspace' }))}><Upload size={17} /><span><strong>Arquivo do Workspace</strong><small>PDF, DOCX, XLSX, PPTX ou imagem</small></span></button>
                  <button className={form.source === 'google_drive' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, source: 'google_drive' }))}><Cloud size={17} /><span><strong>Link do Google Drive</strong><small>Mantém a origem externa identificada</small></span></button>
                </div>

                {form.source === 'workspace' ? (
                  <div className="document-upload-zone" onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
                    <Upload size={24} /><div><strong>{selectedFile ? selectedFile.name : 'Selecionar arquivo'}</strong><span>{selectedFile ? formatFileSize(selectedFile.size) : 'Clique para escolher o arquivo'}</span></div>
                  </div>
                ) : (
                  <label className="stacked-label">Link do arquivo no Drive<input value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/..." /></label>
                )}
              </div>

              <aside className="document-create-side">
                <DocumentCover document={{
                  id: 'preview', title: form.title || 'Nome do documento', companyId: form.companyId, company: companies.find((item) => item.id === form.companyId)?.name || 'Cliente',
                  category: form.category, version: form.version || 'v1.0', updated: 'agora', source: form.source, status: form.clientVisible ? 'published' : 'draft',
                  clientVisible: form.clientVisible, requiresAcknowledgement: form.requiresAcknowledgement, acknowledgements: 0, views: 0, comments: 0,
                  fileType: selectedFile?.name.split('.').pop()?.toUpperCase() || 'PDF', sizeLabel: selectedFile ? formatFileSize(selectedFile.size) : '—', isPreview: true,
                }} />
                <label className="document-setting-row"><input type="checkbox" checked={form.clientVisible} onChange={(event) => setForm((current) => ({ ...current, clientVisible: event.target.checked }))} /><span><strong>Disponível ao cliente</strong><small>O arquivo aparece na biblioteca da empresa.</small></span></label>
                <label className="document-setting-row"><input type="checkbox" checked={form.requiresAcknowledgement} onChange={(event) => setForm((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /><span><strong>Solicitar ciência</strong><small>Registra quem confirmou leitura e quando.</small></span></label>
              </aside>
            </div>
            <div className="document-modal-footer"><button className="secondary" onClick={() => { setOpenCreate(false); resetCreateForm(); }}>Cancelar</button><button className="primary" disabled={saving || !form.title.trim() || (form.source === 'workspace' ? !selectedFile : !form.driveUrl.trim())} onClick={() => void saveDocument()}>{saving ? 'Salvando…' : revisionOfId ? 'Salvar nova versão' : 'Salvar documento'}</button></div>
          </section>
        </div>
      )}

      {selectedDoc && (
        <div className="modal-backdrop full-screen-modal document-modal-backdrop">
          <section className="modal-card document-detail-modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setSelectedDoc(null)} aria-label="Fechar"><X size={20} /></button>
            <div className="document-detail-hero">
              <DocumentCover document={selectedDoc} />
              <div className="document-detail-title"><span className="section-kicker">{documentCategoryMeta[selectedDoc.category].label}</span><h2>{selectedDoc.title}</h2><p>{selectedDoc.company} · {selectedDoc.version} · atualizado em {selectedDoc.updated}</p><div className="document-detail-actions"><button className="primary" onClick={() => void openDocument(selectedDoc)}><Eye size={16} />Abrir arquivo</button><button className="secondary" onClick={() => openNewVersion(selectedDoc)}><History size={16} />Nova versão</button></div></div>
            </div>
            <nav className="document-detail-tabs"><button className={detailTab === 'summary' ? 'active' : ''} onClick={() => setDetailTab('summary')}>Resumo</button><button className={detailTab === 'comments' ? 'active' : ''} onClick={() => setDetailTab('comments')}>Comentários <span>{selectedComments.length}</span></button><button className={detailTab === 'acknowledgements' ? 'active' : ''} onClick={() => setDetailTab('acknowledgements')}>Ciência <span>{selectedDoc.acknowledgements}</span></button></nav>
            <div className="document-detail-body">
              {detailTab === 'summary' && <div className="document-summary-grid"><article><span>Visibilidade</span><strong>{statusLabel(selectedDoc)}</strong></article><article><span>Origem</span><strong>{selectedDoc.source === 'google_drive' ? 'Google Drive' : 'Workspace'}</strong></article><article><span>Formato</span><strong>{selectedDoc.fileType} · {selectedDoc.sizeLabel}</strong></article><article><span>Contexto</span><strong>{selectedDoc.project || 'Biblioteca geral'}</strong></article><article><span>Ciência</span><strong>{selectedDoc.requiresAcknowledgement ? 'Obrigatória' : 'Não solicitada'}</strong></article><article><span>Versão</span><strong>{selectedDoc.version}</strong></article></div>}
              {detailTab === 'comments' && <div className="document-comments"><div className="document-comment-list">{selectedComments.length ? selectedComments.map((comment) => <article key={comment.id} className={comment.mine ? 'mine' : ''}><div><strong>{comment.author}</strong><span>{comment.createdAt}</span></div><p>{comment.body}</p></article>) : <div className="document-no-comments">Nenhum comentário ainda.</div>}</div><div className="document-comment-compose"><textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Escreva um comentário contextual sobre este documento" rows={2} /><button className="primary" disabled={!newComment.trim()} onClick={() => void sendComment()}><Send size={16} />Enviar</button></div></div>}
              {detailTab === 'acknowledgements' && <div className="document-ack-panel"><FileCheck2 size={30} /><div><strong>{selectedDoc.requiresAcknowledgement ? `${selectedDoc.acknowledgements} ciência(s) registrada(s)` : 'Este documento não exige ciência'}</strong><p>{selectedDoc.requiresAcknowledgement ? 'A confirmação fica vinculada ao usuário, documento, versão e horário.' : 'Você pode ativar a solicitação de ciência ao publicar uma nova versão.'}</p></div></div>}
            </div>
            <div className="document-detail-footer"><button className="secondary" onClick={() => void toggleVisibility(selectedDoc)}>{selectedDoc.clientVisible ? 'Tornar interno' : 'Publicar ao cliente'}</button><button className="secondary danger-soft" onClick={() => void archiveDocument(selectedDoc)}><Archive size={15} />Arquivar</button></div>
          </section>
        </div>
      )}
    </Shell>
  );
}
