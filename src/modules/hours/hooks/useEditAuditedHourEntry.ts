import { useMutation } from '@tanstack/react-query';
import { editAuditedHourEntry, type HourAuditEntry } from '../../../api/hours/audit';

export function useEditAuditedHourEntry() {
  return useMutation({
    mutationFn: async ({ entry, reason }: { entry: HourAuditEntry; reason: string }) => {
      const { error } = await editAuditedHourEntry(entry, reason);
      if (error) throw new Error(error.message);
    },
  });
}
