import { useMutation, useQueryClient } from '@tanstack/react-query';
import { correctDeliveredReport } from '../../../../api/reports/withdrawal';

export function useCorrectDeliveredReport(reportId: string, onCorrected: (revisionId: string | null) => void) {
  const client = useQueryClient();
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
    onSuccess: (revisionId) => {
      void client.invalidateQueries({ queryKey: ['admin', 'withdrawable-reports'] });
      void client.invalidateQueries({ queryKey: ['admin', 'report-tracking'] });
      void client.invalidateQueries({ queryKey: ['admin', 'report-client-history'] });
      onCorrected(revisionId);
    },
  });
}
