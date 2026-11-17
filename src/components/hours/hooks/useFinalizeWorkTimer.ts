import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { finalizeTimerWork, notifyTimerChange } from '../../../lib/timerSemantics';

export function useFinalizeWorkTimer(onFinalized?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: finalizeTimerWork,
    onMutate: () => ({ isCurrent: captureQueryScope(client), onFinalized }),
    onSuccess: (_result, _timer, scope) => {
      if (!scope?.isCurrent()) return;
      notifyTimerChange();
      scope.onFinalized?.();
    },
  });
}
