/* Shell do Workspace na composição aprovada da V2 (cali-workspace-v2/src/main.tsx), usado pelo
   cliente e, página a página, pela administradora com os menus dela:
   .app > aside.sidebar + main.main > header.topbar + .content.
   Apenas apresentação: sessão, notificações, perfil, frentes e agendamento chegam prontos
   dos componentes operacionais oficiais. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileBarChart2, FolderOpen, LayoutDashboard, Megaphone, Menu, MessageCircleMore, Search, ShieldCheck, Star, Target, Users, X, type LucideIcon } from 'lucide-react';
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
  { label: 'Avisos', href: '/cliente/avisos', icon: Megaphone },
];
/* Menus oficiais da administradora, na mesma barra lateral. Propostas e Mapa de People são produtos
   integrados e ficam na barra superior, como no protótipo. */
export const adminNavigation: NavItem[] = [
  { label: 'Visão geral', href: '/admin', icon: LayoutDashboard },
  { label: 'Clientes', href: '/admin/clientes', icon: Building2 },
  { label: 'Equipe', href: '/admin/equipe', icon: Users },
  { label: 'Projetos', href: '/admin/projetos', icon: BriefcaseBusiness },
  { label: 'Horas', href: '/admin/horas', icon: Clock3 },
  { label: 'Calendário', href: '/admin/calendario', icon: CalendarDays },
  { label: 'Ocorrências', href: '/admin/registros', icon: MessageCircleMore },
  { label: 'Documentos', href: '/admin/documentos', icon: FolderOpen },
  { label: 'Relatórios', href: '/admin/relatorios', icon: FileBarChart2 },
  { label: 'NPS & satisfação', href: '/admin/satisfacao', icon: Star },
];
export const adminProducts: NavItem[] = [
  { label: 'Propostas', href: '/admin/propostas', icon: BriefcaseBusiness },
  { label: 'Mapa de People', href: '/admin/mapa-de-people', icon: Target },
];
const teamAreas = [['diretorio', 'Diretório'], ['estrutura', 'Estrutura organizacional'], ['movimentacoes', 'Movimentações'], ['indicadores', 'Indicadores']] as const;
const privacyPolicyUrl = 'https://calirh.com/privacidade.html';

type ShellRole = 'admin' | 'client';
type Props = {
  role: ShellRole;
  navigation: NavItem[];
  /** Controles operacionais próprios do papel (timers ativos, despesas de visita). */
  extras?: ReactNode;
  children: ReactNode;
  /** Fluxo oficial de agendamento: permanece montado para atender aos pedidos abertos pelas páginas. */
  scheduling?: ReactNode;
  notifications: ReactNode;
  bridges: ReactNode;
  onLogout: () => void;
};

