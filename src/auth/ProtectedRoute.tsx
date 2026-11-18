import { type ReactNode } from 'react';
import { Navigate } from '../components/navigation/Navigate';
import { homeOf, type Role } from './workspaceAuthContext';
import { useWorkspaceAuth } from './hooks/useWorkspaceAuth';
import { MfaGate } from './MfaGate';
import { TermsGate } from './TermsGate';
import { WorkspaceRouteLoader } from '../components/ds/WorkspaceRouteLoader';

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useWorkspaceAuth();

  if (!auth.ready) return <WorkspaceRouteLoader />;

  if (!auth.user || !auth.active || !auth.role) return <Navigate to="/login" replace />;

  if (auth.role !== role) {
    return <Navigate to={homeOf(auth.role)} replace />;
  }

  const accepted = <TermsGate>{children}</TermsGate>;
  return role === 'admin' ? <MfaGate>{accepted}</MfaGate> : accepted;
}
