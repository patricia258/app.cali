/* Shell do cliente na composição aprovada da V2 (cali-workspace-v2/src/main.tsx):
   .app > aside.sidebar + main.main > header.topbar + .content.
   Apenas apresentação: sessão, notificações, perfil, frentes e agendamento chegam prontos
   dos componentes operacionais oficiais. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight, Clock3, FileBarChart2, FolderOpen, LayoutDashboard, Menu, MessageCircleMore, Users, X, type LucideIcon } from 'lucide-react';
import { DirectProfileControl } from '../components/DirectProfileControl';
import './v2.generated.css';
import './operational.css';

type NavItem = { label: string; href: string; icon: LucideIcon };
export const clientNavigation: NavItem[] = [
  { label: 'Visão Geral', href: '/cliente', icon: LayoutDashboard },
  { label: 'Equipe', href: '/cliente/equipe', icon: Users },
  { label: 'Horas', href: '/cliente/horas', icon: Clock3 },
  { label: 'Calendário', href: '/cliente/cronograma', icon: CalendarDays },
  { label: 'Ocorrências', href: '/cliente/registros', icon: MessageCircleMore },
  { label: 'Documentos', href: '/cliente/documentos', icon: FolderOpen },
  { label: 'Relatórios', href: '/cliente/relatorios', icon: FileBarChart2 },
  { label: 'Projetos', href: '/cliente/entregaveis', icon: BriefcaseBusiness },
];

type Props = {
  children: ReactNode;
  /** Agendamento extra (botão e fluxo oficiais). */
  scheduling: ReactNode;
  notifications: ReactNode;
  /** Atalhos oficiais sem lugar próprio na V2, acomodados no menu de conta. */
  accountLinks: ReactNode;
  themeToggle: ReactNode;
  bridges: ReactNode;
  onLogout: () => void;
};

export function ClientShell({ children, scheduling, notifications, accountLinks, themeToggle, bridges, onLogout }: Props) {
  const { pathname } = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMobileNav(false); setProfileMenu(false); }, [pathname]);
  useEffect(() => {
    if (!profileMenu) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !profileRef.current?.contains(event.target as Node)) setProfileMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [profileMenu]);

  const isActive = (href: string) => pathname === href || (href !== '/cliente' && pathname.startsWith(`${href}/`));

  return <div className="app" data-workspace-role="client">
    <aside className={'sidebar ' + (mobileNav ? 'mobile-open' : '')} aria-label="Menu lateral CALI">
      <div className="brand"><span className="brand-word">CALI</span></div>
      <nav aria-label="Navegação principal">{clientNavigation.map(({ label, href, icon: Icon }) => <Link key={href} to={href} className={'nav-link ' + (isActive(href) ? 'active' : '')} title={label} aria-label={label} aria-current={isActive(href) ? 'page' : undefined}><Icon size={17} strokeWidth={1.6} /></Link>)}</nav>
      <div className="sidebar-bottom"><span className="gold-rule" /><Link className={'nav-link ' + (pathname === '/cliente/frentes' ? 'active' : '')} to="/cliente/frentes" title="Frentes contratadas" aria-label="Frentes contratadas"><BriefcaseBusiness size={17} strokeWidth={1.6} /></Link></div>
    </aside>
    {bridges}
    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileNav}>{mobileNav ? <X size={19} /> : <Menu size={19} />}</button>
        <div className="top-left"><span className="workspace-label">CALI <span>WORKSPACE</span></span>{scheduling}</div>
        <div className="top-actions">
          <div className="profile-holder">{notifications}</div>
          <div className="profile-holder" ref={profileRef}>
            <DirectProfileControl role="client" trigger={({ profile, avatar, companyName, openEditor }) => <>
              <button aria-expanded={profileMenu} aria-haspopup="menu" onClick={() => setProfileMenu(!profileMenu)} className="profile"><span className="avatar small">{avatar}</span><span>{profile.full_name}</span><ChevronDown size={13} /></button>
              {profileMenu && <div className="profile-dropdown v2-profile" role="menu">
                <div className="v2-profile-head"><span className="avatar small">{avatar}</span><span><strong>{profile.full_name}</strong><small>{profile.job_title || 'Perfil cliente'}</small></span></div>
                <div className="v2-profile-meta">{companyName && <span>Empresa <b>{companyName}</b></span>}<span>Acesso <b>Cliente</b></span></div>
                <button role="menuitem" onClick={() => { setProfileMenu(false); openEditor(); }}>Ver meu perfil <ChevronRight size={14} /></button>
                <div className="v2-profile-links">{accountLinks}{themeToggle}</div>
                <button role="menuitem" onClick={() => { setProfileMenu(false); onLogout(); }}>Sair <ArrowRight size={14} /></button>
              </div>}
            </>} />
          </div>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}
