import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { readPreRegistration } from '../../../../api/public/pre-registration';

export function preRegistrationKey(token: string) {
  return ['public', 'company-pre-registration', token] as const;
}

export function usePreRegistration(token: string) {
  return useQuery({
    queryKey: preRegistrationKey(token),
    queryFn: () => z.uuid().safeParse(token).success ? readPreRegistration(token) : Promise.resolve('missing' as const),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
