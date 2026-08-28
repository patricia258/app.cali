import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  TimerReset,
  X,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'admin' | 'client';

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

export const adminNav: NavItem[] = [
  { label: 'Visão geral', icon: LayoutDashboard, href: '/admin' },
  { label: 'Clientes', icon: Building2, href: '/admin/clientes' },
  { label: 'Projetos', icon: FolderKanban, href: '/admin/projetos' },
  { label: 'Horas', icon: TimerReset, href: '/admin/horas' },
  { label: 'Calendário', icon: CalendarDays, href: '/admin/calendario' },
  { label: 'Documentos', icon: FileText, href: '/admin/documentos' },
  { label: 'Relatórios', icon: PieChart, href: '/admin/relatorios' },
];

export const clientNav: NavItem[] = [
  { label: 'Início', icon: Home, href: '/cliente' },
  { label: 'Cronograma', icon: CalendarDays, href: '/cliente/cronograma' },
  { label: 'Entregáveis', icon: FolderKanban, href: '/cliente/entregaveis' },
  { label: 'Horas', icon: Clock3, href: '/cliente/horas' },
  { label: 'Documentos', icon: FileText, href: '/cliente/documentos' },
  { label: 'Relatórios', icon: PieChart, href: '/cliente/relatorios' },
];

export function Brand() {
  return (
    <div className="brand" aria-label="CALI Workspace">
      <strong className="brand-full">CALI</strong>
      <strong className="brand-compact" aria-hidden="true">C</strong>
      <span>WORKSPACE</span>
    </div>
  );
}

function Sidebar({ role }: { role: Role }) {
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : clientNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
        <Menu />
      </button>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${pinned ? 'pinned' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
            <X />
          </button>
        </div>

        <button
          className="sidebar-pin"
          type="button"
          aria-label={pinned ? 'Deixar menu retrair automaticamente' : 'Manter menu aberto'}
          aria-pressed={pinned}
          onClick={() => setPinned((current) => !current)}
        >
          {pinned ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
          <span>{pinned ? 'Retrair automaticamente' : 'Manter aberto'}</span>
        </button>

        <nav aria-label={role === 'admin' ? 'Navegação administrativa' : 'Navegação do cliente'}>
          {nav.map((item) => {
            const active = location.pathname === item.href || (item.href !== `/${role}` && location.pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={active ? 'active' : ''}
                data-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={19} />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{role === 'admin' ? 'PL' : 'GA'}</div>
          <div className="sidebar-user-copy">
            <strong>{role === 'admin' ? 'Patrícia Lima' : 'Grupo Aurora'}</strong>
            <small>{role === 'admin' ? 'Admin CALI' : 'Acesso principal'}</small>
          </div>
          <button className="sidebar-logout" type="button" aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}

export function Shell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar role={role} />
      <main className="main">
        <header className="topbar">
          <div className="topbar-context">
            <span>{role === 'admin' ? 'CALI Workspace' : 'Área da empresa'}</span>
          </div>
          <div className="top-actions">
            <button aria-label="Notificações" className="icon-button">
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>
        <div className="workspace-view">{children}</div>
      </main>
    </div>
  );
}

export function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

export function Progress({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" aria-label={`${bounded}%`}>
      <span style={{ width: `${bounded}%` }} />
    </div>
  );
}
