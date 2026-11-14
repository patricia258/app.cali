import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { observeAdminAgendaChanges, readAdminAgendaChanges } from '../../../api/calendar/changes';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useAgendaChangeInbox() {
  const { user, role } = useWorkspaceAuth();
  const enabled = Boolean(isSupabaseConfigured && user?.id && role === 'admin');
  const query = useQuery({
    queryKey: ['calendar', 'agenda-change-inbox', user?.id],
    queryFn: readAdminAgendaChanges,
    enabled,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!enabled) return;
    return observeAdminAgendaChanges(() => void refetch());
  }, [enabled, refetch]);
  return query;
}
