import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  ChevronRight,
  CircleAlert,
  Clock3,
  ListChecks,
  MessageSquareText,
  Minus,
  Palette,
  Plus,
  Star,
  X,
} from "lucide-react";
import {
  DonutChart,
  HorizontalBars,
  InteractiveTrendChart,
  MiniCalendar,
} from "../../components/DataViz";
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
function TrendBadge({ children }: { children: string }) {
  return (
    <em className="signal-trend neutral">
      <Minus size={13} />
      {children}
    </em>
  );
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
    const cleanup = () => {
      document.body.classList.remove("overview-export-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    document.body.classList.add("overview-export-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 120);
  }
  return (
    <>
      <button
        className="secondary export-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        Exportar <span aria-hidden="true">⌄</span>
      </button>
      {open && (
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
                  <img
                    src="/brand/cali-workspace-transparent.svg"
                    alt="CALI Workspace"
                  />
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
      )}
    </>
  );
}

export function AdminDashboard() {
  const [agendaMode, setAgendaMode] = useState<"month" | "week">("month");
  const [showColors, setShowColors] = useState(false);
  const [eventColors, setEventColors] = useState({
    meeting: "#6b2135",
    validation: "#B58C52",
    deadline: "#9a5b40",
  });
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
