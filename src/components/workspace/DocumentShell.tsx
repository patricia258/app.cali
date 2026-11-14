import type { ReactNode } from 'react';
import { Shell } from './WorkspaceShell';

export function DocumentShell({ children }: { children: ReactNode }) {
  return <Shell role="admin">{children}</Shell>;
}
