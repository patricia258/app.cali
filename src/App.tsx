import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { GoogleCalendarCallbackPage } from './pages/GoogleCalendarCallbackPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminClientsPageV3 } from './pages/admin/AdminClientsPageV3';
import { AdminProposalsPageV2 } from './pages/admin/AdminProposalsPageV2';
import { AdminProposalEditorPageV3 } from './pages/admin/AdminProposalEditorPageV3';
import { AdminProposalPreviewPageV3 } from './pages/admin/AdminProposalPreviewPageV3';
import { AdminProjectsGatePage } from './pages/admin/AdminProjectsGatePage';
import { AdminHoursPageV3 } from './pages/admin/AdminHoursPageV3';
import { AdminCalendarPage } from './pages/admin/AdminCalendarPage';
import { AdminDocumentsPageV4 } from './pages/admin/AdminDocumentsPageV4';
import { AdminReportsPageV16 } from './pages/admin/AdminReportsPageV16';
import { AdminSatisfactionPage } from './pages/admin/AdminSatisfactionPage';
import { AdminPeopleMapPageV2 } from './pages/admin/AdminPeopleMapPageV2';
import { AdminPeopleMapReviewPage } from './pages/admin/AdminPeopleMapReviewPage';
import { AdminPeopleMapReportPage } from './pages/admin/AdminPeopleMapReportPage';
import { AdminRecordsPage, ClientRecordsPage } from './pages/records/WorkspaceRecordsPage';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientTimelinePage } from './pages/client/ClientTimelinePage';
import { ClientDeliverablesPage } from './pages/client/ClientDeliverablesPage';
import { ClientHoursPage } from './pages/client/ClientHoursPage';
import { ClientDocumentsPage } from './pages/client/ClientDocumentsPage';
import { ClientReportsPageV5 } from './pages/client/ClientReportsPageV5';
import { ReportPrintPageV16 } from './pages/reports/ReportPrintPageV16';

export default function App(){return <Routes>
  <Route path="/" element={<LoginPage/>}/><Route path="/auth/callback" element={<AuthCallbackPage/>}/><Route path="/oauth/google/callback" element={<GoogleCalendarCallbackPage/>}/>
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
  <Route path="/admin/relatorios/impressao/:reportId" element={<ProtectedRoute role="admin"><ReportPrintPageV16 role="admin"/></ProtectedRoute>}/>
  <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReportsPageV16/></ProtectedRoute>}/>
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
  <Route path="/cliente/relatorios/impressao/:reportId" element={<ProtectedRoute role="client"><ReportPrintPageV16 role="client"/></ProtectedRoute>}/>
  <Route path="/cliente/relatorios" element={<ProtectedRoute role="client"><ClientReportsPageV5/></ProtectedRoute>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}
