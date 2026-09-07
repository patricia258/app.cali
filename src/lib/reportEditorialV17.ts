import type { ReportEditor, ReportType } from './reportComposition';
import type { IntelligenceSnapshot } from './reportIntelligence';

export type ReportChangeSignalV17 = {
  id: string;
  label: string;
  value: string;
  detail: string;
  direction: 'up' | 'down' | 'stable' | 'new';
  tone: 'positive' | 'attention' | 'neutral';
};

function clean(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function firstSentence(value?: string | null) {
  const text = clean(value);
  if (!text) return '';
  return text.split(/(?<=[.!?])\s/)[0]?.slice(0, 180) || text.slice(0, 180);
}

/**
 * The draft starts with only a safe executive framing. Decisions, demands,
 * risks and next steps are intentionally empty: they are CALI editorial
 * choices and must never be auto-filled from activity/status logs.
 */
export function buildEditorialSeedV17(snapshot: IntelligenceSnapshot, reportType: ReportType): ReportEditor {
  const active = snapshot.workstreams.filter((item) => item.status === 'active').slice(0, 3);
  const fallback = snapshot.workstreams.filter((item) => item.status !== 'completed').slice(0, 3);
  const focus = active.length ? active : fallback;
  const names = focus.map((item) => clean(item.name)).filter(Boolean);
  const objective = focus.map((item) => firstSentence(item.objective)).find(Boolean);
  const projectNames = snapshot.projects.map((item) => clean(item.name)).filter(Boolean).slice(0, 2);

  let summary = '';
  if (names.length) {
    summary = `O período concentrou a atuação em ${names.join(', ')}.${objective ? ` ${objective}` : ''}`;
  } else if (projectNames.length) {
    summary = `O período permaneceu concentrado em ${projectNames.join(' e ')}, com o fechamento orientado pelo avanço real do ciclo.`;
  }

  if (reportType === 'quarterly' && summary) {
    summary = `${summary} A leitura trimestral deve destacar apenas mudanças de direção, decisões e pontos que alterem o próximo ciclo.`;
  }

  return { summary, movements: '', decisions: '', risks: '', nextSteps: '' };
}

/** Candidates only. The admin chooses what becomes part of the report. */
export function decisionCandidatesV17(snapshot: IntelligenceSnapshot) {
  const values: string[] = [];
  snapshot.records
    .filter((record) => record.includeInReport)
    .forEach((record) => record.decisions.forEach((decision) => {
      const value = clean(decision);
      if (value) values.push(value);
    }));
  return Array.from(new Set(values)).slice(0, 12);
}

/**
 * Demands stay an internal review aid. They are never written to the PDF by
 * themselves; selection exists only to help CALI form the final direction.
 */
export function demandCandidatesV17(snapshot: IntelligenceSnapshot) {
  const values = snapshot.records
    .filter((record) => record.includeInReport)
    .filter((record) => record.type !== 'meeting' || record.requiresAction)
    .map((record) => {
      const title = clean(record.title);
      const summary = firstSentence(record.summary);
      return summary ? `${title} — ${summary}` : title;
    })
    .filter(Boolean);
  return Array.from(new Set(values)).slice(0, 12);
}

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function signedPct(value: number | null) {
  if (value === null) return 'novo dado';
  if (value === 0) return 'estável';
  return `${value > 0 ? '+' : ''}${value}%`;
}

function trend(value: number | null, positiveWhenUp = false): Pick<ReportChangeSignalV17, 'direction' | 'tone'> {
  if (value === null) return { direction: 'new', tone: 'neutral' };
  if (value === 0) return { direction: 'stable', tone: 'neutral' };
  if (value > 0) return { direction: 'up', tone: positiveWhenUp ? 'positive' : 'attention' };
  return { direction: 'down', tone: positiveWhenUp ? 'attention' : 'positive' };
}

/**
 * Comparison is conditional on real comparable signal. Two zeros are absence
 * of movement, not an executive trend, so that card is omitted.
 */
export function periodChangeSignalsV17(snapshot: IntelligenceSnapshot, reportType: ReportType = 'monthly'): ReportChangeSignalV17[] {
  const series = [...(snapshot.monthlySeries || [])]
    .filter((item) => item.monthRef)
    .sort((a, b) => a.monthRef.localeCompare(b.monthRef));
  if (series.length < 2) return [];

  const current = series[series.length - 1];
  const previous = reportType === 'quarterly' ? series[0] : series[series.length - 2];
  const comparison = reportType === 'quarterly' ? 'do primeiro ao último mês do trimestre' : 'em relação ao período anterior';
  const signals: ReportChangeSignalV17[] = [];

  if (current.consumedMinutes > 0 || previous.consumedMinutes > 0) {
    const delta = pctDelta(current.consumedMinutes, previous.consumedMinutes);
    signals.push({
      id: 'hours',
      label: 'Ritmo de dedicação',
      value: signedPct(delta),
      detail: delta === null
        ? 'Primeiro período com horas comparáveis.'
        : delta === 0
          ? `O volume de horas permaneceu estável ${comparison}.`
          : `O volume de horas ${delta > 0 ? 'aumentou' : 'reduziu'} ${Math.abs(delta)}% ${comparison}.`,
      ...trend(delta, false),
    });
  }

  if (current.approvedCount > 0 || previous.approvedCount > 0) {
    const delta = current.approvedCount - previous.approvedCount;
    signals.push({
      id: 'approvals',
      label: 'Entregas aprovadas',
      value: delta === 0 ? 'estável' : `${delta > 0 ? '+' : ''}${delta}`,
      detail: delta === 0
        ? `O número de aprovações permaneceu no mesmo nível ${comparison}.`
        : `${Math.abs(delta)} aprovação(ões) ${delta > 0 ? 'a mais' : 'a menos'} ${comparison}.`,
      direction: delta === 0 ? 'stable' : delta > 0 ? 'up' : 'down',
      tone: delta > 0 ? 'positive' : delta < 0 ? 'attention' : 'neutral',
    });
  }

  if (current.adjustmentEventsCount > 0 || previous.adjustmentEventsCount > 0) {
    const delta = current.adjustmentEventsCount - previous.adjustmentEventsCount;
    signals.push({
      id: 'adjustments',
      label: 'Solicitações de ajuste',
      value: delta === 0 ? 'estável' : `${delta > 0 ? '+' : ''}${delta}`,
      detail: delta === 0
        ? `O volume de ajustes permaneceu no mesmo nível ${comparison}.`
        : `${Math.abs(delta)} solicitação(ões) de ajuste ${delta > 0 ? 'a mais' : 'a menos'} ${comparison}.`,
      direction: delta === 0 ? 'stable' : delta > 0 ? 'up' : 'down',
      tone: delta > 0 ? 'attention' : delta < 0 ? 'positive' : 'neutral',
    });
  }

  if (current.feedbackAverage !== null && previous.feedbackAverage !== null) {
    const delta = Number((current.feedbackAverage - previous.feedbackAverage).toFixed(1));
    signals.push({
      id: 'feedback',
      label: 'Percepção do cliente',
      value: delta === 0 ? 'estável' : `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}`,
      detail: delta === 0
        ? 'A média de avaliação permaneceu estável.'
        : `A média de avaliação ${delta > 0 ? 'subiu' : 'caiu'} ${Math.abs(delta).toFixed(1).replace('.', ',')} ponto(s) na escala de 1 a 5.`,
      direction: delta === 0 ? 'stable' : delta > 0 ? 'up' : 'down',
      tone: delta > 0 ? 'positive' : delta < 0 ? 'attention' : 'neutral',
    });
  }

  return signals.slice(0, 4);
}
