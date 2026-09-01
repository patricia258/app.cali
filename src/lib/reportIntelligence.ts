import { normalizeMonthlySeries, type MonthlySeriesPoint, type ReportEditor, type ReportType } from './reportComposition';

export type AccountRecord = {
  id: string;
  protocol?: string | null;
  type: string;
  title: string;
  occurredAt: string;
  visibility: 'internal' | 'client';
  sourceActor: 'admin' | 'client' | 'calendar' | 'import';
  participants: Array<{ name?: string; email?: string } | string>;
  summary?: string | null;
  transcript?: string | null;
  decisions: string[];
  attentionPoints: string[];
  nextActions: string[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  includeInReport: boolean;
  requiresAction: boolean;
  projectId?: string | null;
  eventId?: string | null;
  cycleId?: string | null;
};

export type DependencyItem = {
  kind: string;
  title: string;
  protocol?: string | null;
  responsible: 'client' | 'shared' | 'flow' | string;
  status?: string | null;
  openedAt?: string | null;
  dueAt?: string | null;
  delayBusinessDays: number;
  impactBusinessDays: number;
  detail?: string | null;
  dependsOnTitle?: string | null;
  dependsOnProtocol?: string | null;
};

export type PreviousReport = {
  id: string;
  protocol?: string | null;
  periodStart: string;
  periodEnd: string;
  status: string;
  contractedHours: number | null;
  consumedMinutes: number;
  feedbackAverage: number | null;
};

export type IntelligenceSnapshot = {
  generatedAt: string;
  companyId: string;
  companyName: string;
  period: { start: string; end: string; months: number };
  contract: {
    serviceType?: string | null;
    servicePlan?: string | null;
    monthlyHours: number;
    contractedHoursPeriod: number;
    startDate?: string | null;
    endDate?: string | null;
    autoRenew?: boolean;
  };
  projects: Array<{
    id: string;
    protocol?: string | null;
    name: string;
    status: string;
    planningStatus?: string | null;
    startDate?: string | null;
    targetEndDate?: string | null;
    roadmapStartDate?: string | null;
    roadmapEndDate?: string | null;
  }>;
  workstreams: Array<{
    id: string;
    protocol?: string | null;
    projectId: string;
    projectName?: string | null;
    name: string;
    objective?: string | null;
    status: string;
    roadmapMonthStart?: number | null;
    roadmapMonthEnd?: number | null;
  }>;
  cycleContext: {
    id: string;
    protocol?: string | null;
    projectId?: string | null;
    projectName?: string | null;
    referenceMonth?: string | null;
    contractedHours?: number | null;
    status?: string | null;
    executiveNote?: string | null;
  } | null;
  deliverables: {
    total: number;
    approvedCount: number;
    approved: Array<{ id: string; protocol?: string | null; title: string; approvedAt?: string | null }>;
    createdCount: number;
    inProgressCount: number;
    clientReviewCount: number;
    delayBusinessDays: number;
    delayedCount: number;
    adjustmentCount: number;
    rebriefingCount: number;
    statusChanges: Array<{ title: string; from?: string | null; to?: string | null; note?: string | null; changedAt?: string | null }>;
  };
  tasks: {
    completedCount: number;
    createdCount: number;
    items: Array<{ id: string; title: string; status: string; dueAt?: string | null; completedAt?: string | null }>;
  };
  hours: {
    contractedHours: number;
    consumedMinutes: number;
    entriesCount: number;
    categories: Array<{ label: string; minutes: number }>;
    entries: Array<{
      id: string;
      workDate: string;
      minutes: number;
      category?: string | null;
      description: string;
      projectId?: string | null;
      deliverableId?: string | null;
    }>;
  };
  feedback: {
    count: number;
    average: number | null;
    lowScoreCount: number;
    responses: Array<{ score: number; comment?: string | null; createdAt?: string | null }>;
  };
  events: {
    count: number;
    items: Array<{ id: string; title: string; type?: string | null; startsAt?: string | null; description?: string | null }>;
  };
  documents: {
    publishedCount: number;
    published: Array<{ id: string; title: string; category?: string | null; kind?: string | null; publishedAt?: string | null }>;
    awaitingFinalCount: number;
    readyToPublishCount: number;
  };
  conversations: {
    commentCount: number;
    comments: Array<{ body: string; clientVisible: boolean; createdAt?: string | null }>;
  };
  records: AccountRecord[];
  dependencies: { items: DependencyItem[] };
  previousReports: PreviousReport[];
  monthlySeries: MonthlySeriesPoint[];
  manualOverrides?: Record<string, number | null>;
};

export type HourGroup = { label: string; minutes: number; percent: number };
export type UpgradeSignal = { active: boolean; consecutive: number; message: string };

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function nullableNum(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function textArray(value: unknown) {
  return arr<unknown>(value).map(String).map((item) => item.trim()).filter(Boolean);
}

export function normalizeIntelligenceSnapshot(value: unknown): IntelligenceSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, any>;
  if (!raw.period || !raw.contract || !raw.deliverables || !raw.hours) return null;
  return {
    ...raw,
    contract: {
      ...raw.contract,
      monthlyHours: num(raw.contract.monthlyHours),
      contractedHoursPeriod: num(raw.contract.contractedHoursPeriod || raw.hours?.contractedHours),
    },
    projects: arr(raw.projects),
    workstreams: arr(raw.workstreams),
    cycleContext: raw.cycleContext && typeof raw.cycleContext === 'object' ? raw.cycleContext : null,
    deliverables: {
      ...raw.deliverables,
      approvedCount: num(raw.deliverables.approvedCount),
      approved: arr(raw.deliverables.approved),
      inProgressCount: num(raw.deliverables.inProgressCount),
      clientReviewCount: num(raw.deliverables.clientReviewCount),
      delayedCount: num(raw.deliverables.delayedCount),
      delayBusinessDays: num(raw.deliverables.delayBusinessDays),
      adjustmentCount: num(raw.deliverables.adjustmentCount),
      rebriefingCount: num(raw.deliverables.rebriefingCount),
      statusChanges: arr(raw.deliverables.statusChanges),
    },
    tasks: raw.tasks || { completedCount: 0, createdCount: 0, items: [] },
    hours: {
      ...raw.hours,
      contractedHours: num(raw.hours.contractedHours),
      consumedMinutes: num(raw.hours.consumedMinutes),
      entriesCount: num(raw.hours.entriesCount),
      categories: arr(raw.hours.categories),
      entries: arr(raw.hours.entries),
    },
    feedback: raw.feedback || { count: 0, average: null, lowScoreCount: 0, responses: [] },
    events: raw.events || { count: 0, items: [] },
    documents: raw.documents || { publishedCount: 0, published: [], awaitingFinalCount: 0, readyToPublishCount: 0 },
    conversations: raw.conversations || { commentCount: 0, comments: [] },
    records: arr<any>(raw.records).map((record) => ({
      ...record,
      participants: arr(record.participants),
      decisions: textArray(record.decisions),
      attentionPoints: textArray(record.attentionPoints),
      nextActions: textArray(record.nextActions),
      includeInReport: record.includeInReport !== false,
      requiresAction: Boolean(record.requiresAction),
      impactLevel: record.impactLevel || 'medium',
    })),
    dependencies: { items: arr(raw.dependencies?.items).map((item: any) => ({
      ...item,
      delayBusinessDays: num(item.delayBusinessDays),
      impactBusinessDays: num(item.impactBusinessDays),
    })) },
    previousReports: arr<any>(raw.previousReports).map((item) => ({
      ...item,
      contractedHours: nullableNum(item.contractedHours),
      consumedMinutes: num(item.consumedMinutes),
      feedbackAverage: nullableNum(item.feedbackAverage),
    })),
    monthlySeries: normalizeMonthlySeries(raw.monthlySeries),
  } as IntelligenceSnapshot;
}

export function packageLabel(snapshot: IntelligenceSnapshot) {
  const plan = String(snapshot.contract.servicePlan || '').toLowerCase();
  if (plan === 'partner') return 'CALI Partner';
  if (plan === 'full') return 'CALI Full';
  return snapshot.contract.serviceType || 'CALI RH';
}

export function hoursLabelFromMinutes(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes || 0)));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}

