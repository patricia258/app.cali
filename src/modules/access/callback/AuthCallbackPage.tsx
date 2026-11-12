import { homeOf } from '../../../auth/workspaceAuthContext';
import { useEffect, useState } from 'react';
import { Navigate } from '../../../components/navigation/Navigate';
import { isSupabaseConfigured, readExistingWorkspaceRole, readWorkspaceSession, verifyLegacyAccessLink } from '../../../api/access/session';

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AuthCallbackPage() {
  const [destination, setDestination] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setFailed(true);
      return;
    }

    let active = true;

    async function resolveProfile() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const tokenType = params.get('type');

      if (tokenHash) {
        const verified = await verifyLegacyAccessLink(tokenHash, tokenType === 'email' ? 'email' : 'magiclink');
        if (!active) return;
        if (!verified) {
          setFailed(true);
          return;
        }

        window.history.replaceState(window.history.state, document.title, '/auth/callback');
      }

      for (let attempt = 0; attempt < 12 && active; attempt += 1) {
        const session = await readWorkspaceSession();
        if (session) {
          const role = await readExistingWorkspaceRole();
          if (!active) return;
          if (role) setDestination(homeOf(role));
          else setFailed(true);
          return;
        }
        await wait(250);
      }
      if (active) setFailed(true);
    }

    resolveProfile();
    return () => { active = false; };
  }, []);

  if (destination) return <Navigate to={destination} replace />;
  if (failed) return <Navigate to="/" replace />;

  return <main className="route-loading"><div className="loading-mark">CALI</div><p>Confirmando seu acesso…</p></main>;
}
