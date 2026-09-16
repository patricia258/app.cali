import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Eye,
  FileCheck2,
  FileClock,
  FileText,
  FolderKanban,
  FolderOpen,
  ImagePlus,
  Layers3,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type CategorySlug = 'policy' | 'manual' | 'flow' | 'guide' | 'report' | 'onboarding' | 'deliverable' | 'schedule' | 'contract' | 'reference' | 'other';
type DocumentStatus = 'draft' | 'published' | 'archived';
type SourceMode = 'upload' | 'drive';

type CompanyOption = { id: string; name: string; logoUrl?: string | null };
type ProjectOption = { id: string; companyId: string; name: string; protocol?: string | null };
type DeliverableOption = { id: string; companyId: string; projectId: string; title: string; protocol?: string | null; status?: string | null };
type ProfileOption = { id: string; companyId?: string | null; name: string; role: string; active: boolean };
type DriveConnection = { id: string; accountEmail?: string | null; rootFolderName?: string | null; lastSyncAt?: string | null; status: string };
type FileComment = { id: string; body: string; clientVisible: boolean; createdAt: string; authorUserId?: string | null };

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
  clientVisible: boolean;
  protocol: string;
  coverUrl?: string;
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
  { value: 'deliverable', label: 'Entregável' },
  { value: 'report', label: 'Relatório' },
  { value: 'policy', label: 'Política' },
  { value: 'manual', label: 'Manual' },
  { value: 'flow', label: 'Fluxo' },
  { value: 'guide', label: 'Guia' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'schedule', label: 'Cronograma' },
  { value: 'contract', label: 'Contrato' },
  { value: 'reference', label: 'Referência' },
  { value: 'other', label: 'Outro' },
];

const documentKinds = ['Política', 'Fluxo', 'Protocolo', 'Manual', 'Guia', 'Relatório', 'Plano', 'Matriz', 'Apresentação', 'Contrato', 'Cronograma', 'Outro'];

const previewCompanies: CompanyOption[] = [
  { id: 'preview-aurora', name: 'Grupo Aurora' },
  { id: 'preview-novatech', name: 'Novatech' },
  { id: 'preview-studio', name: 'Studio Norte' },
];

const previewProjects: ProjectOption[] = [
  { id: 'preview-project-aurora', companyId: 'preview-aurora', name: 'Governança de People', protocol: 'CALI-PRJ-PREVIEW-001' },
  { id: 'preview-project-studio', companyId: 'preview-studio', name: 'Estrutura organizacional', protocol: 'CALI-PRJ-PREVIEW-002' },
];

const previewDeliverables: DeliverableOption[] = [
  { id: 'preview-del-1', companyId: 'preview-aurora', projectId: 'preview-project-aurora', title: 'Estrutura de indicadores de People', protocol: 'CALI-DLV-PREVIEW-001', status: 'approved' },
  { id: 'preview-del-2', companyId: 'preview-studio', projectId: 'preview-project-studio', title: 'Plano de governança de People', protocol: 'CALI-DLV-PREVIEW-002', status: 'client_review' },
];

const previewDocs: DocumentRow[] = [
  {
    id: 'preview-doc-1', title: 'Estrutura de indicadores de People', companyId: 'preview-aurora', company: 'Grupo Aurora',
    projectId: 'preview-project-aurora', project: 'Governança de People', deliverableId: 'preview-del-1', deliverable: 'Estrutura de indicadores de People',
    category: 'deliverable', kind: 'Matriz', version: 'v1.0', updatedAt: '2026-08-28T15:30:00Z', sourceType: 'workspace', status: 'published', clientVisible: true,
    protocol: 'CALI-DOC-2026-000041', requiresAcknowledgement: true, views: 2, acknowledgements: 1, expectedAcknowledgements: 2, comments: 2,
  },
  {
    id: 'preview-doc-2', title: 'Matriz de responsabilidades do RH', companyId: 'preview-aurora', company: 'Grupo Aurora',
    projectId: 'preview-project-aurora', project: 'Governança de People', category: 'deliverable', kind: 'Matriz', version: 'rascunho', updatedAt: '2026-08-27T12:00:00Z',
    sourceType: 'workspace', status: 'draft', clientVisible: false, protocol: 'CALI-DOC-2026-000040', requiresAcknowledgement: false, views: 0, acknowledgements: 0, expectedAcknowledgements: 2, comments: 0,
  },
  {
    id: 'preview-doc-3', title: 'Relatório Executivo · Julho', companyId: 'preview-aurora', company: 'Grupo Aurora', category: 'report', kind: 'Relatório', version: 'final',
    updatedAt: '2026-08-01T09:00:00Z', sourceType: 'google_drive', status: 'published', clientVisible: true, protocol: 'CALI-DOC-2026-000032',
    driveUrl: 'https://drive.google.com/', requiresAcknowledgement: false, views: 4, acknowledgements: 0, expectedAcknowledgements: 2, comments: 1,
  },
  {
    id: 'preview-doc-4', title: 'Plano de governança de People', companyId: 'preview-studio', company: 'Studio Norte',
    projectId: 'preview-project-studio', project: 'Estrutura organizacional', deliverableId: 'preview-del-2', deliverable: 'Plano de governança de People',
    category: 'deliverable', kind: 'Plano', version: 'final', updatedAt: '2026-08-24T16:20:00Z', sourceType: 'workspace', status: 'published', clientVisible: true,
    protocol: 'CALI-DOC-2026-000039', requiresAcknowledgement: true, views: 1, acknowledgements: 1, expectedAcknowledgements: 1, comments: 0,
  },
];

