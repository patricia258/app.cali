import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { deleteSatisfactionFollowup, type readSatisfactionReviews } from '../../../../api/admin/satisfaction/reviews';
import { captureQueryScope } from '../../../../api/query-client';

type Ratings = Awaited<ReturnType<typeof readSatisfactionReviews>>;

export function useDeleteSatisfactionFollowup(actorId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = adminKeys.satisfactionRatings(actorId);
  return useMutation({
    mutationFn: async (review: Parameters<typeof deleteSatisfactionFollowup>[0]) => {
      const result = await deleteSatisfactionFollowup(review);
      if (result.error) throw new Error(result.error.message);
    },
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: async (_result, review, isCurrent) => {
      if (!actorId || !isCurrent?.()) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      queryClient.setQueryData<Ratings>(queryKey, (ratings) => {
        if (!ratings?.followups) return ratings;
        const followups = { ...ratings.followups };
        delete followups[`${review.sourceType}:${review.id}`];
        return { ...ratings, followups };
      });
    },
    gcTime: 0,
  });
}