export function canonicalHourCategory(label: string, hasDeliverable = false) {
  const value = String(label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/reun|meeting|call|alinh|agenda|checkpoint/.test(value)) return 'Reuniões e alinhamentos';
  if (/subtarefa|tarefa|task/.test(value)) return 'Subtarefas';
  if (/trein|workshop|mentor/.test(value)) return 'Treinamentos / encontros';
  if (/comunic|follow|whats|email|e-mail|ligac|mensag/.test(value)) return 'Comunicação e follow-up';
  if (/anal|consult|diagnost|estrateg|estudo|pesquisa/.test(value)) return 'Análise e consultoria';
  if (/document|relatorio|politica|manual|procedimento/.test(value)) return 'Documentação';
  if (hasDeliverable || /entreg|execuc|produc|projeto/.test(value)) return 'Entregáveis';
  return 'Outros';
}

export function groupHours(snapshot: IntelligenceSnapshot): HourGroup[] {
  const grouped = new Map<string, number>();
  if (snapshot.hours.entries.length) {
    snapshot.hours.entries.forEach((entry) => {
      const label = canonicalHourCategory(`${entry.category || ''} ${entry.description || ''}`, Boolean(entry.deliverableId));
      grouped.set(label, (grouped.get(label) || 0) + num(entry.minutes));
    });
  } else {
    snapshot.hours.categories.forEach((entry) => {
      const label = canonicalHourCategory(entry.label);
      grouped.set(label, (grouped.get(label) || 0) + num(entry.minutes));
    });
  }
  const total = Array.from(grouped.values()).reduce((sum, value) => sum + value, 0) || 1;
  return Array.from(grouped.entries())
    .map(([label, minutes]) => ({ label, minutes, percent: (minutes / total) * 100 }))
    .sort((a, b) => b.minutes - a.minutes);
}

