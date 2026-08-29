import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, FileText, FolderOpen, ImagePlus, Loader2, Plus, Search, Upload, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';
import { supabase } from '../../lib/supabase';

type CompanyOption = { id: string; name: string };
type DocumentRow = {
  id: string;
  title: string;
  companyId: string;
  company: string;
  category: string;
  kind: string;
  version: string;
  updated: string;
  source: 'Workspace' | 'Google Drive';
  published: boolean;
  protocol: string;
  coverUrl?: string;
  fileType?: string;
  requiresAcknowledgement?: boolean;
};

const previewCompanies: CompanyOption[] = [
  { id: 'preview-aurora', name: 'Grupo Aurora' },
  { id: 'preview-novatech', name: 'Novatech' },
  { id: 'preview-studio', name: 'Studio Norte' },
];

const initialDocs: DocumentRow[] = [
  { id: 'd1', title: 'Estrutura de indicadores de People', companyId: 'preview-aurora', company: 'Grupo Aurora', category: 'Entregável', kind: 'Matriz', version: 'v1.0', updated: '28 ago 2026', source: 'Workspace', published: true, protocol: 'CALI-DOC-2026-000041', requiresAcknowledgement: true },
  { id: 'd2', title: 'Matriz de responsabilidades do RH', companyId: 'preview-aurora', company: 'Grupo Aurora', category: 'Entregável', kind: 'Matriz', version: 'rascunho', updated: '27 ago 2026', source: 'Workspace', published: false, protocol: 'CALI-DOC-2026-000040' },
  { id: 'd3', title: 'Relatório Executivo · Julho', companyId: 'preview-aurora', company: 'Grupo Aurora', category: 'Relatório', kind: 'Relatório', version: 'final', updated: '01 ago 2026', source: 'Google Drive', published: true, protocol: 'CALI-DOC-2026-000032' },
  { id: 'd4', title: 'Plano de governança de People', companyId: 'preview-studio', company: 'Studio Norte', category: 'Entregável', kind: 'Plano', version: 'final', updated: '24 ago 2026', source: 'Workspace', published: true, protocol: 'CALI-DOC-2026-000039', requiresAcknowledgement: true },
];

const categories = ['Entregável', 'Relatório', 'Referência', 'Contrato', 'Cronograma', 'Outro'];
const documentKinds = ['Política', 'Fluxo', 'Protocolo', 'Manual', 'Guia', 'Relatório', 'Plano', 'Matriz', 'Apresentação', 'Contrato', 'Outro'];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120);
}

