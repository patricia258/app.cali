import { useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';

export function useResolvedWorkspaceMedia(source?: string | null) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['workspace', 'media', user?.id, source],
    queryFn: () => resolveWorkspaceMedia(source),
    enabled: Boolean(user?.id && source),
    staleTime: 55 * 60_000,
    refetchOnWindowFocus: true,
  });
}
