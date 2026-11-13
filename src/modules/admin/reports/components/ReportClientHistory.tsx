import { Fragment, useState, type ReactNode } from 'react';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { LoadingState } from '../../../../components/ds/LoadingState';
import { useClientReportHistory } from '../hooks/useClientReportHistory';

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
    : '—';
}

function monthLabel(value?: string | null) {
  const date = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
    : '—';
}

export function ReportClientHistory({ companyId, currentId, onClose, renderCorrection }: {
  companyId: string;
  currentId: string;
  onClose: () => void;
  renderCorrection: (reportId: string) => ReactNode;
}) {
  const { data, isPending } = useClientReportHistory(companyId);
  const [expanded, setExpanded] = useState<string[]>([]);

  return (
    <div className="modal-backdrop full-screen-modal" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <DialogFrame aria-label="Histórico do cliente" className="modal-card tw:w-[min(56.25rem,94vw)]! tw:max-w-[56.25rem]!">
        <button className="modal-close" type="button" aria-label="Fechar" onClick={onClose}>×</button>
        <span className="section-kicker">RASTREABILIDADE</span>
        <h2>Histórico do cliente</h2>
        {isPending ? <LoadingState>Carregando histórico…</LoadingState> : data ? (
          <>
            <p className="tw:mt-1 tw:mb-5 tw:text-cali-muted">{data.companyName}</p>
            <div className="tw:overflow-auto tw:rounded-xl tw:border tw:border-solid tw:border-cali-line">
              <table className="tw:w-full tw:min-w-[42.5rem] tw:border-collapse tw:text-xs">
                <thead className="tw:bg-[var(--theme-surface-soft)] tw:text-cali-muted">
                  <tr>
                    {['Referência', 'Tipo', 'Leitura', 'Ciência', 'Ações'].map((label) => (
                      <th className="tw:border-b tw:border-solid tw:border-cali-line tw:px-3.5 tw:py-3 tw:text-left tw:text-[0.7rem] tw:uppercase tw:tracking-wider" key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.consolidated.map((item) => {
                    const opens = Number(item.client_open_count || 0);
                    const isExpanded = expanded.includes(item.id);
                    const events = data.eventsByReport.get(item.id) ?? [];
                    const detail = [
                      ['Versão', `v${Number(item.version || 1)}`],
                      ['Enviado', formatDate(item.sent_at)],
                      ['Acessos', opens],
                      ['Primeiro acesso', formatDate(item.client_first_opened_at)],
                      ['Último acesso', formatDate(item.client_last_opened_at)],
                      ['PDF', Number(item.client_pdf_count || 0)],
                    ];
                    return (
                      <Fragment key={item.id}>
                        <tr className={item.id === currentId ? 'tw:shadow-[inset_0.1875rem_0_0_var(--tw-color-cali-gold)]' : undefined}>
                          <td className="tw:border-b tw:border-solid tw:border-cali-line tw:p-3.5"><strong>{monthLabel(item.period_start)}</strong></td>
                          <td className="tw:border-b tw:border-solid tw:border-cali-line tw:p-3.5">{item.report_type === 'quarterly' ? 'Trimestral' : 'Mensal'}</td>
                          <td className="tw:border-b tw:border-solid tw:border-cali-line tw:p-3.5"><HistoryStatus complete={opens > 0} label={opens > 0 ? 'Visualizado' : 'Não visualizado'} /></td>
                          <td className="tw:border-b tw:border-solid tw:border-cali-line tw:p-3.5"><HistoryStatus complete={Boolean(item.acknowledged_at)} label={item.acknowledged_at ? 'Registrada' : 'Pendente'} /></td>
                          <td className="tw:border-b tw:border-solid tw:border-cali-line tw:p-3.5">
                            <div className="tw:flex tw:justify-end tw:gap-3 tw:whitespace-nowrap">
                              <a className="tw:font-bold tw:text-cali-brand tw:hover:underline tw:workspace-night:text-cali-gold" href={`/admin/relatorios/impressao/${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer">Ver versão</a>
                              <button
                                className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:font-extrabold tw:text-cali-brand tw:hover:underline tw:workspace-night:text-cali-gold"
                                type="button"
                                aria-expanded={isExpanded}
                                onClick={() => setExpanded((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}
                              >{isExpanded ? 'Ocultar detalhes' : 'Detalhes'}</button>
                              {renderCorrection(item.id)}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="tw:bg-cali-gold/5 tw:px-3.5 tw:pt-2 tw:pb-4">
                              <dl className="tw:m-0 tw:grid tw:grid-cols-6 tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:max-md:grid-cols-2">
                                {detail.map(([label, value]) => (
                                  <div key={label} className="tw:border-r tw:border-solid tw:border-cali-line tw:p-3">
                                    <dt className="tw:mb-1 tw:text-[0.65rem] tw:font-extrabold tw:tracking-wide tw:text-cali-muted tw:uppercase">{label}</dt>
                                    <dd className="tw:m-0 tw:font-bold tw:break-words">{value}</dd>
                                  </div>
                                ))}
                                {item.acknowledgement_protocol && (
                                  <div className="tw:col-span-full tw:border-t tw:border-solid tw:border-cali-line tw:p-3">
                                    <dt className="tw:mb-1 tw:text-[0.65rem] tw:font-extrabold tw:text-cali-muted tw:uppercase">Protocolo da ciência</dt>
                                    <dd className="tw:m-0 tw:font-bold">{item.acknowledgement_protocol}</dd>
                                  </div>
                                )}
                              </dl>
                              <div className="tw:mt-2 tw:grid">
                                {events.length ? events.map((event) => (
                                  <div key={event.id} className="tw:grid tw:grid-cols-[8rem_1fr_auto] tw:gap-3 tw:border-b tw:border-solid tw:border-cali-line tw:py-2 tw:last:border-b-0 tw:max-md:grid-cols-1 tw:max-md:gap-1">
                                    <time dateTime={event.date}>{formatDate(event.date)}</time><strong>{event.label}</strong><b>{event.actor}</b>
                                  </div>
                                )) : <span className="tw:py-2 tw:text-cali-muted">Nenhum evento adicional registrado.</span>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : <InlineNotice>Não foi possível carregar o histórico.</InlineNotice>}
      </DialogFrame>
    </div>
  );
}

function HistoryStatus({ complete, label }: { complete: boolean; label: string }) {
  return (
    <span className={complete
      ? 'tw:inline-block tw:rounded-full tw:bg-[#eaf0e8] tw:px-2 tw:py-1 tw:font-bold tw:whitespace-nowrap tw:text-[#4d694a]'
      : 'tw:inline-block tw:rounded-full tw:bg-[#f4edda] tw:px-2 tw:py-1 tw:font-bold tw:whitespace-nowrap tw:text-[#80632e]'}>
      {label}
    </span>
  );
}
