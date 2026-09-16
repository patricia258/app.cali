import type { ReportType } from './reportComposition';
import type { IntelligenceSnapshot } from './reportIntelligence';

export type ReportLifecycleStatus = 'draft' | 'review' | 'approved' | 'sent' | 'published' | 'archived';

export type DeliveryPerformanceRow = {
  deliverable_id: string;
  company_id: string;
  project_id: string;
  protocol?: string | null;
  title: string;
  status: string;
  workstream?: string | null;
  planned_start_date?: string | null;
  actual_started_at?: string | null;
  original_due_at?: string | null;
  effective_due_at?: string | null;
  work_closed_at?: string | null;
  work_close_reason?: string | null;
  approved_at?: string | null;
  client_response_at?: string | null;
  completion_at?: string | null;
  delivery_timing: 'before_deadline' | 'on_time' | 'after_deadline' | 'open';
  business_days_from_deadline?: number | null;
  start_timing?: 'started_early' | 'started_on_time' | 'started_late' | 'unknown' | null;
  business_days_from_original_deadline?: number | null;
  total_minutes?: number | null;
};

export type DismissedReportAlert = {
  id: string;
  reason: string;
  dismissedAt: string;
};

export type ReportCloseAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  blocking: boolean;
  source: 'deadline' | 'approval' | 'hours' | 'feedback' | 'dependency' | 'memory';
  actionLabel?: string;
  actionHref?: string;
};

export type ReportKpisV14 = {
  contractedHours: number;
  consumedMinutes: number;
  plannedDeliveries: number;
  completedDeliveries: number;
  deliveryAdherence: number | null;
  cyclePosition: string;
  cycleLabel: string;
};

function day(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function within(value: string | null | undefined, start: string, end: string) {
  const normalized = day(value);
  return Boolean(normalized && normalized >= start && normalized <= end);
}

function clean(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function formatHoursV14(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest}min`;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${hours}h`;
}

export function periodLabelV14(type: ReportType, start: string) {
  const [year, month] = start.split('-').map(Number);
  if (type === 'quarterly') return `${Math.floor((month - 1) / 3) + 1}º trimestre de ${year}`;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function reportKpisV14(snapshot: IntelligenceSnapshot, rows: DeliveryPerformanceRow[]): ReportKpisV14 {
  const contractedHours = Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0);
  const consumedMinutes = Number(snapshot.hours.consumedMinutes || 0);
  const start = snapshot.period.start.slice(0, 10);
  const end = snapshot.period.end.slice(0, 10);

  const planned = rows.filter((item) => within(item.effective_due_at, start, end));
  const completedPlanned = planned.filter((item) => Boolean(item.completion_at));
  const completedForTiming = rows.filter((item) => within(item.completion_at, start, end) && Boolean(item.effective_due_at) && item.delivery_timing !== 'open');
  const onTime = completedForTiming.filter((item) => item.delivery_timing !== 'after_deadline').length;
  const deliveryAdherence = completedForTiming.length ? Math.round((onTime / completedForTiming.length) * 100) : null;

  const workstreams = snapshot.workstreams || [];
  const activeIndex = workstreams.findIndex((item) => item.status === 'active');
  const completedCount = workstreams.filter((item) => item.status === 'completed').length;
  const position = activeIndex >= 0 ? activeIndex + 1 : Math.min(workstreams.length || 1, completedCount + 1);
  const active = activeIndex >= 0 ? workstreams[activeIndex] : workstreams.find((item) => item.status !== 'completed') || workstreams[workstreams.length - 1];

  return {
    contractedHours,
    consumedMinutes,
    plannedDeliveries: planned.length,
    completedDeliveries: completedPlanned.length,
    deliveryAdherence,
    cyclePosition: workstreams.length ? `${position} de ${workstreams.length}` : '—',
    cycleLabel: active?.name || snapshot.cycleContext?.projectName || snapshot.projects[0]?.name || 'Ciclo em acompanhamento',
  };
}

export function deliveryRowsForPdf(snapshot: IntelligenceSnapshot, rows: DeliveryPerformanceRow[]) {
  const start = snapshot.period.start.slice(0, 10);
  const end = snapshot.period.end.slice(0, 10);
  return rows
    .filter((item) => within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end))
    .sort((a, b) => String(a.effective_due_at || a.completion_at || '').localeCompare(String(b.effective_due_at || b.completion_at || '')))
    .slice(0, 6);
}

export function decisionOptionsV14(snapshot: IntelligenceSnapshot) {
  const values: string[] = [];
  snapshot.records.forEach((record) => {
    (record.decisions || []).forEach((decision) => {
      const value = clean(decision);
      if (value) values.push(value);
    });
  });
  return Array.from(new Set(values)).slice(0, 12);
}

