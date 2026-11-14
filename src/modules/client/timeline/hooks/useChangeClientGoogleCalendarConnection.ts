import { useMutation } from '@tanstack/react-query';
import { authorizeGoogleCalendar, disconnectGoogleCalendar } from '../../../../api/calendar/connections';

export function useChangeClientGoogleCalendarConnection() {
  return useMutation({
    mutationFn: async ({ action, companyId }: { action: 'connect' | 'disconnect'; companyId: string }) => {
      if (action === 'disconnect') {
        await disconnectGoogleCalendar(companyId);
        return null;
      }
      return await authorizeGoogleCalendar(companyId);
    },
  });
}
