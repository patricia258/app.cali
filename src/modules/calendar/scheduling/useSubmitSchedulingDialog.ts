import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';

export function useSubmitSchedulingDialog(
  onSubmit: (form: FormData) => Promise<void>,
  onClose: () => void,
) {
  const { mutate, isPending, error } = useMutation({ mutationFn: onSubmit, onSuccess: onClose });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPending) mutate(new FormData(event.currentTarget));
  }

  return { submit, isPending, error };
}
