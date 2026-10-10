import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { ArrowRight, CalendarDays, ChevronRight, CircleAlert, Clock3, Download, MessageSquareText, Plus, X } from "lucide-react";
import { Shell } from "../../components/WorkspaceShell";
import { supabase } from "../../lib/supabase";
import { resolveWorkspaceMedia } from "../../lib/workspaceMedia";

type Company = {
  id: string;
  name: string;
  service: string;
  contracted: number;
  mark: string;
  logoUrl?: string;
};
type Project = {
  id: string;
  companyId: string;
  name: string;
  planningStatus?: string | null;
  status?: string | null;
};
type Deliverable = {
  id: string;
  companyId: string;
  projectId?: string | null;
  title: string;
  status: string;
  dueAt?: string | null;
};
type AgendaEvent = {
  id: string;
  companyId: string;
  title: string;
  startsAt: string;
  type: "meeting" | "validation" | "deadline";
};
type Satisfaction = {
  average: number | null;
  total: number;
  distribution: Record<string, number>;
  monthly: Array<{ month: string; average: number | null; count: number }>;
  recent: Array<{
    score: number;
    company?: string | null;
    protocol?: string | null;
    title?: string | null;
    createdAt: string;
  }>;
};
type DashboardData = {
  companies: Company[];
  projects: Project[];
  deliverables: Deliverable[];
  entries: Array<{
    companyId: string;
    minutes: number;
    workDate?: string | null;
  }>;
  events: AgendaEvent[];
  satisfaction: Satisfaction;
};

const emptySatisfaction: Satisfaction = {
  average: null,
  total: 0,
  distribution: {},
  monthly: [],
  recent: [],
};

