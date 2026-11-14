import { useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { readPublicForm } from '../../../../api/forms/public';

export function usePublicForm(slug: string, preview: boolean) {
  const { ready, user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['public', 'form', slug, preview, preview ? user?.id : null],
    queryFn: () => readPublicForm(slug, preview),
    enabled: !preview || ready,
    refetchOnReconnect: false,
    gcTime: 0,
  });
}