function firstSentence(value?: string | null) {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.{20,260}?[.!?])(?:\s|$)/);
  return (match?.[1] || clean.slice(0, 260)).trim();
}

function dateDiffDays(from: string, to: string) {
  const a = new Date(`${from.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${to.slice(0, 10)}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function shouldShowNextCycle(snapshot: IntelligenceSnapshot, reportType: ReportType) {
  if (reportType === 'quarterly') return true;
  const anchors = [
    ...snapshot.projects.map((project) => project.roadmapEndDate || project.targetEndDate).filter(Boolean) as string[],
    snapshot.contract.endDate || '',
  ].filter(Boolean);
  if (!anchors.length) return false;
  return anchors.some((date) => {
    const diff = dateDiffDays(snapshot.period.end, date);
    return diff !== null && diff >= -7 && diff <= 40;
  });
}

export function upgradeSignal(snapshot: IntelligenceSnapshot): UpgradeSignal {
  const contracted = num(snapshot.contract.contractedHoursPeriod || snapshot.hours.contractedHours);
  const currentOver = contracted > 0 && snapshot.hours.consumedMinutes > contracted * 60;
  if (!currentOver) return { active: false, consecutive: 0, message: '' };

  const ordered = [...snapshot.previousReports].sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)));
  let consecutive = 1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const item = ordered[index];
    const itemContracted = num(item.contractedHours);
    const over = itemContracted > 0 && num(item.consumedMinutes) > itemContracted * 60;
    if (!over) break;
    consecutive += 1;
  }
  const active = consecutive >= 2;
  return {
    active,
    consecutive,
    message: active
      ? 'A demanda superou a capacidade prevista no pacote pelo segundo período consecutivo. Recomenda-se revisar a aderência do pacote para preservar previsibilidade e profundidade da atuação.'
      : 'O consumo ultrapassou a capacidade prevista no período. A CALI acompanhará o comportamento no próximo fechamento antes de recomendar mudança de pacote.',
  };
}

export function feedbackDirection(snapshot: IntelligenceSnapshot) {
  const points = snapshot.monthlySeries.filter((item) => item.feedbackAverage !== null);
  if (points.length < 2) return 'stable' as const;
  const previous = Number(points[points.length - 2].feedbackAverage);
  const current = Number(points[points.length - 1].feedbackAverage);
  if (current > previous + 0.15) return 'up' as const;
  if (current < previous - 0.15) return 'down' as const;
  return 'stable' as const;
}

export function buildExecutiveReading(snapshot: IntelligenceSnapshot, reportType: ReportType): ReportEditor {
  const reportRecords = snapshot.records.filter((record) => record.includeInReport);
  const highContext = reportRecords
    .filter((record) => ['critical', 'high'].includes(record.impactLevel))
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
  const meetingRecords = reportRecords.filter((record) => record.type === 'meeting');
  const contextualRecords = reportRecords.filter((record) => record.type !== 'meeting');
  const focus = snapshot.workstreams.filter((item) => item.status === 'active').slice(0, 3);
  const fallbackFocus = snapshot.workstreams.slice(0, 3);
  const focusList = focus.length ? focus : fallbackFocus;
  const focusNames = focusList.map((item) => item.name).filter(Boolean);
  const focusObjective = focusList.map((item) => firstSentence(item.objective)).find(Boolean);
  const dependency = snapshot.dependencies.items[0];
  const delayedDependency = snapshot.dependencies.items.find((item) => item.delayBusinessDays > 0 || item.impactBusinessDays > 0);
  const upgrade = upgradeSignal(snapshot);
  const feedbackTrend = feedbackDirection(snapshot);

  const summary: string[] = [];
  if (focusNames.length) {
    summary.push(`O período permaneceu concentrado em ${focusNames.join(', ')}.${focusObjective ? ` ${focusObjective}` : ''}`);
  } else if (snapshot.projects.length) {
    summary.push(`A atuação do período permaneceu vinculada a ${snapshot.projects.slice(0, 2).map((item) => item.name).join(' e ')}, com leitura orientada pelo avanço real do ciclo e pelos registros da conta.`);
  } else {
    summary.push('A base do período ainda está predominantemente operacional. A leitura executiva ganhará profundidade à medida que reuniões, ocorrências e decisões forem registradas no Workspace.');
  }

  const recordInsight = highContext[0] || contextualRecords[0] || meetingRecords[0];
  if (recordInsight) {
    const insight = firstSentence(recordInsight.summary || recordInsight.transcript);
    summary.push(insight
      ? `Entre os movimentos relevantes do período, ${recordInsight.title.toLowerCase()} trouxe o seguinte contexto: ${insight}`
      : `Entre os movimentos relevantes do período, ${recordInsight.title.toLowerCase()} passou a compor a leitura da conta e deve ser considerado nas próximas decisões.`);
  } else if (meetingRecords.length) {
    summary.push('As reuniões do período estão registradas, mas ainda sem memória consultiva suficiente para sustentar uma leitura qualitativa além da agenda.');
  }

  if (delayedDependency) {
    summary.push(`O principal ponto de atenção está em ${delayedDependency.title}, cuja dependência de retorno ou validação já interfere no ritmo originalmente previsto.`);
  } else if (dependency) {
    summary.push(`A continuidade do ciclo depende de ${dependency.title}; a recomendação é resolver essa pendência antes de ampliar novas frentes.`);
  } else if (feedbackTrend === 'down') {
    summary.push('A percepção registrada apresenta tendência de queda em relação ao período anterior e merece leitura qualitativa antes da abertura de novas frentes.');
  } else if (upgrade.active) {
    summary.push('O padrão de demanda já indica recorrência acima da capacidade mensal prevista no pacote, sinalizando necessidade de rever a aderência da configuração atual.');
  } else {
    summary.push('Não há, na base atual, uma dependência crítica que justifique alterar a direção do ciclo; a prioridade segue sendo consolidar o que já está em andamento antes de ampliar escopo.');
  }

  const movements: string[] = [];
  snapshot.deliverables.approved.slice(0, reportType === 'quarterly' ? 8 : 5).forEach((item) => movements.push(`Entregável aprovado: ${item.title}.`));
  reportRecords.slice(0, 6).forEach((record) => {
    if (!movements.some((item) => item.includes(record.title))) movements.push(`${record.title}${record.summary ? ` — ${firstSentence(record.summary)}` : ''}`);
  });
  if (!movements.length) {
    snapshot.deliverables.statusChanges.filter((item) => item.note).slice(0, 5).forEach((item) => movements.push(`${item.title}: ${item.note}`));
  }

  const decisions: string[] = [];
  reportRecords.forEach((record) => record.decisions.forEach((item) => decisions.push(item)));
  snapshot.deliverables.statusChanges.filter((item) => item.note).slice(0, 5).forEach((item) => decisions.push(`${item.title}: ${item.note}`));
  snapshot.conversations.comments.filter((item) => item.clientVisible).slice(0, 4).forEach((item) => decisions.push(item.body));

  const risks: string[] = [];
  reportRecords.forEach((record) => record.attentionPoints.forEach((item) => risks.push(item)));
  snapshot.dependencies.items.slice(0, 6).forEach((item) => {
    const delay = item.delayBusinessDays > 0 ? ` Impacto acumulado: ${item.delayBusinessDays} dia(s) útil(eis).` : '';
    risks.push(`${item.title}: ${item.detail || 'dependência aberta.'}${delay}`);
  });
  if (snapshot.feedback.lowScoreCount > 0) risks.push('Há avaliação(ões) entre 1 e 3 que pedem leitura qualitativa dos comentários antes do próximo fechamento.');
  if (upgrade.active) risks.push(upgrade.message);

  const nextSteps: string[] = [];
  if (shouldShowNextCycle(snapshot, reportType)) {
    reportRecords.forEach((record) => record.nextActions.forEach((item) => nextSteps.push(item)));
    snapshot.dependencies.items.slice(0, 3).forEach((item) => nextSteps.push(`Resolver ${item.title} antes da transição de ciclo.`));
    const upcoming = snapshot.workstreams.filter((item) => item.status === 'planned').slice(0, 4);
    upcoming.forEach((item) => nextSteps.push(`Preparar a entrada da frente ${item.name}.`));
  }

  return {
    summary: summary.join('\n\n'),
    movements: movements.join('\n'),
    decisions: Array.from(new Set(decisions)).join('\n'),
    risks: Array.from(new Set(risks)).join('\n'),
    nextSteps: Array.from(new Set(nextSteps)).join('\n'),
  };
}

export function reportSourceCount(snapshot: IntelligenceSnapshot) {
  return snapshot.hours.entriesCount
    + snapshot.events.count
    + snapshot.tasks.completedCount
    + snapshot.deliverables.statusChanges.length
    + snapshot.feedback.count
    + snapshot.documents.publishedCount
    + snapshot.records.length;
}
