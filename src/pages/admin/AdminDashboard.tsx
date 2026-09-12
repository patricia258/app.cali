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
} from "lucide-react";
import {
  DonutChart,
  ExportMenu,
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
  entries: Array<{ companyId: string; minutes: number }>;
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

export function AdminDashboard() {
  const [driveNotice, setDriveNotice] = useState(false);
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
      const { start, next, now } = monthBounds();
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
            .select("company_id,minutes")
            .gte("work_date", start)
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
  const minutesByCompany = useMemo(
    () =>
      data.entries.reduce(
        (map, entry) =>
          map.set(
            entry.companyId,
            (map.get(entry.companyId) || 0) + entry.minutes,
          ),
        new Map<string, number>(),
      ),
    [data.entries],
  );
  const totalMinutes = data.entries.reduce(
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
  const exportRows = data.companies.map((client) => ({
    Cliente: client.name,
    Serviço: client.service,
    "Horas consumidas": formatHours(minutesByCompany.get(client.id) || 0),
    "Horas contratadas": client.contracted,
    NPS: data.satisfaction.average ?? "—",
  }));
  const npsSeries = [
    {
      name: "CALI",
      color: "#B58C52",
      values: (data.satisfaction.monthly || []).map((item) => item.average),
    },
  ];
  const periodLabels = (data.satisfaction.monthly || []).map((item) =>
    new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(new Date(`${item.month}T12:00:00`))
      .replace(".", "")
      .replace(/^./, (x) => x.toUpperCase()),
  );
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
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(),
  );

  return (
    <Shell role="admin">
      <section className="page admin-overview-page">
        <div className="page-heading overview-heading">
          <div>
            <div className="eyebrow">CALI · OPERAÇÃO</div>
            <h1>{greeting()}, Patrícia.</h1>
            <p>
              O que precisa de decisão agora, quais contas merecem atenção e
              como cada ciclo está avançando.
            </p>
          </div>
          <div className="overview-actions compact-overview-actions">
            <ExportMenu
              title="Visão geral CALI Workspace"
              rows={exportRows}
              onDrive={() => setDriveNotice(true)}
            />
            <Link
              className="primary compact-primary-action"
              to="/admin/clientes"
            >
              <Plus size={16} />
              Cadastrar cliente
            </Link>
          </div>
        </div>
        {driveNotice && (
          <div className="inline-notice">
            A ação de salvar no Google Drive já está prevista. Ela será ativada
            junto com a conexão do Google Workspace.
          </div>
        )}
        <section
          className="overview-signal-strip"
          aria-label="Sinais reais da operação"
        >
          <div className="signal-card">
            <span>Contas ativas</span>
            <strong>{loading ? "—" : data.companies.length}</strong>
            <small>
              {data.companies.length
                ? "clientes com ciclo aberto"
                : "Nenhuma conta ativa"}
            </small>
            <TrendBadge>período atual</TrendBadge>
            <i>
              <Building2 size={22} />
            </i>
          </div>
          <div className="signal-card">
            <span>Ações pendentes</span>
            <strong>{loading ? "—" : actions.length}</strong>
            <small>
              {actions.length
                ? "precisam de acompanhamento"
                : "Nenhuma ação crítica"}
            </small>
            <TrendBadge>base real</TrendBadge>
            <i>
              <ListChecks size={22} />
            </i>
          </div>
          <div className="signal-card">
            <span>Horas no mês</span>
            <strong>{loading ? "—" : formatHours(totalMinutes)}</strong>
            <small>
              {totalContracted
                ? `${Math.round((totalMinutes / 60 / totalContracted) * 100)}% das ${totalContracted}h contratadas`
                : "Sem horas contratadas registradas"}
            </small>
            <TrendBadge>período atual</TrendBadge>
            <i>
              <Clock3 size={22} />
            </i>
          </div>
          <div className="signal-card">
            <span>NPS atual</span>
            <strong>
              {loading
                ? "—"
                : data.satisfaction.average == null
                  ? "—"
                  : data.satisfaction.average.toFixed(1).replace(".", ",")}
            </strong>
            <small>
              {data.satisfaction.total
                ? `${data.satisfaction.total} avaliações registradas`
                : "Nenhuma avaliação registrada"}
            </small>
            <TrendBadge>escala 1–5</TrendBadge>
            <i>
              <Star size={22} />
            </i>
          </div>
        </section>
        <div className="analytics-grid analytics-primary">
          <section className="panel chart-panel hours-chart-panel">
            <div className="panel-title chart-panel-title">
              <div>
                <span className="section-kicker">CONSUMO DE HORAS</span>
                <h2>Quem está mais perto do limite do ciclo</h2>
              </div>
              <Link to="/admin/horas">
                Detalhar horas <ChevronRight size={16} />
              </Link>
            </div>
            <HorizontalBars
              data={data.companies.map((item) => {
                const value = (minutesByCompany.get(item.id) || 0) / 60;
                const pct = item.contracted
                  ? Math.round((value / item.contracted) * 100)
                  : 0;
                return {
                  label: item.name,
                  logoUrl: item.logoUrl,
                  logoText: item.mark,
                  value,
                  max: item.contracted,
                  helper: item.contracted
                    ? `${Math.max(0, item.contracted - value)
                        .toFixed(1)
                        .replace(".", ",")}h restantes`
                    : "Sem limite de ciclo",
                  tone: pct >= 90 ? "critical" : pct >= 75 ? "warn" : "normal",
                };
              })}
            />
          </section>
          <section className="panel chart-panel deliverable-chart-panel">
            <div className="panel-title chart-panel-title">
              <div>
                <span className="section-kicker">ENTREGÁVEIS</span>
                <h2>Status atual</h2>
              </div>
              <Link to="/admin/projetos">Abrir projetos</Link>
            </div>
            {statusData.length ? (
              <DonutChart
                centerValue={String(data.deliverables.length)}
                centerLabel="no portfólio"
                data={statusData.map(([label, value], index) => ({
                  label: statusNames[label] || label,
                  value,
                  color: tones[index % tones.length],
                }))}
              />
            ) : (
              <div className="dashboard-empty">
                Ainda não há entregáveis para consolidar.
              </div>
            )}
          </section>
        </div>
        <div className="analytics-grid analytics-secondary">
          <section className="panel chart-panel nps-chart-panel">
            <div className="panel-title chart-panel-title">
              <div>
                <span className="section-kicker">NPS / SATISFAÇÃO</span>
                <h2>Evolução das avaliações</h2>
              </div>
              <div className="metric-inline">
                <Star size={17} />
                {data.satisfaction.average == null
                  ? "—"
                  : data.satisfaction.average.toFixed(1).replace(".", ",")}
              </div>
            </div>
            {periodLabels.length > 1 ? (
              <InteractiveTrendChart labels={periodLabels} series={npsSeries} />
            ) : (
              <div className="dashboard-empty">
                As avaliações reais aparecerão aqui conforme forem registradas.
              </div>
            )}
          </section>
          <section className="panel attention-panel">
            <div className="panel-title">
              <div>
                <span className="section-kicker">ATENÇÃO AGORA</span>
                <h2>
                  {actions.length
                    ? `${actions.length} ponto${actions.length === 1 ? "" : "s"} para agir`
                    : "Nada crítico agora"}
                </h2>
              </div>
              <span className="count">{actions.length}</span>
            </div>
            {actions.length ? (
              actions.map((action) => (
                <div
                  className="action-row"
                  key={`${action.title}-${action.detail}`}
                >
                  <div className="status-icon warn">{action.icon}</div>
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                    <small>{action.helper}</small>
                  </div>
                  <Link className="ghost" to={action.href}>
                    Abrir <ChevronRight size={17} />
                  </Link>
                </div>
              ))
            ) : (
              <div className="dashboard-empty">
                A operação não tem pendências críticas no momento.
              </div>
            )}
          </section>
        </div>
        <div className="overview-lower-grid agenda-deadline-grid">
          <section className="panel agenda-overview-panel">
            <div className="panel-title agenda-panel-head">
              <div>
                <span className="section-kicker">AGENDA</span>
                <h2>Próximos compromissos</h2>
              </div>
              <div className="agenda-head-actions">
                <div className="view-toggle">
                  <button
                    className={agendaMode === "month" ? "active" : ""}
                    onClick={() => setAgendaMode("month")}
                  >
                    Mês
                  </button>
                  <button
                    className={agendaMode === "week" ? "active" : ""}
                    onClick={() => setAgendaMode("week")}
                  >
                    Semana
                  </button>
                </div>
                <button
                  className={`agenda-color-button ${showColors ? "active" : ""}`}
                  onClick={() => setShowColors((value) => !value)}
                >
                  <Palette size={15} />
                  Cores
                </button>
                <Link to="/admin/calendario">Calendário completo</Link>
              </div>
            </div>
            {showColors && (
              <div className="event-color-editor">
                {(["meeting", "validation", "deadline"] as const).map(
                  (type) => (
                    <label key={type}>
                      <span style={{ background: eventColors[type] }} />
                      {type === "meeting"
                        ? "Reunião"
                        : type === "validation"
                          ? "Validação"
                          : "Deadline"}
                      <input
                        type="color"
                        value={eventColors[type]}
                        onChange={(e) =>
                          setEventColors((current) => ({
                            ...current,
                            [type]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            )}
            <div className="agenda-overview-content">
              {agendaMode === "month" ? (
                <MiniCalendar
                  monthLabel={
                    monthName.charAt(0).toUpperCase() + monthName.slice(1)
                  }
                  activeDay={new Date().getDate()}
                  markers={events.map((event) => ({
                    day: new Date(event.startsAt).getDate(),
                    color: eventColors[event.type],
                    label: event.title,
                  }))}
                />
              ) : (
                <div className="dashboard-empty">
                  A visão semanal detalhada está disponível no calendário
                  completo.
                </div>
              )}
              <div className="agenda-timeline">
                {events.length ? (
                  events.map((event) => (
                    <div
                      className="agenda-line"
                      key={event.id}
                      style={
                        {
                          "--event-color": eventColors[event.type],
                        } as CSSProperties
                      }
                    >
                      <span>{dateLabel(event.startsAt)}</span>
                      <strong>{event.title}</strong>
                      <small>
                        {companyMap.get(event.companyId)?.name || "Cliente"}
                      </small>
                    </div>
                  ))
                ) : (
                  <div className="dashboard-empty">
                    Nenhum compromisso nos próximos 15 dias.
                  </div>
                )}
              </div>
            </div>
          </section>
          <section className="panel deadline-panel deadline-panel-v2">
            <div className="panel-title">
              <div>
                <span className="section-kicker">DEADLINES</span>
                <h2>Próximos prazos</h2>
              </div>
              <CalendarRange size={20} />
            </div>
            <div className="deadline-list-v2">
              {deadlines.length ? (
                deadlines.map((item) => (
                  <div className="deadline-row-v2" key={item.id}>
                    <span className="deadline-logo-v2">
                      {companyMap.get(item.companyId)?.logoUrl ? (
                        <img src={companyMap.get(item.companyId)?.logoUrl} alt="" />
                      ) : (
                        companyMap.get(item.companyId)?.mark || "C"
                      )}
                    </span>
                    <div className="deadline-main-v2">
                      <p>{item.title}</p>
                      <div>
                        <strong>
                          {companyMap.get(item.companyId)?.name || "Cliente"}
                        </strong>
                        <span>{statusNames[item.status] || item.status}</span>
                      </div>
                    </div>
                    <div className="deadline-time-v2">
                      <strong>{dateLabel(item.dueAt)}</strong>
                      <span>Prazo</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">Nenhum prazo registrado.</div>
              )}
            </div>
          </section>
        </div>
        <section className="panel portfolio-table-panel">
          <div className="panel-title">
            <div>
              <span className="section-kicker">CARTEIRA</span>
              <h2>Clientes em andamento</h2>
            </div>
            <Link to="/admin/clientes">
              Gestão completa <ArrowUpRight size={16} />
            </Link>
          </div>
          {data.companies.length ? (
            <>
              <div className="portfolio-table-head">
                <span>Cliente / serviço</span>
                <span>Horas</span>
                <span>Projetos</span>
                <span>NPS</span>
                <span>Próximo passo</span>
                <span />
              </div>
              {data.companies.map((client) => {
                const value = (minutesByCompany.get(client.id) || 0) / 60;
                const usage = client.contracted
                  ? Math.round((value / client.contracted) * 100)
                  : 0;
                const project = data.projects.find(
                  (item) => item.companyId === client.id,
                );
                const nps = data.satisfaction.recent.find(
                  (item) => item.company === client.name,
                )?.score;
                const next = pendingDeliverables.find(
                  (item) => item.companyId === client.id,
                );
                return (
                  <div className="portfolio-table-row" key={client.id}>
                    <div className="client-identity compact-client">
                      <div className="company-mark">
                        {client.logoUrl ? <img src={client.logoUrl} alt="" /> : client.mark}
                      </div>
                      <div>
                        <strong>{client.name}</strong>
                        <small>{client.service}</small>
                      </div>
                    </div>
                    <div className="portfolio-hours">
                      <strong>{client.contracted ? `${usage}%` : "—"}</strong>
                      <span>
                        {formatHours(minutesByCompany.get(client.id) || 0)}
                        {client.contracted ? ` / ${client.contracted}h` : ""}
                      </span>
                    </div>
                    <div className="portfolio-deadline">
                      <strong>
                        {
                          data.projects.filter(
                            (item) => item.companyId === client.id,
                          ).length
                        }
                      </strong>
                      <span>{project?.name || "Sem projeto ativo"}</span>
                    </div>
                    <div className="metric-inline">
                      <Star size={16} />
                      {nps == null ? "—" : nps.toFixed(1).replace(".", ",")}
                    </div>
                    <div className="portfolio-next">
                      <strong>{next?.title || "Sem pendência"}</strong>
                      <span>{next ? "Acompanhar" : "Operação em dia"}</span>
                    </div>
                    <Link className="ghost" to="/admin/clientes">
                      Abrir conta <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="dashboard-empty">
              Nenhum cliente ativo encontrado.
            </div>
          )}
        </section>
      </section>
    </Shell>
  );
}
