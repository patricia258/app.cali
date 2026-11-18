import { skipToken, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { readSatisfactionReviews } from '../../../../api/admin/satisfaction/reviews';

export function useSatisfactionRatings(actorId: string | null) {
  return useQuery({
    queryKey: adminKeys.satisfactionRatings(actorId),
    queryFn: actorId ? ({ signal }) => readSatisfactionReviews(signal) : skipToken,
    gcTime: 0,
  });
}
