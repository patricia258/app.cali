import { useQuery } from '@tanstack/react-query';
import { readManagementDiscCatalog } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useManagementDiscCatalog() {
  const { user, active } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['disc', 'management-catalog', user?.id],
    queryFn: readManagementDiscCatalog,
    enabled: Boolean(user && active),
    gcTime: 0,
  });
}
