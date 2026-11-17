import { Select } from '../../../../components/ds/Select';
import { EmptyState } from '../../../../components/ds/EmptyState';
import { minutesLabel } from '../../../../lib/capacity';

export type ClientHourRow = {
  kind: string;
  project: string | null;
  title: string;
  protocol: string | null;
  front: string | null;
  minutes: number;
};

export type ContextFilter = 'all' | 'deliverable' | 'project' | 'interaction';
export type FrontTone = 'purple' | 'blue' | 'green' | 'gold';

const kindTones: Record<string, string> = {
  Entregável: 'tw:bg-cali-blue-surface tw:text-cali-blue-text',
  Subtarefa: 'tw:bg-cali-violet-surface tw:text-cali-violet-strong',
  Ocorrência: 'tw:bg-cali-gold-soft tw:text-cali-gold-text',
};

const frontTones: Record<FrontTone, string> = {
  purple: 'tw:bg-cali-violet-surface tw:text-cali-violet-text',
  blue: 'tw:bg-cali-blue-surface tw:text-cali-blue-accent',
  green: 'tw:bg-cali-teal-surface tw:text-cali-green-accent',
  gold: 'tw:bg-cali-orange-surface tw:text-cali-gold-text',
};

export function ClientHoursLedger({ rows, filter, onFilter, toneOf }: {
  rows: ClientHourRow[];
  filter: ContextFilter;
  onFilter: (filter: ContextFilter) => void;
  toneOf: (front: string) => FrontTone;
}) {
  return (
    <>
      <header className="tw:mb-4 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
        <h2 className="tw:m-0 tw:text-lg tw:leading-[inherit] tw:font-bold tw:tracking-[-.02em]">Onde o tempo foi investido</h2>
        <span className="tw:text-xs tw:leading-[inherit] tw:text-cali-sand-text">{rows.length} {rows.length === 1 ? 'item neste período' : 'itens neste período'}</span>
        <label className="tw:flex tw:items-center tw:gap-2.5 tw:text-sm tw:leading-[inherit] tw:text-(--v2-text-746a64)">
          Tipo
          <Select variant="filter" className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:py-2.5 tw:text-sm tw:leading-[inherit]" value={filter} onChange={(event) => onFilter(event.target.value as ContextFilter)}>
            <option value="all">Todos</option>
            <option value="deliverable">Entregáveis e subtarefas</option>
            <option value="project">Projeto</option>
            <option value="interaction">Ocorrências e outras</option>
          </Select>
        </label>
      </header>
      {rows.length === 0 ? <EmptyState variant="workflow">Nenhum registro de horas neste período.</EmptyState> : (
        <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-surface" tabIndex={0} aria-label="Extrato de horas do período" role="region">
          <table className="tw:w-full tw:min-w-224 tw:table-fixed tw:border-collapse tw:text-left tw:text-sm tw:leading-[inherit]">
            <colgroup><col className="tw:w-40" /><col /><col className="tw:w-[8.46rem]" /><col className="tw:w-[9.23rem]" /><col className="tw:w-[13.08rem]" /><col className="tw:w-27.5" /></colgroup>
            <thead className="tw:bg-cali-neutral-soft tw:text-xs tw:leading-[inherit] tw:text-cali-muted">
              <tr className="tw:[&>th]:px-3 tw:[&>th]:py-3.5 tw:[&>th]:font-semibold">
                <th scope="col">Projeto</th><th scope="col">Tarefa</th><th scope="col">Tipo</th><th scope="col">Frente</th><th scope="col">Protocolo</th><th scope="col" className="tw:text-right">Duração</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:hover:bg-cali-surface-soft tw:[&>td]:px-3 tw:[&>td]:py-5" key={JSON.stringify([row.kind, row.project, row.title, row.protocol, row.front])}>
                  <td className="tw:text-cali-body tw:leading-[inherit] tw:text-cali-muted">{row.project || '—'}</td>
                  <td className="tw:font-bold tw:text-cali-neutral-text tw:[overflow-wrap:anywhere]">{row.title}</td>
                  <td><span className={`tw:inline-flex tw:min-h-7 tw:items-center tw:rounded-lg tw:px-3 tw:text-cali-detail tw:leading-[inherit] tw:font-bold ${kindTones[row.kind] ?? 'tw:bg-cali-neutral-soft tw:text-cali-muted'}`}>{row.kind === 'Outras' ? 'Assessoria' : row.kind}</span></td>
                  <td>{row.front ? <span className={`tw:inline-block tw:max-w-full tw:rounded-md tw:px-2 tw:py-1.5 tw:[overflow-wrap:anywhere] tw:text-cali-label tw:leading-[inherit] tw:font-semibold ${frontTones[toneOf(row.front)]}`}>{row.front}</span> : '—'}</td>
                  <td className="tw:truncate tw:text-cali-detail tw:leading-[inherit] tw:text-cali-muted" title={row.protocol || undefined}>{row.protocol || '—'}</td>
                  <td className="tw:text-right tw:font-bold tw:text-cali-burgundy-accent">{minutesLabel(row.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
