import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sessionScope } from '../../api/access/mfa';
import { workspaceProfileQuery, type WorkspaceRole } from '../../api/access/profile';
import { isSupabaseConfigured, observeWorkspaceSession, readWorkspaceSession } from '../../api/access/session';
import { clearWorkspaceQueryCache } from '../../api/query-client';
import type { AuthSnapshot, AuthState } from '../workspaceAuthContext';

const signedOut: AuthSnapshot = { ready: true, user: null, role: null, active: false };

export function useWorkspaceAccess(): AuthState {
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<AuthSnapshot>({ ...signedOut, ready: false });
  const activeSession = useRef<{ actorId: string; sessionKey: string | null; fallbackToken: string | null } | null>(null);
  const resolvedRole = useRef<WorkspaceRole | null | undefined>(undefined);
  const accessVersion = useRef(0);

  const applySession = useCallback(async (session: Session | null) => {
    const version = ++accessVersion.current;
    const nextUser = session?.user ?? null;
    const sessionKey = session ? sessionScope(session, session.user.id)?.key ?? null : null;
    const nextScope = session && { actorId: session.user.id, sessionKey, fallbackToken: sessionKey ? null : session.access_token };
    const previousScope = activeSession.current;
    const scopeChanged = previousScope?.actorId !== nextScope?.actorId ||
      previousScope?.sessionKey !== nextScope?.sessionKey ||
      previousScope?.fallbackToken !== nextScope?.fallbackToken;
    activeSession.current = nextScope;

    if (scopeChanged) {
      clearWorkspaceQueryCache(queryClient);
      resolvedRole.current = undefined;
    }

    if (!nextUser) {
      setAccess(signedOut);
      return;
    }

    setAccess((current) =>
      scopeChanged
        ? { ...signedOut, ready: false, user: nextUser }
        : { ...current, user: nextUser },
    );

    const profile = await queryClient.fetchQuery(workspaceProfileQuery(nextUser.id)).catch(() => null);
    if (accessVersion.current !== version) return;

    const role = profile?.active ? profile.role : null;
    if (resolvedRole.current !== undefined && role !== resolvedRole.current) clearWorkspaceQueryCache(queryClient);
    resolvedRole.current = role;
    setAccess({ ready: true, user: nextUser, role, active: role !== null });
  }, [queryClient]);

  const refreshAccess = useCallback(async () => {
    if (!isSupabaseConfigured) {
      await applySession(null);
      return;
    }

    const version = accessVersion.current;
    const session = await readWorkspaceSession().catch(() => null);
    if (accessVersion.current === version) await applySession(session);
  }, [applySession]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAccess(signedOut);
      return;
    }

    let mounted = true;
    void refreshAccess();
    const unsubscribe = observeWorkspaceSession((session) => {
      if (mounted) void applySession(session);
    });

    return () => {
      mounted = false;
      accessVersion.current++;
      unsubscribe();
      if (activeSession.current) clearWorkspaceQueryCache(queryClient);
      activeSession.current = null;
      resolvedRole.current = undefined;
    };
  }, [applySession, queryClient, refreshAccess]);

  return useMemo<AuthState>(() => ({
    ...access,
    refreshAccess,
  }), [access, refreshAccess]);
}