export function AdminDocumentsPage() {
  const preview = sessionStorage.getItem('cali-preview-role') === 'admin';
  const [docs, setDocs] = useState<DocumentRow[]>(preview ? initialDocs : []);
  const [companies, setCompanies] = useState<CompanyOption[]>(preview ? previewCompanies : []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(!preview);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState('');

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState(previewCompanies[0].id);
  const [category, setCategory] = useState('Entregável');
  const [kind, setKind] = useState('Política');
  const [version, setVersion] = useState('v1.0');
  const [description, setDescription] = useState('');
  const [publish, setPublish] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  const filtered = useMemo(
    () => docs.filter((doc) => `${doc.title} ${doc.company} ${doc.category} ${doc.kind} ${doc.protocol}`.toLowerCase().includes(search.toLowerCase())),
    [docs, search],
  );

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('workspace-modal-open');
    return () => document.body.classList.remove('workspace-modal-open');
  }, [open]);

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
    const [companyResult, fileResult] = await Promise.all([
      supabase.from('companies').select('id, display_name').order('display_name'),
      supabase.from('files').select('id, company_id, title, category, version_label, updated_at, drive_url, client_visible, source_type, protocol, document_kind, cover_storage_path, file_type, requires_acknowledgement, status').order('updated_at', { ascending: false }),
    ]);

    if (companyResult.error || fileResult.error) {
      setError(companyResult.error?.message || fileResult.error?.message || 'Não foi possível carregar a biblioteca.');
      setLoading(false);
      return;
    }

    const companyOptions = (companyResult.data ?? []).map((item) => ({ id: item.id, name: item.display_name }));
    setCompanies(companyOptions);
    if (companyOptions.length && !companyOptions.some((item) => item.id === companyId)) setCompanyId(companyOptions[0].id);
    const nameById = new Map(companyOptions.map((item) => [item.id, item.name]));

    const rows = await Promise.all((fileResult.data ?? []).map(async (item) => ({
      id: item.id,
      title: item.title,
      companyId: item.company_id,
      company: nameById.get(item.company_id) || 'Cliente',
      category: item.category || 'Outro',
      kind: item.document_kind || 'Outro',
      version: item.version_label || (item.status === 'draft' ? 'rascunho' : 'final'),
      updated: formatDate(item.updated_at),
      source: item.drive_url || item.source_type === 'google_drive' ? 'Google Drive' as const : 'Workspace' as const,
      published: Boolean(item.client_visible) && item.status !== 'draft',
      protocol: item.protocol || '—',
      coverUrl: await resolveCover(item.cover_storage_path),
      fileType: item.file_type || undefined,
      requiresAcknowledgement: Boolean(item.requires_acknowledgement),
    })));
    setDocs(rows);
    setLoading(false);
  }

  function resetForm() {
    setTitle('');
    setCompanyId(companies[0]?.id || previewCompanies[0].id);
    setCategory('Entregável');
    setKind('Política');
    setVersion('v1.0');
    setDescription('');
    setPublish(false);
    setRequiresAcknowledgement(false);
    setFile(null);
    setCover(null);
    setCoverPreview('');
  }

  function openNewDocument() {
    resetForm();
    setError('');
    setCreated('');
    setOpen(true);
  }

  function selectCover(next: File | null) {
    setCover(next);
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPreview(next ? URL.createObjectURL(next) : '');
  }

  async function saveDocument() {
    if (!title.trim() || !companyId || !file) return;
    setSaving(true);
    setError('');

    const companyName = companies.find((item) => item.id === companyId)?.name || 'Cliente';
    if (preview || !supabase) {
      const protocol = `CALI-DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const localCover = cover ? URL.createObjectURL(cover) : '';
      const next: DocumentRow = {
        id: `d-${Date.now()}`,
        title: title.trim(),
        companyId,
        company: companyName,
        category,
        kind,
        version: version.trim() || (publish ? 'final' : 'rascunho'),
        updated: 'agora',
        source: 'Workspace',
        published: publish,
        protocol,
        coverUrl: localCover,
        fileType: file.type || file.name.split('.').pop()?.toUpperCase(),
        requiresAcknowledgement,
      };
      setDocs((current) => [next, ...current]);
      setCreated(`${next.title} criado com o protocolo ${protocol}.`);
      setOpen(false);
      resetForm();
      setSaving(false);
      return;
    }

    let uploadedFilePath = '';
    let uploadedCoverPath = '';
    try {
      const { data: protocolValue, error: protocolError } = await supabase.rpc('generate_protocol', { p_entity_type: 'DOC' });
      if (protocolError) throw protocolError;
      const protocol = String(protocolValue);
      const filePath = `documents/${companyId}/${protocol}/file-${Date.now()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('cali-workspace-private').upload(filePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      uploadedFilePath = filePath;

      if (cover) {
        const coverPath = `documents/${companyId}/${protocol}/cover-${Date.now()}-${safeFileName(cover.name)}`;
        const { error: coverError } = await supabase.storage.from('cali-workspace-private').upload(coverPath, cover, { upsert: false, contentType: cover.type || undefined });
        if (coverError) throw coverError;
        uploadedCoverPath = coverPath;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from('files').insert({
        company_id: companyId,
        title: title.trim(),
        category,
        document_kind: kind,
        description: description.trim() || null,
        storage_path: filePath,
        cover_storage_path: uploadedCoverPath || null,
        version_label: version.trim() || (publish ? 'final' : 'rascunho'),
        is_final: publish,
        client_visible: publish,
        uploaded_by: sessionData.session?.user.id ?? null,
        file_type: file.type || file.name.split('.').pop()?.toLowerCase() || null,
        file_size_bytes: file.size,
        original_filename: file.name,
        status: publish ? 'published' : 'draft',
        requires_acknowledgement: requiresAcknowledgement,
        published_at: publish ? now : null,
        source_type: 'workspace',
        protocol,
      });
      if (insertError) throw insertError;

      await supabase.from('activity_log').insert({
        company_id: companyId,
        event_type: publish ? 'document_published' : 'document_created',
        entity_type: 'file',
        metadata: { protocol, title: title.trim(), category, document_kind: kind },
      });

      setCreated(`${title.trim()} criado com o protocolo ${protocol}.`);
      setOpen(false);
      resetForm();
      await loadDocuments();
    } catch (requestError) {
      if (uploadedCoverPath) await supabase.storage.from('cali-workspace-private').remove([uploadedCoverPath]);
      if (uploadedFilePath) await supabase.storage.from('cali-workspace-private').remove([uploadedFilePath]);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o documento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell role="admin">
      <section className="page documents-admin-page">
        <div className="eyebrow">ARQUIVOS DO TRABALHO</div>
        <div className="page-heading">
          <div><h1>Documentos</h1><p>Biblioteca formal da relação com cada cliente: versões finais, políticas, fluxos, protocolos, relatórios e arquivos de apoio em um único histórico.</p></div>
          <button className="primary" onClick={openNewDocument}><Plus size={18} />Adicionar documento</button>
        </div>

        {created && <div className="inline-notice success"><CheckCircle2 size={19} />{created}</div>}
        {error && !open && <div className="inline-notice">{error}</div>}

        <div className="document-toolbar"><label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento, cliente, tipo ou protocolo" /></label><button className="secondary"><Cloud size={18} />Conectar Drive da CALI</button></div>

        <section className="panel docs-table docs-table-v2">
          <div className="docs-head"><span>Documento</span><span>Cliente</span><span>Origem</span><span>Atualização</span><span>Status</span></div>
          {loading && <div className="data-loading"><Loader2 className="spin" size={20} />Carregando biblioteca…</div>}
          {!loading && filtered.length === 0 && <div className="data-empty"><strong>Nenhum documento encontrado.</strong><span>Use “Adicionar documento” para iniciar a biblioteca do cliente.</span></div>}
          {filtered.map((doc) => (
            <article className="docs-row" key={doc.id}>
              <div className="doc-name">
                <div className={`document-icon document-cover-thumb ${doc.coverUrl ? 'has-cover' : ''}`}>{doc.coverUrl ? <img src={doc.coverUrl} alt="" /> : <FileText size={19} />}</div>
                <div><strong>{doc.title}</strong><span>{doc.category} · {doc.kind} · {doc.version}</span><small>{doc.protocol}{doc.requiresAcknowledgement ? ' · requer ciência' : ''}</small></div>
              </div>
              <span>{doc.company}</span><span className="source-badge">{doc.source === 'Google Drive' ? <Cloud size={15} /> : <FolderOpen size={15} />}{doc.source}</span><span>{doc.updated}</span><span className={`status-pill ${doc.published ? 'ok' : ''}`}>{doc.published ? 'Disponível ao cliente' : 'Interno'}</span>
            </article>
          ))}
        </section>
      </section>

      {open && (
        <div className="modal-backdrop workspace-modal-backdrop" role="presentation">
          <section className="modal-card document-create-modal" role="dialog" aria-modal="true" aria-label="Adicionar documento">
            <header className="document-modal-header">
              <div><span className="section-kicker">NOVO DOCUMENTO</span><h2>Organizar documento no Workspace</h2><p>O protocolo é gerado automaticamente ao salvar. O arquivo permanece no Storage privado e pode ser publicado para a biblioteca do cliente.</p></div>
              <button type="button" className="modal-close document-modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
            </header>

            <div className="document-modal-scroll">
              {error && <div className="inline-notice">{error}</div>}
              <div className="document-upload-pair">
                <label className={`upload-drop document-file-drop ${file ? 'selected' : ''}`}>
                  <Upload size={25} /><strong>{file ? file.name : 'Selecionar documento'}</strong><span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'PDF, DOCX, XLSX, PPTX ou imagem'}</span>
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                </label>
                <label className={`document-cover-upload ${coverPreview ? 'selected' : ''}`}>
                  {coverPreview ? <img src={coverPreview} alt="Prévia da capa" /> : <><ImagePlus size={25} /><strong>Adicionar capa</strong><span>Imagem opcional exibida na biblioteca do cliente</span></>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectCover(event.target.files?.[0] ?? null)} />
                </label>
              </div>

              <div className="document-protocol-note"><span>PROTOCOLO</span><strong>Gerado automaticamente ao salvar</strong><small>Ex.: CALI-DOC-2026-000042</small></div>

              <div className="form-grid document-form-grid">
                <label className="stacked-label wide">Nome do documento<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome que o cliente verá" /></label>
                <label className="stacked-label">Cliente<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="stacked-label">Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Tipo documental<select value={kind} onChange={(event) => setKind(event.target.value)}>{documentKinds.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="stacked-label">Versão<input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v1.0" /></label>
                <label className="stacked-label wide">Descrição / contexto<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto curto para facilitar a localização e o entendimento do documento." /></label>
              </div>

              <div className="document-publication-options">
                <label className="check-line"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /><span><strong>Disponibilizar ao cliente</strong><small>O documento entra imediatamente na biblioteca do cliente. Se desmarcado, fica interno.</small></span></label>
                <label className="check-line"><input type="checkbox" checked={requiresAcknowledgement} onChange={(event) => setRequiresAcknowledgement(event.target.checked)} /><span><strong>Solicitar ciência</strong><small>O cliente deverá registrar a leitura/ciência e o horário ficará no histórico do documento.</small></span></label>
              </div>
            </div>

            <footer className="document-modal-footer">
              <span>Arquivo, capa e metadados ficam vinculados ao mesmo protocolo.</span>
              <div className="modal-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving || !title.trim() || !companyId || !file} onClick={() => void saveDocument()}>{saving ? <><Loader2 className="spin" size={17} />Salvando…</> : 'Salvar documento'}</button></div>
            </footer>
          </section>
        </div>
      )}
    </Shell>
  );
}
