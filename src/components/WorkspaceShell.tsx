import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
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
import { supabase } from '../lib/supabase';
import { NotificationCenter, ProfileControl } from './WorkspaceChrome';

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

function CaliWorkspaceMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="cali-workspace-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M4.75 4.75h8.7v3.1a2.55 2.55 0 1 0 5.1 0v-3.1h8.7v8.7h-3.1a2.55 2.55 0 1 0 0 5.1h3.1v8.7h-8.7v-3.1a2.55 2.55 0 1 0-5.1 0v3.1h-8.7v-8.7h3.1a2.55 2.55 0 1 0 0-5.1h-3.1v-8.7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.65" className="cali-workspace-mark-dot" />
    </svg>
  );
}

export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`brand ${dark ? 'brand-dark' : ''}`} aria-label="CALI Workspace">
      <div className="brand-full">
        <img
          src={dark
            ? 'https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-bordo.png'
            : 'https://raw.githubusercontent.com/patricia258/cali-portal/main/assets/logo-cali-light.png'}
          alt="CALI RH"
        />
        <span>WORKSPACE</span>
      </div>
      <span className="brand-compact" title="CALI Workspace"><CaliWorkspaceMark /></span>
    </div>
  );
}

function Sidebar({ role }: { role: Role }) {
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : clientNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPinned((current) => !current);
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <>
      <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></button>
      {mobileOpen && <button className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${pinned ? 'pinned' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>

        <button
          className="sidebar-pin"
          type="button"
          aria-label={pinned ? 'Deixar menu retrair automaticamente' : 'Manter menu aberto'}
          aria-pressed={pinned}
          onClick={() => setPinned((current) => !current)}
          title="Atalho: Ctrl/Cmd + B"
        >
          {pinned ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          <span>{pinned ? 'Retrair automaticamente' : 'Manter aberto'}</span>
        </button>

        <nav aria-label={role === 'admin' ? 'Navegação administrativa' : 'Navegação do cliente'}>
          {nav.map((item) => {
            const active = location.pathname === item.href || (item.href !== `/${role}` && location.pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className={active ? 'active' : ''} data-label={item.label} aria-current={active ? 'page' : undefined}>
                <Icon size={19} />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer sidebar-footer-profile-only">
          <ProfileControl role={role} />
        </div>
      </aside>
    </>
  );
}

export function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.remove('workspace-modal-open');
  }, [location.pathname]);

  async function handleLogout() {
    sessionStorage.removeItem('cali-preview-role');
    document.body.classList.remove('workspace-modal-open');
    if (supabase) await supabase.auth.signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <Sidebar role={role} />
      <main className="main">
        <header className="topbar">
          <div className="topbar-context"><span>{role === 'admin' ? 'CALI Workspace' : 'Área da empresa'}</span></div>
          <div className="top-actions">
            <NotificationCenter role={role} />
            <button className="icon-button topbar-logout" type="button" aria-label="Sair do Workspace" title="Sair" onClick={handleLogout}><LogOut size={19} /></button>
          </div>
        </header>
        <div className="workspace-view">{children}</div>
      </main>
    </div>
  );
}

export function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

export function Progress({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="progress" aria-label={`${bounded}%`}><span style={{ width: `${bounded}%` }} /></div>;
}
