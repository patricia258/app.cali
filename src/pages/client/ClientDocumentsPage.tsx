import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, Download, Eye, FileCheck2, FileText, Loader2, MessageSquare, Search, Send, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type ClientDoc = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  kind: string;
  date: string;
  version: string;
  protocol: string;
  storagePath?: string;
  driveUrl?: string;
  coverUrl?: string;
  requiresAcknowledgement: boolean;
};

type CommentRow = { id: string; body: string; createdAt: string; mine: boolean };

const previewDocuments: ClientDoc[] = [
  { id: 'd1', companyId: 'preview-aurora', title: 'Estrutura de indicadores de People', category: 'Entregável', kind: 'Matriz', date: '28 ago 2026', version: 'v1.0', protocol: 'CALI-DOC-2026-000041', requiresAcknowledgement: true },
  { id: 'd2', companyId: 'preview-aurora', title: 'Relatório Executivo · Julho', category: 'Relatório', kind: 'Relatório', date: '01 ago 2026', version: 'final', protocol: 'CALI-DOC-2026-000032', requiresAcknowledgement: false },
  { id: 'd3', companyId: 'preview-aurora', title: 'Cronograma aprovado · Ciclo 01', category: 'Cronograma', kind: 'Plano', date: '19 ago 2026', version: 'vigente', protocol: 'CALI-DOC-2026-000035', requiresAcknowledgement: true },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

export function ClientDocumentsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'client';
  const [documents, setDocuments] = useState<ClientDoc[]>(preview ? previewDocuments : []);
  const [query, setQuery] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState<string[]>(preview ? ['d1'] : []);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [commentDoc, setCommentDoc] = useState<ClientDoc | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const filtered = useMemo(() => documents.filter((doc) => `${doc.title} ${doc.category} ${doc.kind} ${doc.protocol}`.toLowerCase().includes(query.toLowerCase())), [documents, query]);

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
    const [filesResult, ackResult] = await Promise.all([
      supabase.from('files').select('id, company_id, title, category, document_kind, version_label, protocol, storage_path, drive_url, cover_storage_path, requires_acknowledgement, updated_at, status, client_visible').eq('client_visible', true).neq('status', 'draft').order('updated_at', { ascending: false }),
      supabase.from('document_acknowledgements').select('file_id, acknowledged_at'),
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
      category: item.category || 'Outro',
      kind: item.document_kind || 'Outro',
      date: formatDate(item.updated_at),
      version: item.version_label || 'final',
      protocol: item.protocol || '—',
      storagePath: item.storage_path || undefined,
      driveUrl: item.drive_url || undefined,
      coverUrl: await resolveCover(item.cover_storage_path),
      requiresAcknowledgement: Boolean(item.requires_acknowledgement),
    })));
    setDocuments(rows);
    setAcknowledged((ackResult.data ?? []).filter((item) => item.acknowledged_at).map((item) => item.file_id));
    setLoading(false);
  }

  async function markViewed(doc: ClientDoc) {
    if (preview || !supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;
    const { data: existing } = await supabase.from('document_acknowledgements').select('id, viewed_at').eq('file_id', doc.id).eq('user_id', userId).maybeSingle();
    if (existing?.id) {
      if (!existing.viewed_at) await supabase.from('document_acknowledgements').update({ viewed_at: new Date().toISOString(), status: 'viewed' }).eq('id', existing.id);
    } else {
      await supabase.from('document_acknowledgements').insert({ company_id: doc.companyId, file_id: doc.id, user_id: userId, status: 'viewed', viewed_at: new Date().toISOString() });
    }
  }

  async function openDocument(doc: ClientDoc) {
    await markViewed(doc);
    if (preview || !supabase) return;
    if (doc.storagePath) {
      const { data, error: signedError } = await supabase.storage.from('cali-workspace-private').createSignedUrl(doc.storagePath, 120);
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
    const { data, error: commentsError } = await supabase.from('comments').select('id, body, created_at, author_user_id').eq('target_type', 'file').eq('target_id', doc.id).order('created_at');
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

  function saveToDrive(id: string) {
    if (!driveConnected) { setDriveConnected(true); return; }
    setSaved((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <Shell role="client">
      <section className="page client-documents-v2">
        <div className="eyebrow">BIBLIOTECA DO PROJETO</div>
        <div className="page-heading"><div><h1>Documentos</h1><p>Arquivos compartilhados pela CALI permanecem organizados pelo mesmo protocolo, com versão, contexto, comentários e registro de ciência quando necessário.</p></div></div>

        {error && <div className="inline-notice">{error}</div>}
        <section className="drive-banner"><div className="drive-icon"><Cloud size={23} /></div><div><strong>{driveConnected ? 'Google Drive conectado' : 'Quer guardar uma cópia no Drive da empresa?'}</strong><p>{driveConnected ? 'Quando você solicitar, o Workspace salva uma cópia no Drive conectado sem retirar o arquivo daqui.' : 'Conecte uma vez e use “Salvar no Drive” nos documentos e relatórios que quiser arquivar na sua própria conta.'}</p></div><button className="secondary" onClick={() => setDriveConnected((value) => !value)}>{driveConnected ? 'Gerenciar conexão' : 'Conectar Google Drive'}</button></section>

        <label className="search-box client-doc-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, tipo ou protocolo" /></label>

        {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando biblioteca…</div>}
        <section className="document-cards document-cards-v2">
          {filtered.map((doc) => {
            const isAcknowledged = acknowledged.includes(doc.id);
            return (
              <article className="document-card document-card-v2" key={doc.id}>
                <div className="document-card-cover">{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : <div><FileText size={31} /><span>{doc.kind}</span></div>}</div>
                <div className="document-card-body">
                  <div className="document-card-tags"><span>{doc.category}</span><span>{doc.kind}</span>{isAcknowledged && <span className="ack-tag"><CheckCircle2 size={13} />Ciência registrada</span>}</div>
                  <h2>{doc.title}</h2>
                  <p>{doc.date} · {doc.version}</p>
                  <small className="document-protocol">{doc.protocol}</small>
                  <div className="document-card-actions document-card-actions-v2">
                    <button className="secondary" onClick={() => void openDocument(doc)}><Eye size={17} />Abrir</button>
                    <button className="secondary" onClick={() => void openComments(doc)}><MessageSquare size={17} />Comentar</button>
                    {doc.requiresAcknowledgement && <button className={`secondary ${isAcknowledged ? 'acknowledged' : ''}`} disabled={isAcknowledged} onClick={() => void acknowledgeDocument(doc)}>{isAcknowledged ? <><CheckCircle2 size={17} />Ciente</> : <><FileCheck2 size={17} />Registrar ciência</>}</button>}
                    <button className="secondary" onClick={() => saveToDrive(doc.id)}>{saved.includes(doc.id) ? <><CheckCircle2 size={17} />Salvo no Drive</> : <><Cloud size={17} />Salvar no Drive</>}</button>
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
