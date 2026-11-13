import { useMutation } from '@tanstack/react-query';
import { deleteAuditedHourEntry } from '../../../api/hours/audit';

export function useDeleteAuditedHourEntry() {
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await deleteAuditedHourEntry(id, reason);
      if (error) throw new Error(error.message);
    },
  });
}
