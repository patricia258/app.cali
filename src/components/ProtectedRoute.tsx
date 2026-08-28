import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from './WorkspaceShell';

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [actualRole, setActualRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState('allowed');
      return;
    }

    let active = true;

    async function validateAccess() {
      const { data: sessionData } = await supabase!.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (active) setState('denied');
        return;
      }

      const { data: profile, error } = await supabase!
        .from('profiles')
        .select('role, active')
        .eq('id', user.id)
        .single();

      if (!active) return;
      if (error || !profile?.active) {
        setState('denied');
        return;
      }

      const profileRole = profile.role as Role;
      setActualRole(profileRole);
      setState(profileRole === role ? 'allowed' : 'denied');
    }

    validateAccess();
    return () => { active = false; };
  }, [role]);

  if (state === 'loading') {
    return <main className="route-loading"><div className="loading-mark">CALI</div><p>Carregando seu Workspace…</p></main>;
  }

  if (state === 'denied') {
    if (actualRole) return <Navigate to={actualRole === 'admin' ? '/admin' : '/cliente'} replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
