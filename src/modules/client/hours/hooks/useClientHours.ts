import { skipToken, useQuery } from '@tanstack/react-query';
import { endOfMonth, format, parseISO } from 'date-fns';
import { clientHoursKey, readClientHours } from '../../../../api/client/hours/extract';

export function useClientHours(userId: string | undefined, period: string) {
  return useQuery({
    queryKey: clientHoursKey(userId ?? '', period),
    queryFn: userId && period ? ({ signal }) => {
      const start = `${period}-01`;
      const end = format(endOfMonth(parseISO(start)), 'yyyy-MM-dd');
      return readClientHours(userId, start, end, signal);
    } : skipToken,
  });
}
