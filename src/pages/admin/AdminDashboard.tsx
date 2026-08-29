import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, CalendarRange, ChevronRight, CircleAlert, Clock3, ListChecks, MessageSquareText, Palette, Plus, Star } from 'lucide-react';
import { DonutChart, ExportMenu, HorizontalBars, MiniCalendar, TrendChart } from '../../components/DataViz';
import { Shell } from '../../components/WorkspaceShell';

const clients = [
  { name: 'Grupo Aurora', service: 'Assessoria Estratégica Mensal', consumed: 24.2, contracted: 30, nps: 4.9, deadline: '18 set', cycle: '19 ago → 18 set', next: 'Validação de indicadores · 03 set' },
  { name: 'Novatech', service: 'Assessoria Estratégica Mensal', consumed: 32.8, contracted: 40, nps: 4.7, deadline: '22 set', cycle: '23 ago → 22 set', next: 'Checkpoint executivo · 04 set' },
  { name: 'Studio Norte', service: 'Projeto de Estruturação', consumed: 11.4, contracted: 20, nps: 5.0, deadline: '30 set', cycle: '01 set → 30 set', next: 'Ritual de gestão · 05 set' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function AdminDashboard() {
  const [driveNotice, setDriveNotice] = useState(false);
  const [agendaMode, setAgendaMode] = useState<'month' | 'week'>('month');
  const [showColors, setShowColors] = useState(false);
  const [eventColors, setEventColors] = useState({ meeting: '#6b2135', validation: '#B58C52', deadline: '#9a5b40' });
  const exportRows = useMemo(() => clients.map((client) => ({ Cliente: client.name, Serviço: client.service, Ciclo: client.cycle, 'Horas consumidas': client.consumed, 'Horas contratadas': client.contracted, NPS: client.nps, Deadline: client.deadline, 'Próximo compromisso': client.next })), []);
  const events = [
    { type: 'meeting' as const, date: '31 AGO · 09:30', title: 'Reunião mensal · Grupo Aurora', detail: 'Google Meet · cliente convidado' },
    { type: 'validation' as const, date: '03 SET · 14:00', title: 'Validação de indicadores', detail: 'Grupo Aurora · decisão do cliente' },
    { type: 'deadline' as const, date: '05 SET · 18:00', title: 'Deadline · Ritual de gestão', detail: 'Studio Norte · entrega interna' },
  ];

  return (
    <Shell role="admin">
      <section className="page admin-overview-page">
        <div className="page-heading overview-heading">
          <div><div className="eyebrow">CALI · OPERAÇÃO</div><h1>{greeting()}, Patrícia.</h1><p>O que precisa de decisão agora, quais contas merecem atenção e como cada ciclo está avançando.</p></div>
          <div className="overview-actions compact-overview-actions">
            <ExportMenu title="Visão geral CALI Workspace" rows={exportRows} onDrive={() => setDriveNotice(true)} />
            <Link className="primary compact-primary-action" to="/admin/clientes"><Plus size={16} />Cadastrar cliente</Link>
          </div>
        </div>

        {driveNotice && <div className="inline-notice">A ação de salvar no Google Drive já está prevista. Ela será ativada junto com a conexão do Google Workspace.</div>}

        <section className="overview-signal-strip" aria-label="Sinais da operação">
          <div className="signal-card"><span>Contas ativas</span><strong>3</strong><small>todas com ciclo em andamento</small><i><Building2 size={22} /></i></div>
          <div className="signal-card"><span>Ações pendentes</span><strong>3</strong><small>prazo mais próximo em 31 ago</small><i><ListChecks size={22} /></i></div>
          <div className="signal-card"><span>Horas no mês</span><strong>68,4h</strong><small>76% das 90h contratadas</small><i><Clock3 size={22} /></i></div>
          <div className="signal-card"><span>NPS atual</span><strong>4,8</strong><small>média das avaliações recentes</small><i><Star size={22} /></i></div>
        </section>

        <div className="analytics-grid analytics-primary">
          <section className="panel chart-panel hours-chart-panel">
            <div className="panel-title chart-panel-title"><div><span className="section-kicker">CONSUMO DE HORAS</span><h2>Quem está mais perto do limite do ciclo</h2></div><Link to="/admin/horas">Detalhar horas <ChevronRight size={16} /></Link></div>
            <HorizontalBars data={[{ label: 'Grupo Aurora', value: 24.2, max: 30, helper: '5h48 restantes', tone: 'warn' }, { label: 'Novatech', value: 32.8, max: 40, helper: '7h12 restantes', tone: 'warn' }, { label: 'Studio Norte', value: 11.4, max: 20, helper: '8h36 restantes', tone: 'normal' }]} />
          </section>
          <section className="panel chart-panel deliverable-chart-panel">
            <div className="panel-title chart-panel-title"><div><span className="section-kicker">ENTREGÁVEIS</span><h2>Status do mês</h2></div><Link to="/admin/projetos">Abrir projetos</Link></div>
            <DonutChart centerValue="18" centerLabel="no mês" data={[{ label: 'Concluídos', value: 9, color: '#5A1E2D' }, { label: 'Em andamento', value: 5, color: '#B58C52' }, { label: 'Com cliente', value: 3, color: '#8A6B73' }, { label: 'Ajuste', value: 1, color: '#D9C9BE' }]} />
          </section>
        </div>

        <div className="analytics-grid analytics-secondary">
          <section className="panel chart-panel nps-chart-panel">
            <div className="panel-title chart-panel-title"><div><span className="section-kicker">NPS / SATISFAÇÃO</span><h2>Evolução das avaliações</h2></div><div className="metric-inline"><Star size={17} />4,8</div></div>
            <TrendChart values={[4.5, 4.6, 4.7, 4.7, 4.9, 4.8]} labels={['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']} />
          </section>
          <section className="panel attention-panel">
            <div className="panel-title"><div><span className="section-kicker">ATENÇÃO AGORA</span><h2>3 pontos para agir</h2></div><span className="count">3</span></div>
            <div className="action-row priority-high"><div className="status-icon warn"><CircleAlert size={20} /></div><div><strong>Revisão interna vence em 3 dias</strong><p>Grupo Aurora · Estrutura de indicadores de People</p><small>Deadline · 31 ago · 18:00</small></div><Link className="ghost" to="/admin/projetos">Revisar <ChevronRight size={17} /></Link></div>
            <div className="action-row"><div className="status-icon"><Clock3 size={20} /></div><div><strong>Novatech chegou a 82% das horas</strong><p>32h48 de 40h contratadas</p><small>Alerta de consumo do ciclo</small></div><Link className="ghost" to="/admin/horas">Ver horas <ChevronRight size={17} /></Link></div>
            <div className="action-row"><div className="status-icon"><MessageSquareText size={20} /></div><div><strong>Ajuste solicitado pelo cliente</strong><p>Studio Norte · Ritual de gestão com lideranças</p><small>Comentário recebido há 3h</small></div><Link className="ghost" to="/admin/projetos">Abrir <ChevronRight size={17} /></Link></div>
          </section>
        </div>

        <div className="overview-lower-grid agenda-deadline-grid">
          <section className="panel agenda-overview-panel">
            <div className="panel-title agenda-panel-head">
              <div><span className="section-kicker">AGENDA</span><h2>Próximos compromissos</h2></div>
              <div className="agenda-head-actions">
                <div className="view-toggle"><button className={agendaMode === 'month' ? 'active' : ''} onClick={() => setAgendaMode('month')}>Mês</button><button className={agendaMode === 'week' ? 'active' : ''} onClick={() => setAgendaMode('week')}>Semana</button></div>
                <button className={`agenda-color-button ${showColors ? 'active' : ''}`} onClick={() => setShowColors((value) => !value)}><Palette size={15} />Cores</button>
                <Link to="/admin/calendario">Calendário completo</Link>
              </div>
            </div>
            {showColors && <div className="event-color-editor"><label><span style={{ background: eventColors.meeting }} />Reunião<input type="color" value={eventColors.meeting} onChange={(e) => setEventColors((c) => ({ ...c, meeting: e.target.value }))} /></label><label><span style={{ background: eventColors.validation }} />Validação<input type="color" value={eventColors.validation} onChange={(e) => setEventColors((c) => ({ ...c, validation: e.target.value }))} /></label><label><span style={{ background: eventColors.deadline }} />Deadline<input type="color" value={eventColors.deadline} onChange={(e) => setEventColors((c) => ({ ...c, deadline: e.target.value }))} /></label></div>}
            <div className="agenda-overview-content">
              {agendaMode === 'month' ? <MiniCalendar monthLabel="Agosto" activeDay={28} markers={[{ day: 31, color: eventColors.meeting, label: 'Reunião mensal' }, { day: 28, color: eventColors.validation, label: 'Hoje' }]} /> : <div className="week-calendar"><div className="week-calendar-head"><strong>Semana atual</strong><span>28 ago — 03 set</span></div>{[['SEX','28'],['SÁB','29'],['DOM','30'],['SEG','31'],['TER','01'],['QUA','02'],['QUI','03']].map(([day,date]) => <div key={date} className={`week-day ${date === '28' ? 'active' : ''} ${date === '31' || date === '03' ? 'has-event' : ''}`}><span>{day}</span><strong>{date}</strong>{date === '31' && <i style={{ background: eventColors.meeting }} />}{date === '03' && <i style={{ background: eventColors.validation }} />}</div>)}</div>}
              <div className="agenda-timeline">{events.map((event) => <div className="agenda-line" key={event.date} style={{ '--event-color': eventColors[event.type] } as CSSProperties}><span>{event.date}</span><strong>{event.title}</strong><small>{event.detail}</small></div>)}</div>
            </div>
          </section>

          <section className="panel deadline-panel">
            <div className="panel-title"><div><span className="section-kicker">DEADLINES</span><h2>Próximos 15 dias</h2></div><CalendarRange size={20} /></div>
            <div className="deadline-list enhanced-deadlines">
              <div className="deadline-item critical"><div className="deadline-date"><strong>31 ago</strong><span>18:00</span></div><span className="deadline-client-mark">G</span><div className="deadline-copy"><p>Revisão de indicadores</p><strong>Grupo Aurora</strong><small>vence em 3 dias</small></div></div>
              <div className="deadline-item"><div className="deadline-date"><strong>05 set</strong><span>18:00</span></div><span className="deadline-client-mark">S</span><div className="deadline-copy"><p>Ritual de gestão</p><strong>Studio Norte</strong><small>entrega interna</small></div></div>
              <div className="deadline-item"><div className="deadline-date"><strong>08 set</strong><span>18:00</span></div><span className="deadline-client-mark">G</span><div className="deadline-copy"><p>Estrutura de governança</p><strong>Grupo Aurora</strong><small>entrega interna</small></div></div>
            </div>
          </section>
        </div>

        <section className="panel portfolio-table-panel">
          <div className="panel-title"><div><span className="section-kicker">CARTEIRA</span><h2>Clientes em andamento</h2></div><Link to="/admin/clientes">Gestão completa <ArrowUpRight size={16} /></Link></div>
          <div className="portfolio-table-head"><span>Cliente / serviço</span><span>Horas</span><span>Ciclo / deadline</span><span>NPS</span><span>Próximo passo</span><span /></div>
          {clients.map((client) => { const usage = Math.round(client.consumed / client.contracted * 100); return <div className="portfolio-table-row" key={client.name}><div className="client-identity compact-client"><div className="company-mark">{client.name[0]}</div><div><strong>{client.name}</strong><small>{client.service}</small></div></div><div className="portfolio-hours"><strong>{usage}%</strong><span>{client.consumed.toFixed(1)}h / {client.contracted}h</span></div><div className="portfolio-deadline"><strong>{client.deadline}</strong><span>{client.cycle}</span></div><div className="metric-inline"><Star size={16} />{client.nps.toFixed(1).replace('.', ',')}</div><div className="portfolio-next"><strong>{client.next.split(' · ')[0]}</strong><span>{client.next.split(' · ')[1]}</span></div><Link className="ghost" to="/admin/clientes">Abrir conta <ChevronRight size={16} /></Link></div>; })}
        </section>
      </section>
    </Shell>
  );
}
