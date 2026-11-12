import { useContext } from 'react';
import { WorkspaceAuthContext } from '../workspaceAuthContext';

export function useWorkspaceAuth() {
  const value = useContext(WorkspaceAuthContext);
  if (!value) throw new Error('useWorkspaceAuth must be used inside WorkspaceAuthProvider');
  return value;
}
