import { useState } from 'react';
import { Cloud, FileText, FolderOpen, Plus, Search, Upload, X } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

type DocumentRow = { id: string; title: string; company: string; category: string; version: string; updated: string; source: 'Workspace' | 'Google Drive'; published: boolean };

const initialDocs: DocumentRow[] = [
  { id: 'd1', title: 'Estrutura de indicadores de People', company: 'Grupo Aurora', category: 'Entregável', version: 'v1.0', updated: '28 ago 2026', source: 'Workspace', published: true },
  { id: 'd2', title: 'Matriz de responsabilidades do RH', company: 'Grupo Aurora', category: 'Entregável', version: 'rascunho', updated: '27 ago 2026', source: 'Workspace', published: false },
  { id: 'd3', title: 'Relatório Executivo · Julho', company: 'Grupo Aurora', category: 'Relatório', version: 'final', updated: '01 ago 2026', source: 'Google Drive', published: true },
  { id: 'd4', title: 'Plano de governança de People', company: 'Studio Norte', category: 'Entregável', version: 'final', updated: '24 ago 2026', source: 'Workspace', published: true },
];

export function AdminDocumentsPage() {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('Grupo Aurora');
  const [category, setCategory] = useState('Entregável');
  const [publish, setPublish] = useState(false);

  const filtered = docs.filter((doc) => `${doc.title} ${doc.company} ${doc.category}`.toLowerCase().includes(search.toLowerCase()));

  function addDocument() {
    if (!title.trim()) return;
    setDocs((current) => [{ id: `d-${Date.now()}`, title: title.trim(), company, category, version: publish ? 'final' : 'rascunho', updated: '28 ago 2026', source: 'Workspace', published: publish }, ...current]);
    setOpen(false); setTitle(''); setPublish(false);
  }

  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">ARQUIVOS DO TRABALHO</div>
        <div className="page-heading">
          <div><h1>Documentos</h1><p>Versões finais e arquivos de apoio organizados por cliente, sem depender de links espalhados em conversas ou pastas difíceis de localizar.</p></div>
          <button className="primary" onClick={() => setOpen(true)}><Plus size={18} />Adicionar documento</button>
        </div>

        <div className="document-toolbar"><label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento ou cliente" /></label><button className="secondary"><Cloud size={18} />Conectar Drive da CALI</button></div>

        <section className="panel docs-table">
          <div className="docs-head"><span>Documento</span><span>Cliente</span><span>Origem</span><span>Atualização</span><span>Status</span></div>
          {filtered.map((doc) => (
            <article className="docs-row" key={doc.id}>
              <div className="doc-name"><div className="document-icon"><FileText size={19} /></div><div><strong>{doc.title}</strong><span>{doc.category} · {doc.version}</span></div></div>
              <span>{doc.company}</span><span className="source-badge">{doc.source === 'Google Drive' ? <Cloud size={15} /> : <FolderOpen size={15} />}{doc.source}</span><span>{doc.updated}</span><span className={`status-pill ${doc.published ? 'ok' : ''}`}>{doc.published ? 'Disponível ao cliente' : 'Interno'}</span>
            </article>
          ))}
        </section>
      </section>

      {open && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fechar"><X size={20} /></button>
            <span className="section-kicker">NOVO DOCUMENTO</span><h2>Organizar arquivo no Workspace</h2><p>O arquivo real será enviado ao Storage privado. Quando o Drive estiver conectado, uma cópia também poderá ser sincronizada automaticamente.</p>
            <div className="upload-drop"><Upload size={26} /><strong>Selecionar arquivo</strong><span>PDF, DOCX, XLSX, PPTX ou imagem</span></div>
            <div className="form-grid"><label className="stacked-label wide">Nome do documento<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome que o cliente verá" /></label><label className="stacked-label">Cliente<select value={company} onChange={(event) => setCompany(event.target.value)}><option>Grupo Aurora</option><option>Novatech</option><option>Studio Norte</option></select></label><label className="stacked-label">Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Entregável</option><option>Relatório</option><option>Referência</option><option>Contrato</option></select></label></div>
            <label className="check-line"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /><span><strong>Disponibilizar ao cliente</strong><small>Se marcado, o arquivo entra imediatamente na biblioteca do cliente.</small></span></label>
            <div className="modal-actions"><button className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={!title.trim()} onClick={addDocument}>Salvar documento</button></div>
          </section>
        </div>
      )}
    </Shell>
  );
}
