import { WorkspacePageHeader } from '../../../components/workspace/WorkspacePageHeader';
import { EmptyState } from '../../../components/ds/EmptyState';
import { useEffect, useMemo, useState } from "react";
import { Link } from "../../../components/navigation/Link";
import { format } from "date-fns";
import { ArrowRight, Building2, CalendarDays, ChevronRight, CircleAlert, Clock3, MessageSquareText, Plus } from "lucide-react";
import { Shell } from "../../../components/workspace/WorkspaceShell";
import { readAdminOverview, subscribeAdminOverview, type DashboardData, type Satisfaction } from "../../../api/admin/overview/portfolio";
import { useSearchParams } from "../../../hooks/useSearchParams";
import { Button } from "../../../components/ds/Button";
import { InlineNotice } from "../../../components/ds/InlineNotice";
import { ExportOverview } from './components/ExportOverview';
import { dateLabel, formatHours, statusNames } from './overviewFormatting';

const emptySatisfaction: Satisfaction = {
  average: null,
  total: 0,
  distribution: {},
  monthly: [],
  recent: [],
};
const dashboardSources = ["Carteira", "Projetos", "Entregáveis", "Horas", "Agenda", "Satisfação"] as const;
type DashboardSource = typeof dashboardSources[number];

const tones = ["#5A1E2D", "#B58C52", "#8A6B73", "#D9C9BE", "#C98E62"];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}
export function AdminDashboard() {
  const [loaded, setData] = useState<DashboardData>({
    companies: [],
    projects: [],
    deliverables: [],
    entries: [],
    events: [],
    satisfaction: emptySatisfaction,
  });
  const [loading, setLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<DashboardSource[]>([]);
  const [reloadRevision, setReloadRevision] = useState(0);
  const [params, setParams] = useSearchParams();
  const accountParam = params.get("company");
  const account = accountParam && loaded.companies.some((item) => item.id === accountParam) ? accountParam : "all";
  const monthOptions = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    return Array.from({ length: 12 }, (_, offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const label = formatter.format(date);
      return {
        offset,
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      };
    });
  }, []);
  const monthOffset = monthOptions.find((item) => item.key === params.get("month"))?.offset ?? 0;
  const unavailable = (...sources: DashboardSource[]) => sources.some((source) => failedSources.includes(source));
  function selectFilter(key: "company" | "month", value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  // Recorte por conta: tudo o que a página mostra passa por aqui; a exportação tem o próprio recorte.
  const data = useMemo<DashboardData>(() => account === "all" ? loaded : {
    ...loaded,
    companies: loaded.companies.filter((item) => item.id === account),
    projects: loaded.projects.filter((item) => item.companyId === account),
    deliverables: loaded.deliverables.filter((item) => item.companyId === account),
    entries: loaded.entries.filter((item) => item.companyId === account),
    events: loaded.events.filter((item) => item.companyId === account),
  }, [loaded, account]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = 0;
    let newestLoad = 0;
    async function load() {
      const loadId = ++newestLoad;
      const result = await readAdminOverview().catch(() => null);
      if (cancelled || newestLoad !== loadId) return;
      if (!result) {
        setFailedSources([...dashboardSources]);
        setLoading(false);
        return;
      }
      const [companies, projects, deliverables, entries, events, satisfaction] = result;
      setFailedSources(dashboardSources.filter((_, index) => result[index].status === "rejected"));
      setData((previous) => ({
        companies: companies.status === "fulfilled" ? companies.value : previous.companies,
        projects: projects.status === "fulfilled" ? projects.value : previous.projects,
        deliverables: deliverables.status === "fulfilled" ? deliverables.value : previous.deliverables,
        entries: entries.status === "fulfilled" ? entries.value : previous.entries,
        events: events.status === "fulfilled" ? events.value : previous.events,
        satisfaction: satisfaction.status === "fulfilled" ? satisfaction.value ?? emptySatisfaction : previous.satisfaction,
      }));
      setLoading(false);
    }
    function scheduleReload() {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(), 250);
    }
    void load();
    const unsubscribe = subscribeAdminOverview(scheduleReload);
    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [reloadRevision]);

  const companyMap = useMemo(
    () => new Map(loaded.companies.map((item) => [item.id, item])),
    [loaded.companies],
  );
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return {
      start: format(new Date(now.getFullYear(), now.getMonth() - monthOffset, 1), "yyyy-MM-dd"),
      next: format(new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 1), "yyyy-MM-dd"),
    };
  }, [monthOffset]);
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
  // Prazos vencidos ou dos próximos 7 dias sobem para as prioridades; os seguintes ficam em "Próximos prazos" (sem repetir).
  const soonLimit = new Date(Date.now() + 7 * 86400000).toISOString();
  const byDue = pendingDeliverables
    .filter((item) => item.dueAt)
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
  const dueSoon = byDue.filter((item) => String(item.dueAt) <= soonLimit);
  const displayedDueSoon = dueSoon.slice(0, 4);
  const deadlines = byDue.filter((item) => String(item.dueAt) > soonLimit).slice(0, 5);
  const planningReviews = data.projects.filter((item) => item.planningStatus === "client_review");
  const adjustmentRequests = data.deliverables.filter((item) => item.status === "adjustment_requested");
  const highUsage = data.companies.map((item) => ({
    item,
    usage: item.contracted ? Math.round(((minutesByCompany.get(item.id) || 0) / 60 / item.contracted) * 100) : 0,
  })).filter(({ usage }) => usage >= 80);
  const totalActions = new Set([
    ...dueSoon.map((item) => `deliverable:${item.id}`),
    ...adjustmentRequests.map((item) => `deliverable:${item.id}`),
    ...planningReviews.map((item) => `project:${item.id}`),
    ...highUsage.map(({ item }) => `company:${item.id}`),
  ]).size;
  const npsMonths = (data.satisfaction.monthly || []).map((item) => ({
    id: item.month,
    label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(new Date(`${item.month}T12:00:00`))
      .replace(".", "")
      .replace(/^./, (x) => x.toUpperCase()),
    average: Number(item.average || 0),
  }));
  const actions: { icon: JSX.Element; title: string; detail: string; helper: string; href: string; date?: string; overdue?: boolean }[] = [
    ...displayedDueSoon.map((item) => ({
      icon: <Clock3 size={20} />,
      title: item.title,
      detail: loaded.companies.find((company) => company.id === item.companyId)?.name || "Cliente",
      helper: statusNames[item.status] || item.status,
      href: `/admin/projetos?deliverable=${encodeURIComponent(item.id)}`,
      date: dateLabel(item.dueAt),
      overdue: String(item.dueAt) < new Date().toISOString(),
    })),
    ...planningReviews
      .slice(0, 1)
      .map((item) => ({
        icon: <CircleAlert size={20} />,
        title: "Cronograma aguardando cliente",
        detail: item.name,
        helper: "Aprovação necessária",
        href: `/admin/projetos?project=${encodeURIComponent(item.id)}`,
      })),
    ...adjustmentRequests
      .filter((item) => !displayedDueSoon.includes(item))
      .slice(0, 1)
      .map((item) => ({
        icon: <MessageSquareText size={20} />,
        title: "Ajuste solicitado pelo cliente",
        detail: item.title,
        helper: "Abrir entregável",
        href: `/admin/projetos?deliverable=${encodeURIComponent(item.id)}`,
      })),
    ...highUsage
      .slice(0, 2)
      .map(({ item, usage }) => ({
        icon: <Clock3 size={20} />,
        title: `${item.name} chegou a ${usage}% das horas`,
        detail: `${formatHours(minutesByCompany.get(item.id) || 0)} de ${item.contracted}h contratadas`,
        helper: "Alerta de consumo do ciclo",
        href: "/admin/horas",
      })),
  ];
  const now = Date.now();
  const events = data.events.filter((event) => Date.parse(event.startsAt) >= now).slice(0, 5);
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
  const prioritiesUnavailable = unavailable("Entregáveis", "Projetos", "Carteira", "Horas");
  const usageUnavailable = unavailable("Carteira", "Horas");
  function blockStatus(message: string, ...sources: DashboardSource[]) {
    return loading ? "Carregando…" : unavailable(...sources) ? "Dados indisponíveis" : message;
  }
  const metrics = [
    { label: "Contas ativas", value: String(data.companies.length), tone: "green", helper: data.companies.length ? "clientes com ciclo aberto" : "Nenhuma conta ativa", href: "/admin/clientes", unavailable: unavailable("Carteira") },
    { label: "Ações pendentes", value: String(totalActions), tone: "amber", helper: totalActions ? "precisam de acompanhamento" : "Nenhuma ação crítica", href: "/admin/projetos", unavailable: prioritiesUnavailable },
    { label: monthOffset ? `Horas em ${monthOptions[monthOffset].label.split(" ")[0].toLowerCase()}` : "Horas no mês", value: formatHours(totalMinutes), tone: "blue", helper: totalContracted ? `${Math.round((totalMinutes / 60 / totalContracted) * 100)}% das ${totalContracted}h contratadas` : "Sem horas contratadas registradas", href: "/admin/horas", unavailable: usageUnavailable },
    { label: "NPS da carteira", value: average == null ? "—" : `${average}/5`, tone: "purple", helper: data.satisfaction.total ? `${data.satisfaction.total} avaliações registradas · escala 1–5` : "Nenhuma avaliação registrada", href: "/admin/satisfacao", unavailable: unavailable("Satisfação") },
  ];

  return (
    <Shell role="admin">
      <div className="ap-app v2-admin-page">
        <div className="ap-content">
          <WorkspacePageHeader eyebrow="BACKOFFICE / CALI RH" title="Visão geral" description="Onde estão as decisões, entregas e contas que precisam da CALI hoje.">
            <Link className="ap-primary" to="/admin/clientes"><Plus size={15} /> Cadastrar cliente</Link>
          </WorkspacePageHeader>

          <div className="ap-filters">
            <label><Building2 size={14} /><select aria-label="Conta" value={account} onChange={(event) => selectFilter("company", event.target.value === "all" ? "" : event.target.value)}><option value="all">Todas as contas</option>{loaded.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><CalendarDays size={14} /><select aria-label="Mês das horas" value={monthOptions[monthOffset].key} onChange={(event) => selectFilter("month", event.target.value)}>{monthOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <span>O mês muda as horas; agenda e prazos mostram sempre o que vem pela frente.</span>
          </div>
          {failedSources.length > 0 && <InlineNotice tone="danger">
            Falha ao atualizar {failedSources.join(", ")}. Os demais dados seguem disponíveis. Valores anteriores podem aparecer enquanto a fonte estiver indisponível.
            <Button variant="secondary" type="button" onClick={() => setReloadRevision((revision) => revision + 1)}>Tentar novamente</Button>
          </InlineNotice>}

          <section className="ap-overview-hero">
            <div><small>CALI · OPERAÇÃO</small><h2>{greeting()}, Patrícia.</h2><p>O que precisa de decisão agora, quais contas merecem atenção e como cada ciclo está avançando.</p></div>
            {!loading && !failedSources.length && <ExportOverview data={loaded} />}
          </section>

          <div className="ap-metrics" aria-label="Sinais reais da operação">
            {metrics.map((metric) => <Link className={`ap-metric ${metric.tone}`} key={metric.label} to={metric.href}><small>{metric.label}</small><strong>{loading || metric.unavailable ? "—" : metric.value}</strong><span>{loading ? "Carregando…" : metric.unavailable ? "Dados indisponíveis" : metric.helper}</span></Link>)}
          </div>

          <div className="ap-grid-two">
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>Prioridades de hoje</h2><Link to="/admin/projetos">Abrir acompanhamento <ArrowRight size={14} /></Link></div>
              {actions.length ? actions.map((action, index) => <Link className="ap-activity" key={`${action.title}-${action.detail}`} to={action.href}><span className="ap-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{action.title}</strong><small>{action.detail} · {action.helper}</small></span>{action.date && <span className={`ap-status ${action.overdue ? "red" : "amber"}`}>{action.overdue ? `Venceu ${action.date}` : action.date}</span>}<ChevronRight size={14} /></Link>) : <EmptyState as="p" variant="admin">{blockStatus("A operação não tem pendências críticas no momento.", "Entregáveis", "Projetos", "Carteira", "Horas")}</EmptyState>}
            </section>
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>Agenda da CALI</h2><Link to="/admin/calendario">Ver calendário <ArrowRight size={14} /></Link></div>
              {events.length ? events.map((event) => <Link className="ap-time-line" key={event.id} to="/admin/calendario"><time>{dateLabel(event.startsAt)} · {eventTime(event.startsAt)}</time><i className={eventTone[event.type]} /><span><strong>{event.title}</strong><small>{companyMap.get(event.companyId)?.name || "Cliente"} · {eventKind[event.type]}</small></span><ChevronRight size={14} /></Link>) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum compromisso nos próximos 15 dias.", "Agenda")}</EmptyState>}
            </section>
          </div>

          <div className="ap-exec-grid">
            <section className="ap-pane ap-exec-hours">
              <div className="ap-pane-head"><h2>Consumo de horas por cliente</h2><Link to="/admin/horas">Detalhar horas <ArrowRight size={14} /></Link></div>
              {data.companies.length && !usageUnavailable ? data.companies.map((item) => {
                const minutes = minutesByCompany.get(item.id) || 0;
                const pct = item.contracted ? Math.round((minutes / 60 / item.contracted) * 100) : 0;
                const left = item.contracted ? `${Math.max(0, item.contracted - minutes / 60).toFixed(1).replace(".", ",")}h restantes` : "Sem limite de ciclo";
                return <Link className={`ap-hour-client ${pct >= 90 ? "critical" : pct >= 75 ? "warn" : ""}`} key={item.id} to="/admin/horas"><span className="ap-hour-logo">{item.logoUrl ? <img src={item.logoUrl} alt="" /> : item.mark}</span><span className="ap-hour-main"><strong>{item.name}</strong><small>{formatHours(minutes)}{item.contracted ? ` / ${item.contracted}h` : ""} · {left}</small><span className="ap-hour-track"><i style={{ width: `${Math.min(100, pct)}%` }} /></span></span><b>{item.contracted ? `${pct}%` : "—"}</b></Link>;
              }) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum cliente ativo encontrado.", "Carteira", "Horas")}</EmptyState>}
            </section>
            <section className="ap-pane ap-exec-status">
              <div className="ap-pane-head"><h2>Status dos entregáveis</h2><Link to="/admin/projetos">Abrir projetos <ArrowRight size={14} /></Link></div>
              {statusData.length ? <>
                <div className="ap-exec-donut" role="img" aria-label={statusData.map(([label, value]) => `${statusNames[label] || label}: ${value}`).join(", ")} style={{ background: `conic-gradient(${donutStops.join(",")})` }}><div><strong>{data.deliverables.length}</strong><small>no portfólio</small></div></div>
                <div className="ap-exec-legend">{statusData.map(([label, value], index) => <span key={label}><i style={{ background: tones[index % tones.length] }} />{statusNames[label] || label} <strong>{value}</strong></span>)}</div>
              </> : <EmptyState as="p" variant="admin">{blockStatus("Ainda não há entregáveis para consolidar.", "Entregáveis")}</EmptyState>}
            </section>
          </div>

          <div className="ap-exec-grid">
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>NPS e satisfação</h2><Link to="/admin/satisfacao">Ver avaliações <ArrowRight size={14} /></Link></div>
              <div className="ap-exec-nps"><strong>{average ?? "—"}<span>/5</span></strong><div><b>{data.satisfaction.total ? `${data.satisfaction.total} avaliações registradas` : blockStatus("Nenhuma avaliação registrada", "Satisfação")}</b><small>Escala de satisfação de 1 a 5 · evolução mensal da carteira.</small></div></div>
              {npsMonths.length > 1 ? <div className="ap-exec-nps-bars v2-admin-nps-bars">{npsMonths.map((month) => <span key={month.id} style={{ height: `${Math.max(4, month.average * 16)}%` }} title={`${month.label}: ${month.average.toFixed(1).replace(".", ",")}/5`}><em>{month.label}</em></span>)}</div> : <EmptyState as="p" variant="admin">As avaliações reais aparecerão aqui conforme forem registradas.</EmptyState>}
            </section>
            <section className="ap-pane">
              <div className="ap-pane-head"><h2>Próximos prazos</h2><Link to="/admin/projetos">Ver cronograma <ArrowRight size={14} /></Link></div>
              {deadlines.length ? deadlines.map((item) => <Link className="ap-deadline" key={item.id} to={`/admin/projetos?deliverable=${encodeURIComponent(item.id)}`}><CalendarDays size={16} /><span><strong>{item.title}</strong><small>{companyMap.get(item.companyId)?.name || "Cliente"} · {statusNames[item.status] || item.status}</small></span><b>{dateLabel(item.dueAt)}</b></Link>) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum prazo registrado.", "Entregáveis")}</EmptyState>}
            </section>
          </div>

          <section className="ap-pane ap-full">
            <div className="ap-pane-head"><h2>Carteira de clientes</h2><Link to="/admin/clientes">Todas as contas <ArrowRight size={14} /></Link></div>
            {data.companies.length ? <div className="ap-account-grid">
              {data.companies.map((client) => {
                const minutes = minutesByCompany.get(client.id) || 0;
                const projects = data.projects.filter((item) => item.companyId === client.id);
                const nps = data.satisfaction.recent.find((item) => item.company === client.name)?.score;
                const open = pendingDeliverables.filter((item) => item.companyId === client.id);
                const state = open.some((item) => item.status === "adjustment_requested") ? ["Ajuste solicitado", "red"]
                  : open.some((item) => item.status === "client_review") || projects.some((item) => item.planningStatus === "client_review") ? ["Aguardando cliente", "red"]
                  : !projects.length ? ["Sem projeto ativo", "purple"]
                  : open.length ? ["Em execução", "amber"] : ["Em dia", "green"];
                return <Link className="ap-client" key={client.id} to="/admin/clientes">
                  <span className="ap-client-brand">{client.logoUrl ? <img src={client.logoUrl} alt="" /> : client.mark}</span>
                  <div><strong>{client.name}</strong><small>{[client.service, `${formatHours(minutes)}${client.contracted ? ` / ${client.contracted}h` : ""}`, `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`, nps == null ? "" : `NPS ${nps.toFixed(1).replace(".", ",")}`].filter(Boolean).join(" · ")}</small></div>
                  <span className={`ap-status ${state[1]}`}>{state[0]}</span><ArrowRight size={15} />
                </Link>;
              })}
            </div> : <EmptyState as="p" variant="admin">{blockStatus("Nenhum cliente ativo encontrado.", "Carteira")}</EmptyState>}
          </section>
        </div>
      </div>
    </Shell>
  );
}
