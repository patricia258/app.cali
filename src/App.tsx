import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, WorkspaceRouteLoader } from './components/ProtectedRoute';
import { Shell, type Role } from './components/WorkspaceShell';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const GoogleCalendarCallbackPage = lazy(() => import('./pages/GoogleCalendarCallbackPage').then((m) => ({ default: m.GoogleCalendarCallbackPage })));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminClientsPageV3 = lazy(() => import('./pages/admin/AdminClientsPageV3').then((m) => ({ default: m.AdminClientsPageV3 })));
const AdminProposalsPageV2 = lazy(() => import('./pages/admin/AdminProposalsPageV2').then((m) => ({ default: m.AdminProposalsPageV2 })));
const AdminProposalEditorPageV3 = lazy(() => import('./pages/admin/AdminProposalEditorPageV3').then((m) => ({ default: m.AdminProposalEditorPageV3 })));
const AdminProposalPreviewPageV3 = lazy(() => import('./pages/admin/AdminProposalPreviewPageV3').then((m) => ({ default: m.AdminProposalPreviewPageV3 })));
const AdminProjectsGatePage = lazy(() => import('./pages/admin/AdminProjectsGatePage').then((m) => ({ default: m.AdminProjectsGatePage })));
const AdminHoursPageV3 = lazy(() => import('./pages/admin/AdminHoursPageV3').then((m) => ({ default: m.AdminHoursPageV3 })));
const AdminCalendarPage = lazy(() => import('./pages/admin/AdminCalendarPage').then((m) => ({ default: m.AdminCalendarPage })));
const AdminDocumentsPageV4 = lazy(() => import('./pages/admin/AdminDocumentsPageV4').then((m) => ({ default: m.AdminDocumentsPageV4 })));
const AdminReportsPageV17 = lazy(() => import('./pages/admin/AdminReportsPageV17').then((m) => ({ default: m.AdminReportsPageV17 })));
const AdminSatisfactionPage = lazy(() => import('./pages/admin/AdminSatisfactionPage').then((m) => ({ default: m.AdminSatisfactionPage })));
const AdminPeopleMapPageV2 = lazy(() => import('./pages/admin/AdminPeopleMapPageV2').then((m) => ({ default: m.AdminPeopleMapPageV2 })));
const AdminPeopleMapReviewPage = lazy(() => import('./pages/admin/AdminPeopleMapReviewPage').then((m) => ({ default: m.AdminPeopleMapReviewPage })));
const AdminPeopleMapReportPage = lazy(() => import('./pages/admin/AdminPeopleMapReportPage').then((m) => ({ default: m.AdminPeopleMapReportPage })));

