import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { notifyTimerChange, pauseTimerSession } from '../../../lib/timerSemantics';

export function usePauseGlobalTimer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: pauseTimerSession,
    onMutate: () => captureQueryScope(client),
    onSuccess: (_result, _timerId, isCurrent) => {
      if (isCurrent?.()) notifyTimerChange();
    },
  });
}
