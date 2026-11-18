import { projectKeys } from '../../../api/projects/query-keys';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { useQuery } from '@tanstack/react-query';
import { readProjectScheduleReviewRequests } from '../../../api/projects/schedule';

export function useProjectScheduleReviewRequests(projectId: string) {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: projectKeys.adminSchedule(user?.id, projectId),
    enabled: Boolean(user?.id && role === 'admin' && projectId),
    queryFn: ({ signal }) => readProjectScheduleReviewRequests(projectId, signal),
  });
}
