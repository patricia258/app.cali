import type { ReactNode } from 'react';
import { Shell } from './WorkspaceShell';
import './document-shell.css';

export function DocumentShell({ children }: { children: ReactNode }) {
  return <Shell role="admin">{children}</Shell>;
}
