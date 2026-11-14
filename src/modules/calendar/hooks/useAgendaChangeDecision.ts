import { useMutation } from '@tanstack/react-query';
import { decideAgendaChange } from '../../../api/calendar/changes';

export function useAgendaChangeDecision() {
  return useMutation({
    mutationFn: async ({ id, approve, note, slot }: { id: string; approve: boolean; note: string; slot: number }) => {
      const result = await decideAgendaChange(id, approve, note, slot);
      if (result.error) throw new Error(result.error.message);
      return result.sync;
    },
  });
}
