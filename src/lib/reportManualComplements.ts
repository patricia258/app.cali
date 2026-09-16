import type { IntelligenceSnapshot } from './reportIntelligence';
import type { DeliveryPerformanceRow } from './reportV14';

export const REPORT_MANUAL_CATEGORIES = [
  'Projetos e entregáveis',
  'Ocorrências e solicitações',
  'Subtarefas',
  'Reuniões e alinhamentos',
  'Documentação',
  'Análise e consultoria',
  'Outros',
] as const;

export type ReportManualCategory = (typeof REPORT_MANUAL_CATEGORIES)[number];
export type ReportManualStatus = 'in_progress' | 'completed' | 'cancelled' | 'client_review' | 'adjustment' | 'not_started';

export type ManualReportDelivery = {
  id: string;
  title: string;
  workstream?: string;
  complexity?: string;
  status: ReportManualStatus;
  dueDate?: string;
  completedAt?: string;
  minutes: number;
};

export type ManualReportTimeEntry = {
  id: string;
  description: string;
  category: ReportManualCategory;
  minutes: number;
};

export type ReportManualComplements = {
  deliveries: ManualReportDelivery[];
  timeEntries: ManualReportTimeEntry[];
};

export const emptyReportManualComplements = (): ReportManualComplements => ({ deliveries: [], timeEntries: [] });

