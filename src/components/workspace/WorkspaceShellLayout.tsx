import { WorkflowDialogOverlay } from '../ds/WorkflowDialog';
/* Shell do Workspace na composição aprovada da V2 (cali-workspace-v2/src/main.tsx), usado pelo
   cliente e, página a página, pela administradora com os menus dela:
   .app > aside.sidebar + main.main > header.topbar + .content.
   Apenas apresentação: sessão, notificações, perfil, frentes e agendamento chegam prontos
   dos componentes operacionais oficiais. */
import { Button } from '../ds/Button';
import { StaffDialog, StaffDialogBody, StaffDialogFooter, StaffDialogHeader } from './StaffDialog';
import { InlineNotice } from '../ds/InlineNotice';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from '../navigation/Link';
import { useLocation } from '../../hooks/useLocation';
import { BriefcaseBusiness, Building2, CalendarDays, CalendarPlus, ClipboardList, Clock3, Fingerprint, FileBarChart2, FolderOpen, History, LayoutDashboard, Megaphone, Menu, MessageCircleMore, Star, UserCog, Target, Users, X } from 'lucide-react';
import { CompactWorkspaceSidebar, type WorkspaceNavItem } from './components/CompactWorkspaceSidebar';
import { CompactWorkspaceSearch } from './components/CompactWorkspaceSearch';
import { CompactWorkspaceProfile } from './components/CompactWorkspaceProfile';
import { hoursAvailable } from '../../api/hours/client';
import { pauseWorkTimer, readActiveTimersBeforeExit, stopPartnerTimer } from '../../api/hours/timers';
import { useTimerPresence } from '../hours/hooks/useTimerPresence';
import { WelcomeTour, type WelcomeStep } from './WelcomeTour';
import './workspace-motion.css';