export function WorkspaceShellV2({ role, navigation, extras, children, scheduling, notifications, bridges, onLogout }: Props) {
  const home = role === 'admin' ? '/admin' : '/cliente';
  const searchDestinations = useMemo(() => [...navigation.map(({ label, href }) => ({ label, href })), ...(role === 'client' ? [{ label: 'Frentes contratadas', href: '/cliente/frentes' }] : adminProducts.map(({ label, href }) => ({ label, href })))], [navigation, role]);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);
  const [teamFlyout, setTeamFlyout] = useState(false);
  const teamTab = pathname === '/cliente/equipe' ? new URLSearchParams(search).get('aba') || 'diretorio' : null;
  const [profileMenu, setProfileMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const wanted = term.trim().toLocaleLowerCase('pt-BR');
    return wanted ? searchDestinations.filter(item => item.label.toLocaleLowerCase('pt-BR').includes(wanted)) : searchDestinations;
  }, [term, searchDestinations]);

  useEffect(() => { setMobileNav(false); setProfileMenu(false); setSearching(false); setTerm(''); setTeamFlyout(false); }, [pathname, search]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearching(true); } };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    if (!profileMenu && !searching) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') { setProfileMenu(false); setSearching(false); } return; }
      if (!profileRef.current?.contains(event.target as Node)) setProfileMenu(false);
      if (!searchRef.current?.contains(event.target as Node)) setSearching(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [profileMenu, searching]);

  const isActive = (href: string) => pathname === href || (href !== home && pathname.startsWith(`${href}/`));

  return <div className="app" data-workspace-role={role}>
    <aside onMouseLeave={() => setTeamFlyout(false)} className={'sidebar ' + (mobileNav ? 'mobile-open' : '')} aria-label="Menu lateral CALI">
      <div className="brand"><span className="v2-brand-mark oak" role="img" aria-label="CALI"/></div>
      <nav aria-label="Navegação principal">{navigation.map(({ label, href, icon: Icon }) => <Link key={href} to={href} onMouseEnter={() => setTeamFlyout(role === 'client' && href === '/cliente/equipe')} onFocus={() => setTeamFlyout(role === 'client' && href === '/cliente/equipe')} className={'nav-link ' + (isActive(href) ? 'active' : '')} title={label} aria-label={label} aria-current={isActive(href) ? 'page' : undefined}><Icon size={17} strokeWidth={1.6} /></Link>)}</nav>
      <div className="sidebar-bottom"><span className="gold-rule" /><a className="nav-link" href={privacyPolicyUrl} target="_blank" rel="noopener noreferrer" title="Política de privacidade" aria-label="Política de privacidade"><ShieldCheck size={17} /></a></div>
      {teamFlyout && <div className="sidebar-flyout" onMouseEnter={() => setTeamFlyout(true)}>
        <div className="flyout-heading"><strong>Equipe</strong><span className="flyout-context">Áreas do módulo</span></div>
        {teamAreas.map(([id, label]) => <Link key={id} className={'flyout-link ' + (teamTab === id ? 'selected' : '')} to={`/cliente/equipe?aba=${id}`}><span>{label}</span>{teamTab === id ? <CheckCircle2 size={14} /> : <ChevronRight size={13} />}</Link>)}
      </div>}
    </aside>
    {bridges}
    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileNav}>{mobileNav ? <X size={19} /> : <Menu size={19} />}</button>
        <div className="top-left"><span className="workspace-label">CALI <span>WORKSPACE</span></span></div>
        <div className="top-actions">
          {role === 'client' && <div className="ch-tools v2-top-tools">
            <Link aria-label="Abrir agenda" title="Abrir agenda" className="ch-tool gold" to="/cliente/cronograma"><CalendarPlus size={17} /></Link>
            <Link className="ch-tool pill" to="/cliente/frentes"><BriefcaseBusiness size={17} /> Frentes</Link>
          </div>}
          {role === 'admin' && <div className="ch-tools v2-top-tools">{adminProducts.map(({ label, href, icon: Icon }) => <Link key={href} className="ch-tool pill" to={href}><Icon size={17} /> {label}</Link>)}</div>}
          <div className="profile-holder" ref={searchRef}>
            {searching
              ? <label className="global-search"><Search size={15} /><input autoFocus value={term} onChange={event => setTerm(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && results[0]) navigate(results[0].href); }} placeholder="Buscar no Workspace" aria-label="Buscar no Workspace" /></label>
              : <button type="button" className="global-search" onClick={() => setSearching(true)}><Search size={15} /><span>Buscar no Workspace</span><kbd>⌘ K</kbd></button>}
            {searching && <div className="profile-dropdown v2-search-results" role="listbox" aria-label="Resultados">{results.length ? results.map(item => <button key={item.href} role="option" aria-selected={false} onClick={() => navigate(item.href)}>{item.label} <ChevronRight size={14} /></button>) : <span>Nenhum módulo encontrado.</span>}</div>}
          </div>
          {extras}
          <div className="profile-holder">{notifications}</div>
          <div className="profile-holder" ref={profileRef}>
            <DirectProfileControl role={role} trigger={({ profile, avatar, companyName, openEditor }) => <>
              <button aria-expanded={profileMenu} aria-haspopup="menu" onClick={() => setProfileMenu(!profileMenu)} className="profile"><span className="avatar small">{avatar}</span><span>{profile.full_name}</span><ChevronDown size={13} /></button>
              {profileMenu && <div className="profile-dropdown v2-profile" role="menu">
                <div className="v2-profile-head"><span className="avatar small">{avatar}</span><span><strong>{profile.full_name}</strong><small>{profile.job_title || (role === 'admin' ? 'Administradora geral' : 'Perfil cliente')}</small></span></div>
                <div className="v2-profile-meta">{companyName && <span>Empresa <b>{companyName}</b></span>}<span>Acesso <b>{role === 'admin' ? 'Administradora' : 'Cliente'}</b></span></div>
                <button role="menuitem" onClick={() => { setProfileMenu(false); openEditor(); }}>Ver meu perfil <ChevronRight size={14} /></button>
                <button role="menuitem" onClick={() => { setProfileMenu(false); onLogout(); }}>Sair <ArrowRight size={14} /></button>
              </div>}
            </>} />
          </div>
        </div>
      </header>
      {scheduling}
      <div className="content">{children}</div>
    </main>
  </div>;
}

/** Shell do cliente: a navegação aprovada, sem controles extras. */
export function ClientShell(props: Omit<Props, 'role' | 'navigation' | 'extras'>) {
  return <WorkspaceShellV2 role="client" navigation={clientNavigation} {...props} />;
}

/** Shell da administradora: os menus oficiais dela e os controles operacionais (timer, despesas de visita). */
export function AdminShell(props: Omit<Props, 'role' | 'navigation' | 'scheduling'>) {
  return <WorkspaceShellV2 role="admin" navigation={adminNavigation} {...props} />;
}
