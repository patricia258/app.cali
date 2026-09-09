import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from '../components/WorkspaceShell';

type AuthState = {
  ready: boolean;
  user: User | null;
  role: Role | null;
  active: boolean;
  refreshAccess: () => Promise<void>;
};

const WorkspaceAuthContext = createContext<AuthState | null>(null);

async function readProfile(user: User | null) {
  if (!user || !supabase) return { role: null as Role | null, active: false };
  const { data, error } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single();

  if (error || !data?.active) return { role: null as Role | null, active: false };
  return { role: data.role as Role, active: true };
}

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [active, setActive] = useState(false);

  async function applyUser(nextUser: User | null) {
    setUser(nextUser);
    if (!nextUser) {
      setRole(null);
      setActive(false);
      setReady(true);
      return;
    }

    const profile = await readProfile(nextUser);
    setRole(profile.role);
    setActive(profile.active);
    setReady(true);
  }

  async function refreshAccess() {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      setUser(null);
      setRole(null);
      setActive(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    await applyUser(data.session?.user ?? null);
  }

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      await applyUser(data.session?.user ?? null);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    ready,
    user,
    role,
    active,
    refreshAccess,
  }), [ready, user, role, active]);

  return <WorkspaceAuthContext.Provider value={value}>{children}</WorkspaceAuthContext.Provider>;
}

export function useWorkspaceAuth() {
  const value = useContext(WorkspaceAuthContext);
  if (!value) throw new Error('useWorkspaceAuth must be used inside WorkspaceAuthProvider');
  return value;
}
