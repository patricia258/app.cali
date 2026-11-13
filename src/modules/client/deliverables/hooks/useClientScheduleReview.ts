import { useQuery } from '@tanstack/react-query';
import { readClientScheduleReview } from '../../../../api/projects/schedule';

export function useClientScheduleReview(actorId: string | undefined, companyId: string, projectId: string, status?: string | null) {
  return useQuery({
    queryKey: ['client', 'schedule-review', actorId, companyId, projectId, status],
    queryFn: ({ signal }) => readClientScheduleReview(companyId, projectId, signal),
    enabled: Boolean(actorId && companyId && projectId && (status === 'client_review' || status === 'adjustment_requested')),
    refetchOnWindowFocus: true,
    gcTime: 0,
  });
}
