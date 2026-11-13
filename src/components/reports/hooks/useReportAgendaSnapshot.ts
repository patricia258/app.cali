import { skipToken, useQuery } from '@tanstack/react-query';
import { readReportAgendaSnapshot } from '../../../api/calendar/meetings';

export function useReportAgendaSnapshot(userId: string | undefined, protocol: string) {
  return useQuery({
    queryKey: ['reports', 'paper-agenda', userId, protocol],
    queryFn: userId && protocol && protocol !== '—' ? async ({ signal }) => {
      const { data, error } = await readReportAgendaSnapshot(protocol, signal);
      if (error) throw error;
      return data?.source_snapshot?.agendaCompliance ?? null;
    } : skipToken,
  });
}
