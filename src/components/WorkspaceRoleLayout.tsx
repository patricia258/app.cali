import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Shell, type Role } from './WorkspaceShell';

export function WorkspaceRoleLayout({ role }: { role: Role }) {
  return (
    <ProtectedRoute role={role}>
      <Shell role={role}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Shell>
    </ProtectedRoute>
  );
}
