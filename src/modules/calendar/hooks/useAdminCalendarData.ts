import { calendarKeys } from '../../../api/calendar/query-keys';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { observeSchedulingRequests } from '../../../api/calendar/agenda';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { loadAdminCalendarData } from '../adminCalendarData';

export function useAdminCalendarData(staff: boolean) {
  const { user, role } = useWorkspaceAuth();
  const enabled = isSupabaseConfigured && Boolean(user?.id) && role === (staff ? 'partner' : 'admin');
  const query = useQuery({
    queryKey: calendarKeys.workspaceByRole(user?.id, role),
    queryFn: ({ signal }) => loadAdminCalendarData(staff, signal),
    enabled,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { void refetch(); };
    return observeSchedulingRequests('admin-calendar-scheduling-preview', refresh);
  }, [enabled, refetch]);
  return { ...query, enabled };
}
