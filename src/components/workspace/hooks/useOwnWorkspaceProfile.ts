import { skipToken, useQuery } from '@tanstack/react-query';
import { readOwnWorkspaceProfile } from '../../../api/workspace/profile';
import { workspaceKeys } from '../../../api/workspace/query-keys';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useOwnWorkspaceProfile() {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: workspaceKeys.profile(user?.id),
    queryFn: user?.id ? ({ signal }) => readOwnWorkspaceProfile(user.id, signal) : skipToken,
    staleTime: 60_000,
    gcTime: 0,
  });
}
