import type { ReactNode } from 'react';
import { useNotificationChime } from '../components/workspace/hooks/useNotificationChime';
import { useWorkspaceAccess } from './hooks/useWorkspaceAccess';
import { WorkspaceAuthContext } from './workspaceAuthContext';

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const access = useWorkspaceAccess();
  useNotificationChime(access.user?.id ?? null);
  return <WorkspaceAuthContext.Provider value={access}>{children}</WorkspaceAuthContext.Provider>;
}
