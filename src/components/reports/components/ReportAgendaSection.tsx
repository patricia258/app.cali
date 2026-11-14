import type { ReportAgendaCompliance } from '../../../domain/calendar';
import './report-agenda-print.css';

const reasonLabels: Record<string, string> = {
  client: 'cliente',
  cali: 'CALI',
  external: 'fator externo',
  health: 'saúde',
  travel_vacation: 'viagem/férias',
  other: 'outro motivo',
};

function formatDay(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
    : 'data não informada';
}

export function ReportAgendaSection({ agenda }: { agenda: ReportAgendaCompliance }) {
  if (!agenda.requiredTotal && !agenda.extraCount) return null;

  const items = agenda.items ?? [];
  const occurred = items.filter((item) => item?.outcome === 'occurred');
  const extraOccurred = agenda.extraOccurredCount ?? occurred.filter((item) => item?.scheduleClass === 'extra' || item?.billingApplies).length;
  const remoteOccurred = agenda.remoteOccurredCount ?? occurred.filter((item) => item?.mode === 'remote').length;
  const inPersonOccurred = agenda.inPersonOccurredCount ?? occurred.filter((item) => item?.mode === 'in_person').length;
  const reasons = items.flatMap((item) => {
    if (!item || item.outcome !== 'not_occurred') return [];
    const reason = reasonLabels[item.reasonCategory ?? ''] ?? 'motivo registrado';
    return [`${formatDay(item.startsAt)} · ${reason}${item.note ? ` (${item.note})` : ''}`];
  });
  const metrics = [
    ['Previstos no contrato', agenda.requiredTotal ?? 0],
    ['Realizados', agenda.occurredCount ?? 0],
    ['Não realizados', agenda.notOccurredCount ?? 0],
    ['Adicionais realizados', extraOccurred],
  ] as const;

  return (
    <section className="report-agenda">
      <header className="tw:flex tw:items-end tw:justify-between">
        <div>
          <small>Agenda e atendimentos</small>
          <h2>Encontros do período</h2>
        </div>
        <span className="tw:text-right">{agenda.label || 'CALI'} · não cumulativo</span>
      </header>
      <dl className="tw:m-0 tw:grid tw:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="tw:ml-0 tw:text-cali-brand">{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <b>Formato dos encontros realizados:</b> {remoteOccurred} online · {inPersonOccurred} presencial.
        {reasons.length > 0 && <> <b>Não ocorrência:</b> {reasons.join('; ')}.</>}
        {Boolean(agenda.pendingOutcomeCount) && (
          <> <b>Pendente de registro:</b> {agenda.pendingOutcomeCount} encontro(s) passado(s) ainda sem confirmação de resultado.</>
        )}
      </p>
    </section>
  );
}
