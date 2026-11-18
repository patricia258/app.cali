import { useCallback } from 'react';
import { isCancelledError, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { readCompanyTeam } from '../../../api/team/directory';
import { teamKeys } from '../../../api/team/query-keys';

export function useLoadCompanyTeam(actorId: string | undefined, role: 'admin' | 'client' | 'partner') {
  const queryClient = useQueryClient();

  const loadDirectory = useCallback(async (companyId: string) => {
    if (!actorId) return;
    const isCurrent = captureQueryScope(queryClient);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: teamKeys.directory(actorId, companyId, role),
        queryFn: ({ signal }) => readCompanyTeam(companyId, role === 'partner', signal),
        staleTime: 0,
        gcTime: 0,
      });
      if (isCurrent()) return data;
    } catch (error) {
      if (isCurrent() && !isCancelledError(error)) throw error;
    }
  }, [actorId, queryClient, role]);

  const cancelDirectory = useCallback((companyId: string) => {
    if (actorId) return queryClient.cancelQueries({ queryKey: teamKeys.directory(actorId, companyId, role), exact: true });
  }, [actorId, queryClient, role]);

  return { loadDirectory, cancelDirectory };
}
