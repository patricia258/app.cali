import { WorkspaceAdminPage } from '../../../components/workspace/components/WorkspaceAdminPage';
import { WorkspaceAdminContent } from '../../../components/workspace/components/WorkspaceAdminContent';
import { WorkspaceMetricGrid } from '../../../components/workspace/components/WorkspaceMetricGrid';
import { WorkspaceOverviewIntro } from '../../../components/workspace/components/WorkspaceOverviewIntro';
import { WorkspaceOverviewPanel } from '../../../components/workspace/components/WorkspaceOverviewPanel';
import { OverviewDeliveryChart } from '../../../components/workspace/components/OverviewDeliveryChart';
import { OverviewCompanyHours } from '../../../components/workspace/components/OverviewCompanyHours';
import { OverviewActivityLink } from '../../../components/workspace/components/OverviewActivityLink';
import { OverviewCompanyLink } from '../../../components/workspace/components/OverviewCompanyLink';
import { OverviewDeadlineLink } from '../../../components/workspace/components/OverviewDeadlineLink';
import { StatusBadge } from '../../../components/ds/StatusBadge';
import { WorkspacePageHeader } from '../../../components/workspace/WorkspacePageHeader';
import { EmptyState } from '../../../components/ds/EmptyState';
import { useEffect, useMemo, useState } from "react";
import { Link } from "../../../components/navigation/Link";
import { format } from "date-fns";
import { Building2, CalendarDays, ChevronRight, CircleAlert, Clock3, MessageSquareText, Plus } from "lucide-react";
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
  const eventTone = { meeting: "tw:bg-[#ac89d4]", validation: "tw:bg-[#bd996a]", deadline: "tw:bg-[#72b2d6]" } as const;
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
      <WorkspaceAdminPage>
        <WorkspaceAdminContent>
          <WorkspacePageHeader eyebrow="BACKOFFICE / CALI RH" title="Visão geral" description="Onde estão as decisões, entregas e contas que precisam da CALI hoje.">
            <Link className="tw:inline-flex tw:items-center tw:gap-[.62rem] tw:rounded-[.54rem] tw:border tw:border-solid tw:border-cali-brand tw:bg-cali-brand tw:px-[1rem] tw:py-[.77rem] tw:font-semibold tw:whitespace-nowrap tw:text-white" to="/admin/clientes"><Plus size={15} /> Cadastrar cliente</Link>
          </WorkspacePageHeader>

          <div className="tw:mb-[1.23rem] tw:flex tw:flex-wrap tw:items-center tw:gap-[.69rem] tw:[&_label]:flex tw:[&_label]:items-center tw:[&_label]:gap-[.46rem] tw:[&_label]:rounded-[.54rem] tw:[&_label]:border tw:[&_label]:border-solid tw:[&_label]:border-[#e7ddd5] tw:[&_label]:bg-white tw:[&_label]:px-[.77rem] tw:[&_select]:max-w-[14.62rem] tw:[&_select]:border-0 tw:[&_select]:bg-transparent tw:[&_select]:px-[.38rem] tw:[&_select]:py-[.77rem] tw:[&_select]:text-[.85rem]/[inherit] tw:[&_select]:text-[#67574c]">
            <label><Building2 size={14} /><select aria-label="Conta" value={account} onChange={(event) => selectFilter("company", event.target.value === "all" ? "" : event.target.value)}><option value="all">Todas as contas</option>{loaded.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><CalendarDays size={14} /><select aria-label="Mês das horas" value={monthOptions[monthOffset].key} onChange={(event) => selectFilter("month", event.target.value)}>{monthOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <span className="tw:ml-auto tw:text-[.77rem]/[inherit] tw:text-[#b09f91] tw:max-[40rem]:ml-0">O mês muda as horas; agenda e prazos mostram sempre o que vem pela frente.</span>
          </div>
          {failedSources.length > 0 && <InlineNotice tone="danger">
            Falha ao atualizar {failedSources.join(", ")}. Os demais dados seguem disponíveis. Valores anteriores podem aparecer enquanto a fonte estiver indisponível.
            <Button variant="secondary" type="button" onClick={() => setReloadRevision((revision) => revision + 1)}>Tentar novamente</Button>
          </InlineNotice>}

          <WorkspaceOverviewIntro eyebrow="CALI · OPERAÇÃO" title={`${greeting()}, Patrícia.`} description="O que precisa de decisão agora, quais contas merecem atenção e como cada ciclo está avançando.">
            {!loading && !failedSources.length && <ExportOverview data={loaded} />}
          </WorkspaceOverviewIntro>

          <WorkspaceMetricGrid label="Sinais reais da operação" metrics={metrics.map((metric) => ({
            ...metric,
            value: loading || metric.unavailable ? "—" : metric.value,
            helper: loading ? "Carregando…" : metric.unavailable ? "Dados indisponíveis" : metric.helper,
          }))} />

          <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-2 tw:gap-[1.23rem] tw:max-[59.375rem]:grid-cols-1">
            <WorkspaceOverviewPanel title="Prioridades de hoje" action={{ href: "/admin/projetos", label: "Abrir acompanhamento" }}>
              {actions.length ? actions.map((action, index) => <OverviewActivityLink key={`${action.title}-${action.detail}`} href={action.href} title={action.title} detail={`${action.detail} · ${action.helper}`} leading={<span className="tw:text-[1.23rem]/[inherit] tw:text-[#bf9a75]">{String(index + 1).padStart(2, "0")}</span>} trailing={<>{action.date && <StatusBadge variant="admin" tone={action.overdue ? "red" : "amber"}>{action.overdue ? `Venceu ${action.date}` : action.date}</StatusBadge>}<ChevronRight size={14} /></>} />) : <EmptyState as="p" variant="admin">{blockStatus("A operação não tem pendências críticas no momento.", "Entregáveis", "Projetos", "Carteira", "Horas")}</EmptyState>}
            </WorkspaceOverviewPanel>
            <WorkspaceOverviewPanel title="Agenda da CALI" action={{ href: "/admin/calendario", label: "Ver calendário" }}>
              {events.length ? events.map((event) => <OverviewActivityLink key={event.id} href="/admin/calendario" title={event.title} detail={`${companyMap.get(event.companyId)?.name || "Cliente"} · ${eventKind[event.type]}`} leading={<><time className="tw:text-[.85rem]/[inherit] tw:font-bold tw:text-[#977669]">{dateLabel(event.startsAt)} · {eventTime(event.startsAt)}</time><i className={`tw:size-[.69rem] tw:shrink-0 tw:rounded-full ${eventTone[event.type]}`} /></>} trailing={<ChevronRight size={14} />} />) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum compromisso nos próximos 15 dias.", "Agenda")}</EmptyState>}
            </WorkspaceOverviewPanel>
          </div>

          <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-[1.35fr_1fr] tw:gap-[1.23rem] tw:max-[53.125rem]:grid-cols-1">
            <WorkspaceOverviewPanel title="Consumo de horas por cliente" action={{ href: "/admin/horas", label: "Detalhar horas" }}>
              {data.companies.length && !usageUnavailable ? data.companies.map((item) => {
                const minutes = minutesByCompany.get(item.id) || 0;
                const pct = item.contracted ? Math.round((minutes / 60 / item.contracted) * 100) : 0;
                const left = item.contracted ? `${Math.max(0, item.contracted - minutes / 60).toFixed(1).replace(".", ",")}h restantes` : "Sem limite de ciclo";
                return <OverviewCompanyHours key={item.id} href="/admin/horas" company={item.name}
                  logo={item.logoUrl ? <img src={item.logoUrl} alt="" /> : item.mark}
                  description={`${formatHours(minutes)}${item.contracted ? ` / ${item.contracted}h` : ""} · ${left}`}
                  percent={item.contracted ? pct : null} />;
              }) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum cliente ativo encontrado.", "Carteira", "Horas")}</EmptyState>}
            </WorkspaceOverviewPanel>
            <WorkspaceOverviewPanel title="Status dos entregáveis" action={{ href: "/admin/projetos", label: "Abrir projetos" }}>
              {statusData.length ? <OverviewDeliveryChart
                values={statusData.map(([label, count], index) => ({ label: statusNames[label] || label, count, color: tones[index % tones.length] }))}
                total={data.deliverables.length}
                caption="no portfólio"
              /> : <EmptyState as="p" variant="admin">{blockStatus("Ainda não há entregáveis para consolidar.", "Entregáveis")}</EmptyState>}
            </WorkspaceOverviewPanel>
          </div>

          <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-[1.35fr_1fr] tw:gap-[1.23rem] tw:max-[53.125rem]:grid-cols-1">
            <WorkspaceOverviewPanel title="NPS e satisfação" action={{ href: "/admin/satisfacao", label: "Ver avaliações" }}>
              <div className="tw:mx-[.31rem] tw:my-[1.77rem] tw:flex tw:items-center tw:gap-[1.62rem] tw:[&>strong]:text-[2.77rem]/[inherit] tw:[&>strong]:whitespace-nowrap tw:[&>strong]:text-cali-brand tw:[&>strong>span]:text-[1rem]/[inherit] tw:[&>strong>span]:text-[#ab9b90] tw:[&>div]:flex tw:[&>div]:flex-col tw:[&>div]:gap-[.38rem] tw:[&_small]:leading-[1.5] tw:[&_small]:text-[#93857a]"><strong>{average ?? "—"}<span>/5</span></strong><div><b>{data.satisfaction.total ? `${data.satisfaction.total} avaliações registradas` : blockStatus("Nenhuma avaliação registrada", "Satisfação")}</b><small>Escala de satisfação de 1 a 5 · evolução mensal da carteira.</small></div></div>
              {npsMonths.length > 1 ? <div className="tw:mb-[1.69rem] tw:flex tw:h-[7.69rem] tw:items-end tw:justify-around tw:gap-[.69rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#eae2db] tw:px-[1.54rem] tw:pb-[.38rem] tw:max-[53.125rem]:h-[5.77rem] tw:[&>span]:relative tw:[&>span]:w-full tw:[&>span]:max-w-[2.62rem] tw:[&>span]:rounded-t-[.31rem] tw:[&>span]:bg-[#a76376] tw:[&_em]:absolute tw:[&_em]:top-full tw:[&_em]:left-1/2 tw:[&_em]:-translate-x-1/2 tw:[&_em]:pt-[.54rem] tw:[&_em]:text-[.69rem]/[inherit] tw:[&_em]:text-[#978980] tw:[&_em]:not-italic">{npsMonths.map((month) => <span key={month.id} style={{ height: `${Math.max(4, month.average * 16)}%` }} title={`${month.label}: ${month.average.toFixed(1).replace(".", ",")}/5`}><em>{month.label}</em></span>)}</div> : <EmptyState as="p" variant="admin">As avaliações reais aparecerão aqui conforme forem registradas.</EmptyState>}
            </WorkspaceOverviewPanel>
            <WorkspaceOverviewPanel title="Próximos prazos" action={{ href: "/admin/projetos", label: "Ver cronograma" }}>
              {deadlines.length ? deadlines.map((item) => <OverviewDeadlineLink key={item.id} href={`/admin/projetos?deliverable=${encodeURIComponent(item.id)}`} title={item.title} detail={`${companyMap.get(item.companyId)?.name || "Cliente"} · ${statusNames[item.status] || item.status}`} date={dateLabel(item.dueAt)} />) : <EmptyState as="p" variant="admin">{blockStatus("Nenhum prazo registrado.", "Entregáveis")}</EmptyState>}
            </WorkspaceOverviewPanel>
          </div>

          <WorkspaceOverviewPanel title="Carteira de clientes" action={{ href: "/admin/clientes", label: "Todas as contas" }}>
            {data.companies.length ? <div className="tw:mt-[1.38rem] tw:grid tw:grid-cols-3 tw:gap-[.92rem] tw:max-[59.375rem]:grid-cols-2 tw:max-[40rem]:grid-cols-1">
              {data.companies.map((client) => {
                const minutes = minutesByCompany.get(client.id) || 0;
                const projects = data.projects.filter((item) => item.companyId === client.id);
                const nps = data.satisfaction.recent.find((item) => item.company === client.name)?.score;
                const open = pendingDeliverables.filter((item) => item.companyId === client.id);
                const state = open.some((item) => item.status === "adjustment_requested") ? ["Ajuste solicitado", "red"]
                  : open.some((item) => item.status === "client_review") || projects.some((item) => item.planningStatus === "client_review") ? ["Aguardando cliente", "red"]
                  : !projects.length ? ["Sem projeto ativo", "purple"]
                  : open.length ? ["Em execução", "amber"] : ["Em dia", "green"];
                return <OverviewCompanyLink key={client.id} href="/admin/clientes" company={client.name}
                  logo={client.logoUrl ? <img src={client.logoUrl} alt="" /> : client.mark}
                  detail={[client.service, `${formatHours(minutes)}${client.contracted ? ` / ${client.contracted}h` : ""}`, `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`, nps == null ? "" : `NPS ${nps.toFixed(1).replace(".", ",")}`].filter(Boolean).join(" · ")}
                  status={<StatusBadge variant="admin" tone={state[1]}>{state[0]}</StatusBadge>} />;
              })}
            </div> : <EmptyState as="p" variant="admin">{blockStatus("Nenhum cliente ativo encontrado.", "Carteira")}</EmptyState>}
          </WorkspaceOverviewPanel>
        </WorkspaceAdminContent>
      </WorkspaceAdminPage>
    </Shell>
  );
}
