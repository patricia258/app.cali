import { useMutation } from '@tanstack/react-query';
import { publishProjectSchedule } from '../../../api/projects/workspace';

export function usePublishProjectSchedule(onPublished: () => Promise<void>) {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await publishProjectSchedule(projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: onPublished,
  });
}
