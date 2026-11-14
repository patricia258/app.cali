type Range = { start: Date | null; end: Date | null };

type Response = {
  createdAt: string;
  cohortAt?: string;
  sourceType: 'record' | 'deliverable';
  score: number;
  comment?: string | null;
};

type Closure = {
  closed_at: string;
  answered_at: string | null;
  superseded_at: string | null;
  closed_unanswered_at: string | null;
  account_records: { company_id: string };
};

function isInRange(date: string, { start, end }: Range) {
  const instant = new Date(date);
  return (!start || instant >= start) && (!end || instant <= end);
}

export function filterSatisfactionResponses<T extends Response>(
  rows: T[],
  range: Range,
  source: Response['sourceType'] | 'all',
  score: string,
) {
  return rows.filter((row) => isInRange(row.cohortAt || row.createdAt, range)
    && (source === 'all' || row.sourceType === source)
    && (score === 'all' || row.score === Number(score)));
}

export function summarizeSatisfaction(rows: Response[]) {
  const total = rows.length;
  const average = total ? rows.reduce((sum, row) => sum + row.score, 0) / total : null;
  const comments = rows.filter((row) => Boolean(row.comment?.trim())).length;
  const attention = rows.filter((row) => row.score <= 3).length;
  const distribution = [1, 2, 3, 4, 5].map((score) => ({ score, count: rows.filter((row) => row.score === score).length }));
  const satisfied = rows.filter((row) => row.score >= 4).length;
  return { total, average, comments, attention, distribution, satisfied };
}

export function summarizeClosureCohort<T extends Closure>(closures: T[], range: Range, company: string) {
  const cohort = closures.filter((entry) => isInRange(entry.closed_at, range)
    && (!company || company === 'all' || entry.account_records.company_id === company));
  const waiting = cohort.filter((entry) => !entry.answered_at && !entry.superseded_at && !entry.closed_unanswered_at);
  const answered = cohort.filter((entry) => entry.answered_at).length;
  const closedUnanswered = cohort.length - waiting.length - answered;
  const responseRate = cohort.length ? Math.round(answered / cohort.length * 100) : null;
  return { cohort, waiting, answered, closedUnanswered, responseRate };
}
