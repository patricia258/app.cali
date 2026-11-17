import { calendarKeys } from '../../../../api/calendar/query-keys';
import { useQuery } from '@tanstack/react-query';
import { readClientGoogleConnection } from '../../../../api/calendar/connections';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useClientGoogleCalendarConnection() {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: calendarKeys.googleConnection(user?.id, 'client'),
    queryFn: ({ signal }) => readClientGoogleConnection(signal),
    enabled: Boolean(role === 'client' && user?.id),
  });
}
