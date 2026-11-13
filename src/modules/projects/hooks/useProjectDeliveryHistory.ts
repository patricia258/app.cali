import { useQuery } from '@tanstack/react-query';
import { readProjectPerformance } from '../../../api/projects/performance';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useProjectDeliveryHistory(projectId: string) {
  const { user } = useWorkspaceAuth();

  return useQuery({
    queryKey: ['project-delivery-history', user?.id, projectId],
    queryFn: ({ signal }) => readProjectPerformance(projectId, signal),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 0,
  });
}
