import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspaceAuth } from '../auth/WorkspaceAuthProvider';
import type { Role } from './WorkspaceShell';

export function WorkspaceRouteLoader() {
  return (
    <main className="route-loading cali-route-loading" aria-live="polite" aria-busy="true">
      <div className="cali-loading-illustrations" aria-hidden="true">
        <span className="cali-loading-mark cali-loading-lime" />
        <span className="cali-loading-mark cali-loading-oak" />
      </div>
      <span className="sr-only">Carregando seu Workspace</span>
    </main>
  );
}

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const auth = useWorkspaceAuth();

  if (!auth.ready) return <WorkspaceRouteLoader />;

  if (!auth.user || !auth.active || !auth.role) return <Navigate to="/login" replace />;

  if (auth.role !== role) {
    return <Navigate to={auth.role === 'admin' ? '/admin' : '/cliente'} replace />;
  }

  return <>{children}</>;
}
