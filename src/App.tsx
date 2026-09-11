import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, WorkspaceRouteLoader } from './components/ProtectedRoute';
import { Shell, WorkspaceFrame } from './components/WorkspaceShell';
import { useLocation } from 'react-router-dom';

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

function WorkspaceNavigationFallback() {
  const { pathname } = useLocation();
  const role = pathname.startsWith('/cliente') ? 'client' : 'admin';

  return (
    <Shell role={role}>
      <WorkspaceRouteLoader />
    </Shell>
  );
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

  return () => window.clearTimeout(schedule);
}

function AppRoutes() {
  useEffect(() => prefetchLikelyRoutes(), []);
  const { pathname } = useLocation();
  const workspaceRole = pathname.startsWith('/cliente') ? 'client' : pathname.startsWith('/admin') ? 'admin' : null;

  const routes = (
    
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


  return workspaceRole ? <WorkspaceFrame role={workspaceRole}>{routes}</WorkspaceFrame> : routes;
}
export default AppRoutes;
