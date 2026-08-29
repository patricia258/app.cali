import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  FileCheck2,
  FileText,
  MessageSquare,
  Search,
  Send,
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

type DetailTab = 'document' | 'comments';
type DriveConnection = { id: string; status: string } | null;

const clientPreviewDocuments = previewDocuments.filter((document) => document.companyId === 'aurora' && document.clientVisible && document.status === 'published');

export function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(clientPreviewDocuments);
  const [companyName, setCompanyName] = useState('Grupo Aurora');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DocumentCategory>('all');
  const [selectedDoc, setSelectedDoc] = useState<WorkspaceDocument | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('document');
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set(['doc-preview-001']));
  const [commentsByDoc, setCommentsByDoc] = useState<Record<string, DocumentComment[]>>(previewDocumentComments);
  const [newComment, setNewComment] = useState('');
  const [driveConnection, setDriveConnection] = useState<DriveConnection>(null);
  const [driveJobs, setDriveJobs] = useState<Set<string>>(() => new Set());
  const [driveMessage, setDriveMessage] = useState('');

  useEffect(() => {
    void loadClientDocuments();
  }, []);

  useEffect(() => {
    const active = Boolean(selectedDoc);
    document.body.classList.toggle('workspace-modal-open', active);
    return () => document.body.classList.remove('workspace-modal-open');
  }, [selectedDoc]);

  useEffect(() => {
    if (!selectedDoc) return;
    setDetailTab('document');
    setNewComment('');
    void loadComments(selectedDoc);
  }, [selectedDoc?.id]);

  async function loadClientDocuments() {
    if (!supabase) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: fileRows, error } = await supabase
        .from('files')
        .select('*')
        .eq('client_visible', true)
        .eq('status', 'published')
        .order('updated_at', { ascending: false });
      if (error || !fileRows?.length) return;

      const companyId = fileRows[0].company_id;
      const [{ data: company }, { data: ackRows }, { data: driveRows }] = await Promise.all([
        supabase.from('companies').select('display_name, logo_url').eq('id', companyId).maybeSingle(),
        supabase.from('document_acknowledgements').select('file_id, status').eq('user_id', user.id),
        supabase.from('drive_connections').select('id, status').eq('company_id', companyId).eq('owner_type', 'client').eq('status', 'connected').limit(1),
      ]);

      const displayName = company?.display_name || 'Sua empresa';
      setCompanyName(displayName);
      setDriveConnection(driveRows?.[0] ? { id: driveRows[0].id, status: driveRows[0].status } : null);
      setAcknowledged(new Set((ackRows || []).filter((row: any) => row.status === 'acknowledged').map((row: any) => row.file_id)));
      setDocuments(fileRows.map((row: any) => ({
        id: row.id,
        title: row.title,
        companyId: row.company_id,
        company: displayName,
        companyLogo: company?.logo_url,
        category: normalizeDocumentCategory(row.category),
        version: row.version_label || 'v1.0',
        updated: formatDocumentDate(row.updated_at),
        createdAt: row.created_at,
        source: (row.source_type || (row.drive_url ? 'google_drive' : 'workspace')) as DocumentSource,
        status: 'published',
        clientVisible: true,
        requiresAcknowledgement: Boolean(row.requires_acknowledgement),
        acknowledgements: 0,
        views: 0,
        comments: 0,
        fileType: row.file_type ? String(row.file_type).split('/').pop()?.toUpperCase() || 'ARQUIVO' : 'ARQUIVO',
        sizeLabel: formatFileSize(row.file_size_bytes),
        storagePath: row.storage_path,
        driveUrl: row.drive_url,
        revisionOfId: row.revision_of_id,
        isPreview: false,
      })));
    } catch (error) {
      console.error('Falha ao carregar biblioteca do cliente', error);
    }
  }

  async function loadComments(document: WorkspaceDocument) {
    if (!supabase || document.isPreview) return;
    const { data, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author_user_id')
      .eq('target_type', 'file')
      .eq('target_id', document.id)
      .eq('client_visible', true)
      .order('created_at', { ascending: true });
    if (error) return;
    setCommentsByDoc((current) => ({
      ...current,
      [document.id]: (data || []).map((row: any) => ({
        id: row.id,
        author: row.author_user_id ? 'CALI / Cliente' : 'CALI',
        body: row.body,
        createdAt: formatDocumentDate(row.created_at),
      })),
    }));
  }

  const categories = useMemo(() => Array.from(new Set(documents.map((document) => document.category))), [documents]);
  const filtered = useMemo(() => documents.filter((document) => {
    if (category !== 'all' && document.category !== category) return false;
    if (query && !`${document.title} ${documentCategoryMeta[document.category].label} ${document.version}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [documents, category, query]);

  const pendingAcknowledgements = documents.filter((document) => document.requiresAcknowledgement && !acknowledged.has(document.id)).length;

  async function openDocument(document: WorkspaceDocument) {
    if (document.driveUrl) {
      window.open(document.driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!supabase || !document.storagePath) return;
    const { data, error } = await supabase.storage.from('cali-workspace-private').createSignedUrl(document.storagePath, 60);
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function acknowledgeDocument(document: WorkspaceDocument) {
    if (acknowledged.has(document.id)) return;
    setAcknowledged((current) => new Set(current).add(document.id));
    if (!supabase || document.isPreview) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from('document_acknowledgements').upsert({
      company_id: document.companyId,
      file_id: document.id,
      user_id: userData.user.id,
      status: 'acknowledged',
      viewed_at: new Date().toISOString(),
      acknowledged_at: new Date().toISOString(),
    }, { onConflict: 'file_id,user_id' });
  }

  async function sendComment() {
    if (!selectedDoc || !newComment.trim()) return;
    const body = newComment.trim();
    const localComment: DocumentComment = { id: `comment-${Date.now()}`, author: 'Você', body, createdAt: 'agora', mine: true };
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

  async function requestDriveCopy(document: WorkspaceDocument) {
    setDriveMessage('');
    if (document.source === 'google_drive') {
      setDriveMessage('Este documento já tem origem no Google Drive.');
      return;
    }
    if (!driveConnection) {
      setDriveMessage('A conexão com o Google Workspace ainda precisa ser ativada para esta empresa.');
      return;
    }
    if (!supabase || document.isPreview) {
      setDriveMessage('O fluxo está preparado; a sincronização real será ativada junto ao Google Workspace.');
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from('file_sync_jobs').insert({
      file_id: document.id,
      company_id: document.companyId,
      connection_id: driveConnection.id,
      status: 'pending',
      requested_by: userData.user.id,
    });
    if (!error) {
      setDriveJobs((current) => new Set(current).add(document.id));
      setDriveMessage('Cópia solicitada. O Workspace registrou o pedido de sincronização com o Drive.');
    }
  }

  const selectedComments = selectedDoc ? commentsByDoc[selectedDoc.id] || [] : [];

  return (
    <Shell role="client">
      <section className="page documents-page client-documents-page">
        <div className="eyebrow">BIBLIOTECA DO TRABALHO</div>
        <div className="page-heading documents-heading">
          <div><h1>Documentos</h1><p>Versões finais, referências e arquivos compartilhados pela CALI ficam reunidos aqui para consulta e histórico.</p></div>
        </div>

        <section className="client-document-summary">
          <article><span>Disponíveis</span><strong>{documents.length}</strong></article>
          <article><span>Atualizados no ciclo</span><strong>{documents.filter((document) => document.updated.includes('ago')).length}</strong></article>
          <article className={pendingAcknowledgements ? 'attention' : ''}><span>Aguardando sua ciência</span><strong>{pendingAcknowledgements}</strong></article>
        </section>

        <section className="client-drive-strip">
          <div className="client-drive-icon"><Cloud size={21} /></div>
          <div><strong>{driveConnection ? 'Google Drive conectado' : 'Google Drive da empresa'}</strong><p>{driveConnection ? 'Você pode solicitar uma cópia de arquivos do Workspace sem perder o histórico daqui.' : 'A biblioteca já está preparada para salvar cópias no Drive quando a conexão do Google Workspace for ativada.'}</p></div>
          <span className={`client-drive-status ${driveConnection ? 'connected' : ''}`}>{driveConnection ? 'Conectado' : 'Aguardando conexão'}</span>
        </section>

        <section className="client-document-controls">
          <label className="search-box document-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca" /></label>
          <div className="client-category-tabs">
            <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>Todos <span>{documents.length}</span></button>
            {categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{documentCategoryMeta[item].label} <span>{documents.filter((document) => document.category === item).length}</span></button>)}
          </div>
        </section>

        <section className="document-library-grid client-document-grid">
          {filtered.map((document) => {
            const hasAcknowledged = acknowledged.has(document.id);
            return (
              <article className="cali-document-card client-document-card" key={document.id} onClick={() => setSelectedDoc(document)}>
                <DocumentCover document={document} />
                <div className="cali-document-card-body">
                  <div className="document-card-badges"><span className={`doc-category-chip category-${document.category}`}>{documentCategoryMeta[document.category].label}</span>{document.requiresAcknowledgement && <span className={`doc-ack-chip ${hasAcknowledged ? 'done' : 'pending'}`}>{hasAcknowledged ? <><Check size={13} />Ciência registrada</> : 'Aguardando sua ciência'}</span>}</div>
                  <h2>{document.title}</h2>
                  <p className="document-meta-line">{document.version} · {document.updated} · {document.fileType}</p>
                  <div className="client-document-card-actions" onClick={(event) => event.stopPropagation()}>
                    <button className="secondary" onClick={() => setSelectedDoc(document)}><Eye size={16} />Visualizar</button>
                    <button className="secondary" onClick={() => void openDocument(document)}><Download size={16} />Abrir</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {!filtered.length && <div className="panel document-empty"><FileText size={30} /><strong>Nenhum documento encontrado</strong><span>Tente outro termo ou categoria.</span></div>}
      </section>

      {selectedDoc && (
        <div className="modal-backdrop full-screen-modal document-modal-backdrop">
          <section className="modal-card client-document-detail-modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setSelectedDoc(null)} aria-label="Fechar"><X size={20} /></button>
            <div className="client-document-detail-grid">
              <DocumentCover document={selectedDoc} />
              <div className="client-document-detail-main">
                <span className="section-kicker">{documentCategoryMeta[selectedDoc.category].label}</span>
                <h2>{selectedDoc.title}</h2>
                <p>{companyName} · {selectedDoc.version} · atualizado em {selectedDoc.updated}</p>
                <div className="client-document-detail-actions"><button className="primary" onClick={() => void openDocument(selectedDoc)}><Eye size={16} />Abrir documento</button><button className="secondary" onClick={() => void requestDriveCopy(selectedDoc)}>{driveJobs.has(selectedDoc.id) ? <><CheckCircle2 size={16} />Solicitado</> : <><Cloud size={16} />Salvar no Drive</>}</button></div>
                {driveMessage && <div className="client-drive-message">{driveMessage}</div>}
              </div>
            </div>

            <nav className="document-detail-tabs client-document-tabs"><button className={detailTab === 'document' ? 'active' : ''} onClick={() => setDetailTab('document')}>Documento</button><button className={detailTab === 'comments' ? 'active' : ''} onClick={() => setDetailTab('comments')}>Comentários <span>{selectedComments.length}</span></button></nav>

            <div className="document-detail-body client-document-detail-body">
              {detailTab === 'document' && <>
                <div className="client-document-info-grid"><article><span>Versão</span><strong>{selectedDoc.version}</strong></article><article><span>Formato</span><strong>{selectedDoc.fileType} · {selectedDoc.sizeLabel}</strong></article><article><span>Origem</span><strong>{selectedDoc.source === 'google_drive' ? 'Google Drive' : 'CALI Workspace'}</strong></article><article><span>Contexto</span><strong>{selectedDoc.project || 'Biblioteca da empresa'}</strong></article></div>
                {selectedDoc.requiresAcknowledgement && <section className={`client-document-acknowledgement ${acknowledged.has(selectedDoc.id) ? 'done' : ''}`}><div className="client-ack-icon"><FileCheck2 size={25} /></div><div><strong>{acknowledged.has(selectedDoc.id) ? 'Ciência registrada' : 'Este documento solicita sua ciência'}</strong><p>{acknowledged.has(selectedDoc.id) ? 'Sua confirmação ficou vinculada a esta versão do documento.' : 'Confirme a leitura quando terminar de revisar. O registro guarda usuário, versão, data e horário.'}</p></div><button className={acknowledged.has(selectedDoc.id) ? 'secondary' : 'primary'} disabled={acknowledged.has(selectedDoc.id)} onClick={() => void acknowledgeDocument(selectedDoc)}>{acknowledged.has(selectedDoc.id) ? <><Check size={16} />Confirmado</> : 'Li e estou ciente'}</button></section>}
              </>}

              {detailTab === 'comments' && <div className="document-comments"><div className="document-comment-list">{selectedComments.length ? selectedComments.map((comment) => <article key={comment.id} className={comment.mine ? 'mine' : ''}><div><strong>{comment.author}</strong><span>{comment.createdAt}</span></div><p>{comment.body}</p></article>) : <div className="document-no-comments">Nenhum comentário neste documento.</div>}</div><div className="document-comment-compose"><textarea value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="Escreva uma dúvida ou comentário sobre este documento" rows={2} /><button className="primary" disabled={!newComment.trim()} onClick={() => void sendComment()}><Send size={16} />Enviar</button></div></div>}
            </div>
          </section>
        </div>
      )}
    </Shell>
  );
}
