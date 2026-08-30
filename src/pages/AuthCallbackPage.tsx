import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Role } from '../components/WorkspaceShell';

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AuthCallbackPage() {
  const [destination, setDestination] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setFailed(true);
      return;
    }

    let active = true;

    async function resolveProfile() {
      let userId: string | null = null;

      for (let attempt = 0; attempt < 12 && active; attempt += 1) {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
        if (!sessionError && sessionData.session?.user) {
          userId = sessionData.session.user.id;
          break;
        }
        await wait(250);
      }

      if (!active) return;
      if (!userId) {
        setFailed(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase!
        .from('profiles')
        .select('role, active')
        .eq('id', userId)
        .maybeSingle();

      if (!active) return;
      if (profileError || !profile?.active) {
        setFailed(true);
        return;
      }

      const role = profile.role as Role;
      setDestination(role === 'admin' ? '/admin' : '/cliente');
    }

    resolveProfile();
    return () => { active = false; };
  }, []);

  if (destination) return <Navigate to={destination} replace />;
  if (failed) return <Navigate to="/" replace />;

  return <main className="route-loading"><div className="loading-mark">CALI</div><p>Confirmando seu acesso…</p></main>;
}
