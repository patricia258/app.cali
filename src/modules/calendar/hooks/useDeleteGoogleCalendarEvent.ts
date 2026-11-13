import { useMutation } from '@tanstack/react-query';
import { runGoogleCalendarOperation } from '../../../api/calendar/sync';

export function useDeleteGoogleCalendarEvent() {
  return useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason: string }) => {
      await runGoogleCalendarOperation({ action: 'delete_event', eventId, reason });
    },
  });
}
