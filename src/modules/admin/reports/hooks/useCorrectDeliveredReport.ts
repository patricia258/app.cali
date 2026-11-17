import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { reportsKeys } from '../../../../api/reports/query-keys';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';
import { correctDeliveredReport } from '../../../../api/reports/withdrawal';

export function useCorrectDeliveredReport(reportId: string, onCorrected: (revisionId: string | null) => void) {
  const client = useQueryClient();
  const { user } = useWorkspaceAuth();
  return useMutation({
    mutationFn: async ({ action, reason, acknowledgement }: { action: 'edit' | 'remove'; reason: string; acknowledgement: boolean }) => {
      const result = await correctDeliveredReport(reportId, reason, action, acknowledgement);
      if (!result.error) return result.revisionId;
      if (result.error.includes('report_already_seen')) {
        throw new Error('O cliente já visualizou ou registrou ciência. A partir desse ponto, a versão enviada não pode mais ser retirada.');
      }
      if (result.error.includes('report_not_reopenable') || result.error.includes('report_not_withdrawable')) {
        throw new Error('Este relatório não está mais em um estado que permita correção antes da leitura.');
      }
      throw new Error(`Não foi possível concluir a ação: ${result.error}`);
    },
    onMutate: () => ({ isCurrent: captureQueryScope(client), actorId: user?.id }),
    onSuccess: async (revisionId, _change, scope) => {
      if (!scope?.isCurrent()) return;
      await Promise.all([
        client.invalidateQueries({ queryKey: reportsKeys.withdrawable(scope.actorId), exact: true }),
        client.invalidateQueries({ queryKey: reportsKeys.tracking(scope.actorId) }),
        client.invalidateQueries({ queryKey: reportsKeys.clientHistories(scope.actorId) }),
      ]);
      if (scope.isCurrent()) onCorrected(revisionId);
    },
  });
}
