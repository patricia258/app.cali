import { useForm } from '@tanstack/react-form';
import type { PreRegistrationFields } from '../../../../api/public/pre-registration';
import { useSubmitPreRegistration } from './useSubmitPreRegistration';

export function usePreRegistrationForm(token: string) {
  const submit = useSubmitPreRegistration(token);
  const form = useForm({
    defaultValues: { name: '', legalName: '', city: '', state: '', contact: '', email: '' } satisfies PreRegistrationFields,
    onSubmit: async ({ value }) => {
      await submit.mutateAsync(value).catch(() => undefined);
    },
  });

  return { form, error: submit.error };
}
