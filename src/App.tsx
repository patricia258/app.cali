import { useMemo, useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText,
  FolderKanban, Home, LayoutDashboard, LogOut, MessageSquareText, PieChart,
  Star, Users, TimerReset, Building2, Send, CircleAlert, Menu, X
} from 'lucide-react';

type Role = 'admin' | 'client';
type NavItem = { label: string; icon: React.ComponentType<{ size?: number }>; href: string };

const adminNav: NavItem[] = [
  { label: 'Visão geral', icon: LayoutDashboard, href: '/admin' },
  { label: 'Clientes', icon: Building2, href: '/admin/clientes' },
  { label: 'Projetos', icon: FolderKanban, href: '/admin/projetos' },
  { label: 'Horas', icon: TimerReset, href: '/admin/horas' },
  { label: 'Calendário', icon: CalendarDays, href: '/admin/calendario' },
  { label: 'Documentos', icon: FileText, href: '/admin/documentos' },
  { label: 'Relatórios', icon: PieChart, href: '/admin/relatorios' },
];

const clientNav: NavItem[] = [
  { label: 'Início', icon: Home, href: '/cliente' },
  { label: 'Cronograma', icon: CalendarDays, href: '/cliente/cronograma' },
  { label: 'Entregáveis', icon: FolderKanban, href: '/cliente/entregaveis' },
  { label: 'Horas', icon: Clock3, href: '/cliente/horas' },
  { label: 'Documentos', icon: FileText, href: '/cliente/documentos' },
  { label: 'Relatórios', icon: PieChart, href: '/cliente/relatorios' },
];

const deliverables = [
  { title: 'Estrutura de indicadores de People', status: 'Aguardando validação', due: '03 set', hours: '4h20', progress: 100 },
  { title: 'Ritual de gestão com lideranças', status: 'Em andamento', due: '08 set', hours: '2h45', progress: 62 },
  { title: 'Matriz de responsabilidades do RH', status: 'Em andamento', due: '12 set', hours: '1h30', progress: 35 },
  { title: 'Plano do próximo ciclo', status: 'Não iniciado', due: '18 set', hours: '0h', progress: 0 },
];

function Brand() {
  return <div className="brand"><strong>CALI</strong><span>WORKSPACE</span></div>;
}

function Sidebar({ role }: { role: Role }) {
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : clientNav;
  const [open, setOpen] = useState(false);
  return <>
    <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></button>
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-top"><Brand/><button className="sidebar-close" onClick={() => setOpen(false)}><X/></button></div>
      <nav>{nav.map(item => {
        const active = location.pathname === item.href;
        const Icon = item.icon;
        return <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={active ? 'active' : ''}>
          <Icon size={19}/><span>{item.label}</span>
        </Link>;
      })}</nav>
      <div className="sidebar-footer">
        <div className="avatar">PL</div>
        <div><strong>{role === 'admin' ? 'Patrícia Lima' : 'Conta cliente'}</strong><small>{role === 'admin' ? 'Admin CALI' : 'Acesso principal'}</small></div>
        <LogOut size={18}/>
      </div>
    </aside>
  </>;
}

