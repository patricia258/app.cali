import { projectKeys } from '../../../api/projects/query-keys';
import { useQuery } from '@tanstack/react-query';
import { readAdminProjectLifecycle } from '../../../api/projects/lifecycle';

export function useAdminProjectLifecycle(actorId: string | undefined, projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.adminLifecycle(actorId, projectId),
    queryFn: ({ signal }) => projectId ? readAdminProjectLifecycle(projectId, signal) : null,
    enabled: Boolean(actorId && projectId),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
