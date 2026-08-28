import { useState } from 'react';
import { CheckCircle2, Cloud, Download, FileText, Search } from 'lucide-react';
import { Shell } from '../../components/WorkspaceShell';

const documents = [
  { id: 'd1', title: 'Estrutura de indicadores de People', category: 'Entregável', date: '28 ago 2026', version: 'v1.0' },
  { id: 'd2', title: 'Relatório Executivo · Julho', category: 'Relatório', date: '01 ago 2026', version: 'final' },
  { id: 'd3', title: 'Cronograma aprovado · Ciclo 01', category: 'Cronograma', date: '19 ago 2026', version: 'vigente' },
];

export function ClientDocumentsPage() {
  const [query, setQuery] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const filtered = documents.filter((doc) => `${doc.title} ${doc.category}`.toLowerCase().includes(query.toLowerCase()));

  function saveToDrive(id: string) {
    if (!driveConnected) { setDriveConnected(true); return; }
    setSaved((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <Shell role="client">
      <section className="page">
        <div className="eyebrow">BIBLIOTECA DO PROJETO</div>
        <div className="page-heading"><div><h1>Documentos</h1><p>Arquivos finais e documentos compartilhados pela CALI ficam disponíveis aqui mesmo depois do encerramento do ciclo.</p></div></div>

        <section className="drive-banner"><div className="drive-icon"><Cloud size={23} /></div><div><strong>{driveConnected ? 'Google Drive conectado' : 'Quer guardar uma cópia no Drive da empresa?'}</strong><p>{driveConnected ? 'Quando você solicitar, o Workspace salva uma cópia no Drive conectado sem retirar o arquivo daqui.' : 'Conecte uma vez e use “Salvar no Drive” nos documentos e relatórios que quiser arquivar na sua própria conta.'}</p></div><button className="secondary" onClick={() => setDriveConnected((value) => !value)}>{driveConnected ? 'Gerenciar conexão' : 'Conectar Google Drive'}</button></section>

        <label className="search-box client-doc-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca" /></label>

        <section className="document-cards">
          {filtered.map((doc) => (
            <article className="document-card" key={doc.id}>
              <div className="document-card-top"><div className="document-icon large-doc"><FileText size={24} /></div><span>{doc.category}</span></div>
              <h2>{doc.title}</h2><p>{doc.date} · {doc.version}</p>
              <div className="document-card-actions"><button className="secondary"><Download size={17} />Baixar</button><button className="secondary" onClick={() => saveToDrive(doc.id)}>{saved.includes(doc.id) ? <><CheckCircle2 size={17} />Salvo no Drive</> : <><Cloud size={17} />Salvar no Drive</>}</button></div>
            </article>
          ))}
        </section>
      </section>
    </Shell>
  );
}
