import { skipToken, useQuery } from '@tanstack/react-query';
import { readPartnerWorkspace } from '../../../api/partner/workspace';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function usePartnerWorkspace() {
  const { user } = useWorkspaceAuth();
  const userId = user?.id;
  const { data, isError } = useQuery({
    queryKey: ['partner-workspace', userId] as const,
    queryFn: userId ? ({ signal }) => readPartnerWorkspace(userId, signal) : skipToken,
    gcTime: 0,
    networkMode: 'always',
  });

  return {
    me: data ?? null,
    error: isError ? 'Não foi possível carregar o seu acesso. Recarregue a página; se continuar, fale com a Patricia.' : '',
  };
}
