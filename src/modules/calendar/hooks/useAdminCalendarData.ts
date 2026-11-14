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
    queryKey: ['calendar', 'workspace-data', user?.id, role],
    queryFn: () => loadAdminCalendarData(staff),
    enabled,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { void refetch(); };
    const stop = observeSchedulingRequests('admin-calendar-scheduling-preview', refresh);
    window.addEventListener('cali-calendar-record-updated', refresh);
    return () => {
      stop();
      window.removeEventListener('cali-calendar-record-updated', refresh);
    };
  }, [enabled, refetch]);
  return { ...query, enabled };
}
