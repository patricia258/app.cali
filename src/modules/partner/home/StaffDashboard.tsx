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
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { ChevronRight, Send } from 'lucide-react';
import { readPartnerOverview } from '../../../api/partner/operations';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';
import type { PartnerWorkspace } from '../../../api/partner/workspace';

type Deliverable = { id: string; company_id: string; title: string; status: string | null; due_at: string | null };
type EventRow = { id: string; company_id: string | null; title: string; starts_at: string; event_type: string | null };
type RecordRow = { id: string; company_id: string; title: string; workflow_status: string | null; last_activity_at: string | null };

const PLAN: Record<string, string> = { partner: 'CALI Partner', full: 'CALI Full', build: 'CALI Build' };
const statusNames: Record<string, string> = { not_started: 'Não iniciado', in_progress: 'Em andamento', internal_review: 'Revisão interna', client_review: 'Com cliente', adjustment_requested: 'Ajuste solicitado', approved: 'Aprovados', done: 'Concluídos' };
const tones = ['#5a1e2d', '#b58c52', '#8a6475', '#d8c7bd', '#7aafcd', '#4c9a76'];
const eventKind: Record<string, string> = { meeting: 'Reunião', visit: 'Visita', onsite: 'Visita', deadline: 'Prazo', delivery: 'Entrega', training: 'Treinamento' };
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'; };
const dateLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '');
const timeLabel = (iso: string) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const hours = (minutes: number) => `${(minutes / 60).toFixed(1).replace('.', ',')}h`;
const mark = (name: string) => name.trim().charAt(0).toUpperCase() || '•';

