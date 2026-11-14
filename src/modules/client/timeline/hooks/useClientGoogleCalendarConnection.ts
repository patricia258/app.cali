import { useQuery } from '@tanstack/react-query';
import { readClientGoogleConnection } from '../../../../api/calendar/connections';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useClientGoogleCalendarConnection() {
  const { user, role } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['calendar', 'client-google-connection', user?.id],
    queryFn: readClientGoogleConnection,
    enabled: Boolean(role === 'client' && user?.id),
  });
}