export const clientNavigation: WorkspaceNavItem[] = [
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
export const adminNavigation: WorkspaceNavItem[] = [
  { label: 'Visão geral', href: '/admin', icon: LayoutDashboard },
  { label: 'Clientes', href: '/admin/clientes', icon: Building2 },
  { label: 'Equipe', href: '/admin/equipe', icon: Users },
  { label: 'Projetos', href: '/admin/projetos', icon: BriefcaseBusiness },
  { label: 'Horas', href: '/admin/horas', icon: Clock3 },
  { label: 'Calendário', href: '/admin/calendario', icon: CalendarDays },
  { label: 'Ocorrências', href: '/admin/registros', icon: MessageCircleMore },
  { label: 'Documentos', href: '/admin/documentos', icon: FolderOpen },
  { label: 'Relatórios', href: '/admin/relatorios', icon: FileBarChart2 },
  { label: 'Satisfação', href: '/admin/satisfacao', icon: Star },
  { label: 'Avisos', href: '/admin/avisos', icon: Megaphone },
  { label: 'Equipe CALI', href: '/admin/equipe-cali', icon: UserCog },
  { label: 'Auditoria', href: '/admin/auditoria', icon: History },
];
export const adminProducts: WorkspaceNavItem[] = [
  { label: 'Propostas', href: '/admin/propostas', icon: BriefcaseBusiness },
  { label: 'Mapa de People', href: '/admin/mapa-de-people', icon: Target },
  { label: 'Formulários', href: '/admin/formularios', icon: ClipboardList },
  { label: 'Perfil comportamental', href: '/admin/perfil-comportamental', icon: Fingerprint },
];

type ShellRole = 'admin' | 'client' | 'partner';
type Props = {
  /** Passos da apresentação inicial quando o papel tem roteiro próprio (Partner). */
  welcomeSteps?: WelcomeStep[];
  role: ShellRole;
  navigation: WorkspaceNavItem[];
  /** Controles operacionais próprios do papel (timers ativos, despesas de visita). */
  extras?: ReactNode;
  children: ReactNode;
  /** Fluxo oficial de agendamento: permanece montado para atender aos pedidos abertos pelas páginas. */
  scheduling?: ReactNode;
  notifications: ReactNode;
  onLogout: () => void;
};

export function WorkspaceShellLayout({ role, navigation, extras, children, scheduling, notifications, onLogout, welcomeSteps }: Props) {
  const home = role === 'admin' ? '/admin' : role === 'partner' ? '/equipe' : '/cliente';
  /* Cronômetro esquecido: presença enquanto a pessoa usa o Workspace e conferência antes de sair. */
  const [exitTimers, setExitTimers] = useState<{ id: string; description: string | null; started_at: string }[] | null>(null); const [exitBusy, setExitBusy] = useState(false); const [exitError, setExitError] = useState('');
  useTimerPresence(role !== 'client');
  async function requestLogout() {
    if (role === 'client' || !hoursAvailable) { onLogout(); return; }
    try {
      const timers = await readActiveTimersBeforeExit();
      if (timers.length) {
        setExitError('');
        setExitTimers(timers);
        return;
      }
    } catch { /* sem conferência: segue a saída */ }
    onLogout();
  }
  async function pauseAndLogout() {
    if (!hoursAvailable || !exitTimers) return;
    setExitBusy(true);
    setExitError('');
    for (const timer of exitTimers) {
      const result = role === 'partner' ? await stopPartnerTimer(timer.id, null) : await pauseWorkTimer(timer.id);
      if (result.error) {
        setExitBusy(false);
        setExitError('Não foi possível pausar o cronômetro. Pause-o na tela e tente sair de novo.');
        return;
      }
    }
    setExitBusy(false); setExitTimers(null); onLogout();
  }
  const searchDestinations = useMemo(() => [...navigation.map(({ label, href }) => ({ label, href })), ...(role === 'client' ? [{ label: 'Frentes contratadas', href: '/cliente/frentes' }] : role === 'partner' ? [] : adminProducts.map(({ label, href }) => ({ label, href })))], [navigation, role]);
  const { pathname, search } = useLocation();
  const [tourHref, setTourHref] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [teamFlyout, setTeamFlyout] = useState(false);
  const teamTab = pathname === '/cliente/equipe' ? new URLSearchParams(search).get('aba') || 'diretorio' : null;
  useEffect(() => {
    setMobileNav(false);
    setTeamFlyout(false);
  }, [pathname, search]);

  const isActive = (href: string) => pathname === href || (href !== home && pathname.startsWith(`${href}/`));

  const resetKey = pathname + search;
  const topToolStyle = 'tw:relative tw:inline-flex tw:min-h-[2.692rem] tw:min-w-[2.692rem] tw:items-center tw:justify-center tw:rounded-[0.692rem] tw:border tw:border-solid tw:text-[#62293a] tw:[@media(max-width:50rem)]:min-h-[2.385rem] tw:[@media(max-width:50rem)]:min-w-[2.231rem]';

  return <div className="app tw:flex tw:min-h-screen tw:[&_a]:no-underline tw:[&_a:not([class])]:text-inherit tw:[&:has([data-workspace-welcome])>.sidebar]:z-996!" data-workspace-role={role}>
    <CompactWorkspaceSidebar
      navigation={navigation}
      mobileOpen={mobileNav}
      teamFlyout={teamFlyout}
      teamTab={teamTab}
      tourHref={tourHref}
      isActive={isActive}
      onPreview={(href) => setTeamFlyout(role === 'client' && href === '/cliente/equipe')}
    />
    <main className="main tw:w-full tw:min-w-0 tw:flex-1 tw:bg-[linear-gradient(#96775d0d_1px,transparent_1px),linear-gradient(90deg,#96775d0d_1px,transparent_1px)] tw:bg-size-[1.923rem_1.923rem] tw:[@media(min-width:53.1875rem)]:ml-[4.308rem] tw:[@media(min-width:53.1875rem)]:w-[calc(100%-4.308rem)] tw:[@media(max-width:46.25rem)]:[&:has([data-staff-timer-dock])>.content]:pb-[10rem]!">
      <header className={`topbar tw:relative tw:z-24 tw:flex tw:h-[4.692rem] tw:items-center tw:justify-between tw:gap-[1.385rem] tw:border-0 tw:border-b tw:border-solid tw:border-[#e9e3de] tw:bg-white tw:px-[2.385rem] tw:[@media(max-width:53.125rem)]:px-[1.154rem]
        ${role === 'admin' ? 'tw:[@media(max-width:37.5rem)]:h-auto tw:[@media(max-width:37.5rem)]:min-h-[3.154rem] tw:[@media(max-width:37.5rem)]:flex-wrap tw:[@media(max-width:37.5rem)]:gap-x-[0.615rem] tw:[@media(max-width:37.5rem)]:gap-y-[0.308rem] tw:[@media(max-width:37.5rem)]:py-[0.385rem]' : ''}`}>
        <button type="button" className="mobile-menu tw:hidden tw:items-center tw:border-0 tw:bg-transparent tw:[@media(max-width:53.125rem)]:inline-flex" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileNav}>{mobileNav ? <X size={19} /> : <Menu size={19} />}</button>
        <div className="top-left tw:flex tw:items-center tw:gap-[1.385rem]">
          <span className="workspace-label tw:text-[0.923rem]/[inherit] tw:font-bold tw:tracking-[0.115rem] tw:whitespace-nowrap tw:text-cali-brand">
            CALI <span className="tw:font-normal tw:tracking-[0.077rem] tw:text-[#918781]">WORKSPACE</span>
          </span>
        </div>
        <div className={`top-actions tw:flex tw:items-center tw:[@media(max-width:47.5rem)]:min-w-0 tw:[@media(max-width:47.5rem)]:gap-[0.615rem]
          ${role === 'partner' ? 'tw:gap-[1.23rem]!' : 'tw:gap-[1.385rem]'}
          ${role === 'admin' ? 'tw:[@media(max-width:37.5rem)]:flex-1 tw:[@media(max-width:37.5rem)]:basis-[17.692rem] tw:[@media(max-width:37.5rem)]:flex-wrap tw:[@media(max-width:37.5rem)]:justify-end tw:[@media(max-width:37.5rem)]:gap-[0.385rem]!' : ''}`}>
          {role === 'client' && <div className="ch-tools v2-top-tools tw:flex tw:items-center tw:gap-[0.615rem] tw:[@media(max-width:47.5rem)]:gap-[0.462rem]">
            <Link aria-label="Abrir agenda" title="Abrir agenda" className={`${topToolStyle} gold tw:border-[#e6be64] tw:bg-[#f6d98e] tw:[@media(max-width:47.5rem)]:hidden`} to="/cliente/cronograma"><CalendarPlus size={17} /></Link>
            <Link aria-label="Frentes" className={`${topToolStyle} pill tw:gap-[0.538rem] tw:border-[#ebddd4] tw:bg-white tw:px-[0.923rem] tw:font-semibold tw:[@media(47.5rem<width<=59.375rem)]:hidden tw:[@media(max-width:47.5rem)]:min-w-0 tw:[@media(max-width:47.5rem)]:gap-0 tw:[@media(max-width:47.5rem)]:p-[0.615rem] tw:[@media(max-width:47.5rem)]:text-[0]`} to="/cliente/frentes"><BriefcaseBusiness size={17} /><span className="tw:max-[47.5rem]:sr-only">Frentes</span></Link>
          </div>}
          {role === 'admin' && <div className="ch-tools v2-top-tools tw:flex tw:items-center tw:gap-[0.615rem] tw:[@media(max-width:47.5rem)]:gap-[0.462rem]">{adminProducts.map(({ label, href, icon: Icon }) => <Link key={href} className="v2-top-icon tw:inline-flex tw:size-[2.923rem] tw:min-h-[2.692rem] tw:min-w-[2.692rem] tw:items-center tw:justify-center tw:rounded-[0.615rem] tw:border tw:border-solid tw:border-[#e5dbd5] tw:bg-white tw:text-cali-brand tw:[@media(max-width:50rem)]:min-h-[2.385rem] tw:[@media(max-width:50rem)]:min-w-[2.231rem]" to={href} title={label} aria-label={label}><Icon size={17} /></Link>)}</div>}
          <CompactWorkspaceSearch admin={role === 'admin'} destinations={searchDestinations} resetKey={resetKey} />
          {extras}
          <div className="profile-holder tw:relative tw:[@media(max-width:53.75rem)]:static">{notifications}</div>
          <CompactWorkspaceProfile role={role} partnerHasOccurrences={navigation.some((item) => item.href === '/equipe/ocorrencias')} resetKey={resetKey} onLogout={() => void requestLogout()} />
        </div>
      </header>
      {scheduling}
      <div className="content tw:mx-auto tw:max-w-[119.231rem] tw:px-[2.692rem] tw:pt-8 tw:pb-[5.385rem] tw:[@media(53.125rem<width<=78.125rem)]:px-[1.846rem] tw:[@media(53.125rem<width<=78.125rem)]:pb-[4.615rem] tw:[@media(max-width:53.125rem)]:px-[1.154rem] tw:[@media(max-width:53.125rem)]:pb-[1.923rem]">{children}</div>
    </main>
    {exitTimers && <WorkflowDialogOverlay className="tw:z-1250!" role="presentation"><StaffDialog compact role="alertdialog" aria-label="Cronômetro ligado">
      <StaffDialogHeader><div><small>ANTES DE SAIR</small><h2>Você está com cronômetro ligado</h2></div></StaffDialogHeader>
      <StaffDialogBody><InlineNotice className="tw:m-0 tw:rounded-[.69rem] tw:border tw:border-solid tw:border-[#ecd9b0] tw:bg-[#fff6e3] tw:px-[1.08rem] tw:py-[.92rem] tw:text-[.92rem] tw:leading-[1.5] tw:text-[#7a5a2c]"><strong>Se você sair agora sem pausar, o tempo continua contando.</strong> Pause para registrar só o que foi trabalhado.</InlineNotice>
        {exitTimers.map((timer) => <div className="tw:flex tw:flex-col tw:gap-[.31rem] tw:rounded-[.62rem] tw:bg-[#faf6f2] tw:px-[1.08rem] tw:py-[.92rem] tw:text-[.92rem] tw:text-[#322f2c] tw:[&>small]:text-[.85rem] tw:[&>small]:text-[#8c7e74]" key={timer.id}><strong>{timer.description || 'Atuação em andamento'}</strong><small>Ligado desde {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(timer.started_at)).replace('.', '')}</small></div>)}
        {exitError && <InlineNotice className="tw:border tw:border-solid tw:border-[#f0d5d8] tw:bg-[#fdf3f3] tw:text-[#9d4b64]" role="alert">{exitError}</InlineNotice>}</StaffDialogBody>
      <StaffDialogFooter><Button type="button" variant="workflowSecondary" onClick={() => setExitTimers(null)}>Voltar ao trabalho</Button><Button type="button" variant="workflowPrimary" disabled={exitBusy} onClick={() => void pauseAndLogout()}>{exitBusy ? 'Pausando…' : 'Pausar e sair'}</Button></StaffDialogFooter>
    </StaffDialog></WorkflowDialogOverlay>}
    {role === 'client' && <WelcomeTour onHighlight={setTourHref} />}
    {role === 'partner' && <WelcomeTour steps={welcomeSteps} onHighlight={setTourHref} />}
  </div>;
}

/** Shell do cliente: a navegação aprovada, sem controles extras. */
export function ClientShell(props: Omit<Props, 'role' | 'navigation' | 'extras'>) {
  return <WorkspaceShellLayout role="client" navigation={clientNavigation} {...props} />;
}

/** Shell da administradora: os menus oficiais dela e os controles operacionais (timer, despesas de visita). */
export function AdminShell(props: Omit<Props, 'role' | 'navigation' | 'scheduling'>) {
  return <WorkspaceShellLayout role="admin" navigation={adminNavigation} {...props} />;
}