function clean(value: unknown) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function minutes(value: unknown) { const parsed = Math.round(Number(value || 0)); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }
function date(value: unknown) { const raw = String(value || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''; }
function id(value: unknown, prefix: string, index: number) { return clean(value) || `${prefix}-${index + 1}`; }

export function normalizeReportManualComplements(value: unknown): ReportManualComplements {
  const raw = value && typeof value === 'object' ? value as any : {};
  const deliveries = Array.isArray(raw.deliveries) ? raw.deliveries.map((item: any, index: number): ManualReportDelivery => ({
    id: id(item?.id, 'manual-delivery', index),
    title: clean(item?.title),
    workstream: clean(item?.workstream),
    complexity: clean(item?.complexity),
    status: ['in_progress', 'completed', 'cancelled', 'client_review', 'adjustment', 'not_started'].includes(String(item?.status)) ? item.status : 'in_progress',
    dueDate: date(item?.dueDate),
    completedAt: date(item?.completedAt),
    minutes: minutes(item?.minutes),
  })).filter((item: ManualReportDelivery) => item.title || item.minutes > 0) : [];

  const timeEntries = Array.isArray(raw.timeEntries) ? raw.timeEntries.map((item: any, index: number): ManualReportTimeEntry => ({
    id: id(item?.id, 'manual-time', index),
    description: clean(item?.description),
    category: REPORT_MANUAL_CATEGORIES.includes(item?.category) ? item.category : 'Outros',
    minutes: minutes(item?.minutes),
  })).filter((item: ManualReportTimeEntry) => item.description || item.minutes > 0) : [];

  return { deliveries, timeEntries };
}

export function reportManualComplementsFromSnapshot(snapshot: IntelligenceSnapshot | null | undefined) {
  return normalizeReportManualComplements((snapshot as any)?.reportManual);
}

export function reportManualMinutes(value: ReportManualComplements) {
  return [...value.deliveries, ...value.timeEntries].reduce((sum, item) => sum + minutes(item.minutes), 0);
}

export function hasReportManualComplements(value: ReportManualComplements) {
  return value.deliveries.some((item) => item.title || item.minutes > 0) || value.timeEntries.some((item) => item.description || item.minutes > 0);
}

export function attachReportManualComplements(snapshot: IntelligenceSnapshot, value: ReportManualComplements): IntelligenceSnapshot {
  const normalized = normalizeReportManualComplements(value);
  return { ...(snapshot as any), reportManual: normalized } as IntelligenceSnapshot;
}

function mergeCategories(snapshot: IntelligenceSnapshot, value: ReportManualComplements) {
  const map = new Map<string, number>();
  (snapshot.hours.categories || []).forEach((item) => map.set(item.label, (map.get(item.label) || 0) + minutes(item.minutes)));
  value.deliveries.forEach((item) => map.set('Projetos e entregáveis', (map.get('Projetos e entregáveis') || 0) + minutes(item.minutes)));
  value.timeEntries.forEach((item) => map.set(item.category, (map.get(item.category) || 0) + minutes(item.minutes)));
  return Array.from(map.entries()).filter(([, total]) => total > 0).map(([label, total]) => ({ label, minutes: total }));
}

function syntheticEntries(snapshot: IntelligenceSnapshot, value: ReportManualComplements) {
  const automatic = snapshot.hours.entries.length
    ? snapshot.hours.entries
    : snapshot.hours.categories.map((item, index) => ({
        id: `report-auto-category-${index}`,
        workDate: snapshot.period.end.slice(0, 10),
        minutes: minutes(item.minutes),
        category: item.label,
        description: item.label,
        projectId: null,
        deliverableId: null,
      }));
  const manualDeliveries = value.deliveries.filter((item) => item.minutes > 0).map((item) => ({
    id: `report-manual-hour-${item.id}`,
    workDate: item.completedAt || item.dueDate || snapshot.period.end.slice(0, 10),
    minutes: minutes(item.minutes),
    category: 'Projetos e entregáveis',
    description: item.title || 'Complemento manual do relatório',
    projectId: snapshot.projects[0]?.id || null,
    deliverableId: `report-manual-${item.id}`,
  }));
  const manualTime = value.timeEntries.filter((item) => item.minutes > 0).map((item) => ({
    id: `report-manual-time-${item.id}`,
    workDate: snapshot.period.end.slice(0, 10),
    minutes: minutes(item.minutes),
    category: item.category,
    description: item.description || 'Complemento manual do relatório',
    projectId: snapshot.projects[0]?.id || null,
    deliverableId: null,
  }));
  return [...automatic, ...manualDeliveries, ...manualTime];
}

function deliveryTiming(item: ManualReportDelivery): DeliveryPerformanceRow['delivery_timing'] {
  if (!item.completedAt || !item.dueDate) return 'open';
  if (item.completedAt < item.dueDate) return 'before_deadline';
  if (item.completedAt === item.dueDate) return 'on_time';
  return 'after_deadline';
}

function manualDeliveryRows(snapshot: IntelligenceSnapshot, value: ReportManualComplements): DeliveryPerformanceRow[] {
  return value.deliveries.filter((item) => item.title).map((item) => ({
    deliverable_id: `report-manual-${item.id}`,
    company_id: snapshot.companyId,
    project_id: snapshot.projects[0]?.id || 'report-manual',
    protocol: null,
    title: item.title,
    status: item.status,
    workstream: item.workstream || null,
    planned_start_date: null,
    actual_started_at: null,
    original_due_at: item.dueDate || null,
    effective_due_at: item.dueDate || null,
    work_closed_at: item.completedAt || null,
    work_close_reason: null,
    approved_at: null,
    client_response_at: null,
    completion_at: item.completedAt || null,
    delivery_timing: deliveryTiming(item),
    business_days_from_deadline: null,
    start_timing: null,
    business_days_from_original_deadline: null,
    total_minutes: minutes(item.minutes),
    complexity: item.complexity || null,
    manual_source: true,
  } as DeliveryPerformanceRow & { complexity?: string | null; manual_source?: boolean }));
}

export function augmentReportData(snapshot: IntelligenceSnapshot, deliveries: DeliveryPerformanceRow[], value: ReportManualComplements) {
  const normalized = normalizeReportManualComplements(value);
  const totalManual = reportManualMinutes(normalized);
  const nextSnapshot = {
    ...(snapshot as any),
    reportManual: normalized,
    hours: {
      ...snapshot.hours,
      consumedMinutes: Math.max(0, Number(snapshot.hours.consumedMinutes || 0)) + totalManual,
      entriesCount: Math.max(0, Number(snapshot.hours.entriesCount || 0)) + normalized.deliveries.length + normalized.timeEntries.length,
      categories: mergeCategories(snapshot, normalized),
      entries: syntheticEntries(snapshot, normalized),
    },
  } as IntelligenceSnapshot;
  return { snapshot: nextSnapshot, deliveries: [...deliveries, ...manualDeliveryRows(snapshot, normalized)] };
}
