import { useQuery } from '@tanstack/react-query';
import { workspaceKeys } from '../../../api/workspace/query-keys';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { resolveWorkspaceMedia } from '../../../lib/workspaceMedia';

export function useResolvedWorkspaceMedia(source?: string | null) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: workspaceKeys.media(user?.id, source),
    queryFn: async ({ signal }) => {
      const url = await resolveWorkspaceMedia(source);
      signal.throwIfAborted();
      return url;
    },
    enabled: Boolean(user?.id && source),
    staleTime: 55 * 60_000,
    refetchOnWindowFocus: true,
  });
}
