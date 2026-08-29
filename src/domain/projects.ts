export type ProjectPlanningStatus = 'draft' | 'client_review' | 'adjustment_requested' | 'approved' | 'active' | 'rebriefing' | 'closed';
export type DeliverableStatus = 'not_started' | 'in_progress' | 'internal_review' | 'client_review' | 'adjustment_requested' | 'approved' | 'cancelled';
export type MaterialComplexity = 'MC1' | 'MC2' | 'MC3';

export type ProjectDeliverable = {
  id: string;
  protocol: string;
  title: string;
  description?: string | null;
  status: DeliverableStatus;
  workstream: string;
  complexity: MaterialComplexity;
  roadmapMonthStart?: number | null;
  roadmapMonthEnd?: number | null;
  dueAt?: string | null;
  originalDueAt?: string | null;
  clientResponseDueAt?: string | null;
  clientDelayBusinessDays: number;
  adjustmentCount: number;
  rebriefingRequired: boolean;
  isDocument: boolean;
  hours: number;
  taskCount: number;
  taskDone: number;
  sortOrder: number;
  clientVisible: boolean;
};

export type WorkspaceProject = {
  id: string;
  protocol: string;
  companyId: string;
  company: string;
  companyLogo?: string | null;
  name: string;
  service: string;
  description?: string | null;
  planningStatus: ProjectPlanningStatus;
  startDate?: string | null;
  endDate?: string | null;
  clientResponseBusinessDays: number;
  adjustmentLimit: number;
  deliverables: ProjectDeliverable[];
};

export const projectPlanningLabels: Record<ProjectPlanningStatus, string> = {
  draft: 'Rascunho',
  client_review: 'Aguardando cliente',
  adjustment_requested: 'Ajuste solicitado',
  approved: 'Cronograma aprovado',
  active: 'Projeto vigente',
  rebriefing: 'Rebriefing',
  closed: 'Encerrado',
};

