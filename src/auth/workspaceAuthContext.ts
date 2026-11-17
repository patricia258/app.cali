import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { WorkspaceRole } from '../api/access/profile';

export type Role = WorkspaceRole;
export const homeOf = (role: Role | null | undefined) => role === 'admin' ? '/admin' : role === 'partner' ? '/equipe' : '/cliente';

export type AuthSnapshot = {
  ready: boolean;
  user: User | null;
  role: Role | null;
  active: boolean;
};

export type AuthState = AuthSnapshot & {
  refreshAccess: () => Promise<void>;
};

export const WorkspaceAuthContext = createContext<AuthState | null>(null);
