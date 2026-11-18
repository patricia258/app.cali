import { skipToken, useQuery } from '@tanstack/react-query';
import { peopleMapKeys } from '../../../../api/admin/people-map/query-keys';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { loadMapaDeliveryState } from '../../../../api/admin/people-map/delivery';

export function useMapaDeliveryState(recordId: string | undefined, emailOpen: boolean) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: peopleMapKeys.delivery(user?.id, recordId),
    queryFn: user?.id && emailOpen && recordId ? ({ signal }) => loadMapaDeliveryState(recordId, signal) : skipToken,
    retry: false,
  });
}
