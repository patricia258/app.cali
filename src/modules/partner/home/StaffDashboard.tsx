/* Visão geral do Partner (Equipe CALI). Mesma composição e mesmas classes da Visão geral da administradora (.ap-*),
   com os dados que ele pode ver: empresas atribuídas e módulos liberados. Cada bloco só aparece se o módulo estiver liberado. */
import { EmptyState } from '../../../components/ds/EmptyState';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../../../components/navigation/Link';
import { ArrowRight, CalendarDays, ChevronRight, Send } from 'lucide-react';
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
  const donutStops: string[] = [];
  let cursor = 0;
  for (const [position, [, value]] of statusData.entries()) {
    const from = cursor;
    cursor += value / Math.max(1, deliverables.length) * 100;
    donutStops.push(`${tones[position % tones.length]} ${from}% ${cursor}%`);
  }
  const waiting = pendingHours + pendingReviews;
  const metrics = [
    { label: 'Empresas', value: String(me.companies.length), helper: me.companies.slice(0, 2).map((c) => c.display_name).join(' · ') + (me.companies.length > 2 ? ` · +${me.companies.length - 2}` : ''), tone: 'green', href: '/equipe' },
    ...(has('records') ? [{ label: 'Ocorrências em aberto', value: String(openRecords.length), helper: 'aguardando resposta ou acompanhamento', tone: 'amber', href: '/equipe/ocorrencias' }] : []),
    ...(has('projects') ? [{ label: 'Entregas em andamento', value: String(open.length), helper: `${deliverables.length} no total das suas empresas`, tone: 'blue', href: '/equipe/projetos' }] : []),
    { label: 'Aguardando aprovação', value: String(waiting), helper: `${pendingHours} ${pendingHours === 1 ? 'lançamento de horas' : 'lançamentos de horas'} · ${pendingReviews} ${pendingReviews === 1 ? 'material' : 'materiais'}`, tone: 'purple', href: '/equipe/aprovacoes' },
  ];

  return <div className="ap-app v2-admin-page v2-staff-dashboard"><div className="ap-content">
    <div className="ap-title">
      <div><small>EQUIPE CALI / VISÃO GERAL</small><h1>Visão geral<span>.</span></h1><p>Prioridades, agenda e consumo de horas.</p></div>
      <div className="ap-title-actions"><Link className="ap-outline" to="/equipe/aprovacoes"><Send size={15} /> Ver aprovações</Link></div>
    </div>

    <section className="ap-overview-hero">
      <div><small>CALI · EQUIPE</small><h2>{greeting()}, {me.name.split(' ')[0]}.</h2><p>Veja o que precisa de você hoje.</p></div>
    </section>

    <div className="ap-metrics" aria-label="Sinais do seu trabalho">
      {metrics.map((metric) => <Link className={`ap-metric ${metric.tone}`} key={metric.label} to={metric.href}><small>{metric.label}</small><strong>{loading ? '—' : metric.value}</strong><span>{metric.helper}</span></Link>)}
    </div>

    {(has('projects') || has('calendar')) && <div className="ap-grid-two">
      {has('projects') && <section className="ap-pane">
        <div className="ap-pane-head"><h2>Prioridades de hoje</h2><Link to="/equipe/projetos">Abrir projetos <ArrowRight size={14} /></Link></div>
        {priorities.length ? priorities.map((item, index) => { const overdue = String(item.due_at) < today; return <Link className="ap-activity" key={item.id} to="/equipe/projetos"><span className="ap-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.title}</strong><small>{companyName.get(item.company_id) || 'Empresa'} · {statusNames[item.status || ''] || item.status || 'Não iniciado'}</small></span><span className={`ap-status ${overdue ? 'red' : 'amber'}`}>{overdue ? `Venceu ${dateLabel(String(item.due_at))}` : dateLabel(String(item.due_at))}</span><ChevronRight size={14} /></Link>; }) : <EmptyState as="p" variant="admin">Nenhuma entrega com prazo em aberto nas suas empresas.</EmptyState>}
      </section>}
      {has('calendar') && <section className="ap-pane">
        <div className="ap-pane-head"><h2>Agenda das suas empresas</h2><Link to="/equipe/calendario">Ver calendário <ArrowRight size={14} /></Link></div>
        {events.length ? events.map((event) => <Link className="ap-time-line" key={event.id} to="/equipe/calendario"><time>{dateLabel(event.starts_at)} · {timeLabel(event.starts_at)}</time><i /><span><strong>{event.title}</strong><small>{companyName.get(event.company_id || '') || 'CALI'} · {eventKind[event.event_type || ''] || 'Compromisso'}</small></span><ChevronRight size={14} /></Link>) : <EmptyState as="p" variant="admin">Nenhum compromisso marcado nos próximos dias.</EmptyState>}
      </section>}
      {has('projects') && !has('calendar') && <section className="ap-pane">
        <div className="ap-pane-head"><h2>Próximos prazos</h2><Link to="/equipe/projetos">Ver entregas <ArrowRight size={14} /></Link></div>
        {deadlines.length ? deadlines.map((item) => <Link className="ap-deadline" key={item.id} to="/equipe/projetos"><CalendarDays size={16} /><span><strong>{item.title}</strong><small>{companyName.get(item.company_id) || 'Empresa'} · {statusNames[item.status || ''] || item.status}</small></span><b>{dateLabel(String(item.due_at))}</b></Link>) : <EmptyState as="p" variant="admin">Nenhum prazo à frente.</EmptyState>}
      </section>}
    </div>}

    {(has('hours') || has('projects')) && <div className="ap-exec-grid">
      {has('hours') && <section className="ap-pane ap-exec-hours">
        <div className="ap-pane-head"><h2>Consumo de horas por empresa</h2><Link to="/equipe/horas">Lançar horas <ArrowRight size={14} /></Link></div>
        {me.companies.map((item) => { const used = minutes[item.id] || 0; const contracted = Number(item.monthly_hours_contracted || 0); const pct = contracted ? Math.round(used / 60 / contracted * 100) : 0; return <Link className={`ap-hour-client ${pct >= 90 ? 'critical' : pct >= 75 ? 'warn' : ''}`} key={item.id} to="/equipe/horas"><span className="ap-hour-logo">{logos[item.id] ? <img src={logos[item.id]} alt="" /> : mark(item.display_name)}</span><span className="ap-hour-main"><strong>{item.display_name}</strong><small>{hours(used)}{contracted ? ` / ${contracted}h · ${Math.max(0, contracted - used / 60).toFixed(1).replace('.', ',')}h restantes` : ' · sem limite de ciclo'}</small><span className="ap-hour-track"><i style={{ width: `${Math.min(100, pct)}%` }} /></span></span><b>{contracted ? `${pct}%` : '—'}</b></Link>; })}
      </section>}
      {has('projects') && <section className="ap-pane ap-exec-status">
        <div className="ap-pane-head"><h2>Status das entregas</h2><Link to="/equipe/projetos">Abrir projetos <ArrowRight size={14} /></Link></div>
        {statusData.length ? <>
          <div className="ap-exec-donut" role="img" aria-label={statusData.map(([label, value]) => `${statusNames[label] || label}: ${value}`).join(', ')} style={{ background: `conic-gradient(${donutStops.join(',')})` }}><div><strong>{deliverables.length}</strong><small>nas suas empresas</small></div></div>
          <div className="ap-exec-legend">{statusData.map(([label, value], index) => <span key={label}><i style={{ background: tones[index % tones.length] }} />{statusNames[label] || label} <strong>{value}</strong></span>)}</div>
        </> : <EmptyState as="p" variant="admin">Ainda não há entregas nas suas empresas.</EmptyState>}
      </section>}
    </div>}

    <section className="ap-pane ap-full">
      <div className="ap-pane-head"><h2>Suas empresas</h2></div>
      {me.companies.length ? <div className="ap-account-grid">{me.companies.map((client) => { const mine = open.filter((item) => item.company_id === client.id); const talk = openRecords.filter((item) => item.company_id === client.id).length; const state = mine.some((item) => item.status === 'adjustment_requested') ? ['Ajuste solicitado', 'red'] : mine.some((item) => item.status === 'client_review') ? ['Aguardando cliente', 'red'] : talk ? [`${talk} ${talk === 1 ? 'ocorrência aberta' : 'ocorrências abertas'}`, 'amber'] : mine.length ? ['Em execução', 'amber'] : ['Em dia', 'green'];
        return <Link className="ap-client" key={client.id} to={has('projects') ? '/equipe/projetos' : '/equipe'}><span className="ap-client-brand">{logos[client.id] ? <img src={logos[client.id]} alt="" /> : mark(client.display_name)}</span><div><strong>{client.display_name}</strong><small>{[PLAN[String(client.service_plan || '').toLowerCase()] || client.service_plan, client.monthly_hours_contracted ? `${client.monthly_hours_contracted}h por mês` : '', has('projects') ? `${mine.length} ${mine.length === 1 ? 'entrega em andamento' : 'entregas em andamento'}` : ''].filter(Boolean).join(' · ')}</small></div><span className={`ap-status ${state[1]}`}>{state[0]}</span><ArrowRight size={15} /></Link>; })}</div> : <EmptyState as="p" variant="admin">Nenhuma empresa atribuída a você ainda. Fale com a Patricia.</EmptyState>}
    </section>

    <section className="ap-pane ap-full v2-staff-scope">
      <div className="ap-pane-head"><h2>O que está liberado para você</h2></div>
      <div className="v2-staff-scope-tags">{me.modules.map((key) => <span className="ap-status purple" key={key}>{({ records: 'Ocorrências', projects: 'Projetos e entregas', hours: 'Horas', calendar: 'Calendário', documents: 'Documentos', reports: 'Relatórios', notices: 'Avisos', team: 'Equipe do cliente', people_map: 'Mapa de People' } satisfies Record<string, string>)[key] || key}</span>)}</div>
    </section>
  </div></div>;
}
