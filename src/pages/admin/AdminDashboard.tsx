import { Link } from 'react-router-dom';
import { ChevronRight, CircleAlert, Clock3, MessageSquareText, Star, Users } from 'lucide-react';
import { Kpi, Progress, Shell } from '../../components/WorkspaceShell';

export function AdminDashboard() {
  return (
    <Shell role="admin">
      <section className="page">
        <div className="eyebrow">CALI · OPERAÇÃO</div>
        <div className="page-heading">
          <div>
            <h1>Boa tarde, Patrícia.</h1>
            <p>O que precisa da sua atenção hoje e como estão as contas em andamento.</p>
          </div>
          <button className="primary"><Users size={18} />Cadastrar cliente</button>
        </div>

        <div className="kpi-grid">
          <Kpi label="Clientes ativos" value="4" helper="1 com ação pendente" />
          <Kpi label="Entregáveis no mês" value="18" helper="12 concluídos" />
          <Kpi label="Horas registradas" value="63h40" helper="78% das horas previstas" />
          <Kpi label="NPS médio" value="4,8" helper="últimos 90 dias" />
        </div>

        <div className="dashboard-grid">
          <section className="panel attention">
            <div className="panel-title">
              <div><span className="section-kicker">AGUARDANDO AÇÃO</span><h2>O que precisa da sua atenção</h2></div>
              <span className="count">3</span>
            </div>
            <div className="action-row">
              <div className="status-icon warn"><CircleAlert size={20} /></div>
              <div><strong>Entregável pronto para aprovação interna</strong><p>Grupo Aurora · Estrutura de indicadores de People</p></div>
              <button>Revisar <ChevronRight size={17} /></button>
            </div>
            <div className="action-row">
              <div className="status-icon"><Clock3 size={20} /></div>
              <div><strong>Consumo de horas em 82%</strong><p>Novatech · 32h50 de 40h contratadas</p></div>
              <Link className="ghost" to="/admin/horas">Ver horas <ChevronRight size={17} /></Link>
            </div>
            <div className="action-row">
              <div className="status-icon"><MessageSquareText size={20} /></div>
              <div><strong>Ajuste solicitado pelo cliente</strong><p>Studio Norte · Ritual de gestão com lideranças</p></div>
              <Link className="ghost" to="/admin/projetos">Abrir <ChevronRight size={17} /></Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div><span className="section-kicker">AGENDA</span><h2>Próximos compromissos</h2></div>
              <Link to="/admin/calendario">Ver calendário</Link>
            </div>
            <div className="event"><div className="date"><strong>31</strong><span>AGO</span></div><div><strong>Reunião mensal · Grupo Aurora</strong><p>09:30 · Remota</p></div></div>
            <div className="event"><div className="date"><strong>03</strong><span>SET</span></div><div><strong>Validação de indicadores</strong><p>14:00 · Grupo Aurora</p></div></div>
            <div className="event"><div className="date"><strong>05</strong><span>SET</span></div><div><strong>Checkpoint · Studio Norte</strong><p>11:00 · Remota</p></div></div>
          </section>
        </div>

        <section className="panel companies">
          <div className="panel-title">
            <div><span className="section-kicker">CARTEIRA</span><h2>Clientes em andamento</h2></div>
            <Link to="/admin/clientes">Ver todos</Link>
          </div>
          {[
            ['Grupo Aurora', '24h10 / 30h', '81%', '4,9'],
            ['Novatech', '32h50 / 40h', '82%', '4,7'],
            ['Studio Norte', '11h25 / 20h', '57%', '5,0'],
          ].map(([name, hours, pct, nps]) => (
            <div className="company-row" key={name}>
              <div className="company-mark">{name[0]}</div>
              <div className="company-name"><strong>{name}</strong><span>Assessoria estratégica mensal</span></div>
              <div className="hours-cell"><span>{hours}</span><Progress value={parseInt(pct)} /></div>
              <div className="nps"><Star size={17} />{nps}</div>
              <Link className="ghost" to="/admin/clientes">Abrir conta</Link>
            </div>
          ))}
        </section>
      </section>
    </Shell>
  );
}
