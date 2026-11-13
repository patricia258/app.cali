import { useMutation } from '@tanstack/react-query';
import { requestScheduleAdjustment, type ScheduleAdjustment } from '../../../../api/projects/schedule';

export function useRequestClientScheduleAdjustment(onSaved: () => Promise<void>) {
  return useMutation({
    mutationFn: async (input: ScheduleAdjustment) => {
      const { error } = await requestScheduleAdjustment(input);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
  });
}
