import { skipToken, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { readSatisfactionClosures } from '../../../../api/admin/satisfaction/reviews';

export function useSatisfactionClosures(actorId: string | null) {
  return useQuery({
    queryKey: adminKeys.satisfactionClosures(actorId),
    queryFn: actorId ? ({ signal }) => readSatisfactionClosures(signal) : skipToken,
    gcTime: 0,
  });
}
