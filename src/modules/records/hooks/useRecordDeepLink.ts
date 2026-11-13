import { useSearchParams } from '../../../hooks/useSearchParams';

export function useRecordDeepLink() {
  const [searchParams] = useSearchParams();
  return searchParams.get('record');
}
