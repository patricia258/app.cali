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
  Entregável: 'tw:bg-[#e6eef7] tw:text-[#2c5a86]',
  Subtarefa: 'tw:bg-[#ece8f4] tw:text-[#57467a]',
  Ocorrência: 'tw:bg-[#fdf0cc] tw:text-[#7a5606]',
};

const frontTones: Record<FrontTone, string> = {
  purple: 'tw:bg-[#f0ebfa] tw:text-[#7756a8]',
  blue: 'tw:bg-[#e6f1fb] tw:text-[#497ca5]',
  green: 'tw:bg-[#e2f5eb] tw:text-[#28805d]',
  gold: 'tw:bg-[#fff3db] tw:text-[#94642d]',
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
        <h2 className="tw:m-0 tw:text-[1.077rem] tw:leading-[inherit] tw:font-bold tw:tracking-[-.02em]">Onde o tempo foi investido</h2>
        <span className="tw:text-[.77rem] tw:leading-[inherit] tw:text-[#aa9f97]">{rows.length} {rows.length === 1 ? 'item neste período' : 'itens neste período'}</span>
        <label className="tw:flex tw:items-center tw:gap-2.5 tw:text-[.846rem] tw:leading-[inherit] tw:text-(--v2-text-746a64)">
          Tipo
          <select className="tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-2.5 tw:text-[.846rem] tw:leading-[inherit]" value={filter} onChange={(event) => onFilter(event.target.value as ContextFilter)}>
            <option value="all">Todos</option>
            <option value="deliverable">Entregáveis e subtarefas</option>
            <option value="project">Projeto</option>
            <option value="interaction">Ocorrências e outras</option>
          </select>
        </label>
      </header>
      {rows.length === 0 ? <EmptyState variant="workflow">Nenhum registro de horas neste período.</EmptyState> : (
        <div className="tw:overflow-x-auto tw:rounded-xl tw:border tw:border-solid tw:border-[#e7dfd8] tw:bg-white" tabIndex={0} aria-label="Extrato de horas do período" role="region">
          <table className="tw:w-full tw:min-w-[56rem] tw:table-fixed tw:border-collapse tw:text-left tw:text-[.846rem] tw:leading-[inherit]">
            <colgroup><col className="tw:w-[10rem]" /><col /><col className="tw:w-[8.46rem]" /><col className="tw:w-[9.23rem]" /><col className="tw:w-[13.08rem]" /><col className="tw:w-[6.92rem]" /></colgroup>
            <thead className="tw:bg-[#f2eeea] tw:text-[.77rem] tw:leading-[inherit] tw:text-[#948a84]">
              <tr className="tw:[&>th]:px-3 tw:[&>th]:py-3.5 tw:[&>th]:font-semibold">
                <th scope="col">Projeto</th><th scope="col">Tarefa</th><th scope="col">Tipo</th><th scope="col">Frente</th><th scope="col">Protocolo</th><th scope="col" className="tw:text-right">Duração</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="tw:border-0 tw:border-b tw:border-solid tw:border-[#f0eae5] tw:hover:bg-[#faf7f4] tw:[&>td]:px-3 tw:[&>td]:py-5" key={JSON.stringify([row.kind, row.project, row.title, row.protocol, row.front])}>
                  <td className="tw:text-[.923rem] tw:leading-[inherit] tw:text-[#5f5650]">{row.project || '—'}</td>
                  <td className="tw:font-bold tw:text-[#473c38] tw:[overflow-wrap:anywhere]">{row.title}</td>
                  <td><span className={`tw:inline-flex tw:min-h-7 tw:items-center tw:rounded-lg tw:px-3 tw:text-[.81rem] tw:leading-[inherit] tw:font-bold ${kindTones[row.kind] ?? 'tw:bg-[#f1ebe6] tw:text-[#5f5650]'}`}>{row.kind === 'Outras' ? 'Assessoria' : row.kind}</span></td>
                  <td>{row.front ? <span className={`tw:inline-block tw:max-w-full tw:rounded-md tw:px-2 tw:py-1.5 tw:[overflow-wrap:anywhere] tw:text-[.69rem] tw:leading-[inherit] tw:font-semibold ${frontTones[toneOf(row.front)]}`}>{row.front}</span> : '—'}</td>
                  <td className="tw:truncate tw:text-[.81rem] tw:leading-[inherit] tw:text-[#9a8d85]" title={row.protocol || undefined}>{row.protocol || '—'}</td>
                  <td className="tw:text-right tw:font-bold tw:text-[#592535]">{minutesLabel(row.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
