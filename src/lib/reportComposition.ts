export type ReportType = 'monthly' | 'quarterly';

export type MonthlySeriesPoint = {
  monthRef: string;
  start: string;
  end: string;
  consumedMinutes: number;
  hourEntriesCount: number;
  approvedCount: number;
  createdDeliverablesCount: number;
  completedTasksCount: number;
  feedbackCount: number;
  feedbackAverage: number | null;
  lowScoreCount: number;
  publishedDocumentsCount: number;
  eventsCount: number;
  statusChangesCount: number;
  clientReviewEventsCount: number;
  adjustmentEventsCount: number;
  rebriefingEventsCount: number;
};

export type ReportEditor = {
  summary: string;
  movements: string;
  decisions: string;
  risks: string;
  nextSteps: string;
};

export type CompositionSnapshot = {
  companyName: string;
  period: { start: string; end: string; months: number };
  contract: { serviceType?: string | null; servicePlan?: string | null; contractedHoursPeriod: number };
  deliverables: {
    approvedCount: number;
    approved: Array<{ title: string }>;
    inProgressCount: number;
    clientReviewCount: number;
    delayBusinessDays: number;
    delayedCount: number;
    adjustmentCount: number;
    rebriefingCount: number;
  };
  tasks: { completedCount: number; items: Array<{ title: string; completedAt?: string | null }> };
  hours: { contractedHours: number; consumedMinutes: number; categories: Array<{ label: string; minutes: number }> };
  feedback: { count: number; average: number | null; lowScoreCount: number };
  events: { count: number; items: Array<{ title: string }> };
  documents: {
    publishedCount: number;
    published: Array<{ title: string }>;
    awaitingFinalCount: number;
    readyToPublishCount: number;
  };
  monthlySeries?: MonthlySeriesPoint[];
};

export const reportTypeLabel: Record<ReportType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

export const editorLabels: Record<ReportType, {
  summary: string;
  summaryPlaceholder: string;
  movements: string;
  movementsPlaceholder: string;
  decisions: string;
  decisionsPlaceholder: string;
  risks: string;
  risksPlaceholder: string;
  nextSteps: string;
  nextStepsPlaceholder: string;
}> = {
  monthly: {
    summary: 'Leitura executiva do mês',
    summaryPlaceholder: 'O que o decisor precisa compreender sobre o mês além dos números?',
    movements: 'Entregas e movimentos do mês',
    movementsPlaceholder: 'Avanços, entregas e marcos — um por linha',
    decisions: 'Decisões / alinhamentos',
    decisionsPlaceholder: 'Decisões tomadas, definições e direcionamentos — um por linha',
    risks: 'Pontos de atenção',
    risksPlaceholder: 'Riscos, dependências, atrasos e sinais que merecem atenção',
    nextSteps: 'Próximo ciclo',
    nextStepsPlaceholder: 'O que precisa avançar no próximo mês',
  },
  quarterly: {
    summary: 'Leitura executiva do trimestre',
    summaryPlaceholder: 'O que mudou ao longo dos três meses e o que isso sinaliza para a gestão?',
    movements: 'Evolução e marcos do trimestre',
    movementsPlaceholder: 'Evoluções, marcos e mudanças de ritmo — um por linha',
    decisions: 'Decisões estruturantes',
    decisionsPlaceholder: 'Decisões com impacto no próximo trimestre — uma por linha',
    risks: 'Tendências e pontos de atenção',
    risksPlaceholder: 'Recorrências, dependências e tendências que merecem atenção',
    nextSteps: 'Prioridades do próximo trimestre',
    nextStepsPlaceholder: 'Prioridades e movimentos estruturantes para os próximos três meses',
  },
};

export const compositionGuide: Record<ReportType, Array<{ title: string; description: string }>> = {
  monthly: [
    { title: 'Execução do mês', description: 'Entregas, horas, agenda, documentos e feedback efetivamente registrados.' },
    { title: 'Decisões e dependências', description: 'O que exigiu alinhamento, resposta do cliente, ajuste ou atenção da CALI.' },
    { title: 'Próximo ciclo', description: 'Movimentos que precisam ganhar tração no mês seguinte.' },
  ],
  quarterly: [
    { title: 'Evolução mês a mês', description: 'Comparação dos três meses para enxergar ritmo e mudança, não apenas soma.' },
    { title: 'Tendências e recorrências', description: 'Sinais repetidos em execução, feedback, ajustes e validações.' },
    { title: 'Próximo trimestre', description: 'Prioridades estruturantes a partir da leitura acumulada do ciclo.' },
  ],
};