export function StaffDashboard({ me }: { me: PartnerWorkspace }) {
  const has = (key: string) => me.modules.includes(key);
  const [logos, setLogos] = useState<Record<string, string>>({}); const [deliverables, setDeliverables] = useState<Deliverable[]>([]); const [events, setEvents] = useState<EventRow[]>([]); const [records, setRecords] = useState<RecordRow[]>([]);
  const [minutes, setMinutes] = useState<Record<string, number>>({}); const [pendingHours, setPendingHours] = useState(0); const [pendingReviews, setPendingReviews] = useState(0); const [loading, setLoading] = useState(true);

  useEffect(() => { let alive = true; (async () => {
    const data = await readPartnerOverview(me.modules);
    if (!alive || !data) return;
    setDeliverables(data.deliverables);
    setEvents(data.events);
    setRecords(data.records);
    setMinutes(data.minutes);
    setPendingHours(data.pendingHours);
    setPendingReviews(data.pendingReviews);
    setLoading(false);
    const resolved = await Promise.all(me.companies.map(async (item) => [item.id, (await resolveWorkspaceMedia(item.logo_workspace_url || item.logo_url, 3600)) || ''] satisfies [string, string]));
    if (alive) setLogos(Object.fromEntries(resolved.filter(([, url]) => url)));
  })(); return () => { alive = false; }; }, [me.id]);

  const companyName = useMemo(() => new Map(me.companies.map((item) => [item.id, item.display_name])), [me]);
  const open = deliverables.filter((item) => !['approved', 'done'].includes(item.status || ''));
  const today = new Date().toISOString();
  const priorities = open.filter((item) => item.due_at).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at))).slice(0, 4);
  const deadlines = open.filter((item) => item.due_at && String(item.due_at) >= today).sort((a, b) => String(a.due_at).localeCompare(String(b.due_at))).slice(0, 4);
  const openRecords = records.filter((item) => !['completed', 'closed', 'archived'].includes(item.workflow_status || ''));
  const statusData = Object.entries(deliverables.reduce<Record<string, number>>((map, item) => { const key = item.status || 'not_started'; map[key] = (map[key] || 0) + 1; return map; }, {})).sort((a, b) => b[1] - a[1]);
  const waiting = pendingHours + pendingReviews;
  const metrics = [
    { label: 'Empresas', value: String(me.companies.length), helper: me.companies.slice(0, 2).map((c) => c.display_name).join(' · ') + (me.companies.length > 2 ? ` · +${me.companies.length - 2}` : ''), tone: 'green', href: '/equipe' },
    ...(has('records') ? [{ label: 'Ocorrências em aberto', value: String(openRecords.length), helper: 'aguardando resposta ou acompanhamento', tone: 'amber', href: '/equipe/ocorrencias' }] : []),
    ...(has('projects') ? [{ label: 'Entregas em andamento', value: String(open.length), helper: `${deliverables.length} no total das suas empresas`, tone: 'blue', href: '/equipe/projetos' }] : []),
    { label: 'Aguardando aprovação', value: String(waiting), helper: `${pendingHours} ${pendingHours === 1 ? 'lançamento de horas' : 'lançamentos de horas'} · ${pendingReviews} ${pendingReviews === 1 ? 'material' : 'materiais'}`, tone: 'purple', href: '/equipe/aprovacoes' },
  ];

  return <WorkspaceAdminPage className="v2-staff-dashboard"><WorkspaceAdminContent>
    <WorkspacePageHeader eyebrow="EQUIPE CALI / VISÃO GERAL" title="Visão geral" description="Prioridades, agenda e consumo de horas.">
      <Link className="tw:inline-flex tw:items-center tw:gap-[.538rem] tw:rounded-[.615rem] tw:border tw:border-solid tw:border-[#e5d9d1] tw:bg-white tw:px-4 tw:py-[.846rem] tw:font-bold tw:text-cali-brand" to="/equipe/aprovacoes"><Send size={15} /> Ver aprovações</Link>
    </WorkspacePageHeader>

    <WorkspaceOverviewIntro eyebrow="CALI · EQUIPE" title={`${greeting()}, ${me.name.split(' ')[0]}.`} description="Veja o que precisa de você hoje." />
    <WorkspaceMetricGrid label="Sinais do seu trabalho" metrics={metrics.map((metric) => ({ ...metric, value: loading ? '—' : metric.value }))} />

    {(has('projects') || has('calendar')) && <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-2 tw:gap-[1.23rem] tw:max-[59.375rem]:grid-cols-1">
      {has('projects') && <WorkspaceOverviewPanel title="Prioridades de hoje" action={{ href: "/equipe/projetos", label: "Abrir projetos" }}>
        {priorities.length ? priorities.map((item, index) => { const overdue = String(item.due_at) < today; return <OverviewActivityLink key={item.id} href="/equipe/projetos" title={item.title} detail={`${companyName.get(item.company_id) || 'Empresa'} · ${statusNames[item.status || ''] || item.status || 'Não iniciado'}`} leading={<span className="tw:text-[1.23rem]/[inherit] tw:text-[#bf9a75]">{String(index + 1).padStart(2, '0')}</span>} trailing={<><StatusBadge variant="admin" tone={overdue ? 'red' : 'amber'}>{overdue ? `Venceu ${dateLabel(String(item.due_at))}` : dateLabel(String(item.due_at))}</StatusBadge><ChevronRight size={14} /></>} />; }) : <EmptyState as="p" variant="admin">Nenhuma entrega com prazo em aberto nas suas empresas.</EmptyState>}
      </WorkspaceOverviewPanel>}
      {has('calendar') && <WorkspaceOverviewPanel title="Agenda das suas empresas" action={{ href: "/equipe/calendario", label: "Ver calendário" }}>
        {events.length ? events.map((event) => <OverviewActivityLink key={event.id} href="/equipe/calendario" title={event.title} detail={<>{companyName.get(event.company_id || '') || 'CALI'} · {eventKind[event.event_type || ''] || 'Compromisso'}</>} leading={<><time className="tw:text-[.85rem]/[inherit] tw:font-bold tw:text-[#977669]">{dateLabel(event.starts_at)} · {timeLabel(event.starts_at)}</time><i className="tw:size-[.69rem] tw:shrink-0 tw:rounded-full tw:bg-[#a484d7]" /></>} trailing={<ChevronRight size={14} />} />) : <EmptyState as="p" variant="admin">Nenhum compromisso marcado nos próximos dias.</EmptyState>}
      </WorkspaceOverviewPanel>}
      {has('projects') && !has('calendar') && <WorkspaceOverviewPanel title="Próximos prazos" action={{ href: "/equipe/projetos", label: "Ver entregas" }}>
        {deadlines.length ? deadlines.map((item) => <OverviewDeadlineLink key={item.id} href="/equipe/projetos" title={item.title} detail={<>{companyName.get(item.company_id) || 'Empresa'} · {statusNames[item.status || ''] || item.status}</>} date={dateLabel(String(item.due_at))} />) : <EmptyState as="p" variant="admin">Nenhum prazo à frente.</EmptyState>}
      </WorkspaceOverviewPanel>}
    </div>}

    {(has('hours') || has('projects')) && <div className="tw:mb-[1.23rem] tw:grid tw:grid-cols-[1.35fr_1fr] tw:gap-[1.23rem] tw:max-[53.125rem]:grid-cols-1">
      {has('hours') && <WorkspaceOverviewPanel title="Consumo de horas por empresa" action={{ href: "/equipe/horas", label: "Lançar horas" }}>
        {me.companies.map((item) => { const used = minutes[item.id] || 0; const contracted = Number(item.monthly_hours_contracted || 0); const pct = contracted ? Math.round(used / 60 / contracted * 100) : 0; return <OverviewCompanyHours key={item.id} href="/equipe/horas" company={item.display_name}
          logo={logos[item.id] ? <img src={logos[item.id]} alt="" /> : mark(item.display_name)}
          description={`${hours(used)}${contracted ? ` / ${contracted}h · ${Math.max(0, contracted - used / 60).toFixed(1).replace('.', ',')}h restantes` : ' · sem limite de ciclo'}`}
          percent={contracted ? pct : null} />; })}
      </WorkspaceOverviewPanel>}
      {has('projects') && <WorkspaceOverviewPanel title="Status das entregas" action={{ href: "/equipe/projetos", label: "Abrir projetos" }}>
        {statusData.length ? <OverviewDeliveryChart
                values={statusData.map(([label, count], index) => ({ label: statusNames[label] || label, count, color: tones[index % tones.length] }))}
                total={deliverables.length}
                caption="nas suas empresas"
              /> : <EmptyState as="p" variant="admin">Ainda não há entregas nas suas empresas.</EmptyState>}
      </WorkspaceOverviewPanel>}
    </div>}

    <WorkspaceOverviewPanel title="Suas empresas">
      {me.companies.length ? <div className="tw:mt-[1.38rem] tw:grid tw:grid-cols-[repeat(auto-fill,minmax(min(100%,25.38rem),1fr))] tw:gap-[.92rem]">{me.companies.map((client) => { const mine = open.filter((item) => item.company_id === client.id); const talk = openRecords.filter((item) => item.company_id === client.id).length; const state = mine.some((item) => item.status === 'adjustment_requested') ? ['Ajuste solicitado', 'red'] : mine.some((item) => item.status === 'client_review') ? ['Aguardando cliente', 'red'] : talk ? [`${talk} ${talk === 1 ? 'ocorrência aberta' : 'ocorrências abertas'}`, 'amber'] : mine.length ? ['Em execução', 'amber'] : ['Em dia', 'green'];
        return <OverviewCompanyLink key={client.id} href={has('projects') ? '/equipe/projetos' : '/equipe'} company={client.display_name}
          logo={logos[client.id] ? <img src={logos[client.id]} alt="" /> : mark(client.display_name)}
          detail={[PLAN[String(client.service_plan || '').toLowerCase()] || client.service_plan, client.monthly_hours_contracted ? `${client.monthly_hours_contracted}h por mês` : '', has('projects') ? `${mine.length} ${mine.length === 1 ? 'entrega em andamento' : 'entregas em andamento'}` : ''].filter(Boolean).join(' · ')}
          status={<StatusBadge variant="admin" tone={state[1]}>{state[0]}</StatusBadge>} />; })}</div> : <EmptyState as="p" variant="admin">Nenhuma empresa atribuída a você ainda. Fale com a Patricia.</EmptyState>}
    </WorkspaceOverviewPanel>

    <WorkspaceOverviewPanel title="O que está liberado para você">
      <div className="tw:flex tw:flex-wrap tw:gap-[.62rem] tw:pt-[.31rem]">{me.modules.map((key) => <StatusBadge variant="admin" tone="purple" key={key}>{({ records: 'Ocorrências', projects: 'Projetos e entregas', hours: 'Horas', calendar: 'Calendário', documents: 'Documentos', reports: 'Relatórios', notices: 'Avisos', team: 'Equipe do cliente', people_map: 'Mapa de People' } satisfies Record<string, string>)[key] || key}</StatusBadge>)}</div>
    </WorkspaceOverviewPanel>
  </WorkspaceAdminContent></WorkspaceAdminPage>;
}