export function buildReportAlertsV14(snapshot: IntelligenceSnapshot, rows: DeliveryPerformanceRow[]): ReportCloseAlert[] {
  const alerts: ReportCloseAlert[] = [];
  const start = snapshot.period.start.slice(0, 10);
  const end = snapshot.period.end.slice(0, 10);
  const periodRows = rows.filter((item) => within(item.effective_due_at, start, end) || within(item.completion_at, start, end) || within(item.actual_started_at, start, end));

  periodRows.filter((item) => !item.effective_due_at && item.status !== 'cancelled').slice(0, 4).forEach((item) => {
    alerts.push({
      id: `deadline-missing:${item.deliverable_id}`,
      severity: 'warning',
      title: `${item.title} está sem deadline`,
      detail: 'Sem uma data prevista, o Workspace não consegue calcular aderência ao prazo para este entregável.',
      blocking: true,
      source: 'deadline',
      actionLabel: 'Abrir Projetos',
      actionHref: '/admin/projetos',
    });
  });

  periodRows.filter((item) => item.delivery_timing === 'after_deadline' && Number(item.business_days_from_deadline || 0) > 0).slice(0, 4).forEach((item) => {
    const days = Math.abs(Number(item.business_days_from_deadline || 0));
    alerts.push({
      id: `deadline-late:${item.deliverable_id}`,
      severity: days >= 5 ? 'critical' : 'warning',
      title: `${item.title} foi concluído após o prazo`,
      detail: `O fechamento ocorreu ${days} dia(s) útil(eis) depois do deadline. Revise se o contexto do desvio está claro antes de aprovar o relatório.`,
      blocking: days >= 5,
      source: 'deadline',
      actionLabel: 'Revisar origem',
      actionHref: '/admin/projetos',
    });
  });

  const validationCount = Number(snapshot.deliverables.clientReviewCount || 0);
  if (validationCount > 0) {
    alerts.push({
      id: 'approval:pending',
      severity: 'info',
      title: `${validationCount} entregável(is) ainda em validação`,
      detail: 'A aprovação do cliente ainda não foi registrada para todos os itens em validação. Isso não impede o fechamento, mas merece conferência.',
      blocking: false,
      source: 'approval',
      actionLabel: 'Ver Projetos',
      actionHref: '/admin/projetos',
    });
  }

  const contracted = Number(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours || 0);
  const usedHours = Number(snapshot.hours.consumedMinutes || 0) / 60;
  if (contracted > 0 && usedHours > contracted * 1.1) {
    const pct = Math.round((usedHours / contracted) * 100);
    alerts.push({
      id: 'hours:over-capacity',
      severity: pct >= 125 ? 'critical' : 'warning',
      title: `Consumo de horas em ${pct}% da capacidade`,
      detail: `${formatHoursV14(snapshot.hours.consumedMinutes)} registrados para ${contracted}h previstas no período. O dado é automático e deve ser corrigido na origem caso esteja incorreto.`,
      blocking: false,
      source: 'hours',
      actionLabel: 'Abrir Horas',
      actionHref: '/admin/horas',
    });
  }

  snapshot.dependencies.items
    .filter((item) => Number(item.delayBusinessDays || 0) > 0 || Number(item.impactBusinessDays || 0) > 0)
    .slice(0, 3)
    .forEach((item, index) => {
      const impact = Math.max(Number(item.delayBusinessDays || 0), Number(item.impactBusinessDays || 0));
      alerts.push({
        id: `dependency:${item.protocol || index}:${item.title}`,
        severity: impact >= 5 ? 'critical' : 'warning',
        title: item.title || 'Dependência crítica do ciclo',
        detail: impact ? `Dependência com impacto de ${impact} dia(s) útil(eis) no fluxo.` : clean(item.detail) || 'Dependência que pode alterar a continuidade do ciclo.',
        blocking: impact >= 5,
        source: 'dependency',
        actionLabel: 'Ver origem',
        actionHref: '/admin/projetos',
      });
    });

  if (snapshot.events.count > 0 && snapshot.records.length === 0) {
    alerts.push({
      id: 'memory:no-records',
      severity: 'info',
      title: 'Há agenda no período, mas nenhuma memória consultiva registrada',
      detail: 'Reuniões sem registro não alimentam decisões, riscos ou contexto estratégico do relatório.',
      blocking: false,
      source: 'memory',
      actionLabel: 'Abrir Registros',
      actionHref: '/admin/registros',
    });
  }

  if (snapshot.feedback.count === 0 && Number(snapshot.deliverables.approvedCount || 0) > 0) {
    alerts.push({
      id: 'feedback:not-collected',
      severity: 'info',
      title: 'Nenhum feedback foi registrado no período',
      detail: 'O relatório pode ser aprovado sem NPS. A seção de percepção simplesmente não será exibida ao cliente.',
      blocking: false,
      source: 'feedback',
    });
  }

  return alerts;
}

export function isAlertDismissed(alert: ReportCloseAlert, dismissed: DismissedReportAlert[]) {
  return dismissed.some((item) => item.id === alert.id);
}

export function deliveryTimingLabelV14(item: DeliveryPerformanceRow) {
  const days = Math.abs(Number(item.business_days_from_deadline || 0));
  if (!item.effective_due_at) return 'Sem prazo';
  if (!item.completion_at || item.delivery_timing === 'open') return 'Em aberto';
  if (item.delivery_timing === 'on_time') return 'No prazo';
  if (item.delivery_timing === 'before_deadline') return days ? `${days}d útil antes` : 'Antes do prazo';
  return days ? `+${days}d útil` : 'Após o prazo';
}
