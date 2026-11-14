import { DocumentStorageNotice } from '../../../components/documents/DocumentStorageNotice';
import { WorkflowPage } from '../../../components/ds/WorkflowPage';
import { StatusBadge } from '../../../components/ds/StatusBadge';
import { WorkflowHeading } from '../../../components/ds/WorkflowHeading';
import { DocumentFolderAction } from '../../../components/documents/DocumentFolderAction';
import { DocumentCardArt, DocumentCardTag, DocumentCardTags } from '../../../components/documents/DocumentCardArt';
import { DocumentCardFact, DocumentCardFacts } from '../../../components/documents/DocumentCardFacts';
import { DocumentCardActions, DocumentCardContent, DocumentCardProtocol } from '../../../components/documents/DocumentCardContent';
import { Button } from '../../../components/ds/Button';
import { EmptyState } from '../../../components/ds/EmptyState';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { openPrivateWorkspaceFile } from '../../../api/files/workspace';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { FolderOpen, AlertTriangle, CheckCircle2, Cloud, ExternalLink, Eye, FileCheck2, FileText, MessageSquare, Search } from 'lucide-react';
import { Shell } from '../../../components/workspace/WorkspaceShell';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import {
  acknowledgeDocumentVersion, documentLibraryKey, postDocumentComment, readClientDocumentLibrary,
  readDocumentComments, recordDocumentView,
} from '../../../api/client/documents/library';
import {
  authorizeDriveConnection, copyFileToDrive, copyFolderToDrive, type DriveConnection,
  type DriveSyncState as SyncState,
} from '../../../api/client/documents/drive';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import { DocumentFolderProgress, DocumentLayoutSwitch } from '../../../components/documents/DocumentFolderHeader';
import { ClientDocumentFolder } from './components/ClientDocumentFolder';
import { ClientDocumentDetails } from './components/ClientDocumentDetails';
import { ClientDocumentList } from './components/ClientDocumentList';
import { ClientDocumentComments, type DocumentComment } from './components/ClientDocumentComments';

