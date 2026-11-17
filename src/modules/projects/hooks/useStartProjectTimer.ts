import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { startAdminTimer } from '../../../api/hours/timers';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useStartProjectTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => captureQueryScope(queryClient),
    mutationFn: async (input: Parameters<typeof startAdminTimer>[0]) => {
      const result = await startAdminTimer(input);
      if (result.error) throw result.error;
    },
    onSuccess: (_data, _variables, isCurrent) => {
      if (isCurrent?.()) window.dispatchEvent(new Event(TIMER_EVENT));
    },
  });
}
