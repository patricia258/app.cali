import { useMutation } from '@tanstack/react-query';
import { finalizeTimerWork } from '../../../lib/timerSemantics';

export function useFinalizeGlobalTimer(onFinalized: () => void) {
  return useMutation({ mutationFn: finalizeTimerWork, onSuccess: onFinalized });
}