type CategorySlug = 'policy' | 'manual' | 'flow' | 'guide' | 'report' | 'onboarding' | 'deliverable' | 'schedule' | 'contract' | 'reference' | 'other';
export type ClientDoc = {
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
  deliverableId: string | null;
  taskId: string | null;
};

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
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();
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
  const [folderSaving, setFolderSaving] = useState('');
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [commentDoc, setCommentDoc] = useState<ClientDoc | null>(null);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const categories = useMemo(() => Array.from(new Set(documents.map((doc) => doc.category))), [documents]);
  const folderIds = useMemo(() => new Set(folders.map((folder) => folder.id)), [folders]);
  const filtered = useMemo(() => documents.filter((doc) => !doc.taskId && !folderIds.has(doc.deliverableId || '')).filter((doc) => {
    const matchQuery = `${doc.title} ${categoryLabel(doc.category)} ${doc.kind} ${doc.protocol}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
    const matchCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchQuery && matchCategory;
  }), [folderIds, documents, query, categoryFilter]);
  // Pastas entram na mesma busca e no mesmo filtro dos documentos soltos ("Pastas" mostra só elas).
  const shownFolders = useMemo(() => folders.filter((folder) => (categoryFilter === 'all' || categoryFilter === 'folder') && `${folder.title} ${folder.protocol || ''} pasta`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [folders, query, categoryFilter]);

  useEffect(() => {
    void loadDocuments();
  }, [user?.id]);

  // Chegando por um aviso (?documento=...): abre a pasta do documento ou a ficha dele, uma vez só.
  const location = useLocation(); const openedFromLink = useRef('');
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('documento') || '';
    if (!wanted || openedFromLink.current === wanted || !documents.length) return;
    const hit = documents.find((doc) => doc.id === wanted); if (!hit) return;
    openedFromLink.current = wanted;
    const folder = folders.find((item) => item.id === hit.deliverableId || item.items.some((part) => part.id === hit.taskId));
    if (folder) setOpenFolder(folder.id); else setDetailDoc(hit);
  }, [location.search, documents, folders]);

  useEffect(() => {
    if (!commentDoc) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [commentDoc]);

  async function loadDocuments() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const library = await queryClient.fetchQuery({
        queryKey: documentLibraryKey(user.id),
        queryFn: ({ signal }) => readClientDocumentLibrary(signal),
        staleTime: 0,
      });
      if (library.brand) {
        setCompanyBrand({
          name: library.brand.display_name || 'sua empresa',
          logoUrl: (await resolveWorkspaceMedia(library.brand.logo_url, 86400)) || '',
        });
      }
      setDocuments(library.documents.map((item) => ({
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
        deliverableId: item.deliverable_id,
        taskId: item.task_id,
      })));
      setFolders(library.folders);
      setAcknowledged(library.acknowledged);
      setDriveConnection(library.drive.connection);
      setSyncByFile(library.drive.jobs);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os documentos.');
    } finally {
      setLoading(false);
    }
  }

  async function openDocument(doc: ClientDoc) {
    setError('');
    try {
      if (doc.storagePath) await openPrivateWorkspaceFile(doc.storagePath);
      else if (doc.driveUrl) window.open(doc.driveUrl, '_blank', 'noopener,noreferrer');
      await recordDocumentView(doc);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível abrir o documento.');
    }
  }

  async function acknowledgeDocument(doc: ClientDoc) {
    if (acknowledged.includes(doc.id)) return;
    try {
      if (!await acknowledgeDocumentVersion(doc)) return;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar a ciência.');
      return;
    }
    setAcknowledged((current) => [...current, doc.id]);
    setNotice(`Ciência registrada em ${doc.title}.`);
  }

  async function openComments(doc: ClientDoc) {
    setCommentDoc(doc);
    setComment('');
    setCommentLoading(true);
    try {
      const next = await readDocumentComments(doc.id);
      setComments(next.map((item) => ({ ...item, createdAt: formatDate(item.createdAt) })));
    } catch (reason) {
      setComments([]);
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os comentários.');
    } finally {
      setCommentLoading(false);
    }
  }

  async function sendComment() {
    if (!commentDoc || !comment.trim()) return;
    try {
      if (!await postDocumentComment(commentDoc, comment)) return;
      setComment('');
      await openComments(commentDoc);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar o comentário.');
    }
  }

  async function connectDrive() {
    if (driveConnecting) return;
    setDriveConnecting(true);
    setError('');
    try {
      const { data, error: invokeError, detail } = await authorizeDriveConnection();
      if (!data?.url) throw new Error(detail || invokeError || 'Não foi possível iniciar a conexão com o Google Drive.');
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar a conexão com o Google Drive.');
      setDriveConnecting(false);
    }
  }

  async function requestDriveCopy(doc: ClientDoc) {
    if (!driveConnection || !doc.storagePath) return;
    const existing = syncByFile[doc.id];
    if (existing?.status === 'synced' && existing.url) {
      window.open(existing.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (existing?.status === 'pending' || existing?.status === 'processing') return;
    setError('');
    setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'processing' } }));
    const { data, error: syncError, detail } = await copyFileToDrive(doc.id);
    if (syncError) {
      setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'error' } }));
      setError(detail || syncError || 'Não foi possível salvar este arquivo no Google Drive.');
      return;
    }
    setSyncByFile((current) => ({ ...current, [doc.id]: { status: 'synced', url: data?.url || null } }));
    setNotice(`${doc.title} foi salvo no seu Google Drive.`);
  }

  // Pasta inteira no Drive: "CALI Workspace / <entregável (protocolo)>" com todos os documentos liberados.
  async function saveFolderToDrive(folderId: string, title: string) {
    if (!driveConnection || folderSaving) return;
    setFolderSaving(folderId); setError('');
    const { data, error: syncError, detail } = await copyFolderToDrive(folderId);
    setFolderSaving('');
    if (syncError) { setError(detail || 'Não foi possível salvar a pasta no seu Google Drive. Tente de novo.'); return; }
    setNotice(data?.failed ? `${title}: ${data.copied} documento(s) salvo(s) no Drive; ${data.failed} não pôde(puderam) ser copiado(s).` : `${title} foi salva no seu Google Drive, na pasta CALI Workspace.`);
    if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
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
  const selectedFolder = folders.find((folder) => folder.id === openFolder);
  const folderEntries = selectedFolder ? [
    ...documents.filter((doc) => !doc.taskId && doc.deliverableId === selectedFolder.id).map((doc) => ({
      key: `d:${doc.id}`, title: doc.title, hint: 'Documento do entregável', docs: [doc],
    })),
    ...selectedFolder.items.map((part) => ({
      key: part.id, title: part.title, hint: 'Parte do entregável', docs: documents.filter((doc) => doc.taskId === part.id),
    })),
  ] : [];
  const overdue = documents.filter((doc) => { const left = daysUntil(doc.validUntil); return left != null && left < 0; });
  const expiring = documents.filter((doc) => { const left = daysUntil(doc.validUntil); return left != null && left >= 0 && left <= 60; });
  return <Shell role="client"><section className="v2-client-module v2-client-docs"><WorkflowPage>
    <WorkflowHeading><div><small>ÁREA DA EMPRESA / ACERVO</small><h1>Documentos</h1><p>Entregáveis com capa, versões, protocolo e acompanhamento.</p></div></WorkflowHeading>
    {notice && <InlineNotice tone="success" role="status"><CheckCircle2 size={18}/>{notice}</InlineNotice>}
    {error && <InlineNotice role="alert">{error}</InlineNotice>}
    <DocumentStorageNotice icon={<Cloud size={23} />}
      title={driveConnection ? 'Drive da sua empresa conectado' : 'Leve suas versões aprovadas para o Drive da sua empresa'}
      description={driveConnection ? `${driveConnection.accountEmail || 'Conta Google conectada'}. Você escolhe quais versões copiar para o Drive da empresa.` : 'Conecte a conta Google da sua empresa para salvar as versões aprovadas.'}
      action={<Button type="button" variant="workflowOutline" disabled={driveConnecting} onClick={() => void connectDrive()}>{driveConnecting ? 'Abrindo Google…' : driveConnection ? 'Trocar conta' : 'Conectar meu Drive'}</Button>}
    />
    {selectedFolder && <ClientDocumentFolder
      title={selectedFolder.title}
      protocol={selectedFolder.protocol}
      entries={folderEntries}
      layout={layout}
      companyBrand={companyBrand}
      acknowledged={acknowledged}
      driveConnected={Boolean(driveConnection)}
      saving={folderSaving === selectedFolder.id}
      onBack={() => setOpenFolder(null)}
      onLayout={setLayout}
      onSave={() => void saveFolderToDrive(selectedFolder.id, selectedFolder.title)}
      onOpen={(doc) => void openDocument(doc)}
      onAcknowledge={(doc) => void acknowledgeDocument(doc)}
    />}
    <div hidden={Boolean(selectedFolder)} className="tw:[&[hidden]]:hidden!">
    <div className="tw:mb-[1.154rem] tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-4 tw:rounded-[0.769rem] tw:border tw:border-solid tw:border-[#eee4dc] tw:bg-white tw:p-[1.154rem] tw:min-[68.8125rem]:flex-nowrap"><strong className="tw:mr-auto tw:text-[0.923rem]/[inherit]">{[shownFolders.length ? `${shownFolders.length} ${shownFolders.length === 1 ? 'pasta' : 'pastas'}` : '', filtered.length || !shownFolders.length ? `${filtered.length} ${filtered.length === 1 ? 'documento' : 'documentos'}` : ''].filter(Boolean).join(' · ')}</strong><label className="tw:flex tw:min-w-[20rem] tw:items-center tw:gap-[0.692rem] tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#e9dcd3] tw:px-[0.923rem] tw:py-[0.769rem] tw:focus-within:border-cali-gold tw:max-[40.6875rem]:min-w-[min(100%,13.846rem)]"><Search size={14}/><input className="tw:w-full tw:min-w-0 tw:border-0 tw:text-[0.846rem]/[inherit] tw:outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, tipo ou protocolo" aria-label="Buscar documentos"/></label><select className="tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#eaded5] tw:bg-white tw:px-[0.923rem] tw:py-[0.769rem] tw:text-[0.846rem]/[inherit] tw:text-[#604c49]" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar documentos por categoria"><option value="all">Todas as categorias</option>{folders.length > 0 && <option value="folder">Pastas</option>}{categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select><DocumentLayoutSwitch label="Exibição do acervo" layout={layout} onChange={setLayout} /></div>
    {filtered.length === 0 && shownFolders.length === 0 && <EmptyState variant="workflow"><strong>Nenhum documento encontrado.</strong><p>{documents.length || folders.length ? 'Ajuste a busca ou o filtro.' : 'Assim que a CALI publicar uma versão final para você, ela aparecerá aqui.'}</p></EmptyState>}
    {(expiring.length > 0 || overdue.length > 0) && <div className={`tw:mb-[1.077rem] tw:flex tw:items-center tw:gap-[0.769rem] tw:rounded-[0.769rem] tw:border tw:border-solid tw:px-[1.231rem] tw:py-[0.923rem] tw:text-[0.846rem]/[1.5] tw:[&>svg]:flex-none
      ${overdue.length ? 'tw:border-[#f3d5db] tw:bg-[#fbecee] tw:text-[#7a4450] tw:[&>svg]:text-[#b05165]' : 'tw:border-[#f2dfb8] tw:bg-[#fff5e0] tw:text-[#6b5330] tw:[&>svg]:text-cali-gold'}`} role="status"><AlertTriangle size={16}/><span>{[overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'documento está com a validade vencida' : 'documentos estão com a validade vencida'}` : '', expiring.length ? `${expiring.length} ${expiring.length === 1 ? 'documento tem' : 'documentos têm'} validade ou revisão prevista nos próximos 60 dias` : ''].filter(Boolean).join(' · ')}.</span></div>}
    {layout === 'list' && (filtered.length > 0 || shownFolders.length > 0) && (
      <ClientDocumentList rows={[
        ...shownFolders.map((folder) => {
          const own = documents.filter((doc) => !doc.taskId && doc.deliverableId === folder.id).length;
          const done = own + folder.items.filter((part) => documents.some((doc) => doc.taskId === part.id)).length;
          return {
            id: `f:${folder.id}`, title: folder.title, category: 'Pasta de entregável', reference: folder.protocol || '—',
            status: `${done} de ${own + folder.items.length} entregues`, tone: 'amber', kind: 'folder' as const, onOpen: () => setOpenFolder(folder.id),
          };
        }),
        ...filtered.map((doc) => {
          const state = docState(doc);
          return {
            id: doc.id, title: doc.title, category: categoryLabel(doc.category), reference: doc.date,
            status: state.label, tone: state.tone, kind: doc.category === 'deliverable' ? 'delivery' as const : doc.category === 'report' ? 'report' as const : 'work' as const,
            onOpen: () => setDetailDoc(doc),
          };
        }),
      ]} />
    )}
    {layout === 'covers' && <section className="tw:mt-[1.231rem] tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,20.769rem),1fr))] tw:gap-[1.231rem]">
      {shownFolders.map((folder) => { const own = documents.filter((doc) => !doc.taskId && doc.deliverableId === folder.id).length; const total = folder.items.length + own; const done = folder.items.filter((item) => documents.some((doc) => doc.taskId === item.id)).length + own; return <article className="tw:overflow-hidden tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#e6d9cf] tw:bg-white" key={`f:${folder.id}`}>
        <DocumentCardArt folder tone="delivery" logo={companyBrand.logoUrl} name={companyBrand.name} label={`Abrir a pasta ${folder.title}`} onOpen={() => setOpenFolder(folder.id)} fallback={<b>CALI</b>}>
          <span className="v2-folder-mark tw:pointer-events-none tw:absolute tw:top-[0.769rem] tw:left-[0.769rem] tw:grid tw:size-[2.615rem] tw:place-items-center tw:rounded-[0.692rem] tw:bg-white tw:text-cali-brand tw:shadow-[0_1px_4px_#2817241a]" aria-hidden="true"><FolderOpen size={18} /></span>
          <DocumentCardTags><DocumentCardTag tone="delivery">Pasta</DocumentCardTag></DocumentCardTags>
        </DocumentCardArt>
        <DocumentCardContent title={folder.title}>
          <p className="tw:m-0! tw:text-[0.769rem]/[inherit] tw:text-[#857870]">{folder.protocol || 'Entregável'}</p>
          <DocumentFolderProgress percentage={total ? Math.round((done / total) * 100) : 0} className="tw:mt-[0.923rem] tw:mb-[0.462rem]" />
          <small className="tw:block tw:text-[.885rem] tw:text-[#7d726b]">{done} de {total} {total === 1 ? 'entregue' : 'entregues'}</small>
          <DocumentFolderAction onClick={() => setOpenFolder(folder.id)} />
        </DocumentCardContent>
      </article>; })}
      {filtered.map((doc) => {
        const isAcknowledged = acknowledged.includes(doc.id);
        const syncState = syncByFile[doc.id];
        const syncLocked = syncState?.status === 'pending' || syncState?.status === 'processing';
        const tone = doc.category === 'deliverable' ? 'delivery' : doc.category === 'report' ? 'report' : 'work';
        const left = daysUntil(doc.validUntil);
        const review: { date: string; note: string; tone: 'muted' | 'late' | 'soon' | '' } = !doc.validUntil ? { date: 'Não definida', note: '', tone: 'muted' } : { date: formatDate(doc.validUntil), note: left == null ? '' : left < 0 ? `vencida há ${-left} ${-left === 1 ? 'dia' : 'dias'}` : left === 0 ? 'vence hoje' : `faltam ${left} ${left === 1 ? 'dia' : 'dias'}`, tone: left != null && left < 0 ? 'late' : left != null && left <= 60 ? 'soon' : '' };
        const kindLabel = doc.kind.trim().toLowerCase() === categoryLabel(doc.category).trim().toLowerCase() ? '' : doc.kind;
        return <article className="tw:overflow-hidden tw:rounded-[1rem] tw:border tw:border-solid tw:border-[#e6d9cf] tw:bg-white" key={doc.id}>
          <DocumentCardArt tone={doc.category === 'deliverable' ? 'delivery' : doc.category === 'report' ? 'report' : 'work'} cover={doc.coverUrl} logo={companyBrand.logoUrl} name={companyBrand.name} label={`Ver informações de ${doc.title}`} onOpen={() => setDetailDoc(doc)} fallback={<><FileText size={30} /><b>CALI</b></>}>
            <DocumentCardTags><DocumentCardTag tone={tone}>{categoryLabel(doc.category)}</DocumentCardTag>{isAcknowledged && <StatusBadge variant="workflow" tone="green">Ciente</StatusBadge>}</DocumentCardTags>
          </DocumentCardArt>
          <DocumentCardContent title={doc.title}>
            {doc.description && <p className="tw:m-0! tw:text-[0.769rem]/[inherit] tw:text-[#857870]">{doc.description}</p>}
            <DocumentCardFacts>
              <DocumentCardFact label="Versão">{String(doc.version).replace(/^v/i, '')}</DocumentCardFact>
              <DocumentCardFact label={kindLabel ? 'Tipo' : 'Categoria'}>{kindLabel || categoryLabel(doc.category)}</DocumentCardFact>
              <DocumentCardFact label="Publicado em">{doc.date}</DocumentCardFact>
              <DocumentCardFact label="Validade / revisão" note={review.note} tone={review.tone}>{review.date}</DocumentCardFact>
            </DocumentCardFacts>
            <DocumentCardProtocol value={doc.protocol} />
            <DocumentCardActions><button type="button" onClick={() => void openDocument(doc)}><Eye size={14}/> Abrir</button><button type="button" onClick={() => void openComments(doc)}><MessageSquare size={14}/> Comentar</button>
              {doc.requiresAcknowledgement && <button type="button" disabled={isAcknowledged} onClick={() => void acknowledgeDocument(doc)}>{isAcknowledged ? <><CheckCircle2 size={14}/>Ciente</> : <><FileCheck2 size={14}/>Registrar ciência</>}</button>}
              {driveConnection && doc.storagePath && <button type="button" disabled={Boolean(syncLocked)} onClick={() => void requestDriveCopy(doc)}>{syncState?.status === 'synced' ? <ExternalLink size={14}/> : <Cloud size={14}/>} {driveActionLabel(syncState)}</button>}
            </DocumentCardActions>
          </DocumentCardContent>
        </article>;
      })}
    </section>}
    </div>
    {detailDoc && (() => {
      const doc = detailDoc;
      const left = daysUntil(doc.validUntil);
      const isAcknowledged = acknowledged.includes(doc.id);
      const deadline = left == null ? '—' : left < 0 ? `Vencida há ${Math.abs(left)} ${Math.abs(left) === 1 ? 'dia' : 'dias'}` : left === 0 ? 'Vence hoje' : `${left} ${left === 1 ? 'dia restante' : 'dias restantes'}`;
      const facts = [
        { label: 'Tipo', value: [categoryLabel(doc.category), doc.kind].filter(Boolean).join(' · ') },
        { label: 'Versão', value: doc.version || '—' },
        { label: 'Publicado em', value: doc.date },
        { label: 'Validade / próxima revisão', value: doc.validUntil ? formatDate(doc.validUntil) : 'Não definida' },
        { label: 'Prazo', value: deadline },
        { label: 'Elaborado por', value: 'CALI · Assessoria' },
      ];
      if (doc.requiresAcknowledgement) facts.push({ label: 'Ciência', value: isAcknowledged ? 'Registrada' : 'Pendente' });

      return <ClientDocumentDetails
        doc={doc}
        state={docState(doc)}
        facts={facts}
        acknowledged={isAcknowledged}
        onClose={() => setDetailDoc(null)}
        onComment={() => { setDetailDoc(null); void openComments(doc); }}
        onAcknowledge={() => void acknowledgeDocument(doc)}
        onOpen={() => void openDocument(doc)}
      />;
    })()}
    {commentDoc && <ClientDocumentComments
      title={commentDoc.title}
      protocol={commentDoc.protocol}
      comments={comments}
      draft={comment}
      loading={commentLoading}
      onDraft={setComment}
      onSend={() => void sendComment()}
      onClose={() => setCommentDoc(null)}
    />}
  </WorkflowPage></section></Shell>;
}
