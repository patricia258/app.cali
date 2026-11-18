import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { homeOf } from '../../../../auth/workspaceAuthContext';
import { isSupabaseConfigured, readExistingWorkspaceRole, readWorkspaceSession, verifyLegacyAccessLink } from '../../../../api/access/session';
import { useNavigate } from '../../../../hooks/useNavigate';
import { useSearchParams } from '../../../../hooks/useSearchParams';

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useAuthCallback() {
  const [params] = useSearchParams();
  const token = params.get('token_hash');
  const kind = params.get('type') === 'email' ? 'email' : 'magiclink';
  const navigate = useNavigate();
  const started = useRef(false);
  const { mutate, data, isError } = useMutation({
    gcTime: 0,
    mutationFn: async ({ token, kind }: { token: string | null; kind: 'email' | 'magiclink' }) => {
      if (!isSupabaseConfigured) return '/';
      if (token) {
        if (!await verifyLegacyAccessLink(token, kind)) return '/';
        if (started.current) navigate('/auth/callback', { replace: true });
      }
      for (let attempt = 0; attempt < 12 && started.current; attempt += 1) {
        const session = await readWorkspaceSession();
        if (session) {
          const role = await readExistingWorkspaceRole();
          return role ? homeOf(role) : '/';
        }
        await wait(250);
      }
      return '/';
    },
  });

  const exchanged = useRef(false);
  useEffect(() => {
    started.current = true;
    if (!exchanged.current) {
      exchanged.current = true;
      mutate({ token, kind });
    }
    return () => { started.current = false; };
  }, [mutate, token, kind]);

  return isError ? '/' : data;
}
