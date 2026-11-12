import { Outlet } from '@tanstack/react-router';
import { Suspense, useEffect, useLayoutEffect } from 'react';
import { useLocation } from './app/navigation';
import { ProtectedRoute, WorkspaceRouteLoader } from './components/ProtectedRoute';
import { Shell, WorkspaceFrame } from './components/WorkspaceShell';
import { RouteRuntimeManager } from './runtime/RouteRuntimeManager';
import { applyVisualSystem } from './v2/visualSystem';

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
  // Prefetch só depois do primeiro conteúdo estabilizar. Disparar isso em 250 ms
  // competia com a renderização inicial e tornava a navegação visualmente fragmentada.
  const schedule = window.setTimeout(() => {
    if (document.visibilityState !== 'visible') return;
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
  }, 1800);

  return () => window.clearTimeout(schedule);
}

export default function App() {
  useEffect(() => prefetchLikelyRoutes(), []);
  const { pathname } = useLocation();
  useLayoutEffect(() => { void applyVisualSystem(pathname); }, [pathname]);
  const workspaceArea = pathname.split('/')[1];
  const workspaceRole = workspaceArea === 'cliente' ? 'client' : workspaceArea === 'admin' ? 'admin' : null;
  const routes = (
    <Suspense fallback={<WorkspaceNavigationFallback />}>
      <Outlet />
    </Suspense>
  );

  if (!workspaceRole) return routes;

  return (
    <ProtectedRoute role={workspaceRole}>
      <RouteRuntimeManager />
      <WorkspaceFrame role={workspaceRole}>{routes}</WorkspaceFrame>
    </ProtectedRoute>
  );
}
