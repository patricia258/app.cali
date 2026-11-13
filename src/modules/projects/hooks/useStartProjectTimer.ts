import { useMutation } from '@tanstack/react-query';
import { startAdminTimer } from '../../../api/hours/timers';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useStartProjectTimer() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof startAdminTimer>[0]) => {
      const result = await startAdminTimer(input);
      if (result.error) throw result.error;
      window.dispatchEvent(new Event(TIMER_EVENT));
    },
  });
}
