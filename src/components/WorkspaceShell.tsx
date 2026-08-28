import { useState, type ComponentType, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarDays,
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
} from 'lucide-react';

export type Role = 'admin' | 'client';

type NavItem = {
  label: string;
  icon: ComponentType<{ size?: number }>;
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
    <div className="brand">
      <strong>CALI</strong>
      <span>WORKSPACE</span>
    </div>
  );
}

function Sidebar({ role }: { role: Role }) {
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : clientNav;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu />
      </button>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X />
          </button>
        </div>
        <nav>
          {nav.map((item) => {
            const active = location.pathname === item.href || (item.href !== `/${role}` && location.pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link key={item.href} to={item.href} onClick={() => setOpen(false)} className={active ? 'active' : ''}>
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{role === 'admin' ? 'PL' : 'GA'}</div>
          <div>
            <strong>{role === 'admin' ? 'Patrícia Lima' : 'Grupo Aurora'}</strong>
            <small>{role === 'admin' ? 'Admin CALI' : 'Acesso principal'}</small>
          </div>
          <LogOut size={18} />
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
          <div />
          <div className="top-actions">
            <button aria-label="Notificações" className="icon-button">
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>
        {children}
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
