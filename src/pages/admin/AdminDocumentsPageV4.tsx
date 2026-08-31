import { useEffect, useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, Cloud, ExternalLink, Eye, FileCheck2, FileClock, FileText,
  FolderOpen, ImagePlus, Layers3, Link2, Loader2, MessageSquare, Plus, Search, Send,
  ShieldCheck, Upload, X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type CategorySlug = 'policy' | 'manual' | 'flow' | 'guide' | 'report' | 'onboarding' | 'deliverable' | 'schedule' | 'contract' | 'reference' | 'other';
type DocumentStatus = 'draft' | 'published' | 'archived';
type WorkflowStage = 'preparation' | 'awaiting_final_file' | 'ready_to_publish' | 'published' | 'archived';
type SourceMode = 'upload' | 'drive';
type EditorMode = 'new' | 'complete' | 'revision';

type CompanyOption = { id: string; name: string; logoUrl?: string | null };
type ProjectOption = { id: string; companyId: string; name: string };
type DeliverableOption = { id: string; companyId: string; projectId?: string | null; title: string; status?: string | null };
type ProfileOption = { id: string; companyId?: string | null; role: string; active: boolean };
type DriveConnection = { id: string; accountEmail?: string | null; rootFolderName?: string | null; lastSyncAt?: string | null; status: string };
type FileComment = { id: string; body: string; clientVisible: boolean; createdAt: string };

type DocumentRow = {
  id: string;
  title: string;
  companyId: string;
  company: string;
  companyLogo?: string | null;
  projectId?: string | null;
  project?: string | null;
  deliverableId?: string | null;
  deliverable?: string | null;
  category: CategorySlug;
  kind: string;
  version: string;
  updatedAt: string;
  publishedAt?: string | null;
  sourceType: 'workspace' | 'google_drive' | 'external';
  status: DocumentStatus;
  workflowStage: WorkflowStage;
  workflowOrigin: 'manual' | 'deliverable' | 'project_attachment';
  clientVisible: boolean;
  protocol: string;
  coverUrl?: string;
  coverStoragePath?: string | null;
  fileType?: string;
  fileSizeBytes?: number;
  originalFilename?: string | null;
  requiresAcknowledgement: boolean;
  storagePath?: string | null;
  driveUrl?: string | null;
  description?: string | null;
  revisionOfId?: string | null;
  views: number;
  acknowledgements: number;
  expectedAcknowledgements: number;
  comments: number;
};

type FormState = {
  title: string;
  companyId: string;
  projectId: string;
  deliverableId: string;
  category: CategorySlug;
  kind: string;
  version: string;
  description: string;
  publish: boolean;
  requiresAcknowledgement: boolean;
  sourceMode: SourceMode;
  driveUrl: string;
  revisionOfId: string;
};

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

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

function nextVersion(value: string) {
  const match = value.trim().match(/^v?(\d+)(?:\.(\d+))?$/i);
  return match ? `v${Number(match[1]) + 1}.0` : 'v2.0';
}

function emptyForm(companyId = ''): FormState {
  return { title: '', companyId, projectId: '', deliverableId: '', category: 'deliverable', kind: 'Entregável', version: 'v1.0', description: '', publish: false, requiresAcknowledgement: false, sourceMode: 'upload', driveUrl: '', revisionOfId: '' };
}

export function AdminDocumentsPageV4() {
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
    if (stageFilter !== 'all' && doc.workflowStage !== stageFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    return true;
  }), [docs, search, companyFilter, stageFilter, categoryFilter]);

  const stats = useMemo(() => ({
    preparation: docs.filter((doc) => doc.workflowStage === 'preparation').length,
    awaitingFinal: docs.filter((doc) => doc.workflowStage === 'awaiting_final_file').length,
    ready: docs.filter((doc) => doc.workflowStage === 'ready_to_publish').length,
    published: docs.filter((doc) => doc.workflowStage === 'published').length,
  }), [docs]);

  const formProjects = useMemo(() => projects.filter((item) => item.companyId === form.companyId), [projects, form.companyId]);
  const formDeliverables = useMemo(() => deliverables.filter((item) => item.companyId === form.companyId && (!form.projectId || item.projectId === form.projectId)), [deliverables, form.companyId, form.projectId]);

  useEffect(() => {
    const modalOpen = editorOpen || Boolean(detailDoc);
    document.body.classList.toggle('workspace-modal-open', modalOpen);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [editorOpen, detailDoc]);

  useEffect(() => () => { if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  useEffect(() => {
    if (preview || !supabase) {
      setLoading(false);
      return;
    }
    void loadDocuments();
  }, []);

  async function resolveCover(path?: string | null) {
    if (!path || !supabase) return '';
    const { data } = await supabase.storage.from('cali-workspace-private').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  }

  async function loadDocuments() {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [companyResult, projectResult, deliverableResult, fileResult, ackResult, profileResult, commentResult, driveResult] = await Promise.all([
        supabase.from('companies').select('id,display_name,logo_url').neq('status', 'closed').order('display_name'),
        supabase.from('projects').select('id,company_id,name').order('created_at', { ascending: false }),
        supabase.from('deliverables').select('id,company_id,project_id,title,status,is_document').order('created_at', { ascending: false }),
        supabase.from('files').select('id,company_id,project_id,deliverable_id,title,category,version_label,updated_at,published_at,drive_url,client_visible,source_type,protocol,document_kind,cover_storage_path,file_type,file_size_bytes,original_filename,requires_acknowledgement,status,storage_path,description,revision_of_id,workflow_origin,workflow_stage').order('updated_at', { ascending: false }),
        supabase.from('document_acknowledgements').select('file_id,status,viewed_at,acknowledged_at'),
        supabase.from('profiles').select('id,company_id,role,active').eq('active', true),
        supabase.from('comments').select('target_id').eq('target_type', 'file'),
        supabase.from('drive_connections').select('id,account_email,root_folder_name,last_sync_at,status').eq('owner_type', 'cali').eq('status', 'connected').order('updated_at', { ascending: false }).limit(1),
      ]);
      const failure = [companyResult.error, projectResult.error, deliverableResult.error, fileResult.error, ackResult.error, profileResult.error, commentResult.error, driveResult.error].find(Boolean);
      if (failure) throw failure;

      const companyOptions: CompanyOption[] = (companyResult.data || []).map((row) => ({ id: row.id, name: row.display_name, logoUrl: row.logo_url }));
      const projectOptions: ProjectOption[] = (projectResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, name: row.name }));
      const deliverableOptions: DeliverableOption[] = (deliverableResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, status: row.status }));
      const profileOptions: ProfileOption[] = (profileResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, role: row.role, active: Boolean(row.active) }));
      setCompanies(companyOptions); setProjects(projectOptions); setDeliverables(deliverableOptions); setProfiles(profileOptions); setDriveConnection((driveResult.data?.[0] as DriveConnection | undefined) || null);

      const companyMap = new Map(companyOptions.map((item) => [item.id, item]));
      const projectMap = new Map(projectOptions.map((item) => [item.id, item]));
      const deliverableMap = new Map(deliverableOptions.map((item) => [item.id, item]));
      const acksByFile = new Map<string, { views: number; acknowledgements: number }>();
      (ackResult.data || []).forEach((row) => {
        const current = acksByFile.get(row.file_id) || { views: 0, acknowledgements: 0 };
        if (row.viewed_at) current.views += 1;
        if (row.status === 'acknowledged' || row.acknowledged_at) current.acknowledgements += 1;
        acksByFile.set(row.file_id, current);
      });
      const commentsByFile = new Map<string, number>();
      (commentResult.data || []).forEach((row) => commentsByFile.set(row.target_id, (commentsByFile.get(row.target_id) || 0) + 1));
      const expectedByCompany = new Map<string, number>();
      profileOptions.filter((item) => item.role === 'client' && item.active && item.companyId).forEach((item) => expectedByCompany.set(item.companyId!, (expectedByCompany.get(item.companyId!) || 0) + 1));

      const rows: DocumentRow[] = await Promise.all((fileResult.data || []).map(async (row) => {
        const company = companyMap.get(row.company_id);
        const project = row.project_id ? projectMap.get(row.project_id) : undefined;
        const deliverable = row.deliverable_id ? deliverableMap.get(row.deliverable_id) : undefined;
        const ack = acksByFile.get(row.id) || { views: 0, acknowledgements: 0 };
        return {
          id: row.id, title: row.title, companyId: row.company_id, company: company?.name || 'Cliente', companyLogo: company?.logoUrl,
          projectId: row.project_id, project: project?.name, deliverableId: row.deliverable_id, deliverable: deliverable?.title,
          category: (row.category || 'other') as CategorySlug, kind: row.document_kind || 'Outro', version: row.version_label || 'v1.0',
          updatedAt: row.updated_at, publishedAt: row.published_at, sourceType: (row.source_type || 'workspace') as DocumentRow['sourceType'],
          status: (row.status || 'draft') as DocumentStatus, workflowStage: (row.workflow_stage || (row.status === 'published' ? 'published' : 'ready_to_publish')) as WorkflowStage,
          workflowOrigin: (row.workflow_origin || 'manual') as DocumentRow['workflowOrigin'], clientVisible: Boolean(row.client_visible), protocol: row.protocol || '—',
          coverUrl: await resolveCover(row.cover_storage_path), coverStoragePath: row.cover_storage_path, fileType: row.file_type || undefined,
          fileSizeBytes: Number(row.file_size_bytes || 0), originalFilename: row.original_filename, requiresAcknowledgement: Boolean(row.requires_acknowledgement),
          storagePath: row.storage_path, driveUrl: row.drive_url, description: row.description, revisionOfId: row.revision_of_id,
          views: ack.views, acknowledgements: ack.acknowledgements, expectedAcknowledgements: expectedByCompany.get(row.company_id) || 0, comments: commentsByFile.get(row.id) || 0,
        };
      }));
      setDocs(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a biblioteca.');
    } finally { setLoading(false); }
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
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: doc.version || 'v1.0', description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: '' });
    setCoverPreview(doc.coverUrl || ''); setEditorOpen(true);
  }

  function openNewVersion(doc: DocumentRow) {
    resetUploads(); setEditingDoc(null); setEditorMode('revision'); setDetailDoc(null);
    setForm({ title: doc.title, companyId: doc.companyId, projectId: doc.projectId || '', deliverableId: doc.deliverableId || '', category: doc.category, kind: doc.kind, version: nextVersion(doc.version), description: doc.description || '', publish: false, requiresAcknowledgement: doc.requiresAcknowledgement, sourceMode: 'upload', driveUrl: '', revisionOfId: doc.id });
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
    if (!supabase) return;
    setSaving(true); setError('');

    let uploadedFilePath = ''; let uploadedCoverPath = '';
    try {
      let protocol = editingDoc?.protocol || '';
      if (!protocol) {
        const { data: protocolValue, error: protocolError } = await supabase.rpc('generate_protocol', { p_entity_type: 'DOC' });
        if (protocolError) throw protocolError;
        protocol = String(protocolValue);
      }

      if (form.sourceMode === 'upload' && file) {
        uploadedFilePath = `documents/${form.companyId}/${protocol}/file-${Date.now()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(uploadedFilePath, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) throw uploadError;
      }
      if (cover) {
        uploadedCoverPath = `documents/${form.companyId}/${protocol}/cover-${Date.now()}-${safeFileName(cover.name)}`;
        const { error: coverError } = await supabase.storage.from('cali-workspace-private').upload(uploadedCoverPath, cover, { upsert: false, contentType: cover.type || undefined });
        if (coverError) throw coverError;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const now = new Date().toISOString();
      const payload = {
        company_id: form.companyId, project_id: form.projectId || null, deliverable_id: form.deliverableId || null,
        title: form.title.trim(), category: form.category, document_kind: form.kind, description: form.description.trim() || null,
        storage_path: uploadedFilePath || (editorMode === 'complete' ? editingDoc?.storagePath || null : null),
        drive_url: form.sourceMode === 'drive' ? form.driveUrl.trim() : (editorMode === 'complete' ? editingDoc?.driveUrl || null : null),
        cover_storage_path: uploadedCoverPath || (editorMode === 'complete' ? editingDoc?.coverStoragePath || null : null),
        version_label: form.version.trim() || 'v1.0', is_final: form.publish, client_visible: form.publish,
        uploaded_by: sessionData.session?.user.id ?? null, file_type: file?.type || file?.name.split('.').pop()?.toLowerCase() || editingDoc?.fileType || null,
        file_size_bytes: file?.size || editingDoc?.fileSizeBytes || null, original_filename: file?.name || editingDoc?.originalFilename || null,
        status: form.publish ? 'published' : 'draft', requires_acknowledgement: form.requiresAcknowledgement,
        published_at: form.publish ? now : null, source_type: form.sourceMode === 'drive' ? 'google_drive' : 'workspace',
      };

      if (editorMode === 'complete' && editingDoc) {
        const { error: updateError } = await supabase.from('files').update(payload).eq('id', editingDoc.id);
        if (updateError) throw updateError;
        await supabase.from('activity_log').insert({ company_id: form.companyId, event_type: form.publish ? 'document_published' : 'document_final_file_added', entity_type: 'file', entity_id: editingDoc.id, metadata: { protocol: editingDoc.protocol, title: form.title.trim(), deliverable_id: form.deliverableId || null } });
        setNotice(form.publish ? `${form.title.trim()} publicado para o cliente.` : `${form.title.trim()} recebeu o arquivo final e está pronto para publicação.`);
      } else {
        const { error: insertError } = await supabase.from('files').insert({ ...payload, revision_of_id: form.revisionOfId || null, protocol, workflow_origin: 'manual' });
        if (insertError) throw insertError;
        await supabase.from('activity_log').insert({ company_id: form.companyId, event_type: form.publish ? 'document_published' : form.revisionOfId ? 'document_revision_created' : 'document_created', entity_type: 'file', metadata: { protocol, title: form.title.trim(), revision_of_id: form.revisionOfId || null } });
        setNotice(`${form.title.trim()} salvo com o protocolo ${protocol}.`);
      }

      setEditorOpen(false); setEditingDoc(null); resetUploads(); await loadDocuments();
    } catch (requestError) {
      if (uploadedCoverPath) await supabase.storage.from('cali-workspace-private').remove([uploadedCoverPath]);
      if (uploadedFilePath) await supabase.storage.from('cali-workspace-private').remove([uploadedFilePath]);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o documento.');
    } finally { setSaving(false); }
  }

  async function openDocument(doc: DocumentRow) {
    if (!supabase) return;
    if (doc.driveUrl) { window.open(doc.driveUrl, '_blank', 'noopener,noreferrer'); return; }
    if (!doc.storagePath) return;
    const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(doc.storagePath, 900);
    if (signedError || !data?.signedUrl) { setError(signedError?.message || 'Não foi possível abrir o arquivo.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function changePublication(doc: DocumentRow, publish: boolean) {
    if (!supabase || (publish && !doc.storagePath && !doc.driveUrl)) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('files').update({ status: publish ? 'published' : 'draft', client_visible: publish, is_final: publish, published_at: publish ? new Date().toISOString() : null }).eq('id', doc.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({ company_id: doc.companyId, event_type: publish ? 'document_published' : 'document_unpublished', entity_type: 'file', entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title } });
      setNotice(publish ? 'Documento disponibilizado ao cliente.' : 'Documento voltou para uso interno.'); setDetailDoc(null); await loadDocuments();
    }
    setSaving(false);
  }

  async function archiveDocument(doc: DocumentRow) {
    if (!supabase) return;
    setSaving(true);
    const { error: updateError } = await supabase.from('files').update({ status: 'archived', client_visible: false }).eq('id', doc.id);
    if (updateError) setError(updateError.message);
    else { await supabase.from('activity_log').insert({ company_id: doc.companyId, event_type: 'document_archived', entity_type: 'file', entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title } }); setNotice('Documento arquivado. O histórico foi preservado.'); setDetailDoc(null); await loadDocuments(); }
    setSaving(false);
  }

  async function loadComments(doc: DocumentRow) {
    setDetailDoc(doc); setComments([]); setCommentText('');
    if (!supabase) return;
    setCommentsLoading(true);
    const { data, error: commentError } = await supabase.from('comments').select('id,body,client_visible,created_at').eq('target_type', 'file').eq('target_id', doc.id).order('created_at');
    if (commentError) setError(commentError.message);
    else setComments((data || []).map((row) => ({ id: row.id, body: row.body, clientVisible: Boolean(row.client_visible), createdAt: row.created_at })));
    setCommentsLoading(false);
  }

  async function sendComment() {
    if (!detailDoc || !commentText.trim() || !supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: insertError } = await supabase.from('comments').insert({ company_id: detailDoc.companyId, target_type: 'file', target_id: detailDoc.id, author_user_id: sessionData.session?.user.id || null, body: commentText.trim(), client_visible: commentVisible });
    if (insertError) { setError(insertError.message); return; }
    setCommentText(''); await loadComments(detailDoc); await loadDocuments();
  }

  return (
    <Shell role="admin">
      <section className="page documents-admin-page documents-admin-v3 documents-admin-v4">
        <div className="eyebrow">BIBLIOTECA DE TRABALHO</div>
        <div className="page-heading documents-heading-v3">
          <div><h1>Documentos</h1><p>A fila editorial nasce junto com o trabalho: entregável, aprovação, arquivo final, publicação, comentários e ciência ficam no mesmo histórico.</p></div>
          <div className="documents-heading-actions-v3"><button className="secondary" type="button" onClick={() => openNewDocument('drive')}><Link2 size={17} />Adicionar via Drive</button><button className="primary" type="button" onClick={() => openNewDocument('upload')}><Plus size={18} />Adicionar documento</button></div>
        </div>

        {notice && <div className="inline-notice success"><CheckCircle2 size={19} />{notice}</div>}
        {error && !editorOpen && <div className="inline-notice">{error}</div>}

        <section className="document-summary-v3 document-flow-summary-v4">
          <article><FileClock size={19} /><div><strong>{stats.preparation}</strong><span>Em preparação</span></div></article>
          <article><Upload size={19} /><div><strong>{stats.awaitingFinal}</strong><span>Aguardando arquivo final</span></div></article>
          <article><FileCheck2 size={19} /><div><strong>{stats.ready}</strong><span>Prontos para publicar</span></div></article>
          <article><ShieldCheck size={19} /><div><strong>{stats.published}</strong><span>Publicados</span></div></article>
        </section>

        <section className={`document-drive-strip-v3 ${driveConnection ? 'connected' : ''}`}>
          <div className="document-drive-mark-v3"><Cloud size={19} /></div><div><strong>{driveConnection ? 'Google Drive da CALI conectado' : 'Google Drive sem conexão automática'}</strong><span>{driveConnection ? `${driveConnection.accountEmail || 'Conta CALI'}${driveConnection.rootFolderName ? ` · ${driveConnection.rootFolderName}` : ''}` : 'Links do Drive podem ser registrados normalmente. A sincronização automática só aparece quando existir conexão real.'}</span></div>{driveConnection && <span className="document-drive-status-v3"><CheckCircle2 size={15} />Conectado</span>}
        </section>

        <div className="document-toolbar document-toolbar-v3 document-toolbar-v4">
          <label className="search-box document-search-v3"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, cliente, projeto, entregável ou protocolo" /></label>
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}><option value="all">Todos os clientes</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">Todas as etapas</option><option value="preparation">Em preparação</option><option value="awaiting_final_file">Aguardando arquivo final</option><option value="ready_to_publish">Pronto para publicar</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Todas as categorias</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>

        {loading && <section className="panel data-loading"><Loader2 className="spin" size={20} />Carregando biblioteca…</section>}
        {!loading && filtered.length === 0 && <section className="panel document-empty-v3"><FolderOpen size={30} /><div><strong>{docs.length ? 'Nenhum documento neste filtro.' : 'A biblioteca está pronta.'}</strong><span>{docs.length ? 'Ajuste os filtros.' : 'As prévias surgirão automaticamente quando um entregável marcado como “Gera documento” for criado.'}</span></div></section>}

        {!loading && filtered.length > 0 && <section className="document-library-grid-v3">
          {filtered.map((doc) => {
            const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements);
            const needsFile = doc.workflowStage === 'preparation' || doc.workflowStage === 'awaiting_final_file';
            return <article className={`document-library-card-v3 status-${doc.status} stage-${doc.workflowStage}`} key={doc.id}>
              <div className={`document-card-preview-v3 ${doc.coverUrl ? 'has-cover' : ''}`}>{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : <div><FileText size={34} /><span>{doc.kind}</span></div>}<span className={`document-status-flag-v3 ${doc.workflowStage}`}>{stageLabel(doc.workflowStage)}</span></div>
              <div className="document-card-content-v3">
                <div className="document-card-tags-v3"><span>{categoryLabel(doc.category)}</span><span>{doc.version}</span><span>{sourceLabel(doc.sourceType)}</span></div>
                <h2>{doc.title}</h2>
                <div className="document-client-line-v3"><span className="document-client-logo-v3">{doc.companyLogo ? <img src={doc.companyLogo} alt="" /> : <span>{doc.company.slice(0, 1).toUpperCase()}</span>}</span><div><strong>{doc.company}</strong><small>{doc.project || 'Sem projeto'}{doc.deliverable ? ` · ${doc.deliverable}` : ''}</small></div></div>
                <span className="document-protocol-v3">{doc.protocol}</span>
                <div className="document-card-metrics-v3"><span><Eye size={14} />{doc.views} visualizaç{doc.views === 1 ? 'ão' : 'ões'}</span>{doc.requiresAcknowledgement && <span className={pending > 0 ? 'pending' : 'done'}><ShieldCheck size={14} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''} ciências</span>}<span><MessageSquare size={14} />{doc.comments}</span></div>
                <div className="document-card-footer-v3"><small>Atualizado {formatDateTime(doc.updatedAt)}</small><div>{needsFile && <button className="primary document-complete-cta-v4" type="button" onClick={() => completeDocument(doc)}><Upload size={15} />Completar</button>}<button className="secondary" type="button" onClick={() => void openDocument(doc)} disabled={!doc.storagePath && !doc.driveUrl}><ExternalLink size={15} />Abrir</button><button className="secondary" type="button" onClick={() => void loadComments(doc)}>Detalhes</button></div></div>
              </div>
            </article>;
          })}
        </section>}
      </section>

      {editorOpen && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><section className="modal-card document-create-modal document-create-modal-v3" role="dialog" aria-modal="true">
        <header className="document-modal-header"><div><span className="section-kicker">{editorMode === 'complete' ? 'COMPLETAR PRÉVIA' : editorMode === 'revision' ? 'NOVA VERSÃO' : 'NOVO DOCUMENTO'}</span><h2>{editorMode === 'complete' ? 'Adicionar o arquivo final sem perder o vínculo' : editorMode === 'revision' ? 'Criar nova versão sem sobrescrever a anterior' : 'Organizar documento no Workspace'}</h2><p>{editorMode === 'complete' ? `O protocolo ${editingDoc?.protocol} e os vínculos com cliente, projeto e entregável serão preservados.` : 'Arquivo, metadados e publicação ficam registrados no mesmo histórico.'}</p></div><button type="button" className="modal-close document-modal-close" onClick={() => setEditorOpen(false)}><X size={20} /></button></header>
        <div className="document-modal-scroll">
          {error && <div className="inline-notice">{error}</div>}
          <div className="document-source-tabs-v3"><button type="button" className={form.sourceMode === 'upload' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'upload' }))}><Upload size={16} />Enviar arquivo</button><button type="button" className={form.sourceMode === 'drive' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'drive' }))}><Cloud size={16} />Usar link do Drive</button></div>
          <div className="document-upload-pair">
            {form.sourceMode === 'upload' ? <label className={`upload-drop document-file-drop ${file ? 'selected' : ''}`}><Upload size={25} /><strong>{file ? file.name : 'Selecionar documento'}</strong><span>{file ? `${formatFileSize(file.size)} · ${file.type || 'arquivo'}` : 'PDF, DOCX, XLSX, PPTX ou imagem'}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label> : <label className="document-drive-link-field-v3"><Cloud size={25} /><strong>Link do arquivo no Google Drive</strong><input value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/..." /></label>}
            <label className={`document-cover-upload ${coverPreview ? 'selected' : ''}`}>{coverPreview ? <img src={coverPreview} alt="Prévia da capa" /> : <><ImagePlus size={25} /><strong>Adicionar capa</strong><span>Opcional</span></>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectCover(event.target.files?.[0] ?? null)} /></label>
          </div>
          <div className="document-protocol-note"><span>PROTOCOLO</span><strong>{editingDoc?.protocol || 'Gerado automaticamente ao salvar'}</strong><small>{editorMode === 'complete' ? 'Esta prévia mantém o protocolo que nasceu com o entregável.' : editorMode === 'revision' ? 'A nova versão recebe protocolo próprio e continua ligada à anterior.' : 'Novo documento, novo protocolo.'}</small></div>
          <div className="form-grid document-form-grid document-form-grid-v3">
            <label className="stacked-label wide">Nome do documento<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label className="stacked-label">Cliente<select value={form.companyId} disabled={editorMode === 'complete'} onChange={(event) => updateCompany(event.target.value)}><option value="">Selecionar</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="stacked-label">Projeto<select value={form.projectId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => updateProject(event.target.value)}><option value="none">Sem projeto</option>{formProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="stacked-label">Entregável<select value={form.deliverableId || 'none'} disabled={editorMode === 'complete'} onChange={(event) => setForm((current) => ({ ...current, deliverableId: event.target.value === 'none' ? '' : event.target.value }))}><option value="none">Sem entregável</option>{formDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="stacked-label">Categoria<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CategorySlug }))}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="stacked-label">Tipo documental<select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>{documentKinds.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="stacked-label">Versão<input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} /></label>
            <label className="stacked-label wide">Descrição / contexto<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          </div>
          <div className="document-publication-options"><label className="check-line"><input type="checkbox" checked={form.publish} onChange={(event) => setForm((current) => ({ ...current, publish: event.target.checked }))} /><span><strong>Disponibilizar ao cliente ao salvar</strong><small>Se desmarcado, fica “Pronto para publicar”.</small></span></label><label className="check-line"><input type="checkbox" checked={form.requiresAcknowledgement} onChange={(event) => setForm((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /><span><strong>Solicitar ciência</strong><small>Visualização e ciência ficam registradas por usuário.</small></span></label></div>
        </div>
        <footer className="document-modal-footer"><span>{editorMode === 'complete' ? 'Cliente, projeto, entregável e protocolo permanecem intactos.' : 'Nada é publicado sem a sua escolha.'}</span><div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving || !form.title.trim() || !form.companyId || (form.sourceMode === 'upload' ? !file : !/^https?:\/\//i.test(form.driveUrl.trim()))} onClick={() => void saveDocument()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : editorMode === 'complete' ? 'Concluir documento' : 'Salvar documento'}</button></div></footer>
      </section></div>}

      {detailDoc && <div className="modal-backdrop workspace-modal-backdrop" role="presentation"><section className="modal-card document-detail-modal-v3" role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setDetailDoc(null)}><X size={20} /></button>
        <header className="document-detail-header-v3"><div className={`document-detail-cover-v3 ${detailDoc.coverUrl ? 'has-cover' : ''}`}>{detailDoc.coverUrl ? <img src={detailDoc.coverUrl} alt="" /> : <FileText size={32} />}</div><div><span className="section-kicker">{stageLabel(detailDoc.workflowStage)} · {detailDoc.version}</span><h2>{detailDoc.title}</h2><p>{detailDoc.protocol}</p></div></header>
        <div className="document-detail-scroll-v3">
          <section className="document-detail-grid-v3"><article><span>Cliente</span><strong>{detailDoc.company}</strong><small>{detailDoc.project || 'Sem projeto'}{detailDoc.deliverable ? ` · ${detailDoc.deliverable}` : ''}</small></article><article><span>Etapa</span><strong>{stageLabel(detailDoc.workflowStage)}</strong><small>{detailDoc.workflowOrigin === 'deliverable' ? 'Prévia criada pelo entregável' : 'Documento criado manualmente'}</small></article><article><span>Origem</span><strong>{sourceLabel(detailDoc.sourceType)}</strong><small>{detailDoc.originalFilename || detailDoc.fileType || 'Arquivo ainda não anexado'}</small></article><article><span>Ciência</span><strong>{detailDoc.requiresAcknowledgement ? `${detailDoc.acknowledgements}${detailDoc.expectedAcknowledgements ? ` de ${detailDoc.expectedAcknowledgements}` : ''}` : 'Não solicitada'}</strong><small>{detailDoc.views} visualizações</small></article></section>
          {detailDoc.description && <section className="document-context-v3"><span>CONTEXTO</span><p>{detailDoc.description}</p></section>}
          <section className="document-detail-actions-v3">{(detailDoc.workflowStage === 'preparation' || detailDoc.workflowStage === 'awaiting_final_file') && <button className="primary" onClick={() => completeDocument(detailDoc)}><Upload size={16} />Completar documento</button>}<button className="secondary" onClick={() => void openDocument(detailDoc)} disabled={!detailDoc.storagePath && !detailDoc.driveUrl}><ExternalLink size={16} />Abrir</button>{detailDoc.workflowStage === 'ready_to_publish' && <button className="primary" disabled={saving} onClick={() => void changePublication(detailDoc, true)}><FileCheck2 size={16} />Publicar</button>}{detailDoc.status === 'published' && <button className="secondary" disabled={saving} onClick={() => void changePublication(detailDoc, false)}><FileClock size={16} />Tornar interno</button>}{detailDoc.storagePath || detailDoc.driveUrl ? <button className="secondary" onClick={() => openNewVersion(detailDoc)}><Layers3 size={16} />Nova versão</button> : null}{detailDoc.status !== 'archived' && <button className="secondary danger" disabled={saving} onClick={() => void archiveDocument(detailDoc)}><Archive size={16} />Arquivar</button>}</section>
          <section className="document-comments-v3"><div className="document-comments-title-v3"><div><span className="section-kicker">CONVERSA DO DOCUMENTO</span><strong>{detailDoc.comments} comentários</strong></div><MessageSquare size={19} /></div><div className="document-comment-list-v3">{commentsLoading && <div className="data-loading"><Loader2 className="spin" size={17} />Carregando…</div>}{!commentsLoading && comments.length === 0 && <div className="document-comments-empty-v3">Ainda não há comentários.</div>}{comments.map((comment) => <div key={comment.id} className={comment.clientVisible ? '' : 'internal'}><p>{comment.body}</p><small>{comment.clientVisible ? 'Visível ao cliente' : 'Nota interna'} · {formatDateTime(comment.createdAt)}</small></div>)}</div><div className="document-comment-composer-v3"><textarea rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escreva uma observação..." /><div><label><input type="checkbox" checked={commentVisible} onChange={(event) => setCommentVisible(event.target.checked)} />Visível ao cliente</label><button className="primary" disabled={!commentText.trim()} onClick={() => void sendComment()}><Send size={15} />Enviar</button></div></div></section>
        </div>
      </section></div>}
    </Shell>
  );
}
