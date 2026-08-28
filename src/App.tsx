import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminProjectsPage } from './pages/admin/AdminProjectsPage';
import { AdminHoursPage } from './pages/admin/AdminHoursPage';
import { AdminCalendarPage } from './pages/admin/AdminCalendarPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
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
      <Route path="/admin/clientes" element={<ProtectedRoute role="admin"><AdminClientsPage /></ProtectedRoute>} />
      <Route path="/admin/projetos" element={<ProtectedRoute role="admin"><AdminProjectsPage /></ProtectedRoute>} />
      <Route path="/admin/horas" element={<ProtectedRoute role="admin"><AdminHoursPage /></ProtectedRoute>} />
      <Route path="/admin/calendario" element={<ProtectedRoute role="admin"><AdminCalendarPage /></ProtectedRoute>} />
      <Route path="/admin/documentos" element={<ProtectedRoute role="admin"><AdminDocumentsPage /></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReportsPage /></ProtectedRoute>} />

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
