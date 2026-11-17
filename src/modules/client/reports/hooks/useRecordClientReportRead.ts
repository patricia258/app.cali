import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordReportRead, type readClientReports } from '../../../../api/client/reports/library';
import { clientKeys } from '../../../../api/client/query-keys';

type ReportLibrary = Awaited<ReturnType<typeof readClientReports>>;

export function useRecordClientReportRead(actorId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = clientKeys.reports(actorId);

  return useMutation({
    mutationFn: ({ id, event }: { id: string; event: Parameters<typeof recordReportRead>[1] }) => recordReportRead(id, event),
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: async (read, { id, event }, isCurrent) => {
      if (!read || !actorId || event !== 'opened' || !isCurrent?.()) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      queryClient.setQueryData<ReportLibrary>(queryKey, (library) => library && {
        ...library,
        reports: library.reports.map((report) => report.id === id ? {
          ...report,
          client_open_count: Math.max(read.open_count ?? 0, report.client_open_count ?? 0),
          client_first_opened_at: read.first_opened_at ?? report.client_first_opened_at,
          client_last_opened_at: (read.last_opened_at ?? '') > (report.client_last_opened_at ?? '')
            ? read.last_opened_at : report.client_last_opened_at,
        } : report),
      });
    },
    gcTime: 0,
  });
}
