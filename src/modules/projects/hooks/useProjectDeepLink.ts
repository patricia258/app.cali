import { useSearchParams } from '../../../hooks/useSearchParams';
import { useLocation } from '../../../hooks/useLocation';

export function useProjectDeepLink() {
  const [params] = useSearchParams();
  const { entryKey } = useLocation();
  return {
    entryKey,
    projectId: params.get('project'),
    deliverableId: params.get('deliverable'),
    taskId: params.get('task'),
    view: params.get('view') === 'overview' ? 'overview' as const : 'conversation' as const,
  };
}
