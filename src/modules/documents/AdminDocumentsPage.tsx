import { DocumentStorageNotice } from '../../components/documents/DocumentStorageNotice';
import { WorkflowPage } from '../../components/ds/WorkflowPage';
import { StatusBadge } from '../../components/ds/StatusBadge';
import { WorkspaceAdminPage } from '../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../components/workspace/components/WorkspaceAdminContent';
import { WorkflowSegments } from '../../components/ds/WorkflowControls';
import { WorkflowHeading } from '../../components/ds/WorkflowHeading';
import { WorkflowList, WorkflowListRow } from '../../components/ds/WorkflowList';
import { DocumentFolderAction } from '../../components/documents/DocumentFolderAction';
import { DocumentFolderHeader, DocumentLayoutSwitch } from '../../components/documents/DocumentFolderHeader';
import { DocumentActionButton, DocumentField, DocumentOption, documentCheckboxClass, documentInputClass, documentTextareaClass } from './DocumentFormControls';
import { DocumentDialog, DocumentDialogBody, DocumentDialogHeader } from './DocumentDialog';
import { DocumentCardArt, DocumentCardTag, DocumentCardTags } from '../../components/documents/DocumentCardArt';
import { DocumentCardFact, DocumentCardFacts } from '../../components/documents/DocumentCardFacts';
import { DocumentCardActions, DocumentCardContent, DocumentCardProtocol } from '../../components/documents/DocumentCardContent';
import { DocumentCompanyIdentity, DocumentCompanyLogo } from '../../components/documents/DocumentCompanyIdentity';
import { Button } from '../../components/ds/Button';
import { EmptyState } from '../../components/ds/EmptyState';
import { InlineNotice } from '../../components/ds/InlineNotice';
import { LoadingState } from '../../components/ds/LoadingState';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import {
  Archive, CheckCircle2, Cloud, ExternalLink, Eye, FileCheck2, FileClock, FileText,
  ChevronRight, FolderOpen, ImagePlus, Layers3, Link2, Loader2, MessageSquare, Plus, Search, Send,
  ShieldCheck, Upload,
} from 'lucide-react';
import { Shell } from '../../components/workspace/WorkspaceShell';
import { readAdminDocuments } from '../../api/admin/documents/library';
import { archiveAdminDocument, saveAdminDocument, setAdminDocumentPublication } from '../../api/admin/documents/writes';
import { addAdminDocumentComment, readAdminDocumentComments } from '../../api/admin/documents/comments';
import type {
  CategorySlug, CompanyOption, DeliverableOption, DocumentRow, DriveConnection, EditorMode, FileComment,
  FormState, ProjectOption, SourceMode, WorkflowStage,
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
export const StaffDocumentsPage = () => <AdminDocumentsPage staff />;

export function AdminDocumentsPage({ staff = false }: { staff?: boolean } = {}) {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [deliverables, setDeliverables] = useState<DeliverableOption[]>([]);
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
  const coverPreview = useObjectUrl(cover) ?? editingDoc?.coverUrl ?? '';

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
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingDoc(null);
    resetUploads();
  }

  function openNewDocument(mode: SourceMode = 'upload') {
    resetUploads(); setEditingDoc(null); setEditorMode('new');
    setForm({ ...emptyForm(companies[0]?.id || ''), sourceMode: mode });
    setError(''); setNotice(''); setEditorOpen(true);
  }

  function completeDocument(doc: DocumentRow) {
    resetUploads(); setEditingDoc(doc); setEditorMode('complete'); setDetailDoc(null);
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: doc.version || 'v1.0', description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: '', validUntil: doc.validUntil || '' });
    setEditorOpen(true);
  }

  function openNewVersion(doc: DocumentRow) {
    resetUploads(); setEditingDoc(null); setEditorMode('revision'); setDetailDoc(null);
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: nextVersion(doc.version), description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: doc.id, validUntil: doc.validUntil || '' });
    setEditorOpen(true);
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
      closeEditor(); await loadDocuments();
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

  const sourceTabClass = 'tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-[0.538rem] tw:rounded-[0.462rem] tw:border-0 tw:bg-transparent tw:px-4 tw:py-[0.615rem] tw:text-[0.846rem]/[inherit] tw:text-[#857870] tw:aria-pressed:bg-white tw:aria-pressed:font-bold tw:aria-pressed:text-[#322f2c] tw:aria-pressed:shadow-[0_1px_3px_#0000000f]';
  const uploadClass = 'tw:relative tw:flex tw:min-h-[9.077rem] tw:flex-col tw:items-center tw:justify-center tw:gap-[0.462rem] tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:bg-[#fffdfb] tw:p-[1.231rem] tw:text-center tw:text-[#8a5a2b] tw:[&>span]:text-[0.769rem] tw:[&>span]:text-[#9a8c83] tw:[&>strong]:text-[0.923rem] tw:[&>strong]:text-[#322f2c]';
  const detailFactClass = 'tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.385rem] tw:border-0 tw:border-r tw:border-solid tw:border-[#efe7df] tw:px-[1.154rem] tw:py-4 tw:last:border-r-0 tw:[&>span]:text-[0.692rem] tw:[&>span]:font-bold tw:[&>span]:tracking-[0.1em] tw:[&>span]:text-[#9a8c83] tw:[&>span]:uppercase tw:[&>strong]:text-[0.923rem] tw:[&>strong]:text-[#322f2c] tw:[&>small]:text-[0.769rem] tw:[&>small]:text-[#857870] tw:[&>:is(strong,small)]:[overflow-wrap:anywhere] tw:[@media(max-width:40rem)]:even:border-r-0 tw:[@media(max-width:40rem)]:[&:nth-child(-n+2)]:border-b';
  const documentListRowClass = 'tw:cursor-pointer tw:grid-cols-[2.615rem_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,.7fr)_minmax(0,.9fr)_1.385rem]! tw:[@media(max-width:53.75rem)]:grid-cols-[2.615rem_minmax(0,1fr)_1.385rem]! tw:[@media(max-width:53.75rem)]:[&>span:not(.v2-record-logo):not(:nth-child(2))]:hidden!';
  const documentMetricsStyle = "v2-doc-metrics tw:flex tw:flex-none tw:items-center tw:gap-[0.769rem] tw:text-[0.769rem]/[inherit] tw:text-[#857870] tw:[&>span]:inline-flex tw:[&>span]:items-center tw:[&>span]:gap-[0.385rem]";
  const tagTone = (stage: string) => stage === 'published' ? 'green' : stage === 'ready_to_publish' ? 'blue' : stage === 'archived' ? 'red' : stage === 'awaiting_final_file' ? 'yellow' : 'purple';
  // Projeto e entregável aparecem uma vez só: o entregável some quando já é o próprio título do documento.
  const same = (a?: string | null, b?: string | null) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
  const contextLine = (doc: DocumentRow) => [doc.project ? `Projeto ${doc.project}` : 'Sem projeto vinculado', doc.deliverable && !same(doc.deliverable, doc.title) ? `Entregável ${doc.deliverable}` : ''].filter(Boolean).join(' · ');
  const reviewInfo = (value?: string | null): { date: string; note: string; tone: 'muted' | 'late' | 'soon' | '' } => {
    if (!value) return { date: 'Não definida', note: '', tone: 'muted' };
    const days = Math.round((new Date(`${value}T12:00:00`).getTime() - Date.now()) / 86400000);
    const note = days < 0 ? `vencida há ${-days} ${-days === 1 ? 'dia' : 'dias'}` : days === 0 ? 'vence hoje' : `faltam ${days} ${days === 1 ? 'dia' : 'dias'}`;
    return { date: value.split('-').reverse().join('/'), note, tone: days < 0 ? 'late' : days <= 60 ? 'soon' : '' };
  };

  return (
    <DocsFrame staff={staff}>
      <WorkspaceAdminPage className="v2-admin-docs v2-client-module"><WorkspaceAdminContent><WorkflowPage className="documents-admin-v4">
        <WorkflowHeading className="tw:items-start"><div><small>{staff ? 'EQUIPE CALI / DOCUMENTOS' : 'BACKOFFICE / CALI RH'}</small><h1>Documentos</h1><p>{staff ? 'Documentos das empresas que você atende, organizados por pasta de entregável.' : 'Acervo de todas as contas: prévias, arquivos finais, versões, publicação e ciência.'}</p></div><div className="v2-head-actions tw:[&[hidden]]:hidden!" hidden={staff}><Button variant="workflowSecondary" type="button" onClick={() => openNewDocument('drive')}><Link2 size={15} /> Adicionar via Drive</Button><Button variant="workflowPrimary" type="button" onClick={() => openNewDocument('upload')}><Plus size={15} /> Adicionar documento</Button></div></WorkflowHeading>

        {notice && <InlineNotice tone="success"><CheckCircle2 size={18} />{notice}</InlineNotice>}
        {error && !editorOpen && <InlineNotice>{error}</InlineNotice>}

        {!staff && <DocumentStorageNotice
          title={driveConnection ? 'Arquivo interno da CALI' : 'Armazenamento dos documentos'}
          description={driveConnection
            ? `${driveConnection.accountEmail || 'Conta CALI'}${driveConnection.rootFolderName ? ` · ${driveConnection.rootFolderName}` : ''} · fonte operacional`
            : 'A CALI organiza a versão de trabalho aqui. Depois da aprovação, o documento fica disponível para ser salvo no Drive da empresa cliente.'}
          action={driveConnection && <StatusBadge variant="workflow" tone="green" className="tw:inline-flex tw:shrink-0 tw:items-center tw:gap-[.385rem]"><CheckCircle2 size={12} /> Conectado</StatusBadge>}
        />}

        {activeFolder && <div className="tw:mb-[1.231rem]">
          <DocumentFolderHeader
            title={activeFolder.info?.title || activeFolder.items[0].deliverable || 'Entregável'}
            description={[activeFolder.info?.protocol, activeFolder.items[0].company, `${activeFolder.items.length} ${activeFolder.items.length === 1 ? 'documento' : 'documentos'}`].filter(Boolean).join(' · ')}
            onBack={() => setOpenFolder(null)}
          >
            <DocumentLayoutSwitch label="Exibição da pasta" layout={layout} onChange={setLayout} />
          </DocumentFolderHeader>
        </div>}

        <div className="tw:mb-[1.154rem] tw:flex tw:flex-nowrap tw:items-center tw:justify-end tw:gap-[.769rem] tw:rounded-[.769rem] tw:border tw:border-solid tw:border-[#eee4dc] tw:bg-white tw:p-[1.154rem] tw:[@media(max-width:68.75rem)]:flex-wrap tw:[&[hidden]]:hidden!" hidden={Boolean(activeFolder)}>
          <strong className="tw:mr-auto tw:text-[.923rem] tw:whitespace-nowrap">{[folderList.length ? `${folderList.length} ${folderList.length === 1 ? 'pasta' : 'pastas'}` : '', shown.length || !folderList.length ? `${shown.length} ${shown.length === 1 ? 'documento' : 'documentos'}` : ''].filter(Boolean).join(' · ')}</strong>
          <select className="tw:min-w-0 tw:flex-[0_1_13.846rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#eaded5] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.846rem] tw:text-[#604c49]" aria-label="Empresa" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="all">Todas as empresas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="tw:min-w-0 tw:flex-[0_1_13.846rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#eaded5] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.846rem] tw:text-[#604c49]" aria-label="Etapa" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Em uso (sem arquivados)</option><option value="preparation">Em preparação</option><option value="awaiting_final_file">Aguardando arquivo final</option><option value="ready_to_publish">Pronto para publicar</option><option value="published">Disponível ao cliente</option><option value="archived">Arquivados ({docs.filter((doc) => doc.workflowStage === 'archived' || doc.status === 'archived').length})</option></select>
          <select className="tw:min-w-0 tw:flex-[0_1_13.846rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#eaded5] tw:bg-white tw:px-[.923rem] tw:py-[.769rem] tw:text-[.846rem] tw:text-[#604c49]" aria-label="Categoria" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas as categorias</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <label className="tw:flex tw:min-w-[12.308rem] tw:flex-[1_1_16.923rem] tw:items-center tw:gap-[.692rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#e9dcd3] tw:px-[.923rem] tw:py-[.769rem]"><Search size={14} /><input className="tw:w-full tw:min-w-0 tw:border-0 tw:bg-transparent tw:text-[.846rem] tw:outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, empresa, projeto ou protocolo" aria-label="Buscar documentos" /></label>
          <WorkflowSegments  aria-label="Exibição do acervo"><button type="button" className={layout === 'covers' ? 'on' : ''} onClick={() => setLayout('covers')}>Capas</button><button type="button" className={layout === 'list' ? 'on' : ''} onClick={() => setLayout('list')}>Lista</button></WorkflowSegments>
        </div>

        {filtered.length === 0 && !activeFolder && <EmptyState variant="workflow"><strong>{docs.length ? 'Nenhum documento neste filtro.' : 'A biblioteca está pronta.'}</strong><p>{docs.length ? 'Ajuste os filtros.' : 'As prévias surgirão automaticamente quando um entregável marcado como “Gera documento” for criado.'}</p></EmptyState>}

        {layout === 'covers' && filtered.length > 0 && <section className="tw:mt-[1.231rem] tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,20.769rem),1fr))] tw:gap-[1.231rem]">
          {!activeFolder && folderList.map((group) => { const first = group.items[0]; const live = group.items.filter((doc) => doc.workflowStage === 'published').length; return <article className="tw:overflow-hidden tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#e6d9cf] tw:bg-white" key={`f:${group.id}`}>
            <DocumentCardArt folder logo={first.companyLogo} name={first.company} label={`Abrir a pasta ${group.info?.title || ''}`} onOpen={() => setOpenFolder(group.id)} fallback={<b>CALI</b>}>
              <span className="v2-folder-mark tw:pointer-events-none tw:absolute tw:top-[0.769rem] tw:left-[0.769rem] tw:grid tw:size-[2.615rem] tw:place-items-center tw:rounded-[0.692rem] tw:bg-white tw:text-cali-brand tw:shadow-[0_1px_4px_#2817241a]" aria-hidden="true"><FolderOpen size={18} /></span>
              <DocumentCardTags><DocumentCardTag tone="work">Pasta</DocumentCardTag></DocumentCardTags>
            </DocumentCardArt>
            <DocumentCardContent title={group.info?.title || first.deliverable || 'Entregável'}>
              <DocumentCompanyIdentity logo={first.companyLogo} name={first.company} context={first.project ? `Projeto ${first.project}` : 'Sem projeto vinculado'} />
              <DocumentCardProtocol value={group.info?.protocol} folder><small className="tw:block tw:text-[.885rem] tw:text-[#7d726b]">{live} de {group.items.length} {group.items.length === 1 ? 'disponível' : 'disponíveis'} ao cliente</small></DocumentCardProtocol>
              <DocumentFolderAction onClick={() => setOpenFolder(group.id)} />
            </DocumentCardContent>
          </article>; })}
          {shown.map((doc) => {
            const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements);
            const needsFile = doc.workflowStage === 'preparation' || doc.workflowStage === 'awaiting_final_file';
            const review = reviewInfo(doc.validUntil);
            return <article className="tw:overflow-hidden tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#e6d9cf] tw:bg-white" key={doc.id}>
              <DocumentCardArt cover={doc.coverUrl} logo={doc.companyLogo} name={doc.company} label={`Ver detalhes de ${doc.title}`} onOpen={() => void openRow(doc)} fallback={<b>CALI</b>}>
                <DocumentCardTags><StatusBadge variant="workflow" tone={tagTone(doc.workflowStage)}>{stageLabel(doc.workflowStage)}</StatusBadge><DocumentCardTag tone="work">{categoryLabel(doc.category)}</DocumentCardTag></DocumentCardTags>
              </DocumentCardArt>
              <DocumentCardContent title={doc.title}>
                <DocumentCompanyIdentity logo={doc.companyLogo} name={doc.company} context={contextLine(doc)} />
                <DocumentCardFacts>
                  <DocumentCardFact label="Versão">{doc.version}</DocumentCardFact>
                  <DocumentCardFact label="Origem">{sourceLabel(doc.sourceType)}</DocumentCardFact>
                  <DocumentCardFact label="Atualizado em">{formatDateTime(doc.updatedAt)}</DocumentCardFact>
                  <DocumentCardFact label="Validade / revisão" note={review.note} tone={review.tone}>{review.date}</DocumentCardFact>
                </DocumentCardFacts>
                <DocumentCardProtocol value={doc.protocol}><div className={documentMetricsStyle}><span title="Visualizações"><Eye size={12} />{doc.views}</span>{doc.requiresAcknowledgement && <span className={pending > 0 ? 'tw:text-[#97672f]' : 'tw:text-[#31805a]'} title="Ciências registradas"><ShieldCheck size={12} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''}</span>}<span title="Comentários"><MessageSquare size={12} />{doc.comments}</span></div></DocumentCardProtocol>
                <DocumentCardActions>{needsFile && !staff && <button type="button" className="tw:border-cali-brand! tw:bg-cali-brand! tw:text-white!" onClick={() => completeDocument(doc)}><Upload size={13} /> Completar</button>}<button type="button" onClick={() => void openDocument(doc)} disabled={!doc.storagePath && !doc.driveUrl}><ExternalLink size={13} /> Abrir</button>{!staff && <button type="button" onClick={() => void loadComments(doc)}>Detalhes</button>}</DocumentCardActions>
              </DocumentCardContent>
            </article>;
          })}
        </section>}

        {layout === 'list' && filtered.length > 0 && <WorkflowList className="v2-admin-doc-list tw:mt-[1.231rem]">
          <WorkflowListRow header className={`${documentListRowClass} tw:[@media(max-width:53.75rem)]:hidden!`}><span/><span>Protocolo / Documento</span><span>Empresa / Projeto</span><span>Etapa</span><span>Validade</span><span>Entregue em</span><span>Acompanhamento</span><span/></WorkflowListRow>
          {!activeFolder && folderList.map((group) => { const first = group.items[0]; const live = group.items.filter((doc) => doc.workflowStage === 'published'); const last = live.map((doc) => doc.publishedAt || '').sort().pop(); return <WorkflowListRow className={`${documentListRowClass} tw:[&_strong]:inline-flex tw:[&_strong]:items-center tw:[&_strong]:gap-[.615rem]`} key={`f:${group.id}`} role="button" tabIndex={0} onClick={() => setOpenFolder(group.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpenFolder(group.id); } }}>
            <DocumentCompanyLogo logo={first.companyLogo} name={first.company} list />
            <span className="tw:min-w-0"><small>{group.info?.protocol || '—'}</small><strong className="tw:flex tw:items-center tw:gap-[0.615rem]"><FolderOpen size={15} className="tw:shrink-0" /> {group.info?.title || first.deliverable || 'Entregável'}</strong><small>{group.items.length} {group.items.length === 1 ? 'documento' : 'documentos'}</small></span>
            <span className="v2-record-author tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.231rem] tw:[&>strong]:truncate tw:[&>strong]:text-[0.846rem] tw:[&>strong]:font-semibold tw:[&>strong]:text-[#322f2c] tw:[&>small]:truncate tw:[&>small]:text-[0.692rem] tw:[&>small]:text-[#a18e80]"><strong>{first.company}</strong><small>{first.project ? `Projeto ${first.project}` : 'Sem projeto vinculado'}</small></span>
            <span><StatusBadge variant="workflow" tone="amber">Pasta</StatusBadge></span>
            <span>—</span>
            <span>{last ? new Date(last).toLocaleDateString('pt-BR') : '—'}</span>
            <span>{live.length} de {group.items.length} {group.items.length === 1 ? 'disponível' : 'disponíveis'}</span>
            <ChevronRight size={16} />
          </WorkflowListRow>; })}
          {shown.map((doc) => { const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements); const review = reviewInfo(doc.validUntil); return <WorkflowListRow className={documentListRowClass} key={doc.id} role="button" tabIndex={0} onClick={() => void openRow(doc)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); void openRow(doc); } }}>
            <DocumentCompanyLogo logo={doc.companyLogo} name={doc.company} list />
            <span className="tw:min-w-0"><small>{doc.protocol || '—'}</small><strong className="tw:block tw:truncate" title={doc.title}>{doc.title}</strong><small>{categoryLabel(doc.category)} · versão {String(doc.version).replace(/^v/i, '')}</small></span>
            <span className="v2-record-author tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.231rem] tw:[&>strong]:truncate tw:[&>strong]:text-[0.846rem] tw:[&>strong]:font-semibold tw:[&>strong]:text-[#322f2c] tw:[&>small]:truncate tw:[&>small]:text-[0.692rem] tw:[&>small]:text-[#a18e80]"><strong>{doc.company}</strong><small>{activeFolder ? (doc.project ? `Projeto ${doc.project}` : 'Sem projeto vinculado') : contextLine(doc)}</small></span>
            <span><StatusBadge variant="workflow" tone={tagTone(doc.workflowStage)}>{stageLabel(doc.workflowStage)}</StatusBadge></span>
            <span className={`tw:flex tw:flex-col tw:gap-[0.154rem] ${review.tone === 'late' ? 'tw:text-[#b7495d]' : review.tone === 'muted' ? 'tw:text-[#b3a59c]' : ''}`}>{review.date}{review.note && <small className={`tw:text-[0.692rem]/[inherit] ${review.tone === 'late' ? 'tw:text-[#b7495d]' : review.tone === 'soon' ? 'tw:text-[#97672f]' : 'tw:text-[#31805a]'}`}>{review.note}</small>}</span>
            <span>{delivered(doc)}</span>
            <span className={documentMetricsStyle}><span><Eye size={12} />{doc.views}</span>{doc.requiresAcknowledgement && <span className={pending > 0 ? 'tw:text-[#97672f]' : 'tw:text-[#31805a]'}><ShieldCheck size={12} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''}</span>}<span><MessageSquare size={12} />{doc.comments}</span></span>
            <button type="button" aria-label={`Abrir ${doc.title}`} onClick={(event) => { event.stopPropagation(); void openRow(doc); }}><ChevronRight size={16} /></button>
          </WorkflowListRow>; })}
        </WorkflowList>}
      </WorkflowPage></WorkspaceAdminContent>

      {editorOpen && <DocumentDialog label="Editar documento">
        <DocumentDialogHeader
          kicker={editorMode === 'complete' ? 'COMPLETAR PRÉVIA' : editorMode === 'revision' ? 'NOVA VERSÃO' : 'NOVO DOCUMENTO'}
          title={editorMode === 'complete' ? 'Adicionar o arquivo final sem perder o vínculo' : editorMode === 'revision' ? 'Criar nova versão sem sobrescrever a anterior' : 'Organizar documento no Workspace'}
          subtitle={editorMode === 'complete' ? `O protocolo ${editingDoc?.protocol} e os vínculos com cliente, projeto e entregável serão preservados.` : 'Arquivo, metadados e publicação ficam registrados no mesmo histórico.'}
          onClose={closeEditor}
        />
        <DocumentDialogBody>
          {error && <InlineNotice className="tw:text-[0.846rem]/[inherit]">{error}</InlineNotice>}
          <div className="tw:inline-flex tw:self-start tw:gap-[0.154rem] tw:rounded-[0.615rem] tw:bg-[#f6f0eb] tw:p-[0.308rem]"><button type="button" className={sourceTabClass} aria-pressed={form.sourceMode === 'upload'} onClick={() => setForm((current) => ({ ...current, sourceMode: 'upload' }))}><Upload size={16} />Enviar arquivo</button><button type="button" className={sourceTabClass} aria-pressed={form.sourceMode === 'drive'} onClick={() => setForm((current) => ({ ...current, sourceMode: 'drive' }))}><Cloud size={16} />Usar link do Drive</button></div>
          <div className="tw:grid tw:grid-cols-[minmax(0,1fr)_11.538rem] tw:gap-[1.077rem] tw:[@media(max-width:40rem)]:grid-cols-1">
            {form.sourceMode === 'upload' ? <label className={`${uploadClass} tw:cursor-pointer ${file ? 'tw:border-solid tw:border-cali-brand' : 'tw:border-dashed tw:border-[#d9c7ba]'}`}><Upload size={25} /><strong>{file ? file.name : 'Selecionar documento'}</strong><span>{file ? `${formatFileSize(file.size)} · ${file.type || 'arquivo'}` : 'PDF, DOCX, XLSX, PPTX ou imagem'}</span><input className="tw:absolute tw:inset-0 tw:cursor-pointer tw:opacity-0" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label> : <label className={`${uploadClass} tw:items-stretch tw:border-dashed tw:border-[#d9c7ba] tw:text-left tw:[&>svg]:self-start`}><Cloud size={25} /><strong>Link do arquivo no Google Drive</strong><input className={documentInputClass} value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/..." /></label>}
            <label className={`${uploadClass} tw:cursor-pointer ${coverPreview ? 'tw:border-solid tw:border-cali-brand' : 'tw:border-dashed tw:border-[#d9c7ba]'}`}>{coverPreview ? <img className="tw:absolute tw:inset-0 tw:size-full tw:object-cover" src={coverPreview} alt="Prévia da capa" /> : <><ImagePlus size={25} /><strong>Adicionar capa</strong><span>Opcional</span></>}<input className="tw:absolute tw:inset-0 tw:cursor-pointer tw:opacity-0" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCover(event.target.files?.[0] ?? null)} /></label>
          </div>
          <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-[0.769rem] tw:rounded-[0.692rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-[1.077rem] tw:py-[0.846rem] tw:[&>span]:text-[0.692rem] tw:[&>span]:font-bold tw:[&>span]:tracking-[0.1em] tw:[&>span]:text-[#9a8c83] tw:[&>strong]:text-[0.923rem] tw:[&>strong]:text-cali-brand tw:[&>small]:text-[0.769rem] tw:[&>small]:text-[#857870]"><span>PROTOCOLO</span><strong>{editingDoc?.protocol || 'Gerado automaticamente ao salvar'}</strong><small>{editorMode === 'complete' ? 'Esta prévia mantém o protocolo que nasceu com o entregável.' : editorMode === 'revision' ? 'A nova versão recebe protocolo próprio e continua ligada à anterior.' : 'Novo documento, novo protocolo.'}</small></div>
          <div className="document-form-grid-v3 tw:grid tw:grid-cols-2 tw:gap-x-[1.077rem] tw:gap-y-[0.923rem] tw:pt-[1.154rem] tw:pb-[1.538rem] tw:[&>.wide]:col-span-full tw:[@media(max-width:40.625rem)]:grid-cols-1">
            <DocumentField wide>Nome do documento<input className={documentInputClass} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></DocumentField>
            <DocumentField>Cliente<select className={documentInputClass} value={form.companyId} disabled={editorMode === 'complete'} onChange={(event) => updateCompany(event.target.value)}><option value="">Selecionar</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></DocumentField>
            <DocumentField>Projeto<select className={documentInputClass} value={form.projectId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => updateProject(event.target.value)}><option value="none">Sem projeto</option>{formProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></DocumentField>
            <DocumentField>Entregável<select className={documentInputClass} value={form.deliverableId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => setForm((current) => ({ ...current, deliverableId: event.target.value === 'none' ? '' : event.target.value }))}><option value="none">Sem entregável</option>{formDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></DocumentField>
            <DocumentField>Categoria<select className={documentInputClass} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CategorySlug }))}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></DocumentField>
            <DocumentField>Tipo documental<select className={documentInputClass} value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>{documentKinds.map((item) => <option key={item}>{item}</option>)}</select></DocumentField>
            <DocumentField>Versão<input className={documentInputClass} value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /></DocumentField>
            <DocumentField>Validade / próxima revisão<input className={documentInputClass} type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /><small>Alerta ao cliente 60 dias antes.</small></DocumentField>
            <DocumentField wide>Descrição / contexto<textarea className={documentTextareaClass} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></DocumentField>
          </div>
          <div className="tw:grid tw:grid-cols-2 tw:gap-[0.769rem] tw:[@media(max-width:40rem)]:grid-cols-1">
            <DocumentOption checked={form.publish} onChange={(event) => setForm((current) => ({ ...current, publish: event.target.checked }))} label="Disponibilizar ao cliente ao salvar" description="Se desmarcado, fica “Pronto para publicar”." />
            <DocumentOption checked={form.requiresAcknowledgement} onChange={(event) => setForm((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} label="Solicitar ciência" description="Visualização e ciência ficam registradas por usuário." />
          </div>
        </DocumentDialogBody>
        <footer className="document-modal-footer tw:m-0! tw:flex tw:max-w-none! tw:flex-wrap tw:items-center tw:justify-between tw:gap-[1.077rem] tw:rounded-none! tw:border-0 tw:border-t tw:border-solid tw:border-[#eadfd6] tw:bg-[#fffdfb] tw:px-[1.846rem] tw:py-[1.077rem]"><span className="tw:text-[0.769rem]/[inherit] tw:text-[#857870]">{editorMode === 'complete' ? 'Cliente, projeto, entregável e protocolo permanecem intactos.' : 'Nada é publicado sem a sua escolha.'}</span><div className="tw:m-0 tw:flex tw:items-center tw:gap-[0.615rem]"><DocumentActionButton type="button" variant="secondary" onClick={closeEditor}>Cancelar</DocumentActionButton><DocumentActionButton type="button" variant="primary" disabled={saving || !form.title.trim() || !form.companyId || (form.sourceMode === 'upload' ? !file : !/^https?:\/\//i.test(form.driveUrl.trim()))} onClick={() => void saveDocument()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : editorMode === 'complete' ? 'Concluir documento' : 'Salvar documento'}</DocumentActionButton></div></footer>
      </DocumentDialog>}

      {detailDoc && <DocumentDialog label={detailDoc.title} detail>
        <DocumentDialogHeader detail kicker={`${stageLabel(detailDoc.workflowStage)} · ${detailDoc.version}`} title={detailDoc.title} subtitle={detailDoc.protocol} onClose={() => setDetailDoc(null)}>
          <div className="document-detail-cover-v3 tw:grid tw:h-[4.923rem] tw:w-16 tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:text-cali-gold">
            {detailDoc.coverUrl ? <img className="tw:size-full tw:object-cover" src={detailDoc.coverUrl} alt="" /> : <FileText size={32} />}
          </div>
        </DocumentDialogHeader>
        <DocumentDialogBody detail>
          <section className="tw:grid tw:grid-cols-4 tw:overflow-hidden tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-white tw:[@media(max-width:40rem)]:grid-cols-2"><article className={detailFactClass}><span>Cliente</span><strong>{detailDoc.company}</strong><small>{detailDoc.project || 'Sem projeto'}{detailDoc.deliverable ? ` · ${detailDoc.deliverable}` : ''}</small></article><article className={detailFactClass}><span>Etapa</span><strong>{stageLabel(detailDoc.workflowStage)}</strong><small>{detailDoc.workflowOrigin === 'deliverable' ? 'Prévia criada pelo entregável' : 'Documento criado manualmente'}</small></article><article className={detailFactClass}><span>Origem</span><strong>{sourceLabel(detailDoc.sourceType)}</strong><small>{detailDoc.originalFilename || detailDoc.fileType || 'Arquivo ainda não anexado'}</small></article><article className={detailFactClass}><span>Ciência</span><strong>{detailDoc.requiresAcknowledgement ? `${detailDoc.acknowledgements}${detailDoc.expectedAcknowledgements ? ` de ${detailDoc.expectedAcknowledgements}` : ''}` : 'Não solicitada'}</strong><small>{detailDoc.views} visualizações</small></article></section>
          {detailDoc.description && <section className="tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:px-[1.154rem] tw:py-4 tw:[&>span]:text-[0.692rem] tw:[&>span]:font-bold tw:[&>span]:tracking-[0.1em] tw:[&>span]:text-[#9a8c83] tw:[&>p]:mt-[0.462rem]! tw:[&>p]:mb-0! tw:[&>p]:text-[0.846rem]/[1.55]! tw:[&>p]:text-[#67574c]!"><span>CONTEXTO</span><p>{detailDoc.description}</p></section>}
          <section className="tw:flex tw:flex-wrap tw:items-center tw:gap-[0.615rem]">{(detailDoc.workflowStage === 'preparation' || detailDoc.workflowStage === 'awaiting_final_file') && <DocumentActionButton variant="primary" onClick={() => completeDocument(detailDoc)}><Upload size={16} />Completar documento</DocumentActionButton>}<DocumentActionButton variant="secondary" onClick={() => void openDocument(detailDoc)} disabled={!detailDoc.storagePath && !detailDoc.driveUrl}><ExternalLink size={16} />Abrir</DocumentActionButton>{detailDoc.workflowStage === 'ready_to_publish' && <DocumentActionButton variant="primary" disabled={saving} onClick={() => void changePublication(detailDoc, true)}><FileCheck2 size={16} />Publicar</DocumentActionButton>}{detailDoc.status === 'published' && <DocumentActionButton variant="secondary" disabled={saving} onClick={() => void changePublication(detailDoc, false)}><FileClock size={16} />Tornar interno</DocumentActionButton>}{detailDoc.storagePath || detailDoc.driveUrl ? <DocumentActionButton variant="secondary" onClick={() => openNewVersion(detailDoc)}><Layers3 size={16} />Nova versão</DocumentActionButton> : null}{detailDoc.status !== 'archived' && <DocumentActionButton variant="danger" disabled={saving} onClick={() => void archiveDocument(detailDoc)}><Archive size={16} />Arquivar</DocumentActionButton>}</section>
          <section className="tw:flex tw:flex-col tw:gap-[0.923rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#efe7df] tw:bg-[#fffdfb] tw:p-[1.154rem]"><div className="tw:flex tw:items-center tw:justify-between tw:gap-[0.769rem] tw:text-cali-gold"><div className="tw:flex tw:flex-col tw:gap-[0.308rem]"><span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-[0.769rem]/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-[#a88b76]">CONVERSA DO DOCUMENTO</span><strong className="tw:text-[0.923rem]/[inherit] tw:text-[#322f2c]">{detailDoc.comments} comentários</strong></div><MessageSquare size={19} /></div><div className="tw:flex tw:flex-col tw:gap-[0.615rem]">{commentsLoading && <LoadingState className="tw:min-h-[4.615rem]!"><Loader2 className="spin" size={17} />Carregando…</LoadingState>}{!commentsLoading && comments.length === 0 && <div className="tw:text-[0.846rem]/[inherit] tw:text-[#857870]">Ainda não há comentários.</div>}{comments.map((comment) => <div key={comment.id} className={`tw:rounded-[0.692rem] tw:border tw:border-solid tw:px-4 tw:py-[0.846rem] ${comment.clientVisible ? 'tw:border-[#ebe3dc] tw:bg-white' : 'tw:border-[#ecdcc4] tw:bg-[#fbf4ea]'}`}><p className="tw:m-0! tw:text-[0.846rem]/[1.55]! tw:text-[#322f2c]!">{comment.body}</p><small className="tw:mt-[0.385rem] tw:block tw:text-[0.692rem]/[inherit] tw:text-[#a19a92]">{comment.clientVisible ? 'Visível ao cliente' : 'Nota interna'} · {formatDateTime(comment.createdAt)}</small></div>)}</div><div className="tw:flex tw:flex-col tw:gap-[0.692rem]"><textarea className={documentTextareaClass} rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escreva uma observação..." /><div className="tw:flex tw:items-center tw:justify-between tw:gap-[0.769rem]"><label className="tw:inline-flex tw:items-center tw:gap-[0.615rem] tw:text-[0.846rem]/[inherit] tw:text-[#67574c]"><input className={documentCheckboxClass} type="checkbox" checked={commentVisible} onChange={(event) => setCommentVisible(event.target.checked)} />Visível ao cliente</label><DocumentActionButton variant="primary" disabled={!commentText.trim()} onClick={() => void sendComment()}><Send size={15} />Enviar</DocumentActionButton></div></div></section>
        </DocumentDialogBody>
      </DocumentDialog>}
      </WorkspaceAdminPage>
    </DocsFrame>
  );
}
