import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitPreRegistration, type PreRegistrationFields } from '../../../../api/public/pre-registration';
import { preRegistrationKey } from './usePreRegistration';

export function useSubmitPreRegistration(token: string) {
  const queryClient = useQueryClient();
  const queryKey = preRegistrationKey(token);
  return useMutation({
    mutationFn: (fields: PreRegistrationFields) => submitPreRegistration(token, { ...fields, email: fields.email.trim() }),
    onMutate: () => queryClient.cancelQueries({ queryKey }),
    onSuccess: () => { queryClient.setQueryData(queryKey, 'submitted'); },
  });
}
