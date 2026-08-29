export type DocumentCategory =
  | 'deliverable'
  | 'report'
  | 'policy'
  | 'manual'
  | 'flow'
  | 'guide'
  | 'onboarding'
  | 'schedule'
  | 'contract'
  | 'reference'
  | 'other';

export type DocumentStatus = 'draft' | 'published' | 'archived';
export type DocumentSource = 'workspace' | 'google_drive' | 'external';

export type DocumentComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  mine?: boolean;
};

export type WorkspaceDocument = {
  id: string;
  title: string;
  companyId: string;
  company: string;
  companyLogo?: string | null;
  category: DocumentCategory;
  version: string;
  updated: string;
  createdAt?: string;
  source: DocumentSource;
  status: DocumentStatus;
  clientVisible: boolean;
  requiresAcknowledgement: boolean;
  acknowledgements: number;
  views: number;
  comments: number;
  fileType: string;
  sizeLabel: string;
  storagePath?: string | null;
  driveUrl?: string | null;
  project?: string | null;
  deliverable?: string | null;
  revisionOfId?: string | null;
  isPreview?: boolean;
};

export const documentCategoryMeta: Record<DocumentCategory, { label: string; short: string; mark: 'lime' | 'oak' }> = {
  deliverable: { label: 'Entregável', short: 'ENT', mark: 'oak' },
  report: { label: 'Relatório', short: 'REL', mark: 'lime' },
  policy: { label: 'Política', short: 'POL', mark: 'oak' },
  manual: { label: 'Manual', short: 'MAN', mark: 'lime' },
  flow: { label: 'Fluxo', short: 'FLX', mark: 'oak' },
  guide: { label: 'Guia', short: 'GUI', mark: 'lime' },
  onboarding: { label: 'Onboarding', short: 'ONB', mark: 'oak' },
  schedule: { label: 'Cronograma', short: 'CRO', mark: 'lime' },
  contract: { label: 'Contrato', short: 'CTR', mark: 'oak' },
  reference: { label: 'Referência', short: 'REF', mark: 'lime' },
  other: { label: 'Outro', short: 'DOC', mark: 'oak' },
};

export const previewDocuments: WorkspaceDocument[] = [
  {
    id: 'doc-preview-001', title: 'Estrutura de indicadores de People', companyId: 'aurora', company: 'Grupo Aurora', category: 'deliverable',
    version: 'v1.0', updated: '28 ago 2026', source: 'workspace', status: 'published', clientVisible: true,
    requiresAcknowledgement: true, acknowledgements: 1, views: 7, comments: 2, fileType: 'PDF', sizeLabel: '2,4 MB',
    project: 'Estrutura de indicadores de People', deliverable: 'Indicadores executivos', isPreview: true,
  },
  {
    id: 'doc-preview-002', title: 'Matriz de responsabilidades do RH', companyId: 'aurora', company: 'Grupo Aurora', category: 'guide',
    version: 'v0.8', updated: '27 ago 2026', source: 'workspace', status: 'draft', clientVisible: false,
    requiresAcknowledgement: false, acknowledgements: 0, views: 1, comments: 1, fileType: 'DOCX', sizeLabel: '860 KB',
    project: 'Governança de People', isPreview: true,
  },
  {
    id: 'doc-preview-003', title: 'Relatório Executivo · Julho', companyId: 'aurora', company: 'Grupo Aurora', category: 'report',
    version: 'final', updated: '01 ago 2026', source: 'google_drive', status: 'published', clientVisible: true,
    requiresAcknowledgement: true, acknowledgements: 1, views: 11, comments: 0, fileType: 'PDF', sizeLabel: '3,1 MB',
    driveUrl: 'https://drive.google.com/', isPreview: true,
  },
  {
    id: 'doc-preview-004', title: 'Plano de governança de People', companyId: 'studio-norte', company: 'Studio Norte', category: 'deliverable',
    version: 'v1.2', updated: '24 ago 2026', source: 'workspace', status: 'published', clientVisible: true,
    requiresAcknowledgement: false, acknowledgements: 0, views: 5, comments: 3, fileType: 'PDF', sizeLabel: '1,8 MB',
    project: 'Projeto de Estruturação', isPreview: true,
  },
  {
    id: 'doc-preview-005', title: 'Política de ritos de liderança', companyId: 'novatech', company: 'Novatech', category: 'policy',
    version: 'v2.0', updated: '20 ago 2026', source: 'workspace', status: 'published', clientVisible: true,
    requiresAcknowledgement: true, acknowledgements: 1, views: 9, comments: 1, fileType: 'PDF', sizeLabel: '1,2 MB',
    project: 'Ritual de gestão', isPreview: true,
  },
  {
    id: 'doc-preview-006', title: 'Cronograma aprovado · Ciclo 01', companyId: 'aurora', company: 'Grupo Aurora', category: 'schedule',
    version: 'vigente', updated: '19 ago 2026', source: 'workspace', status: 'published', clientVisible: true,
    requiresAcknowledgement: false, acknowledgements: 0, views: 13, comments: 0, fileType: 'PDF', sizeLabel: '740 KB',
    project: 'Assessoria Estratégica Mensal', isPreview: true,
  },
];

export const previewDocumentComments: Record<string, DocumentComment[]> = {
  'doc-preview-001': [
    { id: 'c1', author: 'Patrícia Lima', body: 'Versão final disponibilizada para validação. O quadro de indicadores já incorpora a última reunião.', createdAt: '28 ago · 14:12' },
    { id: 'c2', author: 'Marina Costa', body: 'Perfeito. Vou validar com a diretoria e retorno por aqui.', createdAt: '28 ago · 16:40', mine: false },
  ],
  'doc-preview-004': [
    { id: 'c3', author: 'Patrícia Lima', body: 'Incluí a divisão de responsabilidades por fórum e a cadência mensal.', createdAt: '24 ago · 10:05' },
  ],
};

export function normalizeDocumentCategory(value: string | null | undefined): DocumentCategory {
  const candidate = (value || 'other') as DocumentCategory;
  return candidate in documentCategoryMeta ? candidate : 'other';
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatDocumentDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}
