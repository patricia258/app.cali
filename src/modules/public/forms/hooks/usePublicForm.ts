import { useQuery } from '@tanstack/react-query';
import { formsKeys } from '../../../../api/forms/query-keys';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { readPublicForm } from '../../../../api/forms/public';

export function usePublicForm(slug: string, preview: boolean) {
  const { ready, user } = useWorkspaceAuth();
  return useQuery({
    queryKey: formsKeys.publicForm(slug, preview, user?.id),
    queryFn: ({ signal }) => readPublicForm(slug, preview, signal),
    enabled: !preview || ready,
    refetchOnReconnect: false,
    gcTime: 0,
  });
}
