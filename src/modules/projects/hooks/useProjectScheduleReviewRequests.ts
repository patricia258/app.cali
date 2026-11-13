import { useQuery } from '@tanstack/react-query';
import { readProjectScheduleReviewRequests } from '../../../api/projects/schedule';

export function useProjectScheduleReviewRequests(projectId: string) {
  return useQuery({
    queryKey: ['admin-project-schedule-review', projectId],
    queryFn: ({ signal }) => readProjectScheduleReviewRequests(projectId, signal),
  });
}
