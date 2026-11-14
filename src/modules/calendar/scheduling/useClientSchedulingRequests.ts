import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { loadClientRequests } from './schedulingRequests';
import { useSchedulingRequestsRefresh } from './useSchedulingRequestsRefresh';

export function useClientSchedulingRequests() {
  const { user, role } = useWorkspaceAuth();
  const enabled = isSupabaseConfigured && role === 'client' && Boolean(user?.id);
  const { data, error, refetch } = useQuery({
    queryKey: ['scheduling-requests', 'client', user?.id],
    queryFn: loadClientRequests,
    enabled,
  });
  const refresh = useCallback(() => { void refetch(); }, [refetch]);
  useSchedulingRequestsRefresh(enabled, refresh);
  return { data, error, enabled };
}
