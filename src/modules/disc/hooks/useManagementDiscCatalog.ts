import { useQuery } from '@tanstack/react-query';
import { discKeys } from '../../../api/disc/query-keys';
import { readManagementDiscCatalog } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useManagementDiscCatalog() {
  const { user, active } = useWorkspaceAuth();
  return useQuery({
    queryKey: discKeys.managementCatalog(user?.id),
    queryFn: ({ signal }) => readManagementDiscCatalog(signal),
    enabled: Boolean(user && active),
    gcTime: 0,
  });
}