const AdminRecordsPage = lazy(() => import('./pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.AdminRecordsPage })));
const ClientRecordsPage = lazy(() => import('./pages/records/WorkspaceRecordsPage').then((m) => ({ default: m.ClientRecordsPage })));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard').then((m) => ({ default: m.ClientDashboard })));
const ClientTimelinePage = lazy(() => import('./pages/client/ClientTimelinePage').then((m) => ({ default: m.ClientTimelinePage })));
const ClientDeliverablesPage = lazy(() => import('./pages/client/ClientDeliverablesPage').then((m) => ({ default: m.ClientDeliverablesPage })));
const ClientHoursPage = lazy(() => import('./pages/client/ClientHoursPage').then((m) => ({ default: m.ClientHoursPage })));
const ClientDocumentsPage = lazy(() => import('./pages/client/ClientDocumentsPage').then((m) => ({ default: m.ClientDocumentsPage })));
const ClientReportsPageV5 = lazy(() => import('./pages/client/ClientReportsPageV5').then((m) => ({ default: m.ClientReportsPageV5 })));
const ReportPrintPageV17 = lazy(() => import('./pages/reports/ReportPrintPageV17').then((m) => ({ default: m.ReportPrintPageV17 })));

function prefetchLikelyRoutes() {
  const path = window.location.pathname;
  const run = () => {
    if (path.startsWith('/admin')) {
      void import('./pages/admin/AdminCalendarPage');
      void import('./pages/admin/AdminReportsPageV17');
      void import('./pages/admin/AdminClientsPageV3');
      void import('./pages/admin/AdminProjectsGatePage');
      void import('./pages/admin/AdminHoursPageV3');
      return;
    }

    if (path.startsWith('/cliente')) {
      void import('./pages/client/ClientTimelinePage');
      void import('./pages/client/ClientReportsPageV5');
      void import('./pages/client/ClientDocumentsPage');
      void import('./pages/client/ClientHoursPage');
      void import('./pages/client/ClientDeliverablesPage');
    }
  };

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(run, { timeout: 4500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(run, 2500);
  return () => window.clearTimeout(timer);
}

function WorkspaceRoleLayout({ role }: { role: Role }) {
  return (
    <ProtectedRoute role={role}>
      <Shell role={role}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Shell>
    </ProtectedRoute>
  );
}

function PublicLazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<WorkspaceRouteLoader />}>{children}</Suspense>;
}

function AppRoutes() {
  useEffect(() => prefetchLikelyRoutes(), []);

  return (
    <Routes>
      <Route path="/" element={<PublicLazy><LoginPage/></PublicLazy>}/>
      <Route path="/auth/callback" element={<PublicLazy><AuthCallbackPage/></PublicLazy>}/>
      <Route path="/oauth/google/callback" element={<PublicLazy><GoogleCalendarCallbackPage/></PublicLazy>}/>

      <Route element={<WorkspaceRoleLayout role="admin"/>}>
        <Route path="/admin" element={<AdminDashboard/>}/>
        <Route path="/admin/clientes" element={<AdminClientsPageV3/>}/>
        <Route path="/admin/propostas" element={<AdminProposalsPageV2/>}/>
        <Route path="/admin/propostas/:submissionId/editar" element={<AdminProposalEditorPageV3/>}/>
        <Route path="/admin/propostas/proposta/:proposalId" element={<AdminProposalPreviewPageV3/>}/>
        <Route path="/admin/projetos" element={<AdminProjectsGatePage/>}/>
        <Route path="/admin/horas" element={<AdminHoursPageV3/>}/>
        <Route path="/admin/calendario" element={<AdminCalendarPage/>}/>
        <Route path="/admin/registros" element={<AdminRecordsPage/>}/>
        <Route path="/admin/documentos" element={<AdminDocumentsPageV4/>}/>
        <Route path="/admin/relatorios" element={<AdminReportsPageV17/>}/>
        <Route path="/admin/satisfacao" element={<AdminSatisfactionPage/>}/>
        <Route path="/admin/mapa-de-people" element={<AdminPeopleMapPageV2/>}/>
        <Route path="/admin/mapa-de-people/revisao" element={<AdminPeopleMapReviewPage/>}/>
        <Route path="/admin/mapa-de-people/relatorio/:id" element={<AdminPeopleMapReportPage/>}/>
      </Route>

      <Route element={<WorkspaceRoleLayout role="client"/>}>
        <Route path="/cliente" element={<ClientDashboard/>}/>
        <Route path="/cliente/cronograma" element={<ClientTimelinePage/>}/>
        <Route path="/cliente/entregaveis" element={<ClientDeliverablesPage/>}/>
        <Route path="/cliente/horas" element={<ClientHoursPage/>}/>
        <Route path="/cliente/registros" element={<ClientRecordsPage/>}/>
        <Route path="/cliente/documentos" element={<ClientDocumentsPage/>}/>
        <Route path="/cliente/relatorios" element={<ClientReportsPageV5/>}/>
      </Route>

      <Route path="/admin/relatorios/impressao/:reportId" element={<ProtectedRoute role="admin"><PublicLazy><ReportPrintPageV17 role="admin"/></PublicLazy></ProtectedRoute>}/>
      <Route path="/cliente/relatorios/impressao/:reportId" element={<ProtectedRoute role="client"><PublicLazy><ReportPrintPageV17 role="client"/></PublicLazy></ProtectedRoute>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default AppRoutes;
