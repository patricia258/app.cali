import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { readSatisfactionReviews, saveSatisfactionFollowup } from '../../../../api/admin/satisfaction/reviews';
import { captureQueryScope } from '../../../../api/query-client';

type Ratings = Awaited<ReturnType<typeof readSatisfactionReviews>>;
type FollowupDraft = { review: Parameters<typeof saveSatisfactionFollowup>[0]; fields: Parameters<typeof saveSatisfactionFollowup>[1] };

export function useSaveSatisfactionFollowup(actorId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = adminKeys.satisfactionRatings(actorId);
  return useMutation({
    mutationFn: async ({ review, fields }: FollowupDraft) => {
      const result = await saveSatisfactionFollowup(review, fields);
      if (result.error) throw new Error(result.error.message);
      return {
        theme: result.data?.theme ?? fields.theme,
        note: result.data?.note ?? fields.note,
        handledAt: result.data?.handled_at ?? new Date().toISOString(),
      };
    },
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: async (saved, { review }, isCurrent) => {
      if (!actorId || !isCurrent?.()) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      queryClient.setQueryData<Ratings>(queryKey, (ratings) => ratings && {
        ...ratings,
        followups: { ...ratings.followups, [`${review.sourceType}:${review.id}`]: saved },
      });
    },
    gcTime: 0,
  });
}
