import { useSearchParams } from '../../../../hooks/useSearchParams';

export function useAdminReportDeepLink() {
  const [searchParams] = useSearchParams();
  return searchParams.get('report');
}
