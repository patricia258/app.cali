import { useQuery } from '@tanstack/react-query';
import { readAdminProjectLifecycle } from '../../../api/projects/lifecycle';

export function useAdminProjectLifecycle(actorId: string | undefined, projectId: string | null) {
  return useQuery({
    queryKey: ['admin', 'project-lifecycle', actorId, projectId],
    queryFn: ({ signal }) => projectId ? readAdminProjectLifecycle(projectId, signal) : null,
    enabled: Boolean(actorId && projectId),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
