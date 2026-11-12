import { Button } from '../../components/ds/Button';
import { DialogFrame } from '../../components/ds/DialogFrame';
import { EmptyState } from '../../components/ds/EmptyState';
import { FieldLabel } from '../../components/ds/FieldLabel';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { LoadingState } from '../../components/ds/LoadingState';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from '../../hooks/useLocation';
import {
  Archive, CheckCircle2, Cloud, ExternalLink, Eye, FileCheck2, FileClock, FileText,
  ArrowLeft, ChevronRight, FolderOpen, ImagePlus, Layers3, Link2, Loader2, MessageSquare, Plus, Search, Send,
  ShieldCheck, Upload, X,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import { DocumentAutoCover as AutoCover } from '../../components/documents/DocumentAutoCover';
import { readAdminDocuments } from '../../api/admin/documents/library';
import { archiveAdminDocument, saveAdminDocument, setAdminDocumentPublication } from '../../api/admin/documents/writes';
import { addAdminDocumentComment, readAdminDocumentComments } from '../../api/admin/documents/comments';
import type {
  CategorySlug, CompanyOption, DeliverableOption, DocumentRow, DriveConnection, EditorMode, FileComment,
  FormState, ProfileOption, ProjectOption, SourceMode, WorkflowStage,
} from '../../domain/documents';
import { openPrivateWorkspaceFile, workspaceStorageAvailable } from '../../api/files/workspace';

const categoryOptions: Array<{ value: CategorySlug; label: string }> = [
  { value: 'deliverable', label: 'Entregável' }, { value: 'report', label: 'Relatório' },
  { value: 'policy', label: 'Política' }, { value: 'manual', label: 'Manual' },
  { value: 'flow', label: 'Fluxo' }, { value: 'guide', label: 'Guia' },
  { value: 'onboarding', label: 'Onboarding' }, { value: 'schedule', label: 'Cronograma' },
  { value: 'contract', label: 'Contrato' }, { value: 'reference', label: 'Referência' }, { value: 'other', label: 'Outro' },
];

const documentKinds = ['Entregável', 'Política', 'Fluxo', 'Protocolo', 'Manual', 'Guia', 'Relatório', 'Plano', 'Matriz', 'Apresentação', 'Contrato', 'Cronograma', 'Outro'];

const categoryLabel = (value: CategorySlug) => categoryOptions.find((item) => item.value === value)?.label || 'Outro';
const stageLabel = (value: WorkflowStage) => value === 'preparation' ? 'Em preparação' : value === 'awaiting_final_file' ? 'Aguardando arquivo final' : value === 'ready_to_publish' ? 'Pronto para publicar' : value === 'published' ? 'Disponível ao cliente' : 'Arquivado';
const sourceLabel = (value: DocumentRow['sourceType']) => value === 'google_drive' ? 'Google Drive' : value === 'external' ? 'Link externo' : 'Workspace';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
}

