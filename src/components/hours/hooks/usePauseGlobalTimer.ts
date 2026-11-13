import { useMutation } from '@tanstack/react-query';
import { pauseTimerSession } from '../../../lib/timerSemantics';

export function usePauseGlobalTimer() {
  return useMutation({ mutationFn: pauseTimerSession });
}
