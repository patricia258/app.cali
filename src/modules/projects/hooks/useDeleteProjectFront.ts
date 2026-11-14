import { useMutation } from '@tanstack/react-query';
import { deleteProjectWorkstream } from '../../../api/projects/schedule';

export function useDeleteProjectFront(frontId: string, onSuccess: () => Promise<void>) {
  return useMutation({
    mutationFn: async (destinationId: string | null) => {
      const { error } = await deleteProjectWorkstream(frontId, destinationId);
      if (error) throw new Error(error.message);
    },
    onSuccess,
  });
}