const statusNames: Record<string, string> = {
  approved: "Aprovados",
  in_progress: "Em andamento",
  client_review: "Com cliente",
  internal_review: "Revisão interna",
  adjustment_requested: "Ajuste",
  rebriefing: "Rebriefing",
  not_started: "Não iniciado",
  standby: "Standby",
};
const tones = ["#5A1E2D", "#B58C52", "#8A6B73", "#D9C9BE", "#C98E62"];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}
function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
    now,
  };
}
function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1).replace(".", ",")}h`;
}
function dateLabel(value?: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sem data"
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
        .format(date)
        .replace(".", "");
}
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
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  };
}

function ExportOverview({ data }: { data: DashboardData }) {
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
  const exportEvents = data.events.filter(
    (item) => selectedIds.has(item.companyId) && item.startsAt.slice(0, 10) >= bounds.start && item.startsAt.slice(0, 10) <= bounds.end,
  );
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
  function printPdf() {
    const documentNode =
      document.querySelector<HTMLElement>(".overview-export-print");
    if (!documentNode) return;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1100,height=900",
    );
    if (!printWindow) {
      window.alert(
        "O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente novamente.",
      );
      return;
    }

    let css = "";
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        css += Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        // Folhas externas sem acesso ao CSSOM não impedem a impressão.
      }
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Panorama do Workspace</title>
    <style>${css}</style>
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .overview-export-print {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        background: #f7f3ee !important;
        color: #2b2b2b !important;
      }
      .overview-export-print * {
        visibility: visible !important;
        opacity: 1 !important;
      }
    </style>
  </head>
  <body>${documentNode.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();

    // A impressão precisa acontecer no mesmo gesto que abriu a janela.
    // Aguardar load/Promise faz o Chrome abrir uma prévia vazia.
    printWindow.print();
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}><Download size={15} /> Exportar</button>
      {open && createPortal((
        <div
          className="overview-export-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Exportar visão geral"
        >
          <section className="overview-export-modal">
            <header className="overview-export-toolbar">
              <div>
                <span className="section-kicker">EXPORTAÇÃO</span>
                <h2>Visão geral da operação</h2>
                <p>
                  Escolha o recorte e revise a prévia antes de salvar em PDF.
                </p>
              </div>
              <button
                className="overview-export-close"
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </header>
            <div className="overview-export-filters">
              <label>
                <span>Período</span>
                <select
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
              <label>
                <span>Cliente</span>
                <select
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
            <div className="overview-export-preview-wrap">
              <article className="overview-export-print">
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
            <footer className="overview-export-actions">
              <button
                className="secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Voltar
              </button>
              <button className="primary" type="button" onClick={printPdf}>
                Abrir visualização do PDF
              </button>
            </footer>
          </section>
        </div>
      ), document.body)}
    </>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    companies: [],
    projects: [],
    deliverables: [],
    entries: [],
    events: [],
    satisfaction: emptySatisfaction,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = 0;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { start, next, now } = monthBounds();
      const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        .toISOString()
        .slice(0, 10);
      try {
        const [
          companies,
          projects,
          deliverables,
          entries,
          events,
          satisfaction,
        ] = await Promise.all([
          supabase
            .from("companies")
            .select(
              "id,display_name,logo_url,service_type,service_plan,monthly_hours_contracted",
            )
            .neq("status", "closed")
            .order("display_name"),
          supabase
            .from("projects")
            .select("id,company_id,name,planning_status,status")
            .neq("status", "closed")
            .order("updated_at", { ascending: false }),
          supabase
            .from("deliverables")
            .select("id,company_id,project_id,title,status,due_at")
            .neq("status", "cancelled")
            .order("due_at", { ascending: true }),
          supabase
            .from("hour_entries")
            .select("company_id,minutes,work_date")
            .gte("work_date", historyStart)
            .lt("work_date", next),
          supabase
            .from("events")
            .select("id,company_id,title,starts_at,event_type")
            .gte("starts_at", now.toISOString())
            .lt(
              "starts_at",
              new Date(now.getTime() + 15 * 86400000).toISOString(),
            )
            .is("cancelled_at", null)
            .order("starts_at"),
          supabase.rpc("get_admin_satisfaction_overview"),
        ]);
        if (cancelled) return;
        const companyData: Company[] = await Promise.all(
          ((companies.data || []) as any[]).map(async (row) => ({
            id: row.id,
            name: row.display_name || "Cliente",
            service: row.service_plan || row.service_type || "Serviço CALI",
            contracted: Number(row.monthly_hours_contracted || 0),
            mark: String(row.display_name || "C")
              .trim()
              .slice(0, 1)
              .toUpperCase(),
            logoUrl: await resolveWorkspaceMedia(row.logo_url),
          })),
        );
        const satisfactionData =
          satisfaction.error || !satisfaction.data
            ? emptySatisfaction
            : (satisfaction.data as Satisfaction);
        setData({
          companies: companyData,
          projects: ((projects.data || []) as any[]).map((row) => ({
            id: row.id,
            companyId: row.company_id,
            name: row.name || "Projeto",
            planningStatus: row.planning_status,
            status: row.status,
          })),
          deliverables: ((deliverables.data || []) as any[]).map((row) => ({
            id: row.id,
            companyId: row.company_id,
            projectId: row.project_id,
            title: row.title || "Entregável",
            status: row.status,
            dueAt: row.due_at,
          })),
          entries: ((entries.data || []) as any[]).map((row) => ({
            companyId: row.company_id,
            minutes: Number(row.minutes || 0),
            workDate: row.work_date,
          })),
          events: ((events.data || []) as any[]).map((row) => ({
            id: row.id,
            companyId: row.company_id,
            title: row.title || "Compromisso",
            startsAt: row.starts_at,
            type:
              row.event_type === "meeting"
                ? "meeting"
                : row.event_type === "deadline"
                  ? "deadline"
                  : "validation",
          })),
          satisfaction: satisfactionData,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    function scheduleReload() {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(), 250);
    }
    void load();
    if (!supabase)
      return () => {
        cancelled = true;
      };
    const channel = supabase
      .channel("admin-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "companies" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "projects" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "deliverables" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "hour_entries" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "events" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "cali_workspace", table: "nps_responses" },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "cali_workspace",
          table: "account_record_feedback",
        },
        scheduleReload,
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      if (supabase) void supabase.removeChannel(channel);
    };
  }, []);

  const companyMap = useMemo(
    () => new Map(data.companies.map((item) => [item.id, item])),
    [data.companies],
  );
  const currentPeriod = monthBounds();
  const currentEntries = useMemo(
    () =>
      data.entries.filter(
        (entry) =>
          !entry.workDate ||
          (entry.workDate >= currentPeriod.start &&
            entry.workDate < currentPeriod.next),
      ),
    [data.entries, currentPeriod.start, currentPeriod.next],
  );
  const minutesByCompany = useMemo(
    () =>
      currentEntries.reduce(
        (map, entry) =>
          map.set(
            entry.companyId,
            (map.get(entry.companyId) || 0) + entry.minutes,
          ),
        new Map<string, number>(),
      ),
    [currentEntries],
  );
  const totalMinutes = currentEntries.reduce(
    (sum, item) => sum + item.minutes,
    0,
  );
  const totalContracted = data.companies.reduce(
    (sum, item) => sum + item.contracted,
    0,
  );
  const pendingDeliverables = data.deliverables.filter(
    (item) => !["approved", "cancelled"].includes(item.status),
  );
  const statusData = Object.entries(
    data.deliverables.reduce<Record<string, number>>((map, item) => {
      map[item.status] = (map[item.status] || 0) + 1;
      return map;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const deadlines = data.deliverables
    .filter((item) => item.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
    .slice(0, 5);
  const npsMonths = (data.satisfaction.monthly || []).map((item) => ({
    label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(new Date(`${item.month}T12:00:00`))
      .replace(".", "")
      .replace(/^./, (x) => x.toUpperCase()),
    average: Number(item.average || 0),
  }));
  const actions = [
    ...data.projects
      .filter((item) => item.planningStatus === "client_review")
      .slice(0, 1)
      .map((item) => ({
        icon: <CircleAlert size={20} />,
        title: "Cronograma aguardando cliente",
        detail: item.name,
        helper: "Aprovação necessária",
        href: "/admin/projetos",
      })),
    ...data.deliverables
      .filter((item) => item.status === "adjustment_requested")
      .slice(0, 1)
      .map((item) => ({
        icon: <MessageSquareText size={20} />,
        title: "Ajuste solicitado pelo cliente",
        detail: item.title,
        helper: "Abrir entregável",
        href: "/admin/projetos",
      })),
    ...data.companies
      .map((item) => ({
        item,
        usage: item.contracted
          ? Math.round(
              ((minutesByCompany.get(item.id) || 0) / 60 / item.contracted) *
                100,
            )
          : 0,
      }))
      .filter(({ usage }) => usage >= 80)
      .slice(0, 2)
      .map(({ item, usage }) => ({
        icon: <Clock3 size={20} />,
        title: `${item.name} chegou a ${usage}% das horas`,
        detail: `${formatHours(minutesByCompany.get(item.id) || 0)} de ${item.contracted}h contratadas`,
        helper: "Alerta de consumo do ciclo",
        href: "/admin/horas",
      })),
  ];
  const events = data.events.slice(0, 5);
  const average = data.satisfaction.average == null ? null : data.satisfaction.average.toFixed(1).replace(".", ",");
  const donutTotal = statusData.reduce((sum, [, value]) => sum + value, 0);
  let donutCursor = 0;
  const donutStops = statusData.map(([, value], index) => {
    const from = donutCursor;
    donutCursor += donutTotal ? (value / donutTotal) * 100 : 0;
    return `${tones[index % tones.length]} ${from}% ${donutCursor}%`;
  });
  const eventTone = { meeting: "purple", validation: "", deadline: "blue" } as const;
  const eventKind = { meeting: "Reunião", validation: "Validação", deadline: "Prazo" } as const;
  const eventTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  const metrics = [
    { label: "Contas ativas", value: String(data.companies.length), tone: "green", helper: data.companies.length ? "clientes com ciclo aberto" : "Nenhuma conta ativa", href: "/admin/clientes" },
    { label: "Ações pendentes", value: String(actions.length), tone: "amber", helper: actions.length ? "precisam de acompanhamento" : "Nenhuma ação crítica", href: "/admin/projetos" },
    { label: "Horas no mês", value: formatHours(totalMinutes), tone: "blue", helper: totalContracted ? `${Math.round((totalMinutes / 60 / totalContracted) * 100)}% das ${totalContracted}h contratadas` : "Sem horas contratadas registradas", href: "/admin/horas" },
    { label: "NPS atual", value: average == null ? "—" : `${average}/5`, tone: "purple", helper: data.satisfaction.total ? `${data.satisfaction.total} avaliações registradas · escala 1–5` : "Nenhuma avaliação registrada", href: "/admin/satisfacao" },
  ];

  return (
    <Shell role="admin">
      <div className="ap-app v2-admin-page">
        <div className="ap-content">
          <div className="ap-title">
            <div><small>BACKOFFICE / CALI RH</small><h1>Visão geral<span>.</span></h1><p>Onde estão as decisões, entregas e contas que precisam da CALI hoje.</p></div>
            <div className="ap-title-actions"><Link className="ap-primary" to="/admin/clientes"><Plus size={15} /> Cadastrar cliente</Link></div>
          </div>

          <section className="ap-overview-hero">
            <div><small>CALI · OPERAÇÃO</small><h2>{greeting()}, Patrícia.</h2><p>O que precisa de decisão agora, quais contas merecem atenção e como cada ciclo está avançando.</p></div>
            <ExportOverview data={data} />
          </section>

          <div className="ap-metrics" aria-label="Sinais reais da operação">
            {metrics.map((metric) => <Link className={`ap-metric ${metric.tone}`} key={metric.label} to={metric.href}><small>{metric.label}</small><strong>{loading ? "—" : metric.value}</strong><span>{metric.helper}</span></Link>)}
          </div>

          <div className="ap-grid-two">
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>{actions.length ? `${actions.length} ponto${actions.length === 1 ? "" : "s"} para agir` : "Nada crítico agora"}</h2><Link to="/admin/projetos">Abrir acompanhamento <ArrowRight size={14} /></Link></div>
              {actions.length ? actions.map((action, index) => <Link className="ap-activity" key={`${action.title}-${action.detail}`} to={action.href}><span className="ap-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{action.title}</strong><small>{action.detail} · {action.helper}</small></span><ChevronRight size={14} /></Link>) : <p className="v2-admin-empty">A operação não tem pendências críticas no momento.</p>}
            </section>
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>Próximos compromissos</h2><Link to="/admin/calendario">Ver calendário <ArrowRight size={14} /></Link></div>
              {events.length ? events.map((event) => <Link className="ap-time-line" key={event.id} to="/admin/calendario"><time>{dateLabel(event.startsAt)} · {eventTime(event.startsAt)}</time><i className={eventTone[event.type]} /><span><strong>{event.title}</strong><small>{companyMap.get(event.companyId)?.name || "Cliente"} · {eventKind[event.type]}</small></span><ChevronRight size={14} /></Link>) : <p className="v2-admin-empty">Nenhum compromisso nos próximos 15 dias.</p>}
            </section>
          </div>

          <div className="ap-exec-grid">
            <section className="ap-pane ap-exec-hours">
              <div className="ap-pane-head"><h2>Consumo de horas por cliente</h2><Link to="/admin/horas">Detalhar horas <ArrowRight size={14} /></Link></div>
              {data.companies.length ? data.companies.map((item) => {
                const minutes = minutesByCompany.get(item.id) || 0;
                const pct = item.contracted ? Math.round((minutes / 60 / item.contracted) * 100) : 0;
                const left = item.contracted ? `${Math.max(0, item.contracted - minutes / 60).toFixed(1).replace(".", ",")}h restantes` : "Sem limite de ciclo";
                return <Link className={`ap-hour-client ${pct >= 90 ? "critical" : pct >= 75 ? "warn" : ""}`} key={item.id} to="/admin/horas"><span className="ap-hour-logo">{item.logoUrl ? <img src={item.logoUrl} alt="" /> : item.mark}</span><span className="ap-hour-main"><strong>{item.name}</strong><small>{formatHours(minutes)}{item.contracted ? ` / ${item.contracted}h` : ""} · {left}</small><span className="ap-hour-track"><i style={{ width: `${Math.min(100, pct)}%` }} /></span></span><b>{item.contracted ? `${pct}%` : "—"}</b></Link>;
              }) : <p className="v2-admin-empty">Nenhum cliente ativo encontrado.</p>}
            </section>
            <section className="ap-pane ap-exec-status">
              <div className="ap-pane-head"><h2>Status dos entregáveis</h2><Link to="/admin/projetos">Abrir projetos <ArrowRight size={14} /></Link></div>
              {statusData.length ? <>
                <div className="ap-exec-donut" role="img" aria-label={statusData.map(([label, value]) => `${statusNames[label] || label}: ${value}`).join(", ")} style={{ background: `conic-gradient(${donutStops.join(",")})` }}><div><strong>{data.deliverables.length}</strong><small>no portfólio</small></div></div>
                <div className="ap-exec-legend">{statusData.map(([label, value], index) => <span key={label}><i style={{ background: tones[index % tones.length] }} />{statusNames[label] || label} <strong>{value}</strong></span>)}</div>
              </> : <p className="v2-admin-empty">Ainda não há entregáveis para consolidar.</p>}
            </section>
          </div>

          <div className="ap-exec-grid">
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>NPS e satisfação</h2><Link to="/admin/satisfacao">Ver avaliações <ArrowRight size={14} /></Link></div>
              <div className="ap-exec-nps"><strong>{average ?? "—"}<span>/5</span></strong><div><b>{data.satisfaction.total ? `${data.satisfaction.total} avaliações registradas` : "Nenhuma avaliação registrada"}</b><small>Escala de satisfação de 1 a 5 · evolução mensal das avaliações.</small></div></div>
              {npsMonths.length > 1 ? <div className="ap-exec-nps-bars v2-admin-nps-bars">{npsMonths.map((month, index) => <span key={index} style={{ height: `${Math.max(4, month.average * 16)}%` }} title={`${month.label}: ${month.average.toFixed(1).replace(".", ",")}/5`}><em>{month.label}</em></span>)}</div> : <p className="v2-admin-empty">As avaliações reais aparecerão aqui conforme forem registradas.</p>}
            </section>
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>Próximos prazos</h2><Link to="/admin/projetos">Ver cronograma <ArrowRight size={14} /></Link></div>
              {deadlines.length ? deadlines.map((item) => <Link className="ap-deadline" key={item.id} to="/admin/projetos"><CalendarDays size={16} /><span><strong>{item.title}</strong><small>{companyMap.get(item.companyId)?.name || "Cliente"} · {statusNames[item.status] || item.status}</small></span><b>{dateLabel(item.dueAt)}</b></Link>) : <p className="v2-admin-empty">Nenhum prazo registrado.</p>}
            </section>
          </div>

          <section className="ap-pane ap-full">
            <div className="ap-pane-head"><h2>Clientes em andamento</h2><Link to="/admin/clientes">Gestão completa <ArrowRight size={14} /></Link></div>
            {data.companies.length ? <div className="ap-client-data v2-admin-portfolio">
              <div className="ap-client-data-head"><span>Cliente / serviço</span><span>Próximo passo</span><span>Horas</span><span>NPS</span><span>Projetos</span><span /></div>
              {data.companies.map((client) => {
                const minutes = minutesByCompany.get(client.id) || 0;
                const usage = client.contracted ? Math.round((minutes / 60 / client.contracted) * 100) : 0;
                const projects = data.projects.filter((item) => item.companyId === client.id);
                const nps = data.satisfaction.recent.find((item) => item.company === client.name)?.score;
                const next = pendingDeliverables.find((item) => item.companyId === client.id);
                return <div className="ap-client-data-row" key={client.id}>
                  <div className="ap-client-info"><span className="ap-hour-logo">{client.logoUrl ? <img src={client.logoUrl} alt="" /> : client.mark}</span><span><strong>{client.name}</strong><small>{client.service}</small></span></div>
                  <div className="ap-client-contact"><strong>{next?.title || "Sem pendência"}</strong><small>{next ? "Acompanhar" : "Operação em dia"}</small></div>
                  <div className="ap-client-contact"><strong>{client.contracted ? `${usage}%` : "—"}</strong><small>{formatHours(minutes)}{client.contracted ? ` / ${client.contracted}h` : ""}</small></div>
                  <div className="ap-client-contact"><strong>{nps == null ? "—" : nps.toFixed(1).replace(".", ",")}</strong></div>
                  <div className="ap-client-contact"><strong>{projects.length}</strong><small>{projects[0]?.name || "Sem projeto ativo"}</small></div>
                  <Link className="ap-outline" to="/admin/clientes">Abrir conta <ChevronRight size={14} /></Link>
                </div>;
              })}
            </div> : <p className="v2-admin-empty">Nenhum cliente ativo encontrado.</p>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
