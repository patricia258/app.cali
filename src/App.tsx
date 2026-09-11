import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, WorkspaceRouteLoader } from './components/ProtectedRoute';
import { Shell } from './components/WorkspaceShell';

function lazyWithRecovery<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const marker = `cali:lazy-route-retry:${window.location.pathname}`;
    try {
      const module = await loader();
      sessionStorage.removeItem(marker);
      return module;
    } catch (error) {
      if (!sessionStorage.getItem(marker)) {
        sessionStorage.setItem(marker, '1');
        window.location.reload();
      }
      throw error;
    }
  });
}

const LoginPage = lazyWithRecovery(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazyWithRecovery(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const GoogleCalendarCallbackPage = lazyWithRecovery(() => import('./pages/GoogleCalendarCallbackPage').then((m) => ({ default: m.GoogleCalendarCallbackPage })));

const AdminDashboard = lazyWithRecovery(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminClientsPageV3 = lazyWithRecovery(() => import('./pages/admin/AdminClientsPageV3').then((m) => ({ default: m.AdminClientsPageV3 })));
const AdminProposalsPageV2 = lazyWithRecovery(() => import('./pages/admin/AdminProposalsPageV2').then((m) => ({ default: m.AdminProposalsPageV2 })));
const AdminProposalEditorPageV3 = lazyWithRecovery(() => import('./pages/admin/AdminProposalEditorPageV3').then((m) => ({ default: m.AdminProposalEditorPageV3 })));
const AdminProposalPreviewPageV3 = lazyWithRecovery(() => import('./pages/admin/AdminProposalPreviewPageV3').then((m) => ({ default: m.AdminProposalPreviewPageV3 })));
const AdminProjectsGatePage = lazyWithRecovery(() => import('./pages/admin/AdminProjectsGatePage').then((m) => ({ default: m.AdminProjectsGatePage })));
const AdminHoursPageV3 = lazyWithRecovery(() => import('./pages/admin/AdminHoursPageV3').then((m) => ({ default: m.AdminHoursPageV3 })));
const AdminCalendarPage = lazyWithRecovery(() => import('./pages/admin/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage })));
const AdminDocumentsPageV4 = lazyWithRecovery(() => import('./pages/admin/AdminDocumentsPageV4').then((m) => ({ default: m.AdminDocumentsPageV4 })));
const AdminReportsPageV17 = lazyWithRecovery(() => import('./pages/admin/AdminReportsPageV17').then((m) => ({ default: m.AdminReportsPageV17 })));
const AdminSatisfactionPage = lazyWithRecovery(() => import('./pages/admin/AdminSatisfactionPage').then((m) => ({ default: m.AdminSatisfactionPage })));
const AdminPeopleMapPageV2 = lazyWithRecovery(() => import('./pages/admin/AdminPeopleMapPageV2').then((m) => ({ default: m.AdminPeopleMapPageV2 })));
const AdminPeopleMapReviewPage = lazyWithRecovery(() => import('./pages/admin/AdminPeopleMapReviewPage').then((m) => ({ default: m.AdminPeopleMapReviewPage })));
const AdminPeopleMapReportPage = lazyWithRecovery(() => import('./pages/admin/AdminPeopleMapReportPage').then((m) => ({ default: m.AdminPeopleMapReportPage })));

const AdminRecordsPage = lazyWithRecovery(() => import('./pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.AdminRecordsPage })));
const ClientRecordsPage = lazyWithRecovery(() => import('./pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.ClientRecordsPage })));
const ClientDashboard = lazyWithRecovery(() => import('./pages/client/ClientDashboard').then((m) => ({ default: m.ClientDashboard })));
const ClientTimelinePage = lazyWithRecovery(() => import('./pages/client/ClientTimelinePage').then((m) => ({ default: m.ClientTimelinePage })));
const ClientDeliverablesPage = lazyWithRecovery(() => import('./pages/client/ClientDeliverablesPage').then((m) => ({ default: m.ClientDeliverablesPage })));
const ClientHoursPage = lazyWithRecovery(() => import('./pages/client/ClientHoursPage').then((m) => ({ default: m.ClientHoursPage })));
const ClientDocumentsPage = lazyWithRecovery(() => import('./pages/client/ClientDocumentsPage').then((m) => ({ default: m.ClientDocumentsPage })));
const ClientReportsPageV5 = lazyWithRecovery(() => import('./pages/client/ClientReportsPageV5').then((m) => ({ default: m.ClientReportsPageV5 })));
const ReportPrintPageV17 = lazyWithRecovery(() => import('./pages/reports/ReportPrintPageV17').then((m) => ({ default: m.ReportPrintPageV17 })));

function WorkspaceNavigationFallback() {
  const { pathname } = useLocation();
  const role = pathname.startsWith('/cliente') ? 'client' : 'admin';
  return (
    <Shell role={role}>
      <WorkspaceRouteLoader />
    </Shell>
  );
}

function prefetchRouteModule(pathname: string) {
  if (pathname === '/admin') return void import('./pages/admin/AdminDashboard');
  if (pathname === '/admin/clientes') return void import('./pages/admin/AdminClientsPageV3');
  if (pathname === '/admin/propostas') return void import('./pages/admin/AdminProposalsPageV2');
  if (pathname === '/admin/projetos') return void import('./pages/admin/AdminProjectsGatePage');
  if (pathname === '/admin/horas') return void import('./pages/admin/AdminHoursPageV3');
  if (pathname === '/admin/calendario') return void import('./pages/admin/AdminCalendarPage');
  if (pathname === '/admin/registros') return void import('./pages/records/WorkspaceRecordsPage');
  if (pathname === '/admin/documentos') return void import('./pages/admin/AdminDocumentsPageV4');
  if (pathname === '/admin/relatorios') return void import('./pages/admin/AdminReportsPageV17');
  if (pathname === '/cliente') return void import('./pages/client/ClientDashboard');
  if (pathname === '/cliente/cronograma') return void import('./pages/client/ClientTimelinePage');
  if (pathname === '/cliente/entregaveis') return void import('./pages/client/ClientDeliverablesPage');
  if (pathname === '/cliente/horas') return void import('./pages/client/ClientHoursPage');
  if (pathname === '/cliente/registros') return void import('./pages/records/WorkspaceRecordsPage');
  if (pathname === '/cliente/documentos') return void import('./pages/client/ClientDocumentsPage');
  if (pathname === '/cliente/relatorios') return void import('./pages/client/ClientReportsPageV5');
}

function prefetchLikelyRoutes() {
  const path = window.location.pathname;
  const schedule = window.setTimeout(() => {
    if (path.startsWith('/admin')) {
      void import('./pages/admin/AdminCalendarPage');
      void import('./pages/admin/AdminReportsPageV17');
      void import('./pages/admin/AdminClientsPageV3');
      void import('./pages/admin/AdminProjectsGatePage');
      void import('./pages/admin/AdminHoursPageV3');
      void import('./pages/admin/AdminDocumentsPageV4');
      return;
    }

    if (path.startsWith('/cliente')) {
      void import('./pages/client/ClientTimelinePage');
      void import('./pages/client/ClientReportsPageV5');
      void import('./pages/client/ClientDocumentsPage');
      void import('./pages/client/ClientHoursPage');
      void import('./pages/client/ClientDeliverablesPage');
    }
  }, 1200);

  const prefetchOnHover = (event: PointerEvent) => {
    const target = event.target as Element | null;
    const link = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    const url = new URL(link.href, window.location.origin);
    if (url.origin === window.location.origin) prefetchRouteModule(url.pathname);
  };
  document.addEventListener('pointerover', prefetchOnHover, { passive: true });

  return () => {
    window.clearTimeout(schedule);
    document.removeEventListener('pointerover', prefetchOnHover);
  };
}

function AppRoutes() {
  useEffect(() => prefetchLikelyRoutes(), []);

  return (
    <Suspense fallback={<WorkspaceNavigationFallback />}>
      <Routes>
        <Route path="/" element={<LoginPage/>}/>
        <Route path="/auth/callback" element={<AuthCallbackPage/>}/>
        <Route path="/oauth/google/callback" element={<GoogleCalendarCallbackPage/>}/>

        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard/></ProtectedRoute>}/>
        <Route path="/admin/clientes" element={<ProtectedRoute role="admin"><AdminClientsPageV3/></ProtectedRoute>}/>
        <Route path="/admin/propostas" element={<ProtectedRoute role="admin"><AdminProposalsPageV2/></ProtectedRoute>}/>
        <Route path="/admin/propostas/:submissionId/editar" element={<ProtectedRoute role="admin"><AdminProposalEditorPageV3/></ProtectedRoute>}/>
        <Route path="/admin/propostas/proposta/:proposalId" element={<ProtectedRoute role="admin"><AdminProposalPreviewPageV3/></ProtectedRoute>}/>
        <Route path="/admin/projetos" element={<ProtectedRoute role="admin"><AdminProjectsGatePage/></ProtectedRoute>}/>
        <Route path="/admin/horas" element={<ProtectedRoute role="admin"><AdminHoursPageV3/></ProtectedRoute>}/>
        <Route path="/admin/calendario" element={<ProtectedRoute role="admin"><AdminCalendarPage/></ProtectedRoute>}/>
        <Route path="/admin/registros" element={<ProtectedRoute role="admin"><AdminRecordsPage/></ProtectedRoute>}/>
        <Route path="/admin/documentos" element={<ProtectedRoute role="admin"><AdminDocumentsPageV4/></ProtectedRoute>}/>
        <Route path="/admin/relatorios/impressao/:reportId" element={<ProtectedRoute role="admin"><ReportPrintPageV17 role="admin"/></ProtectedRoute>}/>
        <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReportsPageV17/></ProtectedRoute>}/>
        <Route path="/admin/satisfacao" element={<ProtectedRoute role="admin"><AdminSatisfactionPage/></ProtectedRoute>}/>
        <Route path="/admin/mapa-de-people" element={<ProtectedRoute role="admin"><AdminPeopleMapPageV2/></ProtectedRoute>}/>
        <Route path="/admin/mapa-de-people/revisao" element={<ProtectedRoute role="admin"><AdminPeopleMapReviewPage/></ProtectedRoute>}/>
        <Route path="/admin/mapa-de-people/relatorio/:id" element={<ProtectedRoute role="admin"><AdminPeopleMapReportPage/></ProtectedRoute>}/>

        <Route path="/cliente" element={<ProtectedRoute role="client"><ClientDashboard/></ProtectedRoute>}/>
        <Route path="/cliente/cronograma" element={<ProtectedRoute role="client"><ClientTimelinePage/></ProtectedRoute>}/>
        <Route path="/cliente/entregaveis" element={<ProtectedRoute role="client"><ClientDeliverablesPage/></ProtectedRoute>}/>
        <Route path="/cliente/horas" element={<ProtectedRoute role="client"><ClientHoursPage/></ProtectedRoute>}/>
        <Route path="/cliente/registros" element={<ProtectedRoute role="client"><ClientRecordsPage/></ProtectedRoute>}/>
        <Route path="/cliente/documentos" element={<ProtectedRoute role="client"><ClientDocumentsPage/></ProtectedRoute>}/>
        <Route path="/cliente/relatorios/impressao/:reportId" element={<ProtectedRoute role="client"><ReportPrintPageV17 role="client"/></ProtectedRoute>}/>
        <Route path="/cliente/relatorios" element={<ProtectedRoute role="client"><ClientReportsPageV5/></ProtectedRoute>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
