import { useSearchParams } from '../../../hooks/useSearchParams';

export function useHighlightedSchedulingRequest() {
  const [params] = useSearchParams();
  return params.get('request');
}
