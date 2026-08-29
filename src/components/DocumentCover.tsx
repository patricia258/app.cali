import { Cloud, FileCheck2, FileText } from 'lucide-react';
import { documentCategoryMeta, type WorkspaceDocument } from '../domain/documents';

export function DocumentCover({ document, compact = false }: { document: WorkspaceDocument; compact?: boolean }) {
  const meta = documentCategoryMeta[document.category];
  return (
    <div className={`cali-document-cover tone-${document.category} ${compact ? 'compact' : ''}`}>
      <span className={`cali-document-cover-mark mark-${meta.mark}`} aria-hidden="true" />
      <div className="cali-document-cover-top">
        <span className="document-cover-code">{meta.short}</span>
        <span className="document-cover-source" title={document.source === 'google_drive' ? 'Google Drive' : 'Workspace'}>
          {document.source === 'google_drive' ? <Cloud size={15} /> : document.status === 'published' ? <FileCheck2 size={15} /> : <FileText size={15} />}
        </span>
      </div>
      <div className="cali-document-cover-copy">
        <span>{document.company}</span>
        <strong>{document.title}</strong>
        <small>{meta.label} · {document.version}</small>
      </div>
    </div>
  );
}
