import { projectKeys } from '../../../api/projects/query-keys';
import { useQuery } from '@tanstack/react-query';
import { readProjectPerformance } from '../../../api/projects/performance';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useProjectDeliveryHistory(projectId: string) {
  const { user } = useWorkspaceAuth();

  return useQuery({
    queryKey: projectKeys.deliveryHistory(user?.id, projectId),
    enabled: Boolean(user?.id && projectId),
    queryFn: ({ signal }) => readProjectPerformance(projectId, signal),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 0,
  });
}
