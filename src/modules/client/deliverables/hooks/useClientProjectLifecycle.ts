import { useQuery } from '@tanstack/react-query';
import { readClientProjectLifecycle } from '../../../../api/projects/lifecycle';

export function useClientProjectLifecycle(actorId: string | undefined, companyId: string, projectId: string | null) {
  return useQuery({
    queryKey: ['client', 'project-lifecycle', actorId, companyId, projectId],
    queryFn: ({ signal }) => readClientProjectLifecycle(companyId, projectId, signal),
    enabled: Boolean(actorId && companyId),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
