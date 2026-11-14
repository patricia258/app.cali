import { useQueryClient } from '@tanstack/react-query';

export function useInvalidateGoogleCalendarEvent() {
  const client = useQueryClient();
  return (eventId: string) => {
    void client.invalidateQueries({ predicate: ({ queryKey }) =>
      queryKey[0] === 'calendar' && queryKey[1] === 'google-event' && queryKey[3] === eventId,
    });
    window.dispatchEvent(new Event('cali-calendar-record-updated'));
  };
}