const categoryLabel = (value: CategorySlug) => categoryOptions.find((item) => item.value === value)?.label || 'Outro';
const statusLabel = (value: DocumentStatus) => value === 'published' ? 'Disponível ao cliente' : value === 'archived' ? 'Arquivado' : 'Interno';
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
  if (!match) return 'v2.0';
  return `v${Number(match[1]) + 1}.0`;
}

function emptyForm(companyId = ''): FormState {
  return {
    title: '', companyId, projectId: '', deliverableId: '', category: 'deliverable', kind: 'Matriz', version: 'v1.0', description: '', publish: false,
    requiresAcknowledgement: false, sourceMode: 'upload', driveUrl: '', revisionOfId: '',
  };
}

export function AdminDocumentsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [docs, setDocs] = useState<DocumentRow[]>(preview ? previewDocs : []);
  const [companies, setCompanies] = useState<CompanyOption[]>(preview ? previewCompanies : []);
  const [projects, setProjects] = useState<ProjectOption[]>(preview ? previewProjects : []);
  const [deliverables, setDeliverables] = useState<DeliverableOption[]>(preview ? previewDeliverables : []);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [driveConnection, setDriveConnection] = useState<DriveConnection | null>(null);
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(previewCompanies[0].id));
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [detailDoc, setDetailDoc] = useState<DocumentRow | null>(null);
  const [comments, setComments] = useState<FileComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentVisible, setCommentVisible] = useState(true);

  const filtered = useMemo(() => docs.filter((doc) => {
    const haystack = `${doc.title} ${doc.company} ${doc.project || ''} ${doc.deliverable || ''} ${categoryLabel(doc.category)} ${doc.kind} ${doc.protocol}`.toLocaleLowerCase('pt-BR');
    if (search && !haystack.includes(search.toLocaleLowerCase('pt-BR'))) return false;
    if (companyFilter !== 'all' && doc.companyId !== companyFilter) return false;
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && doc.sourceType !== sourceFilter) return false;
    return true;
  }), [docs, search, companyFilter, categoryFilter, statusFilter, sourceFilter]);

  const stats = useMemo(() => ({
    total: docs.length,
    published: docs.filter((doc) => doc.status === 'published').length,
    awaiting: docs.filter((doc) => doc.status === 'published' && doc.requiresAcknowledgement && doc.expectedAcknowledgements > doc.acknowledgements).length,
    linked: docs.filter((doc) => Boolean(doc.projectId || doc.deliverableId)).length,
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
    if (preview || !supabase) return;
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
        supabase.from('projects').select('id,company_id,name,protocol').order('created_at', { ascending: false }),
        supabase.from('deliverables').select('id,company_id,project_id,title,protocol,status,is_document').order('created_at', { ascending: false }),
        supabase.from('files').select('id,company_id,project_id,deliverable_id,title,category,version_label,updated_at,published_at,drive_url,client_visible,source_type,protocol,document_kind,cover_storage_path,file_type,file_size_bytes,original_filename,requires_acknowledgement,status,storage_path,description,revision_of_id').order('updated_at', { ascending: false }),
        supabase.from('document_acknowledgements').select('file_id,user_id,status,viewed_at,acknowledged_at'),
        supabase.from('profiles').select('id,company_id,full_name,role,active').eq('active', true),
        supabase.from('comments').select('target_id').eq('target_type', 'file'),
        supabase.from('drive_connections').select('id,account_email,root_folder_name,last_sync_at,status').eq('owner_type', 'cali').eq('status', 'connected').order('updated_at', { ascending: false }).limit(1),
      ]);
      const failure = [companyResult.error, projectResult.error, deliverableResult.error, fileResult.error, ackResult.error, profileResult.error, commentResult.error, driveResult.error].find(Boolean);
      if (failure) throw failure;

      const companyOptions: CompanyOption[] = (companyResult.data || []).map((row) => ({ id: row.id, name: row.display_name, logoUrl: row.logo_url }));
      const projectOptions: ProjectOption[] = (projectResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, name: row.name, protocol: row.protocol }));
      const deliverableOptions: DeliverableOption[] = (deliverableResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, protocol: row.protocol, status: row.status }));
      const profileOptions: ProfileOption[] = (profileResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, name: row.full_name || 'Usuário', role: row.role, active: Boolean(row.active) }));

      setCompanies(companyOptions);
      setProjects(projectOptions);
      setDeliverables(deliverableOptions);
      setProfiles(profileOptions);
      setDriveConnection((driveResult.data?.[0] as DriveConnection | undefined) || null);
      if (companyOptions.length && !form.companyId) setForm((current) => ({ ...current, companyId: companyOptions[0].id }));

      const companyMap = new Map(companyOptions.map((item) => [item.id, item]));
      const projectMap = new Map(projectOptions.map((item) => [item.id, item]));
      const deliverableMap = new Map(deliverableOptions.map((item) => [item.id, item]));
      const acksByFile = new Map<string, { views: number; acknowledgements: number }>();
      (ackResult.data || []).forEach((row) => {
        const current = acksByFile.get(row.file_id) || { views: 0, acknowledgements: 0 };
        current.views += row.viewed_at ? 1 : 0;
        current.acknowledgements += row.status === 'acknowledged' || row.acknowledged_at ? 1 : 0;
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
          id: row.id,
          title: row.title,
          companyId: row.company_id,
          company: company?.name || 'Cliente',
          companyLogo: company?.logoUrl,
          projectId: row.project_id,
          project: project?.name,
          deliverableId: row.deliverable_id,
          deliverable: deliverable?.title,
          category: (row.category || 'other') as CategorySlug,
          kind: row.document_kind || 'Outro',
          version: row.version_label || (row.status === 'draft' ? 'rascunho' : 'final'),
          updatedAt: row.updated_at,
          publishedAt: row.published_at,
          sourceType: (row.source_type || (row.drive_url ? 'google_drive' : 'workspace')) as DocumentRow['sourceType'],
          status: (row.status || 'draft') as DocumentStatus,
          clientVisible: Boolean(row.client_visible),
          protocol: row.protocol || '—',
          coverUrl: await resolveCover(row.cover_storage_path),
          fileType: row.file_type || undefined,
          fileSizeBytes: Number(row.file_size_bytes || 0),
          originalFilename: row.original_filename,
          requiresAcknowledgement: Boolean(row.requires_acknowledgement),
          storagePath: row.storage_path,
          driveUrl: row.drive_url,
          description: row.description,
          revisionOfId: row.revision_of_id,
          views: ack.views,
          acknowledgements: ack.acknowledgements,
          expectedAcknowledgements: expectedByCompany.get(row.company_id) || 0,
          comments: commentsByFile.get(row.id) || 0,
        };
      }));
      setDocs(rows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }

  function resetUploads() {
    setFile(null);
    setCover(null);
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview('');
  }

  function openNewDocument(mode: SourceMode = 'upload') {
    resetUploads();
    setForm({ ...emptyForm(companies[0]?.id || previewCompanies[0].id), sourceMode: mode });
    setError('');
    setNotice('');
    setEditorOpen(true);
  }

  function openNewVersion(doc: DocumentRow) {
    resetUploads();
    setForm({
      title: doc.title,
      companyId: doc.companyId,
      projectId: doc.projectId || '',
      deliverableId: doc.deliverableId || '',
      category: doc.category,
      kind: doc.kind,
      version: nextVersion(doc.version),
      description: doc.description || '',
      publish: false,
      requiresAcknowledgement: doc.requiresAcknowledgement,
      sourceMode: 'upload',
      driveUrl: '',
      revisionOfId: doc.id,
    });
    setDetailDoc(null);
    setEditorOpen(true);
  }

  function selectCover(next: File | null) {
    setCover(next);
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(next ? URL.createObjectURL(next) : '');
  }

  function updateCompany(nextCompanyId: string) {
    setForm((current) => ({ ...current, companyId: nextCompanyId, projectId: '', deliverableId: '' }));
  }

  function updateProject(nextProjectId: string) {
    setForm((current) => ({ ...current, projectId: nextProjectId === 'none' ? '' : nextProjectId, deliverableId: '' }));
  }

  async function saveDocument() {
    if (!form.title.trim() || !form.companyId) return;
    if (form.sourceMode === 'upload' && !file) return;
    if (form.sourceMode === 'drive' && !/^https?:\/\//i.test(form.driveUrl.trim())) return;
    setSaving(true);
    setError('');

    const companyName = companies.find((item) => item.id === form.companyId)?.name || 'Cliente';
    if (preview || !supabase) {
      const protocol = `CALI-DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const project = projects.find((item) => item.id === form.projectId);
      const deliverable = deliverables.find((item) => item.id === form.deliverableId);
      const next: DocumentRow = {
        id: `preview-doc-${Date.now()}`,
        title: form.title.trim(), companyId: form.companyId, company: companyName,
        projectId: form.projectId || null, project: project?.name || null, deliverableId: form.deliverableId || null, deliverable: deliverable?.title || null,
        category: form.category, kind: form.kind, version: form.version.trim() || (form.publish ? 'final' : 'rascunho'), updatedAt: new Date().toISOString(),
        sourceType: form.sourceMode === 'drive' ? 'google_drive' : 'workspace', status: form.publish ? 'published' : 'draft', clientVisible: form.publish,
        protocol, coverUrl: coverPreview || undefined, fileType: file?.type || undefined, fileSizeBytes: file?.size, originalFilename: file?.name || null,
        requiresAcknowledgement: form.requiresAcknowledgement, driveUrl: form.sourceMode === 'drive' ? form.driveUrl.trim() : null, description: form.description.trim() || null,
        revisionOfId: form.revisionOfId || null, views: 0, acknowledgements: 0, expectedAcknowledgements: 1, comments: 0,
      };
      setDocs((current) => [next, ...current]);
      setNotice(`${next.title} criado com o protocolo ${protocol}.`);
      setEditorOpen(false);
      resetUploads();
      setSaving(false);
      return;
    }

    let uploadedFilePath = '';
    let uploadedCoverPath = '';
    try {
      const { data: protocolValue, error: protocolError } = await supabase.rpc('generate_protocol', { p_entity_type: 'DOC' });
      if (protocolError) throw protocolError;
      const protocol = String(protocolValue);

      if (form.sourceMode === 'upload' && file) {
        const filePath = `documents/${form.companyId}/${protocol}/file-${Date.now()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(filePath, file, { upsert: false, contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;
      }

      if (cover) {
        const coverPath = `documents/${form.companyId}/${protocol}/cover-${Date.now()}-${safeFileName(cover.name)}`;
        const { error: coverError } = await supabase.storage.from('cali-workspace-private').upload(coverPath, cover, { upsert: false, contentType: cover.type || undefined });
        if (coverError) throw coverError;
        uploadedCoverPath = coverPath;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from('files').insert({
        company_id: form.companyId,
        project_id: form.projectId || null,
        deliverable_id: form.deliverableId || null,
        title: form.title.trim(),
        category: form.category,
        document_kind: form.kind,
        description: form.description.trim() || null,
        storage_path: uploadedFilePath || null,
        drive_url: form.sourceMode === 'drive' ? form.driveUrl.trim() : null,
        cover_storage_path: uploadedCoverPath || null,
        version_label: form.version.trim() || (form.publish ? 'final' : 'rascunho'),
        is_final: form.publish,
        client_visible: form.publish,
        uploaded_by: sessionData.session?.user.id ?? null,
        file_type: file?.type || file?.name.split('.').pop()?.toLowerCase() || null,
        file_size_bytes: file?.size || null,
        original_filename: file?.name || null,
        status: form.publish ? 'published' : 'draft',
        requires_acknowledgement: form.requiresAcknowledgement,
        published_at: form.publish ? now : null,
        source_type: form.sourceMode === 'drive' ? 'google_drive' : 'workspace',
        revision_of_id: form.revisionOfId || null,
        protocol,
      });
      if (insertError) throw insertError;

      await supabase.from('activity_log').insert({
        company_id: form.companyId,
        event_type: form.publish ? 'document_published' : form.revisionOfId ? 'document_revision_created' : 'document_created',
        entity_type: 'file',
        metadata: { protocol, title: form.title.trim(), category: form.category, document_kind: form.kind, revision_of_id: form.revisionOfId || null },
      });

      setNotice(`${form.title.trim()} criado com o protocolo ${protocol}.`);
      setEditorOpen(false);
      resetUploads();
      await loadDocuments();
    } catch (requestError) {
      if (uploadedCoverPath) await supabase.storage.from('cali-workspace-private').remove([uploadedCoverPath]);
      if (uploadedFilePath) await supabase.storage.from('cali-workspace-private').remove([uploadedFilePath]);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  }

  async function openDocument(doc: DocumentRow) {
    if (preview || !supabase) {
      if (doc.driveUrl) window.open(doc.driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (doc.driveUrl) {
      window.open(doc.driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!doc.storagePath) return;
    const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(doc.storagePath, 900);
    if (signedError || !data?.signedUrl) {
      setError(signedError?.message || 'Não foi possível abrir o arquivo.');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function changePublication(doc: DocumentRow, publish: boolean) {
    if (preview || !supabase) {
      setDocs((current) => current.map((item) => item.id === doc.id ? { ...item, status: publish ? 'published' : 'draft', clientVisible: publish, publishedAt: publish ? new Date().toISOString() : null } : item));
      setDetailDoc((current) => current?.id === doc.id ? { ...current, status: publish ? 'published' : 'draft', clientVisible: publish } : current);
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.from('files').update({ status: publish ? 'published' : 'draft', client_visible: publish, is_final: publish, published_at: publish ? new Date().toISOString() : null }).eq('id', doc.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({ company_id: doc.companyId, event_type: publish ? 'document_published' : 'document_unpublished', entity_type: 'file', entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title } });
      setNotice(publish ? 'Documento disponibilizado ao cliente.' : 'Documento voltou para uso interno.');
      setDetailDoc(null);
      await loadDocuments();
    }
    setSaving(false);
  }

  async function archiveDocument(doc: DocumentRow) {
    if (preview || !supabase) {
      setDocs((current) => current.map((item) => item.id === doc.id ? { ...item, status: 'archived', clientVisible: false } : item));
      setDetailDoc(null);
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.from('files').update({ status: 'archived', client_visible: false }).eq('id', doc.id);
    if (updateError) setError(updateError.message);
    else {
      await supabase.from('activity_log').insert({ company_id: doc.companyId, event_type: 'document_archived', entity_type: 'file', entity_id: doc.id, metadata: { protocol: doc.protocol, title: doc.title } });
      setNotice('Documento arquivado. O histórico e o protocolo foram preservados.');
      setDetailDoc(null);
      await loadDocuments();
    }
    setSaving(false);
  }

  async function loadComments(doc: DocumentRow) {
    setDetailDoc(doc);
    setComments([]);
    setCommentText('');
    if (preview || !supabase) {
      setComments(doc.comments ? [{ id: 'preview-comment', body: 'Material organizado e pronto para validação.', clientVisible: true, createdAt: '2026-08-28T15:40:00Z' }] : []);
      return;
    }
    setCommentsLoading(true);
    const { data, error: commentError } = await supabase.from('comments').select('id,body,client_visible,created_at,author_user_id').eq('target_type', 'file').eq('target_id', doc.id).order('created_at');
    if (commentError) setError(commentError.message);
    else setComments((data || []).map((row) => ({ id: row.id, body: row.body, clientVisible: Boolean(row.client_visible), createdAt: row.created_at, authorUserId: row.author_user_id })));
    setCommentsLoading(false);
  }

  async function sendComment() {
    if (!detailDoc || !commentText.trim()) return;
    if (preview || !supabase) {
      setComments((current) => [...current, { id: `preview-comment-${Date.now()}`, body: commentText.trim(), clientVisible: commentVisible, createdAt: new Date().toISOString() }]);
      setCommentText('');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: insertError } = await supabase.from('comments').insert({
      company_id: detailDoc.companyId,
      target_type: 'file',
      target_id: detailDoc.id,
      author_user_id: sessionData.session?.user.id || null,
      body: commentText.trim(),
      client_visible: commentVisible,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCommentText('');
    await loadComments(detailDoc);
    await loadDocuments();
  }

  return (
    <Shell role="admin">
      <section className="page documents-admin-page documents-admin-v3">
        <div className="eyebrow">BIBLIOTECA DE TRABALHO</div>
        <div className="page-heading documents-heading-v3">
          <div>
            <h1>Documentos</h1>
            <p>Um único histórico para tudo que nasce no trabalho com o cliente: arquivo, versão, projeto, entregável, publicação, comentários e ciência.</p>
          </div>
          <div className="documents-heading-actions-v3">
            <button className="secondary" type="button" onClick={() => openNewDocument('drive')}><Link2 size={17} />Adicionar via Drive</button>
            <button className="primary" type="button" onClick={() => openNewDocument('upload')}><Plus size={18} />Adicionar documento</button>
          </div>
        </div>

        {notice && <div className="inline-notice success"><CheckCircle2 size={19} />{notice}</div>}
        {error && !editorOpen && <div className="inline-notice">{error}</div>}

        <section className="document-summary-v3" aria-label="Resumo da biblioteca">
          <article><FileText size={19} /><div><strong>{stats.total}</strong><span>Total na biblioteca</span></div></article>
          <article><FileCheck2 size={19} /><div><strong>{stats.published}</strong><span>Disponíveis ao cliente</span></div></article>
          <article><ShieldCheck size={19} /><div><strong>{stats.awaiting}</strong><span>Aguardando ciência</span></div></article>
          <article><FolderKanban size={19} /><div><strong>{stats.linked}</strong><span>Vinculados ao trabalho</span></div></article>
        </section>

        <section className={`document-drive-strip-v3 ${driveConnection ? 'connected' : ''}`}>
          <div className="document-drive-mark-v3"><Cloud size={19} /></div>
          <div>
            <strong>{driveConnection ? 'Google Drive da CALI conectado' : 'Google Drive sem conexão automática'}</strong>
            <span>{driveConnection ? `${driveConnection.accountEmail || 'Conta CALI'}${driveConnection.rootFolderName ? ` · ${driveConnection.rootFolderName}` : ''}${driveConnection.lastSyncAt ? ` · última sincronização ${formatDateTime(driveConnection.lastSyncAt)}` : ''}` : 'Você já pode registrar arquivos do Drive por link. A conexão automática só aparece como ativa quando existir uma credencial válida no Workspace.'}</span>
          </div>
          {driveConnection && <span className="document-drive-status-v3"><CheckCircle2 size={15} />Conectado</span>}
        </section>

        <div className="document-toolbar document-toolbar-v3">
          <label className="search-box document-search-v3"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, cliente, projeto, tipo ou protocolo" /></label>
          <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} aria-label="Filtrar por cliente"><option value="all">Todos os clientes</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar por categoria"><option value="all">Todas as categorias</option>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status"><option value="all">Todos os status</option><option value="published">Disponível ao cliente</option><option value="draft">Interno</option><option value="archived">Arquivado</option></select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filtrar por origem"><option value="all">Todas as origens</option><option value="workspace">Workspace</option><option value="google_drive">Google Drive</option><option value="external">Link externo</option></select>
        </div>

        {loading && <section className="panel data-loading"><Loader2 className="spin" size={20} />Carregando biblioteca…</section>}
        {!loading && filtered.length === 0 && (
          <section className="panel document-empty-v3">
            <FolderOpen size={30} />
            <div><strong>{docs.length ? 'Nenhum documento neste filtro.' : 'A biblioteca está pronta para o primeiro documento.'}</strong><span>{docs.length ? 'Ajuste os filtros ou faça uma nova busca.' : 'Ao adicionar, você pode vincular o arquivo ao cliente, projeto e entregável desde a origem.'}</span></div>
            {!docs.length && <button className="primary" type="button" onClick={() => openNewDocument('upload')}><Plus size={17} />Adicionar documento</button>}
          </section>
        )}

        {!loading && filtered.length > 0 && (
          <section className="document-library-grid-v3">
            {filtered.map((doc) => {
              const pending = Math.max(0, doc.expectedAcknowledgements - doc.acknowledgements);
              return (
                <article className={`document-library-card-v3 status-${doc.status}`} key={doc.id}>
                  <div className={`document-card-preview-v3 ${doc.coverUrl ? 'has-cover' : ''}`}>
                    {doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : <div><FileText size={34} /><span>{doc.kind}</span></div>}
                    <span className={`document-status-flag-v3 ${doc.status}`}>{statusLabel(doc.status)}</span>
                  </div>
                  <div className="document-card-content-v3">
                    <div className="document-card-tags-v3"><span>{categoryLabel(doc.category)}</span><span>{doc.version}</span><span>{sourceLabel(doc.sourceType)}</span></div>
                    <h2>{doc.title}</h2>
                    <div className="document-client-line-v3">
                      <span className="document-client-logo-v3">{doc.companyLogo ? <img src={doc.companyLogo} alt="" /> : <span>{doc.company.slice(0, 1).toUpperCase()}</span>}</span>
                      <div><strong>{doc.company}</strong><small>{doc.project || 'Sem projeto vinculado'}{doc.deliverable ? ` · ${doc.deliverable}` : ''}</small></div>
                    </div>
                    <span className="document-protocol-v3">{doc.protocol}</span>
                    <div className="document-card-metrics-v3">
                      <span><Eye size={14} />{doc.views} visualizaç{doc.views === 1 ? 'ão' : 'ões'}</span>
                      {doc.requiresAcknowledgement && <span className={pending > 0 ? 'pending' : 'done'}><ShieldCheck size={14} />{doc.acknowledgements}{doc.expectedAcknowledgements ? `/${doc.expectedAcknowledgements}` : ''} ciência{doc.expectedAcknowledgements === 1 ? '' : 's'}</span>}
                      <span><MessageSquare size={14} />{doc.comments}</span>
                    </div>
                    <div className="document-card-footer-v3">
                      <small>Atualizado {formatDateTime(doc.updatedAt)}</small>
                      <div><button className="secondary" type="button" onClick={() => void openDocument(doc)} disabled={!doc.storagePath && !doc.driveUrl}><ExternalLink size={15} />Abrir</button><button className="secondary" type="button" onClick={() => void loadComments(doc)}>Detalhes</button></div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      {editorOpen && (
        <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
          <section className="modal-card document-create-modal document-create-modal-v3" role="dialog" aria-modal="true" aria-label="Adicionar documento">
            <header className="document-modal-header">
              <div><span className="section-kicker">{form.revisionOfId ? 'NOVA VERSÃO' : 'NOVO DOCUMENTO'}</span><h2>{form.revisionOfId ? 'Criar nova versão sem perder o histórico' : 'Organizar documento no Workspace'}</h2><p>Arquivo, metadados, vínculo com o trabalho e publicação ficam registrados no mesmo protocolo.</p></div>
              <button type="button" className="modal-close document-modal-close" onClick={() => setEditorOpen(false)} aria-label="Fechar"><X size={20} /></button>
            </header>

            <div className="document-modal-scroll">
              {error && <div className="inline-notice">{error}</div>}

              <div className="document-source-tabs-v3">
                <button type="button" className={form.sourceMode === 'upload' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'upload' }))}><Upload size={16} />Enviar arquivo</button>
                <button type="button" className={form.sourceMode === 'drive' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, sourceMode: 'drive' }))}><Cloud size={16} />Usar link do Drive</button>
              </div>

              <div className="document-upload-pair">
                {form.sourceMode === 'upload' ? (
                  <label className={`upload-drop document-file-drop ${file ? 'selected' : ''}`}>
                    <Upload size={25} /><strong>{file ? file.name : 'Selecionar documento'}</strong><span>{file ? `${formatFileSize(file.size)} · ${file.type || 'arquivo'}` : 'PDF, DOCX, XLSX, PPTX ou imagem'}</span>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  </label>
                ) : (
                  <label className="document-drive-link-field-v3"><Cloud size={25} /><strong>Link do arquivo no Google Drive</strong><span>O link fica registrado como origem oficial do documento.</span><input value={form.driveUrl} onChange={(event) => setForm((current) => ({ ...current, driveUrl: event.target.value }))} placeholder="https://drive.google.com/..." /></label>
                )}
                <label className={`document-cover-upload ${coverPreview ? 'selected' : ''}`}>
                  {coverPreview ? <img src={coverPreview} alt="Prévia da capa" /> : <><ImagePlus size={25} /><strong>Adicionar capa</strong><span>Opcional · melhora a leitura da biblioteca</span></>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectCover(event.target.files?.[0] ?? null)} />
                </label>
              </div>

              <div className="document-protocol-note"><span>PROTOCOLO</span><strong>Gerado automaticamente ao salvar</strong><small>{form.revisionOfId ? 'A nova versão recebe protocolo próprio e continua ligada à anterior.' : 'Ex.: CALI-DOC-2026-000042'}</small></div>

              <div className="form-grid document-form-grid document-form-grid-v3">
                <label className="stacked-label wide">Nome do documento<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Nome que aparecerá na biblioteca" /></label>
                <label className="stacked-label">Cliente<select value={form.companyId} onChange={(event) => updateCompany(event.target.value)}><option value="">Selecionar</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="stacked-label">Projeto<select value={form.projectId || 'none'} onChange={(event) => updateProject(event.target.value)}><option value="none">Sem projeto</option>{formProjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="stacked-label">Entregável<select value={form.deliverableId || 'none'} onChange={(event) => setForm((current) => ({ ...current, deliverableId: event.target.value === 'none' ? '' : event.target.value }))}><option value="none">Sem entregável</option>{formDeliverables.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
                <label className="stacked-label">Categoria<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as CategorySlug }))}>{categoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <label className="stacked-label">Tipo documental<select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}>{documentKinds.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Versão<input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} placeholder="v1.0" /></label>
                <label className="stacked-label wide">Descrição / contexto<textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Contexto curto para quem consultar este documento depois." /></label>
              </div>

              <div className="document-publication-options">
                <label className="check-line"><input type="checkbox" checked={form.publish} onChange={(event) => setForm((current) => ({ ...current, publish: event.target.checked }))} /><span><strong>Disponibilizar ao cliente</strong><small>Publica o documento na biblioteca do cliente assim que salvar.</small></span></label>
                <label className="check-line"><input type="checkbox" checked={form.requiresAcknowledgement} onChange={(event) => setForm((current) => ({ ...current, requiresAcknowledgement: event.target.checked }))} /><span><strong>Solicitar ciência</strong><small>Leitura e ciência ficam registradas com usuário, data e horário.</small></span></label>
              </div>
            </div>

            <footer className="document-modal-footer"><span>{form.revisionOfId ? 'A versão anterior permanece intacta no histórico.' : 'Nada é publicado ao cliente sem a sua escolha.'}</span><div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditorOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving || !form.title.trim() || !form.companyId || (form.sourceMode === 'upload' ? !file : !/^https?:\/\//i.test(form.driveUrl.trim()))} onClick={() => void saveDocument()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Salvar documento'}</button></div></footer>
          </section>
        </div>
      )}

      {detailDoc && (
        <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
          <section className="modal-card document-detail-modal-v3" role="dialog" aria-modal="true" aria-label={`Detalhes de ${detailDoc.title}`}>
            <button className="modal-close" type="button" onClick={() => setDetailDoc(null)} aria-label="Fechar"><X size={20} /></button>
            <header className="document-detail-header-v3">
              <div className={`document-detail-cover-v3 ${detailDoc.coverUrl ? 'has-cover' : ''}`}>{detailDoc.coverUrl ? <img src={detailDoc.coverUrl} alt="" /> : <FileText size={32} />}</div>
              <div><span className="section-kicker">{categoryLabel(detailDoc.category)} · {detailDoc.version}</span><h2>{detailDoc.title}</h2><p>{detailDoc.protocol}</p></div>
            </header>

            <div className="document-detail-scroll-v3">
              <section className="document-detail-grid-v3">
                <article><span>Cliente</span><strong>{detailDoc.company}</strong><small>{detailDoc.project || 'Sem projeto vinculado'}{detailDoc.deliverable ? ` · ${detailDoc.deliverable}` : ''}</small></article>
                <article><span>Origem</span><strong>{sourceLabel(detailDoc.sourceType)}</strong><small>{detailDoc.originalFilename || detailDoc.fileType || 'Arquivo vinculado'}</small></article>
                <article><span>Status</span><strong>{statusLabel(detailDoc.status)}</strong><small>{detailDoc.publishedAt ? `Publicado ${formatDateTime(detailDoc.publishedAt)}` : `Atualizado ${formatDateTime(detailDoc.updatedAt)}`}</small></article>
                <article><span>Ciência</span><strong>{detailDoc.requiresAcknowledgement ? `${detailDoc.acknowledgements}${detailDoc.expectedAcknowledgements ? ` de ${detailDoc.expectedAcknowledgements}` : ''}` : 'Não solicitada'}</strong><small>{detailDoc.views} visualizaç{detailDoc.views === 1 ? 'ão' : 'ões'}</small></article>
              </section>

              {detailDoc.description && <section className="document-context-v3"><span>CONTEXTO</span><p>{detailDoc.description}</p></section>}

              <section className="document-detail-actions-v3">
                <button className="primary" type="button" onClick={() => void openDocument(detailDoc)} disabled={!detailDoc.storagePath && !detailDoc.driveUrl}><ExternalLink size={16} />Abrir documento</button>
                {detailDoc.status !== 'archived' && <button className="secondary" type="button" onClick={() => openNewVersion(detailDoc)}><Layers3 size={16} />Nova versão</button>}
                {detailDoc.status === 'published' ? <button className="secondary" type="button" disabled={saving} onClick={() => void changePublication(detailDoc, false)}><FileClock size={16} />Tornar interno</button> : detailDoc.status === 'draft' ? <button className="secondary" type="button" disabled={saving} onClick={() => void changePublication(detailDoc, true)}><FileCheck2 size={16} />Publicar</button> : null}
                {detailDoc.status !== 'archived' && <button className="secondary danger" type="button" disabled={saving} onClick={() => void archiveDocument(detailDoc)}><Archive size={16} />Arquivar</button>}
              </section>

              <section className="document-comments-v3">
                <div className="document-comments-title-v3"><div><span className="section-kicker">CONVERSA DO DOCUMENTO</span><strong>{detailDoc.comments} comentário{detailDoc.comments === 1 ? '' : 's'}</strong></div><MessageSquare size={19} /></div>
                <div className="document-comment-list document-comment-list-v3">
                  {commentsLoading && <div className="data-loading"><Loader2 className="spin" size={17} />Carregando conversa…</div>}
                  {!commentsLoading && comments.length === 0 && <div className="document-comments-empty-v3">Ainda não há comentários neste documento.</div>}
                  {comments.map((comment) => <div key={comment.id} className={comment.clientVisible ? '' : 'internal'}><p>{comment.body}</p><small>{comment.clientVisible ? 'Visível ao cliente' : 'Nota interna'} · {formatDateTime(comment.createdAt)}</small></div>)}
                </div>
                <div className="document-comment-composer document-comment-composer-v3">
                  <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={3} placeholder="Escreva uma observação sobre este documento..." />
                  <div><label><input type="checkbox" checked={commentVisible} onChange={(event) => setCommentVisible(event.target.checked)} />Visível ao cliente</label><button className="primary" type="button" disabled={!commentText.trim()} onClick={() => void sendComment()}><Send size={15} />Enviar</button></div>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}
