import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { acknowledgeClientReport, recordReportRead, type readClientReports } from '../../../../api/client/reports/library';
import { clientKeys } from '../../../../api/client/query-keys';

type ReportLibrary = Awaited<ReturnType<typeof readClientReports>>;

export function useAcknowledgeClientReport(actorId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = clientKeys.reports(actorId);

  return useMutation({
    mutationFn: async ({ id, needsOpen }: { id: string; needsOpen: boolean }) => {
      const isCurrent = captureQueryScope(queryClient);
      const read = needsOpen ? await recordReportRead(id, 'opened') : null;
      if (!isCurrent()) return null;
      const receipt = await acknowledgeClientReport(id);
      return isCurrent() ? { receipt, read } : null;
    },
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: async (result, { id }, isCurrent) => {
      if (!result || !actorId || !isCurrent?.()) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      const { receipt, read } = result;
      queryClient.setQueryData<ReportLibrary>(queryKey, (library) => library && {
        ...library,
        reports: library.reports.map((report) => report.id === id ? {
          ...report,
          client_open_count: read ? Math.max(read.open_count ?? 0, report.client_open_count ?? 0) : report.client_open_count,
          client_first_opened_at: read?.first_opened_at ?? report.client_first_opened_at,
          client_last_opened_at: read?.last_opened_at && read.last_opened_at > (report.client_last_opened_at ?? '')
            ? read.last_opened_at : report.client_last_opened_at,
          acknowledged_at: receipt?.acknowledged_at ?? report.acknowledged_at,
          acknowledgement_protocol: receipt?.acknowledgement_protocol ?? report.acknowledgement_protocol,
          acknowledgement_identity_snapshot: receipt?.identity ?? report.acknowledgement_identity_snapshot,
        } : report),
      });
    },
    gcTime: 0,
  });
}
