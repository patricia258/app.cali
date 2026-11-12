import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { workspaceProfileKey, workspaceProfileQuery, type WorkspaceRole } from '../api/access/profile';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/* Perfis de acesso: administradora, cliente e Partner (equipe CALI, área própria em /equipe). */
export type Role = WorkspaceRole;
export const homeOf = (role: Role | null | undefined) => role === 'admin' ? '/admin' : role === 'partner' ? '/equipe' : '/cliente';

type AuthSnapshot = {
  ready: boolean;
  user: User | null;
  role: Role | null;
  active: boolean;
};

type AuthState = AuthSnapshot & {
  refreshAccess: () => Promise<void>;
};

const WorkspaceAuthContext = createContext<AuthState | null>(null);
const signedOut: AuthSnapshot = { ready: true, user: null, role: null, active: false };

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<AuthSnapshot>({ ...signedOut, ready: false });
  const activeUserId = useRef<string | null>(null);
  const accessVersion = useRef(0);

  const applyUser = useCallback(async (nextUser: User | null) => {
    const version = ++accessVersion.current;
    const previousId = activeUserId.current;
    const nextId = nextUser?.id ?? null;
    activeUserId.current = nextId;

    if (previousId && previousId !== nextId) {
      queryClient.removeQueries({ queryKey: workspaceProfileKey(previousId), exact: true });
    }

    if (!nextUser) {
      setAccess(signedOut);
      return;
    }

    setAccess((current) =>
      previousId === nextId
        ? { ...current, user: nextUser }
        : { ...signedOut, ready: false, user: nextUser },
    );

    const profile = await queryClient.fetchQuery(workspaceProfileQuery(nextUser.id)).catch(() => null);
    if (accessVersion.current !== version) return;

    const role = profile?.active ? profile.role : null;
    setAccess({ ready: true, user: nextUser, role, active: role !== null });
  }, [queryClient]);

  const refreshAccess = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      await applyUser(null);
      return;
    }

    const version = accessVersion.current;
    const result = await supabase.auth.getSession().catch(() => null);
    if (accessVersion.current === version) await applyUser(result?.data.session?.user ?? null);
  }, [applyUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAccess(signedOut);
      return;
    }

    let mounted = true;
    void refreshAccess();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) void applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      accessVersion.current++;
      listener.subscription.unsubscribe();
      if (activeUserId.current) {
        queryClient.removeQueries({ queryKey: workspaceProfileKey(activeUserId.current), exact: true });
        activeUserId.current = null;
      }
    };
  }, [applyUser, queryClient, refreshAccess]);

  const value = useMemo<AuthState>(() => ({
    ...access,
    refreshAccess,
  }), [access, refreshAccess]);

  return <WorkspaceAuthContext.Provider value={value}>{children}</WorkspaceAuthContext.Provider>;
}

export function useWorkspaceAuth() {
  const value = useContext(WorkspaceAuthContext);
  if (!value) throw new Error('useWorkspaceAuth must be used inside WorkspaceAuthProvider');
  return value;
}
