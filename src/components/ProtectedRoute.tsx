import { type ReactNode } from 'react';
import { Navigate } from '../app/navigation';
import { homeOf, useWorkspaceAuth, type Role } from '../auth/WorkspaceAuthProvider';
import { MfaGate } from '../auth/MfaGate';
import { TermsGate } from '../auth/TermsGate';

export function WorkspaceRouteLoader() {
  return (
    <main className="route-loading cali-route-loading tw:grid tw:place-items-center" aria-live="polite" aria-busy="true">
      <div className="cali-loading-illustrations tw:relative" aria-hidden="true">
        <span className="cali-loading-mark cali-loading-lime tw:absolute tw:inset-0 tw:block" />
        <span className="cali-loading-mark cali-loading-oak tw:absolute tw:inset-0 tw:block" />
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
    return <Navigate to={homeOf(auth.role)} replace />;
  }

  const accepted = <TermsGate>{children}</TermsGate>;
  return role === 'admin' ? <MfaGate>{accepted}</MfaGate> : accepted;
}
