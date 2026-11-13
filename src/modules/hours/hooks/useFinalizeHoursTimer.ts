import { useMutation } from '@tanstack/react-query';
import { finalizeTimerWork } from '../../../lib/timerSemantics';

export function useFinalizeHoursTimer() {
  return useMutation({ mutationFn: finalizeTimerWork });
}