function Shell({ role, children }: { role: Role; children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar role={role}/><main className="main"><header className="topbar"><div/><div className="top-actions"><button aria-label="Notificações" className="icon-button"><Bell size={20}/><span className="notification-dot"/></button></div></header>{children}</main></div>;
}

function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

function Progress({ value }: { value: number }) {
  return <div className="progress"><span style={{ width: `${value}%` }}/></div>;
}

function AdminDashboard() {
  return <Shell role="admin"><section className="page">
    <div className="eyebrow">CALI · OPERAÇÃO</div>
    <div className="page-heading"><div><h1>Boa tarde, Patrícia.</h1><p>O que precisa da sua atenção hoje e como estão as contas em andamento.</p></div><button className="primary"><Users size={18}/>Cadastrar cliente</button></div>
    <div className="kpi-grid"><Kpi label="Clientes ativos" value="4" helper="1 com ação pendente"/><Kpi label="Entregáveis no mês" value="18" helper="12 concluídos"/><Kpi label="Horas registradas" value="63h40" helper="78% das horas previstas"/><Kpi label="NPS médio" value="4,8" helper="últimos 90 dias"/></div>

    <div className="dashboard-grid">
      <section className="panel attention"><div className="panel-title"><div><span className="section-kicker">AGUARDANDO AÇÃO</span><h2>O que precisa da sua atenção</h2></div><span className="count">3</span></div>
        <div className="action-row"><div className="status-icon warn"><CircleAlert size={20}/></div><div><strong>Entregável pronto para aprovação interna</strong><p>Grupo Aurora · Estrutura de indicadores de People</p></div><button>Revisar <ChevronRight size={17}/></button></div>
        <div className="action-row"><div className="status-icon"><Clock3 size={20}/></div><div><strong>Consumo de horas em 82%</strong><p>Novatech · 32h50 de 40h contratadas</p></div><button>Ver horas <ChevronRight size={17}/></button></div>
        <div className="action-row"><div className="status-icon"><MessageSquareText size={20}/></div><div><strong>Ajuste solicitado pelo cliente</strong><p>Studio Norte · Ritual de gestão com lideranças</p></div><button>Abrir <ChevronRight size={17}/></button></div>
      </section>

      <section className="panel"><div className="panel-title"><div><span className="section-kicker">AGENDA</span><h2>Próximos compromissos</h2></div><Link to="/admin/calendario">Ver calendário</Link></div>
        <div className="event"><div className="date"><strong>31</strong><span>AGO</span></div><div><strong>Reunião mensal · Grupo Aurora</strong><p>09:30 · Remota</p></div></div>
        <div className="event"><div className="date"><strong>03</strong><span>SET</span></div><div><strong>Validação de indicadores</strong><p>14:00 · Grupo Aurora</p></div></div>
        <div className="event"><div className="date"><strong>05</strong><span>SET</span></div><div><strong>Checkpoint · Studio Norte</strong><p>11:00 · Remota</p></div></div>
      </section>
    </div>

    <section className="panel companies"><div className="panel-title"><div><span className="section-kicker">CARTEIRA</span><h2>Clientes em andamento</h2></div><Link to="/admin/clientes">Ver todos</Link></div>
      {[['Grupo Aurora','24h10 / 30h','81%','4,9'],['Novatech','32h50 / 40h','82%','4,7'],['Studio Norte','11h25 / 20h','57%','5,0']].map(([name,hours,pct,nps]) => <div className="company-row" key={name}><div className="company-mark">{name[0]}</div><div className="company-name"><strong>{name}</strong><span>Assessoria estratégica mensal</span></div><div className="hours-cell"><span>{hours}</span><Progress value={parseInt(pct)}/></div><div className="nps"><Star size={17}/>{nps}</div><button className="ghost">Abrir conta</button></div>)}
    </section>
  </section></Shell>;
}

function ClientDashboard() {
  return <Shell role="client"><section className="page">
    <div className="client-context"><div className="company-logo">A</div><div><span>ESPAÇO COMPARTILHADO</span><strong>Grupo Aurora × CALI RH</strong></div></div>
    <div className="page-heading"><div><h1>Olá, Grupo Aurora.</h1><p>Acompanhe o que está em movimento, valide entregas e consulte o histórico do trabalho com a CALI.</p></div></div>

    <section className="hero-attention"><div><span className="section-kicker light">AGUARDANDO VOCÊ</span><h2>1 entrega está pronta para sua validação.</h2><p>A Estrutura de indicadores de People foi concluída e está disponível para leitura e aprovação.</p></div><button className="light-button">Revisar entregável <ChevronRight size={18}/></button></section>

    <div className="client-summary"><div><span>Horas neste ciclo</span><strong>24h10 <small>de 30h</small></strong><Progress value={81}/><p>Você será avisado novamente ao atingir 90%.</p></div><div><span>Projeto atual</span><strong>62%</strong><Progress value={62}/><p>3 de 5 entregáveis concluídos.</p></div><div><span>Satisfação</span><strong>4,9 <small>/ 5</small></strong><div className="stars">★★★★★</div><p>Média das suas últimas avaliações.</p></div></div>

    <div className="dashboard-grid client-grid"><section className="panel"><div className="panel-title"><div><span className="section-kicker">PROJETO EM ANDAMENTO</span><h2>Estruturação People · Ciclo 01</h2></div><Link to="/cliente/entregaveis">Ver projeto</Link></div>
      <div className="deliverable-list">{deliverables.map(d => <div className="deliverable" key={d.title}><div className="check"><CheckCircle2 size={19}/></div><div><strong>{d.title}</strong><span className={`status ${d.status === 'Aguardando validação' ? 'needs-action' : ''}`}>{d.status}</span><Progress value={d.progress}/></div><div className="deliverable-meta"><span>{d.due}</span><small>{d.hours}</small></div></div>)}</div>
    </section>
    <section className="panel"><div className="panel-title"><div><span className="section-kicker">PRÓXIMOS PASSOS</span><h2>Agenda compartilhada</h2></div><Link to="/cliente/cronograma">Abrir</Link></div>
      <div className="event"><div className="date"><strong>31</strong><span>AGO</span></div><div><strong>Reunião mensal</strong><p>09:30 · Remota</p></div></div><div className="event"><div className="date"><strong>03</strong><span>SET</span></div><div><strong>Validação de indicadores</strong><p>14:00 · Remota</p></div></div>
      <div className="consultant"><div className="avatar large">PL</div><div><span>SUA CONSULTORA</span><strong>Patrícia Lima</strong><p>Última atualização hoje, às 16:42.</p></div></div>
    </section></div>
  </section></Shell>;
}

function Placeholder({ role, title, description }: { role: Role; title: string; description: string }) {
  return <Shell role={role}><section className="page"><div className="eyebrow">CALI WORKSPACE</div><div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div></div><section className="panel empty-state"><FileText size={34}/><h2>Estrutura preparada</h2><p>Esta área já está mapeada na arquitetura e será conectada ao banco real na próxima etapa.</p></section></section></Shell>;
}

function Login() {
  const [email, setEmail] = useState('');
  const valid = useMemo(() => email.includes('@') && email.includes('.'), [email]);
  return <main className="login-page"><section className="login-brand"><Brand/><div><span className="section-kicker light">CALI RH</span><h1>O trabalho continua aqui.</h1><p>Um espaço compartilhado para acompanhar projetos, decisões, entregas, horas, documentos e relatórios.</p></div><small>Pessoas como estratégia. Negócios que evoluem.</small></section><section className="login-form"><div className="login-card"><span className="section-kicker">ACESSO SEGURO</span><h2>Entre no seu Workspace.</h2><p>Informe seu e-mail. Você receberá um link de acesso — sem senha para memorizar.</p><label>E-mail<input value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br" type="email"/></label><button disabled={!valid} className="primary full"><Send size={18}/>Enviar link de acesso</button><div className="demo-links"><span>Prévia de desenvolvimento</span><Link to="/admin">Patrícia</Link><Link to="/cliente">Cliente</Link></div></div></section></main>;
}

export default function App() {
  return <Routes>
    <Route path="/" element={<Login/>}/>
    <Route path="/admin" element={<AdminDashboard/>}/>
    <Route path="/cliente" element={<ClientDashboard/>}/>
    {adminNav.filter(i => i.href !== '/admin').map(i => <Route key={i.href} path={i.href} element={<Placeholder role="admin" title={i.label} description={`Gestão de ${i.label.toLowerCase()} da CALI Workspace.`}/>}/>)}
    {clientNav.filter(i => i.href !== '/cliente').map(i => <Route key={i.href} path={i.href} element={<Placeholder role="client" title={i.label} description={`Acompanhe ${i.label.toLowerCase()} da sua empresa com a CALI.`}/>}/>)}
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}