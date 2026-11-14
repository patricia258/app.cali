import { useMutation } from '@tanstack/react-query';
import { approveProjectSchedule } from '../../../../api/projects/schedule';

export function useApproveClientSchedule(projectId: string, onSaved: () => Promise<void>) {
  return useMutation({
    mutationFn: async () => {
      const { error } = await approveProjectSchedule(projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSaved,
  });
}
