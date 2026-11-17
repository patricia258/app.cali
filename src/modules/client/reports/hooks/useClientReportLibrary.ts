import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientReports } from '../../../../api/client/reports/library';
import { clientKeys } from '../../../../api/client/query-keys';

export function useClientReportLibrary(actorId: string | null) {
  return useQuery({
    queryKey: clientKeys.reports(actorId),
    queryFn: actorId ? ({ signal }) => readClientReports(actorId, signal) : skipToken,
  });
}
