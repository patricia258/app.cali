import { format } from 'date-fns';
import { Download, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DashboardData } from '../../../../api/admin/overview/portfolio';
import { Button } from '../../../../components/ds/Button';
import { DialogFrame } from '../../../../components/ds/DialogFrame';
import { InlineNotice } from '../../../../components/ds/InlineNotice';
import { dateLabel, formatHours, statusNames } from '../overviewFormatting';
import './overview-paper.css';
import overviewPrintStyles from './overview-print.css?inline';

type ExportRange = "month" | "quarter" | "year";

function overviewExportBounds(range: ExportRange) {
  const now = new Date();
  const start =
    range === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : range === "quarter"
        ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        : new Date(now.getFullYear(), 0, 1);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(now, "yyyy-MM-dd"),
  };
}

function readPrintStyles(sheet: CSSStyleSheet): string {
  try {
    return Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n');
  } catch {
    // Folhas externas sem acesso ao CSSOM não impedem a impressão.
    return '';
  }
}

export function ExportOverview({ data }: { data: DashboardData }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<ExportRange>("month");
  const [companyId, setCompanyId] = useState("all");
  const bounds = overviewExportBounds(range);
  const selectedCompanies =
    companyId === "all"
      ? data.companies
      : data.companies.filter((item) => item.id === companyId);
  const selectedIds = new Set(selectedCompanies.map((item) => item.id));
  const exportEntries = data.entries.filter(
    (item) =>
      selectedIds.has(item.companyId) &&
      (!item.workDate ||
        (item.workDate >= bounds.start && item.workDate <= bounds.end)),
  );
  const exportDeliverables = data.deliverables.filter(
    (item) =>
      selectedIds.has(item.companyId) &&
      (!item.dueAt ||
        (item.dueAt.slice(0, 10) >= bounds.start &&
          item.dueAt.slice(0, 10) <= bounds.end)),
  );
  const exportProjects = data.projects.filter((item) => selectedIds.has(item.companyId));
  const exportEvents = data.events.filter((item) => {
    const day = format(new Date(item.startsAt), "yyyy-MM-dd");
    return selectedIds.has(item.companyId) && day >= bounds.start && day <= bounds.end;
  });
  const exportDistribution = Object.entries(data.satisfaction.distribution).sort(([a], [b]) => Number(a) - Number(b));
  const totalMinutes = exportEntries.reduce(
    (sum, item) => sum + item.minutes,
    0,
  );
  const groupedHours = selectedCompanies.map((company) => ({
    company,
    minutes: exportEntries
      .filter((item) => item.companyId === company.id)
      .reduce((sum, item) => sum + item.minutes, 0),
  }));
  const periodLabel =
    range === "month"
      ? "Mês atual"
      : range === "quarter"
        ? "Trimestre atual"
        : "Ano atual";
  const [printError, setPrintError] = useState('');
  const printDocument = useRef<HTMLElement>(null);
  function printPdf() {
    setPrintError('');
    const documentNode = printDocument.current;
    if (!documentNode) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1100,height=900",
    );
    if (!printWindow) {
      setPrintError(
        "O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.",
      );
      return;
    }

    const css = Array.from(document.styleSheets, readPrintStyles).join('\n');

    const target = printWindow.document;
    if (!target.doctype) target.prepend(target.implementation.createDocumentType('html', '', ''));
    target.documentElement.lang = 'pt-BR';
    target.title = 'Panorama do Workspace';
    const styles = target.createElement('style');
    styles.textContent = `${css}\n${overviewPrintStyles}`;
    target.head.append(styles);
    target.body.replaceChildren(target.importNode(documentNode, true));
    printWindow.focus();

    // A impressão precisa acontecer no mesmo gesto que abriu a janela.
    // Aguardar load/Promise faz o Chrome abrir uma prévia vazia.
    printWindow.print();
  }
  return (
    <>
      <Button type="button" variant="adminOutline" onClick={() => setOpen(true)}><Download size={15} /> Exportar</Button>
      {open && createPortal((
        <DialogFrame
          className="tw:fixed tw:inset-0 tw:z-10000 tw:isolate tw:grid tw:place-items-center tw:bg-cali-overlay/72 tw:p-7.5 tw:backdrop-blur-[0.615rem] tw:max-[42.5rem]:p-3"
          as="div"
          aria-label="Exportar visão geral"
        >
          <section className="tw:grid tw:max-h-[calc(100dvh-3.692rem)] tw:w-[min(86.154rem,100%)] tw:grid-rows-[auto_auto_minmax(0,1fr)_auto] tw:overflow-hidden tw:rounded-[1.692rem] tw:border tw:border-solid tw:border-cali-gold/38 tw:bg-cali-surface tw:shadow-cali-dialog tw:workspace-night:bg-cali-burgundy-inverse tw:max-[42.5rem]:max-h-[calc(100dvh-1.538rem)] tw:max-[42.5rem]:rounded-[1.231rem]">
            <header className="tw:flex tw:justify-between tw:gap-6 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:px-8 tw:pt-7 tw:pb-5.5 tw:max-[42.5rem]:px-5">
              <div>
                <span className="section-kicker tw:workspace-compact:block tw:workspace-compact:text-xs/[inherit] tw:workspace-compact:font-bold tw:workspace-compact:tracking-[0.077rem] tw:workspace-compact:text-cali-muted">EXPORTAÇÃO</span>
                <h2 className="tw:my-1! tw:text-cali-title-lg/[inherit] tw:text-cali-text">Visão geral da operação</h2>
                <p className="tw:m-0 tw:text-cali-body/[inherit] tw:text-cali-muted">
                  Escolha o recorte e revise a prévia antes de salvar em PDF.
                </p>
              </div>
              <button
                className="tw:grid tw:size-11 tw:cursor-pointer tw:place-items-center tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:p-2.5 tw:text-cali-ink"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </header>
            <div className="tw:flex tw:gap-3.5 tw:border-0 tw:border-b tw:border-solid tw:border-cali-line tw:bg-cali-surface-soft tw:px-8 tw:py-5 tw:workspace-night:bg-cali-burgundy-strong tw:max-[42.5rem]:grid tw:max-[42.5rem]:px-5">
              <label className="tw:grid tw:min-w-[14.615rem] tw:gap-2 tw:max-[42.5rem]:w-full">
                <span className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[0.08em] tw:text-cali-muted tw:uppercase">Período</span>
                <select
                  className="tw:h-13 tw:min-w-[14.615rem] tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body/[inherit] tw:text-cali-text tw:workspace-night:bg-cali-burgundy-inverse tw:workspace-night:text-cali-day-canvas"
                  value={range}
                  onChange={(event) =>
                    setRange(event.target.value as ExportRange)
                  }
                >
                  <option value="month">Mês atual</option>
                  <option value="quarter">Trimestre atual</option>
                  <option value="year">Ano atual</option>
                </select>
              </label>
              <label className="tw:grid tw:min-w-[14.615rem] tw:gap-2 tw:max-[42.5rem]:w-full">
                <span className="tw:text-xs/[inherit] tw:font-extrabold tw:tracking-[0.08em] tw:text-cali-muted tw:uppercase">Cliente</span>
                <select
                  className="tw:h-13 tw:min-w-[14.615rem] tw:rounded-cali-compact-control tw:border tw:border-solid tw:border-cali-input-line tw:bg-cali-neutral-surface tw:px-3.5 tw:py-3 tw:text-cali-body/[inherit] tw:text-cali-text tw:workspace-night:bg-cali-burgundy-inverse tw:workspace-night:text-cali-day-canvas"
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                >
                  <option value="all">Todos os clientes</option>
                  {data.companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="tw:overflow-auto tw:bg-cali-line/32 tw:p-8.5 tw:workspace-night:bg-cali-canvas tw:max-[42.5rem]:p-3.5">
              <article className="overview-export-print" ref={printDocument}>
                <header className="overview-export-document-head">
                  <span className="overview-export-brand-logo" aria-label="CALI Workspace" />
                  <div>
                    <span>VISÃO GERAL DA OPERAÇÃO</span>
                    <strong>{periodLabel}</strong>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(new Date())}
                    </small>
                  </div>
                </header>
                <div className="overview-export-rule" />
                <section className="overview-export-title">
                  <span>CALI · OPERAÇÃO</span>
                  <h1>Panorama do Workspace</h1>
                  <p>
                    {companyId === "all"
                      ? "Consolidado de todos os clientes ativos."
                      : `Recorte da conta ${selectedCompanies[0]?.name || "selecionada"}.`}
                  </p>
                </section>
                <section className="overview-export-kpis">
                  <div>
                    <small>Contas no recorte</small>
                    <strong>{selectedCompanies.length}</strong>
                  </div>
                  <div>
                    <small>Horas registradas</small>
                    <strong>{formatHours(totalMinutes)}</strong>
                  </div>
                  <div>
                    <small>Entregáveis</small>
                    <strong>{exportDeliverables.length}</strong>
                  </div>
                  <div>
                    <small>Avaliações acumuladas</small>
                    <strong>{data.satisfaction.total}</strong>
                  </div>
                </section>
                <section className="overview-export-section">
                  <div className="overview-export-section-head">
                    <span>CONSUMO POR CLIENTE</span>
                    <strong>Horas registradas no período</strong>
                  </div>
                  {groupedHours.length ? (
                    <div className="overview-export-bars">
                      {groupedHours.map(({ company, minutes }) => (
                        <div key={company.id}>
                          <span>{company.name}</span>
                          <i>
                            <b
                              style={{
                                width: `${Math.min(100, company.contracted ? (minutes / 60 / company.contracted) * 100 : 0)}%`,
                              }}
                            />
                          </i>
                          <strong>{formatHours(minutes)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="overview-export-empty">
                      Nenhum cliente encontrado no recorte.
                    </p>
                  )}
                </section>
                <section className="overview-export-section">
                  <div className="overview-export-section-head">
                    <span>ENTREGÁVEIS E PRAZOS</span>
                    <strong>Itens vinculados ao período</strong>
                  </div>
                  {exportDeliverables.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Entregável</th>
                          <th>Status</th>
                          <th>Prazo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exportDeliverables.slice(0, 14).map((item) => (
                          <tr key={item.id}>
                            <td>
                              {data.companies.find(
                                (company) => company.id === item.companyId,
                              )?.name || "Cliente"}
                            </td>
                            <td>{item.title}</td>
                            <td>{statusNames[item.status] || item.status}</td>
                            <td>{dateLabel(item.dueAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="overview-export-empty">
                      Nenhum entregável com prazo no recorte.
                    </p>
                  )}
                </section>
                <section className="overview-export-section">
                  <div className="overview-export-section-head">
                    <span>PROJETOS NO RECORTE</span>
                    <strong>Carteira e situação atual</strong>
                  </div>
                  {exportProjects.length ? (
                    <table>
                      <thead><tr><th>Cliente</th><th>Projeto</th><th>Status</th><th>Entregáveis</th></tr></thead>
                      <tbody>{exportProjects.slice(0, 12).map((project) => <tr key={project.id}>
                        <td>{data.companies.find((company) => company.id === project.companyId)?.name || "Cliente"}</td>
                        <td>{project.name}</td>
                        <td>{statusNames[project.planningStatus || project.status || ""] || project.planningStatus || project.status || "Sem status"}</td>
                        <td>{exportDeliverables.filter((item) => item.projectId === project.id).length}</td>
                      </tr>)}</tbody>
                    </table>
                  ) : <p className="overview-export-empty">Nenhum projeto encontrado no recorte.</p>}
                </section>
                <section className="overview-export-section overview-export-signal-grid">
                  <div>
                    <div className="overview-export-section-head"><span>SATISFAÇÃO</span><strong>Sinais registrados</strong></div>
                    <p className="overview-export-metric"><b>{data.satisfaction.average == null ? "—" : `${data.satisfaction.average.toFixed(1).replace(".", ",")}/5`}</b><small>{data.satisfaction.total} avaliações acumuladas</small></p>
                    {exportDistribution.length ? <div className="overview-export-distribution">{exportDistribution.map(([score, count]) => <span key={score}><b>{score}</b><i><em style={{width:`${data.satisfaction.total ? (count / data.satisfaction.total) * 100 : 0}%`}} /></i><small>{count}</small></span>)}</div> : <p className="overview-export-empty">Sem avaliações registradas.</p>}
                  </div>
                  <div>
                    <div className="overview-export-section-head"><span>AGENDA</span><strong>Compromissos no período</strong></div>
                    {exportEvents.length ? <div className="overview-export-events">{exportEvents.slice(0, 6).map((event) => <span key={event.id}><b>{dateLabel(event.startsAt)}</b><small>{event.title}</small></span>)}</div> : <p className="overview-export-empty">Nenhum compromisso no recorte.</p>}
                  </div>
                </section>
                <footer className="overview-export-document-foot">
                  <span>
                    Documento gerado pelo CALI Workspace · Dados operacionais do
                    Supabase
                  </span>
                  <strong>
                    {bounds.start} a {bounds.end}
                  </strong>
                </footer>
              </article>
            </div>
            {printError && <InlineNotice role="alert">{printError}</InlineNotice>}
            <footer className="tw:flex tw:items-center tw:justify-end tw:gap-3 tw:border-0 tw:border-t tw:border-solid tw:border-cali-line tw:px-8.5 tw:py-4.5 tw:max-[42.5rem]:flex-col-reverse tw:max-[42.5rem]:px-5">
              <Button
                variant="secondary"
                className="tw:min-h-0! tw:rounded-lg! tw:border-cali-line-strong! tw:bg-cali-neutral-surface! tw:px-4.5! tw:py-3! tw:text-sm/[1.2]! tw:text-cali-brand! tw:shadow-none! tw:max-[42.5rem]:w-full tw:max-[42.5rem]:justify-center"
                type="button"
                onClick={() => setOpen(false)}
              >
                Voltar
              </Button>
              <Button variant="primary" className="tw:min-h-0! tw:rounded-lg! tw:border-cali-brand! tw:bg-cali-brand! tw:px-4.5! tw:py-3! tw:text-sm/[1.2]! tw:text-cali-neutral-surface! tw:shadow-none! tw:max-[42.5rem]:w-full tw:max-[42.5rem]:justify-center" type="button" onClick={printPdf}>
                Abrir visualização do PDF
              </Button>
            </footer>
          </section>
        </DialogFrame>
      ), document.body)}
    </>
  );
}
