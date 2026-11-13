import { useMutation } from '@tanstack/react-query';
import { renameProjectWorkstream } from '../../../api/projects/schedule';

export function useRenameProjectFront(frontId: string, onSuccess: () => Promise<void>) {
  return useMutation({
    mutationFn: async ({ name, objective }: { name: string; objective: string }) => {
      const { error } = await renameProjectWorkstream(frontId, name.trim(), objective.trim() || null);
      if (error) throw new Error(error.message);
    },
    onSuccess,
  });
}
