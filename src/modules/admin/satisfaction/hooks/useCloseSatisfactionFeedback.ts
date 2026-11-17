import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { closeFeedbackRequest } from '../../../../api/admin/satisfaction/reviews';
import { captureQueryScope } from '../../../../api/query-client';

export function useCloseSatisfactionFeedback(actorId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeFeedbackRequest,
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: (_result, _id, isCurrent) => {
      if (actorId && isCurrent?.()) {
        return queryClient.invalidateQueries({ queryKey: adminKeys.satisfactionClosures(actorId), exact: true });
      }
    },
    gcTime: 0,
  });
}
