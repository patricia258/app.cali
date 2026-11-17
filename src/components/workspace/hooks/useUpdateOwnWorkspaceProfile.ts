import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOwnWorkspaceProfile, type readOwnWorkspaceProfile, type ProfileUpdate } from '../../../api/workspace/profile';
import { workspaceKeys } from '../../../api/workspace/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useUpdateOwnWorkspaceProfile() {
  const { user } = useWorkspaceAuth();
  const queryClient = useQueryClient();

  return useMutation({
    gcTime: 0,
    mutationFn: async (profile: ProfileUpdate) => {
      const isCurrent = captureQueryScope(queryClient);
      const owner = await updateOwnWorkspaceProfile(user?.id, profile);
      if (!owner || !isCurrent()) return null;
      const queryKey = workspaceKeys.profile(owner);
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return null;
      const current = queryClient.getQueryData<Awaited<ReturnType<typeof readOwnWorkspaceProfile>>>(queryKey);
      if (current) queryClient.setQueryData(queryKey, { ...current, ...profile });
      else await queryClient.invalidateQueries({ queryKey, exact: true });
      return isCurrent() ? { owner, isCurrent } : null;
    },
  });
}
