import { useMutation } from '@tanstack/react-query';
import { homeOf } from '../../../../auth/workspaceAuthContext';
import { verifyAccessCode } from '../../../../api/access/codes';
import { endWorkspaceSession, readAuthenticatedWorkspaceProfile } from '../../../../api/access/session';
import { useNavigate } from '../../../../hooks/useNavigate';

const disabledAccess = 'Seu acesso ao CALI Workspace está desativado. Se acha que é um engano, fale com a CALI RH.';

export function useVerifyAccessCode() {
  const navigate = useNavigate();
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const result = await verifyAccessCode(email.trim(), code);
      if (result.error) throw new Error('Código inválido ou expirado.');
      const profile = await readAuthenticatedWorkspaceProfile();
      if (profile && !profile.active) {
        await endWorkspaceSession();
        return { blocked: true, message: disabledAccess } as const;
      }
      return { blocked: false, role: result.data?.role } as const;
    },
    onSuccess: (result) => {
      if (!result.blocked) navigate(homeOf(result.role), { replace: true });
    },
  });
}
