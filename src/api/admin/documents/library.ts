import type {
  CategorySlug, CompanyOption, DeliverableOption, DocumentRow, DocumentStatus, DriveConnection, ProfileOption, ProjectOption, WorkflowStage,
} from '../../../domain/documents';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { signPrivateWorkspaceMedia } from '../../files/workspace';
import { supabase } from '../../supabase';

export async function readAdminDocuments() {
  if (!supabase) throw new Error('Conexão indisponível.');
  const [companyResult, projectResult, deliverableResult, fileResult, ackResult, profileResult, commentResult, driveResult, partResult] = await Promise.all([
    supabase.from('companies').select('id,display_name,logo_url,logo_workspace_url').neq('status', 'closed').order('display_name'),
    supabase.from('projects').select('id,company_id,name').order('created_at', { ascending: false }),
    supabase.from('deliverables').select('id,company_id,project_id,title,status,is_document,protocol').order('created_at', { ascending: false }),
    supabase.from('files').select('id,company_id,project_id,deliverable_id,title,category,version_label,updated_at,published_at,drive_url,client_visible,source_type,protocol,document_kind,cover_storage_path,file_type,file_size_bytes,original_filename,requires_acknowledgement,status,storage_path,description,revision_of_id,workflow_origin,workflow_stage,valid_until').order('updated_at', { ascending: false }),
    supabase.from('document_acknowledgements').select('file_id,status,viewed_at,acknowledged_at'),
    supabase.from('profiles').select('id,company_id,role,active').eq('active', true),
    supabase.from('comments').select('target_id').eq('target_type', 'file'),
    supabase.from('drive_connections').select('id,account_email,root_folder_name,last_sync_at,status').eq('owner_type', 'cali').eq('status', 'connected').order('updated_at', { ascending: false }).limit(1),
    supabase.from('deliverable_tasks').select('deliverable_id'),
  ]);
  const partCount = new Map<string, number>();
  ((partResult.data || []) as { deliverable_id: string }[]).forEach((row) => partCount.set(row.deliverable_id, (partCount.get(row.deliverable_id) || 0) + 1));
  const failure = [companyResult.error, projectResult.error, deliverableResult.error, fileResult.error, ackResult.error, profileResult.error, commentResult.error, driveResult.error].find(Boolean);
  if (failure) throw failure;

  const companyOptions: CompanyOption[] = await Promise.all((companyResult.data || []).map(async (row) => ({
    id: row.id,
    name: row.display_name,
    logoUrl: await resolveWorkspaceMedia(row.logo_url || row.logo_workspace_url) || await resolveWorkspaceMedia(row.logo_workspace_url),
  })));
  const projectOptions: ProjectOption[] = (projectResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, name: row.name }));
  const deliverableOptions: DeliverableOption[] = (deliverableResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, projectId: row.project_id, title: row.title, status: row.status, protocol: row.protocol || null, parts: partCount.get(row.id) || 0 }));
  const profileOptions: ProfileOption[] = (profileResult.data || []).map((row) => ({ id: row.id, companyId: row.company_id, role: row.role, active: Boolean(row.active) }));

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

  const rows: DocumentRow[] = (fileResult.data || []).map((row) => {
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
      coverUrl: '', coverStoragePath: row.cover_storage_path, fileType: row.file_type || undefined,
      fileSizeBytes: Number(row.file_size_bytes || 0), originalFilename: row.original_filename, requiresAcknowledgement: Boolean(row.requires_acknowledgement),
      storagePath: row.storage_path, driveUrl: row.drive_url, description: row.description, revisionOfId: row.revision_of_id, validUntil: row.valid_until,
      views: ack.views, acknowledgements: ack.acknowledgements, expectedAcknowledgements: expectedByCompany.get(row.company_id) || 0, comments: commentsByFile.get(row.id) || 0,
    };
  });
  const documents = await Promise.all(rows.map(async (doc) => ({
    ...doc,
    coverUrl: doc.coverStoragePath ? await signPrivateWorkspaceMedia(doc.coverStoragePath, 3600) || doc.coverUrl : doc.coverUrl,
  })));
  return {
    companies: companyOptions,
    projects: projectOptions,
    deliverables: deliverableOptions,
    profiles: profileOptions,
    driveConnection: (driveResult.data?.[0] as DriveConnection | undefined) || null,
    documents,
  };
}
