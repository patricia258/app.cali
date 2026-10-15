import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { homeOf, useWorkspaceAuth, type Role } from '../auth/WorkspaceAuthProvider';
import { MfaGate } from '../auth/MfaGate';
import { TermsGate } from '../auth/TermsGate';

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
    return <Navigate to={homeOf(auth.role)} replace />;
  }

  // Administradora passa pela verificação em duas etapas; cliente aceita os termos (desligado até a revisão jurídica).
  return role === 'admin' ? <MfaGate>{children}</MfaGate> : <TermsGate>{children}</TermsGate>;
}
