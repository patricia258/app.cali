import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from './WorkspaceShell';

function previewBypassAllowed() {
  const hostname = window.location.hostname;
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.vercel.app');
}

function WorkspaceRouteLoader() {
  return (
    <main className="route-loading cali-route-loading" aria-live="polite" aria-busy="true">
      <div className="cali-loading-illustrations" aria-hidden="true">
        <span className="cali-loading-mark cali-loading-lime" />
        <span className="cali-loading-mark cali-loading-oak" />
      </div>
      <span className="sr-only">Carregando seu Workspace</span>
    </main>
  );
}

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [actualRole, setActualRole] = useState<Role | null>(null);

  useEffect(() => {
    const previewRole = sessionStorage.getItem('cali-preview-role') as Role | null;
    if (previewBypassAllowed() && previewRole === role) {
      setActualRole(previewRole);
      setState('allowed');
      return;
    }

    // Produção nunca pode depender do preview local.
    if (!previewBypassAllowed()) sessionStorage.removeItem('cali-preview-role');

    if (!isSupabaseConfigured || !supabase) {
      setState('denied');
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

      sessionStorage.removeItem('cali-preview-role');

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

  if (state === 'loading') return <WorkspaceRouteLoader />;

  if (state === 'denied') {
    if (actualRole) return <Navigate to={actualRole === 'admin' ? '/admin' : '/cliente'} replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
