import { useQueryClient } from '@tanstack/react-query';
import { discKeys } from '../../../api/disc/query-keys';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useRefreshManagementDisc(linkId: string) {
  const client = useQueryClient();
  const { user, role } = useWorkspaceAuth();

  return () => {
    const isCurrent = captureQueryScope(client);
    const actorId = user?.id;
    return async () => {
      if (!actorId || !isCurrent()) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: discKeys.managementReport(actorId, role, linkId), exact: true }),
        client.invalidateQueries({ queryKey: discKeys.managementCatalog(actorId), exact: true }),
      ]);
    };
  };
}