export const deliverableLabels: Record<DeliverableStatus, string> = {
  not_started: 'Não iniciado',
  in_progress: 'Em andamento',
  internal_review: 'Revisão interna',
  client_review: 'Aguardando cliente',
  adjustment_requested: 'Ajuste solicitado',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export const complexityMeta: Record<MaterialComplexity, { label: string; description: string }> = {
  MC1: { label: 'MC1 · Baixa', description: 'Construção mais direta, com menor volume de análise e dependências.' },
  MC2: { label: 'MC2 · Média', description: 'Exige diagnóstico, cruzamento de informações e validações relevantes.' },
  MC3: { label: 'MC3 · Alta', description: 'Material denso, com maior profundidade, dependências e impacto estratégico.' },
};

export const caliWorkstreams = [
  'Liderança',
  'Cultura & Engajamento',
  'Pessoas & Performance',
  'Gestão & Governança de RH',
  'Comunicação Interna',
  'Estrutura & Processos',
  'Outro',
] as const;

export function addBusinessDays(value: string | Date, days: number) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value.slice(0, 10)}T12:00:00`);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date;
}

export function businessDaysLate(dueAt?: string | null, now = new Date()) {
  if (!dueAt) return 0;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime()) || now <= due) return 0;
  const cursor = new Date(due);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(now);
  end.setHours(12, 0, 0, 0);
  let count = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
  }
  return count;
}

export function formatProjectDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

export function projectProgress(deliverables: ProjectDeliverable[]) {
  const valid = deliverables.filter((item) => item.status !== 'cancelled');
  if (!valid.length) return 0;
  const score = valid.reduce((sum, item) => {
    if (item.status === 'approved') return sum + 1;
    if (item.status === 'client_review' || item.status === 'internal_review') return sum + .75;
    if (item.status === 'in_progress' || item.status === 'adjustment_requested') return sum + .45;
    return sum;
  }, 0);
  return Math.round((score / valid.length) * 100);
}

export const previewProjects: WorkspaceProject[] = [
  {
    id: 'project-aurora', protocol: 'CALI-PRJ-2026-000021', companyId: 'aurora', company: 'Grupo Aurora',
    name: 'Roadmap People · Ciclo estratégico', service: 'Assessoria Estratégica Mensal', planningStatus: 'active',
    startDate: '2026-08-19', endDate: '2027-04-18', clientResponseBusinessDays: 3, adjustmentLimit: 3,
    deliverables: [
      { id: 'a1', protocol: 'CALI-ENT-2026-000101', title: 'Briefing, diagnóstico e implantação', status: 'approved', workstream: 'Gestão & Governança de RH', complexity: 'MC2', roadmapMonthStart: 1, roadmapMonthEnd: 1, dueAt: '2026-09-01T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: true, hours: 5.5, taskCount: 4, taskDone: 4, sortOrder: 1, clientVisible: true },
      { id: 'a2', protocol: 'CALI-ENT-2026-000102', title: 'Cultura e Clima · direcionadores', status: 'client_review', workstream: 'Cultura & Engajamento', complexity: 'MC3', roadmapMonthStart: 2, roadmapMonthEnd: 3, dueAt: '2026-10-16T18:00:00-03:00', clientResponseDueAt: '2026-08-27T18:00:00-03:00', clientDelayBusinessDays: 2, adjustmentCount: 1, rebriefingRequired: false, isDocument: true, hours: 8.2, taskCount: 6, taskDone: 5, sortOrder: 2, clientVisible: true },
      { id: 'a3', protocol: 'CALI-ENT-2026-000103', title: 'Processos prioritários de RH', status: 'in_progress', workstream: 'Estrutura & Processos', complexity: 'MC3', roadmapMonthStart: 3, roadmapMonthEnd: 4, dueAt: '2026-11-18T18:00:00-03:00', originalDueAt: '2026-11-14T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: true, hours: 4.3, taskCount: 7, taskDone: 3, sortOrder: 3, clientVisible: true },
      { id: 'a4', protocol: 'CALI-ENT-2026-000104', title: 'Comunicação Interna · fluxo e rituais', status: 'not_started', workstream: 'Comunicação Interna', complexity: 'MC2', roadmapMonthStart: 5, roadmapMonthEnd: 6, dueAt: '2027-01-18T18:00:00-03:00', originalDueAt: '2027-01-14T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: true, hours: 0, taskCount: 5, taskDone: 0, sortOrder: 4, clientVisible: true },
      { id: 'a5', protocol: 'CALI-ENT-2026-000105', title: 'Políticas prioritárias', status: 'not_started', workstream: 'Gestão & Governança de RH', complexity: 'MC3', roadmapMonthStart: 7, roadmapMonthEnd: 8, dueAt: '2027-03-18T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: true, hours: 0, taskCount: 4, taskDone: 0, sortOrder: 5, clientVisible: true },
      { id: 'a6', protocol: 'CALI-ENT-2026-000106', title: 'Governança · acompanhamento e manutenção', status: 'not_started', workstream: 'Gestão & Governança de RH', complexity: 'MC2', roadmapMonthStart: 8, roadmapMonthEnd: 8, dueAt: '2027-04-18T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: false, hours: 0, taskCount: 3, taskDone: 0, sortOrder: 6, clientVisible: true },
    ],
  },
  {
    id: 'project-novatech', protocol: 'CALI-PRJ-2026-000022', companyId: 'novatech', company: 'Novatech',
    name: 'Governança e performance', service: 'People Advisory', planningStatus: 'client_review', startDate: '2026-09-01', endDate: '2026-12-18', clientResponseBusinessDays: 3, adjustmentLimit: 3,
    deliverables: [
      { id: 'n1', protocol: 'CALI-ENT-2026-000111', title: 'Matriz de responsabilidades', status: 'client_review', workstream: 'Gestão & Governança de RH', complexity: 'MC2', roadmapMonthStart: 1, roadmapMonthEnd: 1, dueAt: '2026-09-25T18:00:00-03:00', clientResponseDueAt: '2026-09-03T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: true, hours: 2.5, taskCount: 3, taskDone: 3, sortOrder: 1, clientVisible: true },
      { id: 'n2', protocol: 'CALI-ENT-2026-000112', title: 'Ritual executivo de indicadores', status: 'not_started', workstream: 'Pessoas & Performance', complexity: 'MC2', roadmapMonthStart: 2, roadmapMonthEnd: 3, dueAt: '2026-11-03T18:00:00-03:00', clientDelayBusinessDays: 0, adjustmentCount: 0, rebriefingRequired: false, isDocument: false, hours: 0, taskCount: 4, taskDone: 0, sortOrder: 2, clientVisible: true },
    ],
  },
  {
    id: 'project-studio', protocol: 'CALI-PRJ-2026-000023', companyId: 'studio', company: 'Studio Norte',
    name: 'Liderança e cultura', service: 'Projeto de Estruturação', planningStatus: 'rebriefing', startDate: '2026-08-05', endDate: '2026-11-30', clientResponseBusinessDays: 3, adjustmentLimit: 3,
    deliverables: [
      { id: 's1', protocol: 'CALI-ENT-2026-000121', title: 'Ritual de gestão com lideranças', status: 'adjustment_requested', workstream: 'Liderança', complexity: 'MC3', roadmapMonthStart: 1, roadmapMonthEnd: 2, dueAt: '2026-09-19T18:00:00-03:00', adjustmentCount: 4, clientDelayBusinessDays: 0, rebriefingRequired: true, isDocument: false, hours: 11.1, taskCount: 6, taskDone: 4, sortOrder: 1, clientVisible: true },
    ],
  },
];
