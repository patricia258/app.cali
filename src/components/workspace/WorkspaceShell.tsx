import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BookOpenText, BriefcaseBusiness, Building2, CalendarDays, FileText, FolderKanban, LayoutDashboard, PieChart, Star, Target, TimerReset, UsersRound } from 'lucide-react';
import { endWorkspaceSession } from '../../api/access/session';
import { RUNTIME_V2_EVENT, usesV2 } from '../../app/visualRoutes';
import { useLocation } from '../../hooks/useLocation';
import { useNavigate } from '../../hooks/useNavigate';
import { ExtraVisitExpenses } from '../calendar/ExtraVisitExpenses';
import { ExtraVisitRequest } from '../calendar/ExtraVisitRequest';
import { GlobalTimerBar } from '../hours/GlobalTimerBar';
import { DocumentWorkspaceHeader } from './components/DocumentWorkspaceHeader';
import { DocumentWorkspaceSidebar, isDocumentNavigationActive, type DocumentNavigationItem } from './components/DocumentWorkspaceSidebar';
import { DirectProfileControl } from './DirectProfileControl';
import { NotificationCenter } from './WorkspaceChrome';
import { AdminShell, ClientShell } from './WorkspaceShellLayout';

export type Role = 'admin' | 'client';

const documentNavigation: DocumentNavigationItem[] = [
  { label: 'Visão geral', icon: LayoutDashboard, href: '/admin' },
  { label: 'Clientes', icon: Building2, href: '/admin/clientes' },
  { label: 'Equipe', icon: UsersRound, href: '/admin/equipe' },
  { label: 'Projetos', icon: FolderKanban, href: '/admin/projetos' },
  { label: 'Horas', icon: TimerReset, href: '/admin/horas' },
  { label: 'Calendário', icon: CalendarDays, href: '/admin/calendario' },
  { label: 'Ocorrências', icon: BookOpenText, href: '/admin/registros' },
  { label: 'Documentos', icon: FileText, href: '/admin/documentos' },
  { label: 'Relatórios', icon: PieChart, href: '/admin/relatorios' },
  { label: 'Satisfação', icon: Star, href: '/admin/satisfacao' },
];
const documentProducts: DocumentNavigationItem[] = [
  { label: 'Propostas', icon: BriefcaseBusiness, href: '/admin/propostas' },
  { label: 'Mapa de People', icon: Target, href: '/admin/mapa-de-people' },
];

const WorkspaceFrameContext = createContext(false);

function WorkspaceChrome({ role, children }: { role: Role; children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [, redrawForRuntimeV2] = useState(0);

  useEffect(() => {
    const redraw = () => redrawForRuntimeV2((value) => value + 1);
    window.addEventListener(RUNTIME_V2_EVENT, redraw);
    return () => window.removeEventListener(RUNTIME_V2_EVENT, redraw);
  }, []);

  useEffect(() => {
    document.body.classList.remove('workspace-modal-open');
  }, [pathname]);

  async function handleLogout() {
    sessionStorage.removeItem('cali-preview-role');
    document.body.classList.remove('workspace-modal-open');
    await endWorkspaceSession();
    navigate('/', { replace: true });
  }

  const notifications = <NotificationCenter role={role} />;
  if (role === 'client') {
    return <ClientShell scheduling={<ExtraVisitRequest showTrigger={false} />} notifications={notifications} onLogout={handleLogout}>{children}</ClientShell>;
  }
  if (usesV2(pathname)) {
    return <AdminShell
      extras={<><GlobalTimerBar role={role} />{pathname === '/admin/clientes' && <ExtraVisitExpenses />}</>}
      notifications={notifications}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>;
  }

  const currentPage = [...documentNavigation, ...documentProducts].find(({ href }) => isDocumentNavigationActive(pathname, href));
  return (
    <div
      className="app-shell tw:flex tw:min-h-dvh tw:w-screen tw:min-w-0 tw:max-w-[100vw] tw:overflow-x-clip tw:bg-[var(--v2-canvas)] tw:font-cali-body tw:text-[0.8125rem]/[inherit] tw:text-[var(--v2-text)]
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:block!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:w-[210mm]!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:max-w-none!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:min-h-0!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:overflow-visible!"
      data-visual-system="v2"
      data-workspace-role={role}
    >
      <DocumentWorkspaceSidebar pathname={pathname} navigation={documentNavigation} profile={<DirectProfileControl role={role} />} />
      <main
        className="main tw:min-h-dvh tw:w-screen tw:min-w-0 tw:max-w-[100vw] tw:bg-[var(--v2-canvas)]
        tw:[@media_screen_and_(min-width:53.8125rem)]:ml-14 tw:min-[53.8125rem]:w-[calc(100%-3.5rem)] tw:min-[53.8125rem]:max-w-[calc(100%-3.5rem)] tw:min-[53.8125rem]:basis-[calc(100%-3.5rem)]
        tw:print:m-0!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:w-full!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:max-w-none!
        tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:min-h-0!"
      >
        <DocumentWorkspaceHeader
          pageLabel={currentPage?.label ?? 'Visão geral'}
          pathname={pathname}
          products={documentProducts}
          timer={<GlobalTimerBar role={role} />}
          notifications={notifications}
          onLogout={handleLogout}
        />
        <div className="workspace-view tw:relative tw:isolate tw:w-full tw:min-w-0 tw:max-w-full tw:bg-[var(--v2-canvas)] tw:[@media_screen]:pt-1.5
          tw:print:p-0!
          tw:print:has-[.portal-proposal-preview,.report-print-v16-stage]:max-w-none!
          tw:[&>:is(.page,.company-team,.fronts-page)]:mx-auto! tw:[&>:is(.page,.company-team,.fronts-page)]:my-0!
          tw:[&>:is(.page,.company-team,.fronts-page)]:w-full! tw:[&>:is(.page,.company-team,.fronts-page)]:max-w-[96.875rem]!
          tw:[&>:is(.page,.company-team,.fronts-page)]:px-[1.875rem]! tw:[&>:is(.page,.company-team,.fronts-page)]:pt-[1.625rem]!
          tw:[&>:is(.page,.company-team,.fronts-page)]:pb-[4.5rem]! tw:[&>:is(.page,.company-team,.fronts-page)]:text-[var(--v2-text)]
          tw:[@media(max-width:64rem)]:[&>:is(.page,.company-team,.fronts-page)]:px-[1.375rem]!
          tw:[@media(max-width:64rem)]:[&>:is(.page,.company-team,.fronts-page)]:pt-[1.375rem]!
          tw:[@media(max-width:64rem)]:[&>:is(.page,.company-team,.fronts-page)]:pb-[3.75rem]!
          tw:[@media(max-width:37.5rem)]:[&>:is(.page,.company-team,.fronts-page)]:px-[0.875rem]!
          tw:[@media(max-width:37.5rem)]:[&>:is(.page,.company-team,.fronts-page)]:pt-[1.125rem]!">
          {children}
        </div>
      </main>
    </div>
  );
}

export function WorkspaceFrame({ role, children }: { role: Role; children: ReactNode }) {
  return <WorkspaceFrameContext.Provider value={true}><WorkspaceChrome role={role}>{children}</WorkspaceChrome></WorkspaceFrameContext.Provider>;
}

export function Shell({ role, children }: { role: Role; children: ReactNode }) {
  const persistent = useContext(WorkspaceFrameContext);
  return persistent ? <>{children}</> : <WorkspaceChrome role={role}>{children}</WorkspaceChrome>;
}

export function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>;
}

export function Progress({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="progress" aria-label={`${bounded}%`}><span style={{ width: `${bounded}%` }} /></div>;
}
