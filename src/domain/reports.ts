export type ReportStatus = 'draft' | 'review' | 'published' | 'archived';
export type ReportType = 'monthly' | 'quarterly';

export type ReportPeriod = {
  type: ReportType;
  start: string;
  end: string;
};

export const reportTypeLabel: Record<ReportType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function isoDate(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function currentMonthlyPeriod(): ReportPeriod {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    type: 'monthly',
    start: isoDate(year, monthIndex, 1),
    end: isoDate(year, monthIndex, lastDay),
  };
}

export function currentQuarterlyPeriod(): ReportPeriod {
  const now = new Date();
  const year = now.getFullYear();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterEndMonth = quarterStartMonth + 2;
  const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate();
  return {
    type: 'quarterly',
    start: isoDate(year, quarterStartMonth, 1),
    end: isoDate(year, quarterEndMonth, lastDay),
  };
}

export function defaultReportPeriod(type: ReportType): ReportPeriod {
  return type === 'quarterly' ? currentQuarterlyPeriod() : currentMonthlyPeriod();
}

export function periodReferenceMonth(periodStart: string) {
  return `${periodStart.slice(0, 7)}-01`;
}

export function periodLabel(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return `${start} — ${end}`;
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${formatter.format(startDate).replace('.', '')} — ${formatter.format(endDate).replace('.', '')}`;
}

export function monthsInPeriod(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1;
}
