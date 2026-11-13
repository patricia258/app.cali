import { useMutation } from '@tanstack/react-query';
import { markLegacyReportSimulation, type AdminReportRow } from '../../../../api/reports/admin';

export function useMarkLegacyReportSimulation() {
  return useMutation({
    gcTime: 0,
    mutationFn: ({ report, officialId }: { report: AdminReportRow; officialId: string }) =>
      markLegacyReportSimulation(report, officialId),
  });
}
