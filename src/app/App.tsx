import { Outlet } from '@tanstack/react-router';
import { Suspense, useEffect, useLayoutEffect } from 'react';
import { useLocation } from '../hooks/useLocation';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { WorkspaceRouteLoader } from '../components/ds/WorkspaceRouteLoader';
import { Shell, WorkspaceFrame } from '../components/workspace/WorkspaceShell';
import { RouteRuntimeManager } from '../runtime/RouteRuntimeManager';
import { applyVisualSystem } from '../v2/visualSystem';

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
      void import('../modules/shared/calendar/AdminCalendarPage');
      void import('../modules/admin/reports/AdminReportsPageV17');
      void import('../modules/admin/companies/AdminClientsPageV3');
      void import('../modules/admin/projects/AdminProjectsGatePage');
      void import('../modules/shared/hours/AdminHoursPageV3');
      void import('../modules/shared/documents/AdminDocumentsPageV4');
      return;
    }

    if (path.startsWith('/cliente')) {
      void import('../modules/client/timeline/ClientTimelinePage');
      void import('../modules/client/reports/ClientReportsPageV5');
      void import('../modules/client/documents/ClientDocumentsPage');
      void import('../modules/client/hours/ClientHoursPage');
      void import('../modules/client/deliverables/ClientDeliverablesPage');
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
