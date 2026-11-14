import { skipToken, useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { loadMapaDeliveryState } from '../../../../api/admin/people-map/delivery';

export function useMapaDeliveryState(recordId: string | undefined, emailOpen: boolean) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['mapa-delivery', user?.id, recordId],
    queryFn: user?.id && emailOpen && recordId ? () => loadMapaDeliveryState(recordId) : skipToken,
    retry: false,
  });
}
