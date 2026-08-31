import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminClientsPageV3 } from './pages/admin/AdminClientsPageV3';
import { AdminProjectsGatePage } from './pages/admin/AdminProjectsGatePage';
import { AdminHoursPage } from './pages/admin/AdminHoursPage';
import { AdminCalendarPage } from './pages/admin/AdminCalendarPage';
import { AdminDocumentsPageV4 } from './pages/admin/AdminDocumentsPageV4';
import { AdminReportsPageV5 } from './pages/admin/AdminReportsPageV5';
import { AdminPeopleMapPageV2 } from './pages/admin/AdminPeopleMapPageV2';
import { AdminPeopleMapReviewPage } from './pages/admin/AdminPeopleMapReviewPage';
import { AdminPeopleMapReportPage } from './pages/admin/AdminPeopleMapReportPage';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientTimelinePage } from './pages/client/ClientTimelinePage';
import { ClientDeliverablesPage } from './pages/client/ClientDeliverablesPage';
import { ClientHoursPage } from './pages/client/ClientHoursPage';
import { ClientDocumentsPage } from './pages/client/ClientDocumentsPage';
import { ClientReportsPage } from './pages/client/ClientReportsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/clientes" element={<ProtectedRoute role="admin"><AdminClientsPageV3 /></ProtectedRoute>} />
      <Route path="/admin/projetos" element={<ProtectedRoute role="admin"><AdminProjectsGatePage /></ProtectedRoute>} />
      <Route path="/admin/horas" element={<ProtectedRoute role="admin"><AdminHoursPage /></ProtectedRoute>} />
      <Route path="/admin/calendario" element={<ProtectedRoute role="admin"><AdminCalendarPage /></ProtectedRoute>} />
      <Route path="/admin/documentos" element={<ProtectedRoute role="admin"><AdminDocumentsPageV4 /></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReportsPageV5 /></ProtectedRoute>} />
      <Route path="/admin/mapa-de-people" element={<ProtectedRoute role="admin"><AdminPeopleMapPageV2 /></ProtectedRoute>} />
      <Route path="/admin/mapa-de-people/revisao" element={<ProtectedRoute role="admin"><AdminPeopleMapReviewPage /></ProtectedRoute>} />
      <Route path="/admin/mapa-de-people/relatorio/:id" element={<ProtectedRoute role="admin"><AdminPeopleMapReportPage /></ProtectedRoute>} />

      <Route path="/cliente" element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
      <Route path="/cliente/cronograma" element={<ProtectedRoute role="client"><ClientTimelinePage /></ProtectedRoute>} />
      <Route path="/cliente/entregaveis" element={<ProtectedRoute role="client"><ClientDeliverablesPage /></ProtectedRoute>} />
      <Route path="/cliente/horas" element={<ProtectedRoute role="client"><ClientHoursPage /></ProtectedRoute>} />
      <Route path="/cliente/documentos" element={<ProtectedRoute role="client"><ClientDocumentsPage /></ProtectedRoute>} />
      <Route path="/cliente/relatorios" element={<ProtectedRoute role="client"><ClientReportsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
