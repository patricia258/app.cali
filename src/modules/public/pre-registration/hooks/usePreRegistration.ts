import { useQuery } from '@tanstack/react-query';
import { publicKeys } from '../../../../api/public/query-keys';
import { z } from 'zod';
import { readPreRegistration } from '../../../../api/public/pre-registration';

export function usePreRegistration(token: string) {
  return useQuery({
    queryKey: publicKeys.preRegistration(token),
    queryFn: ({ signal }) => z.uuid().safeParse(token).success ? readPreRegistration(token, signal) : Promise.resolve('missing' as const),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