function minutesLabel(minutes: number) {
  const safe = Number(minutes || 0);
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

function monthLabel(ref: string) {
  const [year, month] = ref.split('-').map(Number);
  if (!year || !month) return ref;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '')
    .replace(/^./, (char) => char.toUpperCase());
}

function periodLabel(type: ReportType, start: string) {
  const [year, month] = start.split('-').map(Number);
  if (type === 'monthly') {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
  }
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${quarter}º trimestre de ${year}`;
}

function consumedPercent(snapshot: CompositionSnapshot) {
  const contracted = Number(snapshot.hours.contractedHours || snapshot.contract.contractedHoursPeriod || 0);
  if (!contracted) return null;
  return (Number(snapshot.hours.consumedMinutes || 0) / 60 / contracted) * 100;
}

export function normalizeMonthlySeries(value: unknown): MonthlySeriesPoint[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw: any) => ({
    monthRef: String(raw?.monthRef || ''),
    start: String(raw?.start || ''),
    end: String(raw?.end || ''),
    consumedMinutes: Number(raw?.consumedMinutes || 0),
    hourEntriesCount: Number(raw?.hourEntriesCount || 0),
    approvedCount: Number(raw?.approvedCount || 0),
    createdDeliverablesCount: Number(raw?.createdDeliverablesCount || 0),
    completedTasksCount: Number(raw?.completedTasksCount || 0),
    feedbackCount: Number(raw?.feedbackCount || 0),
    feedbackAverage: raw?.feedbackAverage === null || raw?.feedbackAverage === undefined ? null : Number(raw.feedbackAverage),
    lowScoreCount: Number(raw?.lowScoreCount || 0),
    publishedDocumentsCount: Number(raw?.publishedDocumentsCount || 0),
    eventsCount: Number(raw?.eventsCount || 0),
    statusChangesCount: Number(raw?.statusChangesCount || 0),
    clientReviewEventsCount: Number(raw?.clientReviewEventsCount || 0),
    adjustmentEventsCount: Number(raw?.adjustmentEventsCount || 0),
    rebriefingEventsCount: Number(raw?.rebriefingEventsCount || 0),
  }));
}

export function planReadingMode(servicePlan?: string | null) {
  const normalized = String(servicePlan || '').toLowerCase();
  if (normalized.includes('full')) {
    return {
      key: 'full',
      title: 'Leitura ampliada · CALI Full',
      description: 'Cruza execução, distribuição de horas, feedback, agenda e evolução para apoiar a leitura executiva da conta.',
    };
  }
  if (normalized.includes('partner')) {
    return {
      key: 'partner',
      title: 'Leitura de direção · CALI Partner',
      description: 'Concentra prioridades, decisões, dependências e ritmo de execução para manter foco e cadência.',
    };
  }
  return {
    key: 'standard',
    title: 'Leitura executiva CALI',
    description: 'Organiza os fatos registrados no Workspace e preserva a leitura final para revisão da CALI.',
  };
}

export function quarterlyEvolutionSummary(series: MonthlySeriesPoint[]) {
  if (!series.length) return [] as string[];
  const labels = series.map((item) => monthLabel(item.monthRef));
  const hours = series.map((item) => minutesLabel(item.consumedMinutes));
  const approvals = series.map((item) => item.approvedCount);
  const responses = series.filter((item) => item.feedbackCount > 0 && item.feedbackAverage !== null);
  const adjustmentTotal = series.reduce((sum, item) => sum + item.adjustmentEventsCount, 0);
  const rebriefingTotal = series.reduce((sum, item) => sum + item.rebriefingEventsCount, 0);
  const clientReviewTotal = series.reduce((sum, item) => sum + item.clientReviewEventsCount, 0);
  const lines = [
    `Horas por mês: ${labels.map((label, index) => `${label} ${hours[index]}`).join(' · ')}.`,
    `Aprovações por mês: ${labels.map((label, index) => `${label} ${approvals[index]}`).join(' · ')}.`,
  ];
  if (responses.length) {
    lines.push(`Feedback registrado: ${responses.map((item) => `${monthLabel(item.monthRef)} ${Number(item.feedbackAverage).toFixed(1).replace('.', ',')}`).join(' · ')}.`);
  }
  if (adjustmentTotal || rebriefingTotal || clientReviewTotal) {
    lines.push(`No trimestre: ${clientReviewTotal} envio(s) para validação, ${adjustmentTotal} solicitação(ões) de ajuste e ${rebriefingTotal} rebriefing(s).`);
  }
  return lines;
}

export function composeBaseReading(snapshot: CompositionSnapshot, type: ReportType): ReportEditor {
  const movements: string[] = [];
  const risks: string[] = [];
  const nextSteps: string[] = [];
  const series = snapshot.monthlySeries || [];

  snapshot.deliverables.approved.slice(0, type === 'quarterly' ? 8 : 5)
    .forEach((item) => movements.push(`Entregável aprovado: ${item.title}.`));
  snapshot.documents.published.slice(0, type === 'quarterly' ? 6 : 4)
    .forEach((item) => movements.push(`Documento disponibilizado: ${item.title}.`));

  if (type === 'quarterly' && series.length > 1) {
    quarterlyEvolutionSummary(series).forEach((line) => movements.unshift(line));
  } else {
    snapshot.tasks.items.filter((item) => Boolean(item.completedAt)).slice(0, 4)
      .forEach((item) => movements.push(`Atividade concluída: ${item.title}.`));
  }

  if (!movements.length) {
    snapshot.events.items.slice(0, 3).forEach((item) => movements.push(`Agenda realizada no período: ${item.title}.`));
  }

  if (snapshot.deliverables.delayedCount) {
    risks.push(`${snapshot.deliverables.delayedCount} entregável(eis) registraram impacto de prazo, somando ${snapshot.deliverables.delayBusinessDays} dia(s) útil(eis).`);
  }
  if (snapshot.deliverables.rebriefingCount) risks.push(`${snapshot.deliverables.rebriefingCount} entregável(eis) exigiram rebriefing.`);
  if (snapshot.deliverables.adjustmentCount) risks.push(`${snapshot.deliverables.adjustmentCount} ajuste(s) foram registrados na execução.`);
  const usage = consumedPercent(snapshot);
  if (usage !== null && usage >= 80) risks.push(`Consumo de horas em ${Math.round(usage)}% do total contratado para o período.`);
  if (snapshot.feedback.lowScoreCount) risks.push(`${snapshot.feedback.lowScoreCount} avaliação(ões) entre 1 e 3 exigem leitura qualitativa.`);

  if (type === 'quarterly' && series.length > 1) {
    const adjustmentByMonth = series.map((item) => item.adjustmentEventsCount);
    const maxAdjustments = Math.max(...adjustmentByMonth);
    if (maxAdjustments > 0) {
      const index = adjustmentByMonth.indexOf(maxAdjustments);
      risks.push(`Maior concentração de solicitações de ajuste em ${monthLabel(series[index].monthRef)}: ${maxAdjustments} registro(s).`);
    }
    const lowMonths = series.filter((item) => item.lowScoreCount > 0);
    if (lowMonths.length) {
      risks.push(`Notas entre 1 e 3 apareceram em ${lowMonths.map((item) => monthLabel(item.monthRef)).join(', ')}.`);
    }
  }

  if (snapshot.deliverables.clientReviewCount) nextSteps.push(`Concluir a validação de ${snapshot.deliverables.clientReviewCount} entregável(eis) com o cliente.`);
  if (snapshot.deliverables.inProgressCount) nextSteps.push(`Avançar ${snapshot.deliverables.inProgressCount} entregável(eis) atualmente em execução.`);
  if (snapshot.documents.awaitingFinalCount) nextSteps.push(`Finalizar ${snapshot.documents.awaitingFinalCount} documento(s) que aguardam arquivo final.`);
  if (snapshot.documents.readyToPublishCount) nextSteps.push(`Publicar ${snapshot.documents.readyToPublishCount} documento(s) já pronto(s) para disponibilização.`);

  const parts = [
    `${snapshot.companyName} registrou ${snapshot.deliverables.approvedCount} entregável(eis) aprovado(s) em ${periodLabel(type, snapshot.period.start)}`,
    `${minutesLabel(snapshot.hours.consumedMinutes)} de atuação registrada`,
    `${snapshot.tasks.completedCount} atividade(s) concluída(s)`,
  ];
  if (snapshot.feedback.count) parts.push(`avaliação média ${Number(snapshot.feedback.average || 0).toFixed(1).replace('.', ',')} em ${snapshot.feedback.count} resposta(s)`);
  if (snapshot.documents.publishedCount) parts.push(`${snapshot.documents.publishedCount} documento(s) publicado(s)`);

  const typeSentence = type === 'quarterly'
    ? 'A leitura trimestral compara o comportamento dos meses para evidenciar evolução, recorrências e mudanças de ritmo; a interpretação final deve ser revisada pela CALI.'
    : 'A leitura mensal organiza execução, decisões, dependências e próximos movimentos; a interpretação final deve ser revisada pela CALI.';

  return {
    summary: `${parts.join('; ')}. ${typeSentence}`,
    movements: movements.join('\n'),
    decisions: '',
    risks: risks.join('\n'),
    nextSteps: nextSteps.join('\n'),
  };
}
