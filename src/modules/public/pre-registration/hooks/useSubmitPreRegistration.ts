import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { publicKeys } from '../../../../api/public/query-keys';
import { submitPreRegistration, type PreRegistrationFields } from '../../../../api/public/pre-registration';

export function useSubmitPreRegistration(token: string) {
  const queryClient = useQueryClient();
  const queryKey = publicKeys.preRegistration(token);
  return useMutation({
    gcTime: 0,
    mutationFn: (fields: PreRegistrationFields) => submitPreRegistration(token, { ...fields, email: fields.email.trim() }),
    onMutate: async () => {
      const isCurrent = captureQueryScope(queryClient);
      await queryClient.cancelQueries({ queryKey, exact: true });
      return isCurrent;
    },
    onSuccess: (_result, _fields, isCurrent) => {
      if (isCurrent?.()) queryClient.setQueryData(queryKey, (previous) => previous === undefined ? undefined : 'submitted');
    },
  });
}
