import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { workspaceProfileQuery } from '../api/access/profile';
import { isSupabaseConfigured, observeWorkspaceSession, readWorkspaceSession } from '../api/access/session';
import { WorkspaceAuthContext, type AuthSnapshot, type AuthState } from './workspaceAuthContext';

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
      queryClient.clear();
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
    if (!isSupabaseConfigured) {
      await applyUser(null);
      return;
    }

    const version = accessVersion.current;
    const session = await readWorkspaceSession().catch(() => null);
    if (accessVersion.current === version) await applyUser(session?.user ?? null);
  }, [applyUser]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAccess(signedOut);
      return;
    }

    let mounted = true;
    void refreshAccess();
    const unsubscribe = observeWorkspaceSession((session) => {
      if (mounted) void applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      accessVersion.current++;
      unsubscribe();
      if (activeUserId.current) {
        queryClient.clear();
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
