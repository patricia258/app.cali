import { useMutation } from '@tanstack/react-query';
import { resolveScheduleAdjustment } from '../../../api/projects/schedule';

export function useResolveScheduleAdjustment(reviewId: string, accept: boolean, onSaved: () => Promise<void>) {
  return useMutation({
    mutationFn: async (note: string) => {
      const { error } = await resolveScheduleAdjustment(reviewId, accept, note.trim());
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
  });
}