function formatFileSize(value?: number) {
  if (!value) return '—';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

function nextVersion(value: string) {
  const match = value.trim().match(/^v?(\d+)(?:\.(\d+))?$/i);
  return match ? `v${Number(match[1]) + 1}.0` : 'v2.0';
}

function emptyForm(companyId = ''): FormState {
  return { title: '', companyId, projectId: '', deliverableId: '', category: 'deliverable', kind: 'Entregável', version: 'v1.0', description: '', publish: false, requiresAcknowledgement: false, sourceMode: 'upload', driveUrl: '', revisionOfId: '', validUntil: '' };
}

// Equipe CALI usa a mesma página, só para consulta: sem criar, publicar, arquivar ou comentar.
const DocsFrame = ({ staff, children }: { staff?: boolean; children: ReactNode }) => staff ? <>{children}</> : <Shell role="admin">{children}</Shell>;
export const StaffDocumentsPage = () => <AdminDocumentsPageV4 staff />;

export function AdminDocumentsPageV4({ staff = false }: { staff?: boolean } = {}) {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'covers' | 'list'>('list');
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('new');
  const [editingDoc, setEditingDoc] = useState<DocumentRow | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [detailDoc, setDetailDoc] = useState<DocumentRow | null>(null);
  const [comments, setComments] = useState<FileComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentVisible, setCommentVisible] = useState(true);

  const filtered = useMemo(() => docs.filter((doc) => {
    const haystack = `${doc.title} ${doc.company} ${doc.project || ''} ${doc.deliverable || ''} ${doc.protocol} ${categoryLabel(doc.category)} ${stageLabel(doc.workflowStage)}`.toLocaleLowerCase('pt-BR');
    if (search && !haystack.includes(search.toLocaleLowerCase('pt-BR'))) return false;
    if (companyFilter !== 'all' && doc.companyId !== companyFilter) return false;
    // Arquivado fica fora da visão padrão; só aparece quando a etapa "Arquivados" é escolhida.
    if (stageFilter === 'all' ? (doc.workflowStage === 'archived' || doc.status === 'archived') : doc.workflowStage !== stageFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    return true;
  }), [docs, search, companyFilter, stageFilter, categoryFilter]);

  // Pasta = entregável com subtarefas ou com mais de um documento. Os demais documentos seguem soltos.
  const folderList = useMemo(() => {
    const groups = new Map<string, DocumentRow[]>();
    filtered.forEach((doc) => { if (doc.deliverableId) groups.set(doc.deliverableId, [...(groups.get(doc.deliverableId) || []), doc]); });
    return [...groups.entries()].map(([id, items]) => ({ id, items, info: deliverables.find((item) => item.id === id) })).filter((group) => group.items.length > 1 || (group.info?.parts || 0) > 0);
  }, [filtered, deliverables]);
  const folderIds = useMemo(() => new Set(folderList.map((group) => group.id)), [folderList]);
  const activeFolder = folderList.find((group) => group.id === openFolder) || null;
  const shown = useMemo(() => activeFolder ? activeFolder.items : filtered.filter((doc) => !doc.deliverableId || !folderIds.has(doc.deliverableId)), [activeFolder, filtered, folderIds]);

  const stats = useMemo(() => ({
    preparation: docs.filter((doc) => doc.workflowStage === 'preparation').length,
    awaitingFinal: docs.filter((doc) => doc.workflowStage === 'awaiting_final_file').length,
    ready: docs.filter((doc) => doc.workflowStage === 'ready_to_publish').length,
    published: docs.filter((doc) => doc.workflowStage === 'published').length,
  }), [docs]);

  const formProjects = useMemo(() => projects.filter((item) => item.companyId === form.companyId), [projects, form.companyId]);
  const formDeliverables = useMemo(() => deliverables.filter((item) => item.companyId === form.companyId && (!form.projectId || item.projectId === form.projectId)), [deliverables, form.companyId, form.projectId]);

  // Chegando por um aviso (?documento=...): abre os detalhes do documento, uma vez só.
  const location = useLocation(); const openedFromLink = useRef('');
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('documento') || '';
    if (staff || !wanted || openedFromLink.current === wanted || !docs.length) return;
    const hit = docs.find((doc) => doc.id === wanted); if (!hit) return;
    openedFromLink.current = wanted; void loadComments(hit);
  }, [location.search, docs]);

  useEffect(() => {
    const modalOpen = editorOpen || Boolean(detailDoc);
    document.body.classList.toggle('workspace-modal-open', modalOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, detailDoc]);

  useEffect(() => () => { if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  useEffect(() => {
    if (preview || !workspaceStorageAvailable) {
      setLoading(false);
      return;
    }
    void loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError('');
    try {
      const library = await readAdminDocuments();
      setCompanies(library.companies);
      setProjects(library.projects);
      setDeliverables(library.deliverables);
      setProfiles(library.profiles);
      setDriveConnection(library.driveConnection);
      setDocs(library.documents);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }

  function resetUploads() {
    setFile(null); setCover(null);
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview('');
  }

  function openNewDocument(mode: SourceMode = 'upload') {
    resetUploads(); setEditingDoc(null); setEditorMode('new');
    setForm({ ...emptyForm(companies[0]?.id || ''), sourceMode: mode });
    setError(''); setNotice(''); setEditorOpen(true);
  }

  function completeDocument(doc: DocumentRow) {
    resetUploads(); setEditingDoc(doc); setEditorMode('complete'); setDetailDoc(null);
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: doc.version || 'v1.0', description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: '', validUntil: doc.validUntil || '' });
    setCoverPreview(doc.coverUrl || ''); setEditorOpen(true);
  }

  function openNewVersion(doc: DocumentRow) {
    resetUploads(); setEditingDoc(null); setEditorMode('revision'); setDetailDoc(null);
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: nextVersion(doc.version), description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: doc.id, validUntil: doc.validUntil || '' });
    setEditorOpen(true);
  }

  function selectCover(next: File | null) {
    setCover(next);
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(next ? URL.createObjectURL(next) : editingDoc?.coverUrl || '');
  }

  function updateCompany(nextCompanyId: string) { setForm((current) => ({ ...current, companyId: nextCompanyId, projectId: '', deliverableId: '' })); }
  function updateProject(nextProjectId: string) { setForm((current) => ({ ...current, projectId: nextProjectId === 'none' ? '' : nextProjectId, deliverableId: '' })); }

  async function saveDocument() {
    if (!form.title.trim() || !form.companyId) return;
    if (form.sourceMode === 'upload' && !file) return;
    if (form.sourceMode === 'drive' && !/^https?:\/\//i.test(form.driveUrl.trim())) return;
    setSaving(true); setError('');
    try {
      const receipt = await saveAdminDocument({ form, editorMode, editingDoc, file, cover });
      const title = form.title.trim();
      if (receipt.completed) {
        setNotice(form.publish ? `${title} publicado para o cliente.` : `${title} recebeu o arquivo final e está pronto para publicação.`);
      } else {
        setNotice(`${title} salvo com o protocolo ${receipt.protocol}.`);
      }
      setEditorOpen(false); setEditingDoc(null); resetUploads(); await loadDocuments();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(doc: DocumentRow) {
    if (doc.driveUrl) { window.open(doc.driveUrl, '_blank', 'noopener,noreferrer'); return; }
    if (!doc.storagePath) return;
    try {
      await openPrivateWorkspaceFile(doc.storagePath);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível abrir o arquivo.');
    }
  }

  async function changePublication(doc: DocumentRow, publish: boolean) {
    if (publish && !doc.storagePath && !doc.driveUrl) return;
    setSaving(true);
    try {
      await setAdminDocumentPublication(doc, publish);
      setNotice(publish ? 'Documento disponibilizado ao cliente.' : 'Documento voltou para uso interno.');
      setDetailDoc(null);
      await loadDocuments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveDocument(doc: DocumentRow) {
    setSaving(true);
    try {
      await archiveAdminDocument(doc);
      setNotice('Documento arquivado. O histórico foi preservado.');
      setDetailDoc(null);
      await loadDocuments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível arquivar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function loadComments(doc: DocumentRow) {
    setDetailDoc(doc); setComments([]); setCommentText('');
    setCommentsLoading(true);
    try {
      setComments(await readAdminDocumentComments(doc.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os comentários.');
    } finally {
      setCommentsLoading(false);
    }
  }

  async function sendComment() {
    if (!detailDoc || !commentText.trim()) return;
    try {
      await addAdminDocumentComment(detailDoc, commentText, commentVisible);
      setCommentText('');
      await loadComments(detailDoc);
      await loadDocuments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o comentário.');
    }
  }

  if(loading)return <DocsFrame staff={staff}><section className="v2-client-module data-loading" aria-live="polite" aria-busy="true">Carregando biblioteca…</section></DocsFrame>;
  const openRow = (doc: DocumentRow) => staff ? openDocument(doc) : loadComments(doc);
  const delivered = (doc: DocumentRow) => doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('pt-BR') : '—';

  const tagTone = (stage: string) => stage === 'published' ? 'green' : stage === 'ready_to_publish' ? 'blue' : stage === 'archived' ? 'red' : stage === 'awaiting_final_file' ? 'yellow' : 'purple';
  const validity = (doc: DocumentRow) => doc.validUntil ? doc.validUntil.split('-').reverse().join('/') : 'não definida';
  // Projeto e entregável aparecem uma vez só: o entregável some quando já é o próprio título do documento.
  const same = (a?: string | null, b?: string | null) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
  const contextLine = (doc: DocumentRow) => [doc.project ? `Projeto ${doc.project}` : 'Sem projeto vinculado', doc.deliverable && !same(doc.deliverable, doc.title) ? `Entregável ${doc.deliverable}` : ''].filter(Boolean).join(' · ');
  const reviewInfo = (value?: string | null) => {
    if (!value) return { date: 'Não definida', note: '', tone: 'muted' };
    const days = Math.round((new Date(`${value}T12:00:00`).getTime() - Date.now()) / 86400000);
    const note = days < 0 ? `vencida há ${-days} ${-days === 1 ? 'dia' : 'dias'}` : days === 0 ? 'vence hoje' : `faltam ${days} ${days === 1 ? 'dia' : 'dias'}`;
    return { date: value.split('-').reverse().join('/'), note, tone: days < 0 ? 'late' : days <= 60 ? 'soon' : '' };
  };

  return (
    <DocsFrame staff={staff}>
      <div className="ap-app v2-admin-page v2-admin-docs v2-client-module"><div className="ap-content"><div className="wf documents-admin-v4">
        <div className="wf-head"><div><small>{staff ? 'EQUIPE CALI / DOCUMENTOS' : 'BACKOFFICE / CALI RH'}</small><h1>Documentos</h1><p>{staff ? 'Documentos das empresas que você atende, organizados por pasta de entregável.' : 'Acervo de todas as contas: prévias, arquivos finais, versões, publicação e ciência.'}</p></div><div className="v2-head-actions" hidden={staff}><Button variant="workflowSecondary" type="button" onClick={() => openNewDocument('drive')}><Link2 size={15} /> Adicionar via Drive</Button><Button variant="workflowPrimary" type="button" onClick={() => openNewDocument('upload')}><Plus size={15} /> Adicionar documento</Button></div></div>

        {notice && <InlineNotice tone="success"><CheckCircle2 size={18} />{notice}</InlineNotice>}
        {error && !editorOpen && <InlineNotice>{error}</InlineNotice>}

        {!staff && <section className={`wf-doc-drive v2-doc-storage ${driveConnection ? 'connected' : ''}`}>
          <div><strong>{driveConnection ? 'Arquivo interno da CALI' : 'Armazenamento dos documentos'}</strong><p>{driveConnection ? `${driveConnection.accountEmail || 'Conta CALI'}${driveConnection.rootFolderName ? ` · ${driveConnection.rootFolderName}` : ''} · fonte operacional` : 'A CALI organiza a versão de trabalho aqui. Depois da aprovação, o documento fica disponível para ser salvo no Drive da empresa cliente.'}</p></div>{driveConnection && <span className="wf-tag green"><CheckCircle2 size={12} /> Conectado</span>}
        </section>}

        {activeFolder && <div className="v2-fv-top"><button type="button" className="v2-fv-back" onClick={() => setOpenFolder(null)}><ArrowLeft size={14} /> Documentos</button>
          <header className="v2-fv-head"><div><FolderOpen size={22} /><div><h2>{activeFolder.info?.title || activeFolder.items[0].deliverable || 'Entregável'}</h2><p>{[activeFolder.info?.protocol, activeFolder.items[0].company, `${activeFolder.items.length} ${activeFolder.items.length === 1 ? 'documento' : 'documentos'}`].filter(Boolean).join(' · ')}</p></div></div><div className="v2-fv-right"><div className="wf-segments" aria-label="Exibição da pasta"><button type="button" className={layout === 'covers' ? 'on' : ''} onClick={() => setLayout('covers')}>Capas</button><button type="button" className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')}>Lista</button></div></div></header></div>}

        <div className="wf-doc-toolbar v2-doc-toolbar" hidden={Boolean(activeFolder)}>
          <strong>{[folderList.length ? `${folderList.length} ${folderList.length === 1 ? 'pasta' : 'pastas'}` : '', shown.length || !folderList.length ? `${shown.length} ${shown.length === 1 ? 'documento' : 'documentos'}` : ''].filter(Boolean).join(' · ')}</strong>
          <select className="wf-doc-filter" aria-label="Empresa" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="all">Todas as empresas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="wf-doc-filter" aria-label="Etapa" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Em uso (sem arquivados)</option><option value="preparation">Em preparação</option><option value="awaiting_final_file">Aguardando arquivo final</option><option value="ready_to_publish">Pronto para publicar</option><option value="published">Disponível ao cliente</option><option value="archived">Arquivados ({docs.filter((doc) => doc.workflowStage === 'archived' || doc.status === 'archived').length})</option></select>
          <select className="wf-doc-filter" aria-label="Categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas as categorias</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, empresa, projeto ou protocolo" aria-label="Buscar documentos" /></label>
          <div className="wf-segments" aria-label="Exibição do acervo"><button type="button" className={layout === 'covers' ? 'on' : ''} onClick={() => setLayout('covers')}>Capas</button><button type="button" className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')}>Lista</button></div>
        </div>

        {filtered.length === 0 && !activeFolder && <EmptyState variant="workflow"><strong>{docs.length ? 'Nenhum documento neste filtro.' : 'A biblioteca está pronta.'}</strong><p>{docs.length ? 'Ajuste os filtros.' : 'As prévias surgirão automaticamente quando um entregável marcado como “Gera documento” for criado.'}</p></EmptyState>}

        {layout === 'covers' && filtered.length > 0 && <section className="wf-doc-gallery v2-doc-gallery">
          {!activeFolder && folderList.map((group) => { const first = group.items[0]; const live = group.items.filter((doc) => doc.workflowStage === 'published').length; return <article className="wf-doc-cover doc-work v2-doc-card v2-folder-card" key={`f:${group.id}`}>
            <div className="v2-doc-art-wrap"><button type="button" className="wf-doc-art v2-folder-art" aria-label={`Abrir a pasta ${group.info?.title || ''}`} onClick={() => setOpenFolder(group.id)}>{first.companyLogo ? <AutoCover logo={first.companyLogo} name={first.company} /> : <span><b>CALI</b></span>}</button><span className="v2-folder-mark" aria-hidden="true"><FolderOpen size={18} /></span><div className="v2-doc-tags"><span className="wf-doc-label doc-work">Pasta</span></div></div>
            <div className="wf-doc-content"><h2 title={group.info?.title || ''}>{group.info?.title || first.deliverable || 'Entregável'}</h2>
              <div className="v2-doc-client"><span className="v2-doc-client-logo">{first.companyLogo ? <img src={first.companyLogo} alt="" /> : <span>{first.company.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{first.company}</strong><small>{first.project ? `Projeto ${first.project}` : 'Sem projeto vinculado'}</small></div></div>
              <div className="v2-doc-foot"><strong className="wf-doc-protocol">{group.info?.protocol || 'Sem protocolo'}</strong><small className="v2-folder-count">{live} de {group.items.length} {group.items.length === 1 ? 'disponível' : 'disponíveis'} ao cliente</small></div>
              <button type="button" className="v2-folder-open" onClick={() => setOpenFolder(group.id)}>Abrir pasta <ChevronRight size={14} /></button></div>
          </article>; })}
          {shown.map((doc) => {
            const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements);
            const needsFile = doc.workflowStage === 'preparation' || doc.workflowStage === 'awaiting_final_file';
            const review = reviewInfo(doc.validUntil);
            return <article className={`wf-doc-cover doc-work v2-doc-card status-${doc.status} stage-${doc.workflowStage}`} key={doc.id}>
              <div className="v2-doc-art-wrap">
                <button type="button" className={`wf-doc-art ${doc.coverUrl ? 'has-cover' : ''}`} aria-label={`Ver detalhes de ${doc.title}`} onClick={() => void openRow(doc)}>{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : doc.companyLogo ? <AutoCover logo={doc.companyLogo} name={doc.company} /> : <span><b>CALI</b></span>}</button>
                <div className="v2-doc-tags"><span className={`wf-tag ${tagTone(doc.workflowStage)}`}>{stageLabel(doc.workflowStage)}</span><span className="wf-doc-label doc-work">{categoryLabel(doc.category)}</span></div>
              </div>
              <div className="wf-doc-content">
                <h2 title={doc.title}>{doc.title}</h2>
                <div className="v2-doc-client"><span className="v2-doc-client-logo">{doc.companyLogo ? <img src={doc.companyLogo} alt="" /> : <span>{doc.company.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{doc.company}</strong><small>{contextLine(doc)}</small></div></div>
                <dl className="v2-doc-facts">
                  <div><dt>Versão</dt><dd>{doc.version}</dd></div>
                  <div><dt>Origem</dt><dd>{sourceLabel(doc.sourceType)}</dd></div>
                  <div><dt>Atualizado em</dt><dd>{formatDateTime(doc.updatedAt)}</dd></div>
                  <div className={review.tone}><dt>Validade / revisão</dt><dd>{review.date}{review.note && <small>{review.note}</small>}</dd></div>
                </dl>
                <div className="v2-doc-foot"><strong className="wf-doc-protocol">{doc.protocol || 'Sem protocolo'}</strong><div className="v2-doc-metrics"><span title="Visualizações"><Eye size={12} />{doc.views}</span>{doc.requiresAcknowledgement && <span className={pending > 0 ? 'pending' : 'done'} title="Ciências registradas"><ShieldCheck size={12} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''}</span>}<span title="Comentários"><MessageSquare size={12} />{doc.comments}</span></div></div>
                <div className="wf-doc-actions">{needsFile && !staff && <button type="button" className="v2-doc-primary" onClick={() => completeDocument(doc)}><Upload size={13} /> Completar</button>}<button type="button" onClick={() => void openDocument(doc)} disabled={!doc.storagePath && !doc.driveUrl}><ExternalLink size={13} /> Abrir</button>{!staff && <button type="button" onClick={() => void loadComments(doc)}>Detalhes</button>}</div>
              </div>
            </article>;
          })}
        </section>}

        {layout === 'list' && filtered.length > 0 && <div className="wf-records v2-admin-doc-list">
          <div className="wf-record-row header"><span/><span>Protocolo / Documento</span><span>Empresa / Projeto</span><span>Etapa</span><span>Validade</span><span>Entregue em</span><span>Acompanhamento</span><span/></div>
          {!activeFolder && folderList.map((group) => { const first = group.items[0]; const live = group.items.filter((doc) => doc.workflowStage === 'published'); const last = live.map((doc) => doc.publishedAt || '').sort().pop(); return <div className="wf-record-row v2-folder-row" key={`f:${group.id}`} role="button" tabIndex={0} onClick={() => setOpenFolder(group.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpenFolder(group.id); } }}>
            <span className="v2-record-logo">{first.companyLogo ? <img src={first.companyLogo} alt="" /> : <span aria-hidden="true">{first.company.slice(0, 1).toUpperCase()}</span>}</span>
            <span><small>{group.info?.protocol || '—'}</small><strong><FolderOpen size={15} /> {group.info?.title || first.deliverable || 'Entregável'}</strong><small>{group.items.length} {group.items.length === 1 ? 'documento' : 'documentos'}</small></span>
            <span className="v2-record-author"><strong>{first.company}</strong><small>{first.project ? `Projeto ${first.project}` : 'Sem projeto vinculado'}</small></span>
            <span><span className="wf-tag amber">Pasta</span></span>
            <span>—</span>
            <span>{last ? new Date(last).toLocaleDateString('pt-BR') : '—'}</span>
            <span>{live.length} de {group.items.length} {group.items.length === 1 ? 'disponível' : 'disponíveis'}</span>
            <ChevronRight size={16} />
          </div>; })}
          {shown.map((doc) => { const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements); return <div className="wf-record-row" key={doc.id} role="button" tabIndex={0} onClick={() => void openRow(doc)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); void openRow(doc); } }}>
            <span className="v2-record-logo">{doc.companyLogo ? <img src={doc.companyLogo} alt="" /> : <span aria-hidden="true">{doc.company.slice(0, 1).toUpperCase()}</span>}</span>
            <span><small>{doc.protocol || '—'}</small><strong title={doc.title}>{doc.title}</strong><small>{categoryLabel(doc.category)} · versão {String(doc.version).replace(/^v/i, '')}</small></span>
            <span className="v2-record-author"><strong>{doc.company}</strong><small>{activeFolder ? (doc.project ? `Projeto ${doc.project}` : 'Sem projeto vinculado') : contextLine(doc)}</small></span>
            <span><span className={`wf-tag ${tagTone(doc.workflowStage)}`}>{stageLabel(doc.workflowStage)}</span></span>
            <span className={`v2-doc-review ${reviewInfo(doc.validUntil).tone}`}>{reviewInfo(doc.validUntil).date}{reviewInfo(doc.validUntil).note && <small>{reviewInfo(doc.validUntil).note}</small>}</span>
            <span>{delivered(doc)}</span>
            <span className="v2-doc-metrics"><span><Eye size={12} />{doc.views}</span>{doc.requiresAcknowledgement && <span className={pending > 0 ? 'pending' : 'done'}><ShieldCheck size={12} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''}</span>}<span><MessageSquare size={12} />{doc.comments}</span></span>
            <button type="button" aria-label={`Abrir ${doc.title}`} onClick={(event) => { event.stopPropagation(); void openRow(doc); }}><ChevronRight size={16} /></button>
          </div>; })}
        </div>}
      </div></div>

      {editorOpen && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><DialogFrame className="modal-card document-create-modal document-create-modal-v3" aria-label="Editar documento">
        <header className="document-modal-header"><div><span className="section-kicker">{editorMode === 'complete' ? 'COMPLETAR PRÉVIA' : editorMode === 'revision' ? 'NOVA VERSÃO' : 'NOVO DOCUMENTO'}</span><h2>{editorMode === 'complete' ? 'Adicionar o arquivo final sem perder o vínculo' : editorMode === 'revision' ? 'Criar nova versão sem sobrescrever a anterior' : 'Organizar documento no Workspace'}</h2><p>{editorMode === 'complete' ? `O protocolo ${editingDoc?.protocol} e os vínculos com cliente, projeto e entregável serão preservados.` : 'Arquivo, metadados e publicação ficam registrados no mesmo histórico.'}</p></div><Button type="button" variant="close" className="document-modal-close" onClick={() => setEditorOpen(false)}><X size={20} /></Button></header>
        <div className="document-modal-scroll">
          {error && <InlineNotice>{error}</InlineNotice>}
          <div className="document-source-tabs-v3"><button type="button" className={form.sourceMode === 'upload' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'upload' }))}><Upload size={16} />Enviar arquivo</button><button type="button" className={form.sourceMode === 'drive' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'drive' }))}><Cloud size={16} />Usar link do Drive</button></div>
          <div className="document-upload-pair">
            {form.sourceMode === 'upload' ? <label className={`upload-drop document-file-drop ${file ? 'selected' : ''}`}><Upload size={25} /><strong>{file ? file.name : 'Selecionar documento'}</strong><span>{file ? `${formatFileSize(file.size)} · ${file.type || 'arquivo'}` : 'PDF, DOCX, XLSX, PPTX ou imagem'}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label> : <label className="document-drive-link-field-v3"><Cloud size={25} /><strong>Link do arquivo no Google Drive</strong><input value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/..." /></label>}
            <label className={`document-cover-upload ${coverPreview ? 'selected' : ''}`}>{coverPreview ? <img src={coverPreview} alt="Prévia da capa" /> : <><ImagePlus size={25} /><strong>Adicionar capa</strong><span>Opcional</span></>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectCover(event.target.files?.[0] ?? null)} /></label>
          </div>
          <div className="document-protocol-note"><span>PROTOCOLO</span><strong>{editingDoc?.protocol || 'Gerado automaticamente ao salvar'}</strong><small>{editorMode === 'complete' ? 'Esta prévia mantém o protocolo que nasceu com o entregável.' : editorMode === 'revision' ? 'A nova versão recebe protocolo próprio e continua ligada à anterior.' : 'Novo documento, novo protocolo.'}</small></div>
          <div className="form-grid document-form-grid document-form-grid-v3">
            <FieldLabel className="wide">Nome do documento<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></FieldLabel>
            <FieldLabel>Cliente<select value={form.companyId} disabled={editorMode === 'complete'} onChange={(event) => updateCompany(event.target.value)}><option value="">Selecionar</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FieldLabel>
            <FieldLabel>Projeto<select value={form.projectId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => updateProject(event.target.value)}><option value="none">Sem projeto</option>{formProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FieldLabel>
            <FieldLabel>Entregável<select value={form.deliverableId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => setForm((current) => ({ ...current, deliverableId: event.target.value === 'none' ? '' : event.target.value }))}><option value="none">Sem entregável</option>{formDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></FieldLabel>
            <FieldLabel>Categoria<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CategorySlug }))}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel>Tipo documental<select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>{documentKinds.map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
            <FieldLabel>Versão<input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /></FieldLabel>
            <FieldLabel>Validade / próxima revisão<input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /><small>Alerta ao cliente 60 dias antes.</small></FieldLabel>
            <FieldLabel className="wide">Descrição / contexto<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></FieldLabel>
          </div>
          <div className="document-publication-options"><label className="check-line"><input type="checkbox" checked={form.publish} onChange={(event) => setForm((current) => ({ ...current, publish: event.target.checked }))} /><span><strong>Disponibilizar ao cliente ao salvar</strong><small>Se desmarcado, fica “Pronto para publicar”.</small></span></label><label className="check-line"><input type="checkbox" checked={form.requiresAcknowledgement} onChange={(event) => setForm((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /><span><strong>Solicitar ciência</strong><small>Visualização e ciência ficam registradas por usuário.</small></span></label></div>
        </div>
        <footer className="document-modal-footer"><span>{editorMode === 'complete' ? 'Cliente, projeto, entregável e protocolo permanecem intactos.' : 'Nada é publicado sem a sua escolha.'}</span><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditorOpen(false)}>Cancelar</Button><Button type="button" variant="primary" disabled={saving || !form.title.trim() || !form.companyId || (form.sourceMode === 'upload' ? !file : !/^https?:\/\//i.test(form.driveUrl.trim()))} onClick={() => void saveDocument()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : editorMode === 'complete' ? 'Concluir documento' : 'Salvar documento'}</Button></div></footer>
      </DialogFrame></div>}

      {detailDoc && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><DialogFrame className="modal-card document-detail-modal-v3" aria-label={detailDoc.title}><Button variant="close" type="button" onClick={() => setDetailDoc(null)}><X size={20} /></Button>
        <header className="document-detail-header-v3"><div className={`document-detail-cover-v3 ${detailDoc.coverUrl ? 'has-cover' : ''}`}>{detailDoc.coverUrl ? <img src={detailDoc.coverUrl} alt="" /> : <FileText size={32} />}</div><div><span className="section-kicker">{stageLabel(detailDoc.workflowStage)} · {detailDoc.version}</span><h2>{detailDoc.title}</h2><p>{detailDoc.protocol}</p></div></header>
        <div className="document-detail-scroll-v3">
          <section className="document-detail-grid-v3"><article><span>Cliente</span><strong>{detailDoc.company}</strong><small>{detailDoc.project || 'Sem projeto'}{detailDoc.deliverable ? ` · ${detailDoc.deliverable}` : ''}</small></article><article><span>Etapa</span><strong>{stageLabel(detailDoc.workflowStage)}</strong><small>{detailDoc.workflowOrigin === 'deliverable' ? 'Prévia criada pelo entregável' : 'Documento criado manualmente'}</small></article><article><span>Origem</span><strong>{sourceLabel(detailDoc.sourceType)}</strong><small>{detailDoc.originalFilename || detailDoc.fileType || 'Arquivo ainda não anexado'}</small></article><article><span>Ciência</span><strong>{detailDoc.requiresAcknowledgement ? `${detailDoc.acknowledgements}${detailDoc.expectedAcknowledgements ? ` de ${detailDoc.expectedAcknowledgements}` : ''}` : 'Não solicitada'}</strong><small>{detailDoc.views} visualizações</small></article></section>
          {detailDoc.description && <section className="document-context-v3"><span>CONTEXTO</span><p>{detailDoc.description}</p></section>}
          <section className="document-detail-actions-v3">{(detailDoc.workflowStage === 'preparation' || detailDoc.workflowStage === 'awaiting_final_file') && <Button variant="primary" onClick={() => completeDocument(detailDoc)}><Upload size={16} />Completar documento</Button>}<Button variant="secondary" onClick={() => void openDocument(detailDoc)} disabled={!detailDoc.storagePath && !detailDoc.driveUrl}><ExternalLink size={16} />Abrir</Button>{detailDoc.workflowStage === 'ready_to_publish' && <Button variant="primary" disabled={saving} onClick={() => void changePublication(detailDoc, true)}><FileCheck2 size={16} />Publicar</Button>}{detailDoc.status === 'published' && <Button variant="secondary" disabled={saving} onClick={() => void changePublication(detailDoc, false)}><FileClock size={16} />Tornar interno</Button>}{detailDoc.storagePath || detailDoc.driveUrl ? <Button variant="secondary" onClick={() => openNewVersion(detailDoc)}><Layers3 size={16} />Nova versão</Button> : null}{detailDoc.status !== 'archived' && <Button variant="secondary" className="danger" disabled={saving} onClick={() => void archiveDocument(detailDoc)}><Archive size={16} />Arquivar</Button>}</section>
          <section className="document-comments-v3"><div className="document-comments-title-v3"><div><span className="section-kicker">CONVERSA DO DOCUMENTO</span><strong>{detailDoc.comments} comentários</strong></div><MessageSquare size={19} /></div><div className="document-comment-list-v3">{commentsLoading && <LoadingState><Loader2 className="spin" size={17} />Carregando…</LoadingState>}{!commentsLoading && comments.length === 0 && <div className="document-comments-empty-v3">Ainda não há comentários.</div>}{comments.map((comment) => <div key={comment.id} className={comment.clientVisible ? '' : 'internal'}><p>{comment.body}</p><small>{comment.clientVisible ? 'Visível ao cliente' : 'Nota interna'} · {formatDateTime(comment.createdAt)}</small></div>)}</div><div className="document-comment-composer-v3"><textarea rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escreva uma observação..." /><div><label><input type="checkbox" checked={commentVisible} onChange={(event) => setCommentVisible(event.target.checked)} />Visível ao cliente</label><Button variant="primary" disabled={!commentText.trim()} onClick={() => void sendComment()}><Send size={15} />Enviar</Button></div></div></section>
        </div>
      </DialogFrame></div>}
      </div>
    </DocsFrame>
  );
}
