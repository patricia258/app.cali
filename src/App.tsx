import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminProjectsPage } from './pages/admin/AdminProjectsPage';
import { AdminHoursPage } from './pages/admin/AdminHoursPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { ClientDashboard } from './pages/client/ClientDashboard';
import { ClientTimelinePage } from './pages/client/ClientTimelinePage';
import { ClientDeliverablesPage } from './pages/client/ClientDeliverablesPage';
import { ClientHoursPage } from './pages/client/ClientHoursPage';
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
      <Route path="/admin/calendario" element={<ProtectedRoute role="admin"><PlaceholderPage role="admin" title="Calendário" description="Reuniões, marcos e prazos compartilhados por cliente e projeto." /></ProtectedRoute>} />
      <Route path="/admin/documentos" element={<ProtectedRoute role="admin"><PlaceholderPage role="admin" title="Documentos" description="Arquivos finais, versões e conexões com Google Drive organizados por cliente." /></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute role="admin"><AdminReportsPage /></ProtectedRoute>} />

      <Route path="/cliente" element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
      <Route path="/cliente/cronograma" element={<ProtectedRoute role="client"><ClientTimelinePage /></ProtectedRoute>} />
      <Route path="/cliente/entregaveis" element={<ProtectedRoute role="client"><ClientDeliverablesPage /></ProtectedRoute>} />
      <Route path="/cliente/horas" element={<ProtectedRoute role="client"><ClientHoursPage /></ProtectedRoute>} />
      <Route path="/cliente/documentos" element={<ProtectedRoute role="client"><PlaceholderPage role="client" title="Documentos" description="Entregas finais e arquivos compartilhados pela CALI, com opção de salvar no Drive da sua empresa." /></ProtectedRoute>} />
      <Route path="/cliente/relatorios" element={<ProtectedRoute role="client"><ClientReportsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
